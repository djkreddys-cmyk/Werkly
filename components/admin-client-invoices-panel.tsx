"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClientRecord } from "@/lib/crm";
import type { JobApplication, JobSummary } from "@/lib/jobs";
import {
  formatFinanceBankAccountLabel,
  invoiceNumberFromInvoices,
  mergeFinanceStoreWithFallback,
  readFinanceBankAccounts,
  readFinanceInvoices,
  readFinanceStoreFromBackend,
  readLocalFinanceStore,
  writeFinanceStoreToBackend,
  type FinanceBankAccountRecord,
  type FinanceInvoiceRecord,
  type FinanceStore,
} from "@/lib/finance";
import { formatPersonName } from "@/lib/format";
import { buildPrintableInvoiceHtml } from "@/lib/invoice-print";

type InvoiceLine = {
  applicationId: string;
  candidateName: string;
  ctc: string;
  doj: string;
  department: string;
  hsnSac: string;
  feePercent: string;
  selected: boolean;
};

const fieldClassName =
  "w-full rounded-[1rem] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)] focus:ring-4 focus:ring-[rgba(10,118,132,0.12)]";

const compactFieldClassName =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-xs text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)] focus:ring-4 focus:ring-[rgba(10,118,132,0.12)]";
const compactSelectClassName = `${compactFieldClassName} appearance-none pr-9`;
const compactPrimaryButtonClassName =
  "h-10 rounded-full bg-[var(--color-dark)] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(8,96,108,0.16)] transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50";
const compactSecondaryButtonClassName =
  "h-10 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]";
const compactDangerButtonClassName =
  "h-10 rounded-full border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100";
const gstRate = 9;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function toDateInputKey(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dayFirstMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dayFirstMatch) {
    const day = dayFirstMatch[1].padStart(2, "0");
    const month = dayFirstMatch[2].padStart(2, "0");
    return `${dayFirstMatch[3]}-${month}-${day}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function parseMoney(value?: string) {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw) {
    return 0;
  }

  const firstNumber = Number(raw.replace(/,/g, "").match(/\d+(\.\d+)?/)?.[0] || 0);
  if (!Number.isFinite(firstNumber)) {
    return 0;
  }

  if (raw.includes("lpa") || raw.includes("lakh") || raw.includes("lac") || /\d\s*l\b/.test(raw)) {
    return firstNumber * 100000;
  }

  if (raw.includes("cr") || raw.includes("crore")) {
    return firstNumber * 10000000;
  }

  return firstNumber;
}

function formatNumberInput(value: number) {
  return value > 0 ? String(Math.round(value)) : "";
}

function getFinancialYearRange(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  const year = date.getFullYear();
  const fiscalStartYear = date.getMonth() >= 3 ? year : year - 1;
  return {
    start: `${fiscalStartYear}-04-01`,
    end: `${fiscalStartYear + 1}-03-31`,
  };
}

function isDateKeyInRange(dateKey: string, start: string, end: string) {
  return dateKey >= start && dateKey <= end;
}

function invoiceNumber(dateKey = todayKey()) {
  const invoiceDateKey = toDateInputKey(dateKey) || todayKey();
  const { start, end } = getFinancialYearRange(invoiceDateKey);
  const invoices = typeof window === "undefined" ? [] : readFinanceInvoices();
  const maxSequence = invoices.reduce((max, invoice) => {
    const match = String(invoice.invoiceNo || "").match(/^(\d{8})(\d+)$/);
    if (!match) {
      return max;
    }

    const invoiceKey = `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`;
    if (!isDateKeyInRange(invoiceKey, start, end)) {
      return max;
    }

    return Math.max(max, Number(match[2]) || 0);
  }, 0);
  const sequence = String(maxSequence + 1).padStart(3, "0");
  return `${invoiceDateKey.replaceAll("-", "")}${sequence}`;
}


function defaultLine(application: JobApplication, job?: JobSummary): InvoiceLine {
  const ctc =
    parseMoney(application.finalCtc) ||
    parseMoney(application.currentCtc) ||
    parseMoney(application.expectedCtc);
  const joinedStageDate =
    String(application.stage || "").toLowerCase() === "joined" ? application.stageDate : "";
  return {
    applicationId: application.id,
    candidateName: formatPersonName(application.candidateName),
    ctc: formatNumberInput(ctc),
    doj:
      toDateInputKey(application.dateOfJoining) ||
      toDateInputKey(joinedStageDate) ||
      toDateInputKey(application.stageUpdatedAt) ||
      todayKey(),
    department:
      job?.title ||
      application.jobTitle ||
      application.preferredRole ||
      application.currentDesignation ||
      "Recruitment placement",
    hsnSac: "998512",
    feePercent: "8.33",
    selected: true,
  };
}

function lineTaxableValue(line: InvoiceLine) {
  return (parseMoney(line.ctc) * Number(line.feePercent || 0)) / 100;
}

function getDefaultBankAccount(financeBankAccounts?: FinanceBankAccountRecord[]) {
  const bankAccounts = financeBankAccounts ?? readFinanceBankAccounts();
  return bankAccounts.find((account) => account.isPrimary) || bankAccounts[0];
}

export function AdminClientInvoicesPanel({
  invoiceToLoad,
  onFinanceInvoiceChange,
}: {
  invoiceToLoad?: FinanceInvoiceRecord | null;
  onFinanceInvoiceChange?: () => void;
}) {
  const [token, setToken] = useState("");
  const [authType, setAuthType] = useState("");
  const [authRole, setAuthRole] = useState("");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [bankAccounts, setBankAccounts] = useState<FinanceBankAccountRecord[]>([]);
  const [financeInvoices, setFinanceInvoices] = useState<FinanceInvoiceRecord[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState(invoiceNumber);
  const [invoiceDate, setInvoiceDate] = useState(todayKey);
  const [dueDate, setDueDate] = useState(addDays(todayKey(), 30));
  const [notes, setNotes] = useState(
    "Payment should be made within 30 days after the candidate joins your organization."
  );
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isInvoiceGenerated, setIsInvoiceGenerated] = useState(false);
  const [generatedInvoiceId, setGeneratedInvoiceId] = useState("");

  async function loadFinanceDetails(nextToken = token) {
    try {
      const loadedStore = await readFinanceStoreFromBackend(nextToken);
      const store = mergeFinanceStoreWithFallback(loadedStore, {
        invoices: financeInvoices,
        bankAccounts,
        income: [],
        expenditure: [],
      });
      setFinanceInvoices(store.invoices);
      setBankAccounts(store.bankAccounts);
      const defaultAccount = store.bankAccounts.find((account) => account.isPrimary) || store.bankAccounts[0];
      setSelectedBankAccountId((current) =>
        current && store.bankAccounts.some((account) => account.id === current)
          ? current
          : defaultAccount?.id || ""
      );
      return store;
    } catch {
      const store = readLocalFinanceStore();
      setFinanceInvoices(store.invoices);
      setBankAccounts(store.bankAccounts);
      const defaultAccount = store.bankAccounts.find((account) => account.isPrimary) || store.bankAccounts[0];
      setSelectedBankAccountId((current) =>
        current && store.bankAccounts.some((account) => account.id === current)
          ? current
          : defaultAccount?.id || ""
      );
      return store;
    }
  }

  useEffect(() => {
    const nextToken = window.localStorage.getItem("werklyAdminToken") ?? "";
    setToken(nextToken);
    setAuthType(window.localStorage.getItem("werklyAuthType") ?? "");
    setAuthRole(window.localStorage.getItem("werklyAuthRole") ?? "");
    void loadFinanceDetails(nextToken);
    const handleFocus = () => void loadFinanceDetails(nextToken);
    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const canDeleteInvoice =
    authType === "admin" || String(authRole).trim().toLowerCase() === "super-admin";

  useEffect(() => {
    if (generatedInvoiceId || invoiceToLoad) {
      return;
    }

    setInvoiceNo(invoiceNumberFromInvoices(financeInvoices, invoiceDate));
  }, [financeInvoices, generatedInvoiceId, invoiceDate, invoiceToLoad]);

  useEffect(() => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError("");

    Promise.all([
      fetch("/api/admin/clients", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/applications", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([clientsResponse, applicationsResponse, jobsResponse]) => {
        const clientsResult = (await clientsResponse.json()) as {
          clients?: ClientRecord[];
          message?: string;
        };
        const applicationsResult = (await applicationsResponse.json()) as {
          applications?: JobApplication[];
          message?: string;
        };
        const jobsResult = (await jobsResponse.json()) as {
          jobs?: JobSummary[];
          message?: string;
        };

        if (!clientsResponse.ok) {
          throw new Error(clientsResult.message || "Unable to load clients.");
        }

        if (!applicationsResponse.ok) {
          throw new Error(applicationsResult.message || "Unable to load applications.");
        }

        if (!jobsResponse.ok) {
          throw new Error(jobsResult.message || "Unable to load jobs.");
        }

        setClients(clientsResult.clients ?? []);
        setApplications(applicationsResult.applications ?? []);
        setJobs(jobsResult.jobs ?? []);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load invoice data.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const joinedApplications = useMemo(
    () =>
      applications.filter(
        (application) => String(application.stage || "").toLowerCase() === "joined"
      ),
    [applications]
  );

  const onboardedClients = useMemo(
    () =>
      clients.filter((client) => {
        const onboardingStatus = String(client.onboardingStatus || "").toLowerCase();
        const followUpStatus = String(client.followUpStatus || "").toLowerCase();
        return onboardingStatus === "onboarded" || followUpStatus === "on-boarded";
      }),
    [clients]
  );

  const visibleClients = onboardedClients;

  const selectedClient = useMemo(() => {
    const visibleClient = visibleClients.find((client) => client.id === selectedClientId);
    if (visibleClient) {
      return visibleClient;
    }

    if (invoiceToLoad?.clientId === selectedClientId) {
      const fallbackClient: ClientRecord = {
        id: invoiceToLoad.clientId,
        companyName: invoiceToLoad.clientName,
        contactPerson: "",
        gstNumber: invoiceToLoad.clientGstNumber,
        cinNumber: invoiceToLoad.clientCinNumber,
        panNumber: invoiceToLoad.clientPanNumber,
        communicationAddress: invoiceToLoad.clientAddress,
        status: "active",
        onboardingStatus: "onboarded",
        followUpStatus: "on-boarded",
        linkedJobsCount: 0,
        linkedJobs: [],
        createdAt: invoiceToLoad.generatedAt,
      };
      return fallbackClient;
    }

    return undefined;
  }, [invoiceToLoad, selectedClientId, visibleClients]);
  const selectedBankAccount = useMemo(
    () =>
      bankAccounts.find((account) => account.id === selectedBankAccountId) ||
      bankAccounts.find((account) => account.isPrimary) ||
      bankAccounts[0],
    [bankAccounts, selectedBankAccountId]
  );

  const clientJoinedApplications = useMemo(() => {
    if (!selectedClient) {
      return [];
    }

    const selectedClientName = selectedClient.companyName.trim().toLowerCase();
    const selectedClientJobs = new Set(
      jobs.filter((job) => job.clientId === selectedClient.id).map((job) => job.id)
    );

    return joinedApplications.filter((application) => {
      if (application.clientId === selectedClient.id) {
        return true;
      }

      if (selectedClientJobs.has(application.jobId)) {
        return true;
      }

      return String(application.clientName || "").trim().toLowerCase() === selectedClientName;
    });
  }, [jobs, joinedApplications, selectedClient]);

  useEffect(() => {
    if (generatedInvoiceId) {
      return;
    }

    setLines(
      clientJoinedApplications.map((application) =>
        defaultLine(
          application,
          jobs.find((job) => job.id === application.jobId)
        )
      )
    );
    setIsInvoiceGenerated(false);
    setMessage("");
  }, [clientJoinedApplications, generatedInvoiceId, jobs]);

  useEffect(() => {
    if (
      !isLoading &&
      !generatedInvoiceId &&
      selectedClientId &&
      !visibleClients.some((client) => client.id === selectedClientId)
    ) {
      setSelectedClientId("");
    }
  }, [generatedInvoiceId, isLoading, selectedClientId, visibleClients]);

  useEffect(() => {
    if (!invoiceToLoad) {
      return;
    }

    setSelectedClientId(invoiceToLoad.clientId);
    setInvoiceNo(invoiceToLoad.invoiceNo);
    setInvoiceDate(toDateInputKey(invoiceToLoad.invoiceDate) || todayKey());
    setDueDate(toDateInputKey(invoiceToLoad.dueDate) || addDays(toDateInputKey(invoiceToLoad.invoiceDate) || todayKey(), 30));
    setSelectedBankAccountId(invoiceToLoad.bankAccountId || "");
    setNotes(invoiceToLoad.notes || "");
    setLines(
      invoiceToLoad.lines.map((line, index) => ({
        applicationId: line.applicationId || `${invoiceToLoad.id}-${index}`,
        candidateName: line.candidateName,
        ctc: line.ctc,
        doj: toDateInputKey(line.doj) || todayKey(),
        department: line.department,
        hsnSac: line.hsnSac || "998512",
        feePercent: line.feePercent || "8.33",
        selected: true,
      }))
    );
    setGeneratedInvoiceId(invoiceToLoad.id);
    setIsInvoiceGenerated(true);
    setError("");
    setMessage(`Loaded invoice ${invoiceToLoad.invoiceNo}. You can review, edit, print, or regenerate it.`);
  }, [invoiceToLoad]);

  const totals = useMemo(() => {
    const selectedLines = lines.filter((line) => line.selected);
    const taxable = selectedLines.reduce((sum, line) => sum + lineTaxableValue(line), 0);
    const cgst = (taxable * gstRate) / 100;
    const sgst = (taxable * gstRate) / 100;
    return {
      count: selectedLines.length,
      taxable,
      cgst,
      sgst,
      total: Math.round(taxable + cgst + sgst),
    };
  }, [lines]);

  function updateLine(applicationId: string, patch: Partial<InvoiceLine>) {
    setIsInvoiceGenerated(false);
    setMessage("");
    setLines((current) =>
      current.map((line) => (line.applicationId === applicationId ? { ...line, ...patch } : line))
    );
  }

  function missingInvoiceDetails() {
    const missing: string[] = [];

    if (!selectedClient) {
      return ["Client"];
    }

    if (!selectedClient.gstNumber?.trim()) {
      missing.push("Client GST number");
    }
    if (!selectedClient.panNumber?.trim()) {
      missing.push("Client PAN number");
    }
    if (!selectedClient.communicationAddress?.trim()) {
      missing.push("Client communication address");
    }
    return missing;
  }

  function validateInvoiceReady() {
    if (!selectedClient || totals.count === 0) {
      setError("Select a client and at least one joined candidate before generating invoice.");
      setMessage("");
      return false;
    }

    const missing = missingInvoiceDetails();
    if (missing.length > 0) {
      setMessage("");
      setError(`Cannot generate invoice. Please add: ${missing.join(", ")}.`);
      return false;
    }

    setError("");
    return true;
  }

  function buildFinanceInvoiceId(clientId: string) {
    return `${invoiceNo.trim() || invoiceNumber()}-${clientId}`;
  }

  async function pushInvoiceToFinance(invoiceClient: ClientRecord) {
    const selectedLines = lines.filter((line) => line.selected);
    const financeInvoiceId = buildFinanceInvoiceId(invoiceClient.id);
    const store = await loadFinanceDetails();
    const existingInvoice = store.invoices.find((invoice) => invoice.id === financeInvoiceId);
    const defaultBankAccount = selectedBankAccount || getDefaultBankAccount(store.bankAccounts);
    const generatedBy =
      window.localStorage.getItem("werklyAdminEmail") ||
      window.localStorage.getItem("werklyAuthName") ||
      authRole ||
      authType ||
      "Werkly User";

    const nextInvoice: FinanceInvoiceRecord = {
      id: financeInvoiceId,
      invoiceNo,
      invoiceDate,
      dueDate,
      clientId: invoiceClient.id,
      clientName: invoiceClient.companyName,
      clientGstNumber: invoiceClient.gstNumber || "",
      clientCinNumber: invoiceClient.cinNumber || "",
      clientPanNumber: invoiceClient.panNumber || "",
      clientAddress: invoiceClient.communicationAddress || invoiceClient.branch || "",
      taxable: totals.taxable,
      cgst: totals.cgst,
      sgst: totals.sgst,
      total: totals.total,
      notes,
      status: "generated",
      generatedAt: new Date().toISOString(),
      generatedBy,
      paymentStatus: existingInvoice?.paymentStatus || "unpaid",
      amountReceived: existingInvoice?.amountReceived || 0,
      paymentDate: existingInvoice?.paymentDate || "",
      paymentMode: existingInvoice?.paymentMode || "Bank Transfer",
      paymentReference: existingInvoice?.paymentReference || "",
      paymentNotes: existingInvoice?.paymentNotes || "",
      bankAccountId: selectedBankAccount?.id || existingInvoice?.bankAccountId || defaultBankAccount?.id || "",
      lines: selectedLines.map((line) => {
        const taxable = lineTaxableValue(line);
        const cgst = (taxable * gstRate) / 100;
        const sgst = (taxable * gstRate) / 100;
        return {
          applicationId: line.applicationId,
          candidateName: line.candidateName,
          ctc: line.ctc,
          doj: line.doj,
          department: line.department,
          hsnSac: line.hsnSac,
          feePercent: line.feePercent,
          taxable,
          cgst,
          sgst,
          amount: taxable + cgst + sgst,
        };
      }),
    };
    const nextStore: FinanceStore = {
      ...store,
      invoices: [nextInvoice, ...store.invoices.filter((invoice) => invoice.id !== financeInvoiceId)],
    };
    const savedStore = await writeFinanceStoreToBackend(nextStore, token);
    setFinanceInvoices(savedStore.invoices);
    setBankAccounts(savedStore.bankAccounts);
    setGeneratedInvoiceId(financeInvoiceId);
    onFinanceInvoiceChange?.();
  }

  async function handleGenerateInvoice() {
    if (!validateInvoiceReady()) {
      setIsInvoiceGenerated(false);
      return;
    }

    if (!selectedClient) {
      setError("Select a client before generating invoice.");
      return;
    }

    try {
      await pushInvoiceToFinance(selectedClient);
      setIsInvoiceGenerated(true);
      setMessage("Invoice generated. Review below, print when ready, or update payment details in Finance.");
    } catch (saveError) {
      setIsInvoiceGenerated(false);
      setError(saveError instanceof Error ? saveError.message : "Unable to save invoice.");
    }
  }

  async function handleDeleteGeneratedInvoice() {
    if (!canDeleteInvoice) {
      setError("Only admin users can delete generated invoices.");
      return;
    }

    const confirmed = window.confirm(
      `Delete generated invoice "${invoiceNo}"? You can regenerate it again from the current details.`
    );
    if (!confirmed) {
      return;
    }

    try {
      const store = await loadFinanceDetails();
      const invoiceId = generatedInvoiceId || buildFinanceInvoiceId(selectedClientId);
      const savedStore = await writeFinanceStoreToBackend(
        {
          ...store,
          invoices: store.invoices.filter((invoice) => invoice.id !== invoiceId),
          income: store.income.filter((item) => item.id !== `invoice-income-${invoiceId}`),
        },
        token
      );
      setFinanceInvoices(savedStore.invoices);
      setBankAccounts(savedStore.bankAccounts);
      setIsInvoiceGenerated(false);
      setGeneratedInvoiceId("");
      onFinanceInvoiceChange?.();
      setMessage("Generated invoice deleted from Finance. Review the details and generate again when ready.");
      setError("");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete invoice.");
    }
  }

  async function generateInvoice() {
    if (!isInvoiceGenerated) {
      setError("Please generate the invoice before printing.");
      return;
    }

    if (!validateInvoiceReady()) {
      setIsInvoiceGenerated(false);
      return;
    }
    const invoiceClient = selectedClient;
    if (!invoiceClient) {
      setError("Select a client before generating invoice.");
      setIsInvoiceGenerated(false);
      return;
    }

    const html = buildPrintableInvoiceHtml({
      invoiceNo,
      invoiceDate,
      dueDate,
      selectedClient: invoiceClient,
      bankAccount: selectedBankAccount || getDefaultBankAccount(bankAccounts),
      lines,
      notes,
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setError("Popup blocked. Please allow popups to print the invoice.");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
    setMessage("Invoice generated. Need changes? Edit the invoice fields and print again.");
  }

  if (!token) {
    return (
      <section className="accent-card p-7">
        <p className="text-sm text-[var(--color-muted)]">Please sign in again to generate invoices.</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="accent-card p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-eyebrow">Finance Invoices</p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
              Generate invoices from joined recruitments.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-muted)]">
              Select a client to pull joined candidates from CRM, review billing values, and create
              a tax invoice for recruitment placements.
            </p>
          </div>
          <div className="rounded-full bg-[rgba(10,118,132,0.08)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-dark)]">
            {totals.count} Fillups
          </div>
        </div>

        {error ? (
          <p className="mt-5 rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-5 rounded-[1rem] border border-[rgba(10,118,132,0.18)] bg-[rgba(10,118,132,0.06)] px-4 py-3 text-sm font-medium text-[var(--color-dark)]">
            {message}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(260px,2fr)_minmax(145px,1fr)_minmax(145px,1fr)_minmax(160px,1fr)_minmax(260px,2fr)]">
          <label className="space-y-1.5">
            <span className="section-eyebrow">Client</span>
            <select
              className={compactSelectClassName}
              value={selectedClientId}
              onChange={(event) => {
                setSelectedClientId(event.target.value);
                setGeneratedInvoiceId("");
                setIsInvoiceGenerated(false);
                setMessage("");
              }}
              disabled={isLoading}
            >
              <option value="">Select onboarded client</option>
              {invoiceToLoad?.clientId === selectedClientId &&
              !visibleClients.some((client) => client.id === selectedClientId) ? (
                <option value={invoiceToLoad.clientId}>{invoiceToLoad.clientName} - Generated invoice</option>
              ) : null}
              {visibleClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName} - Onboarded
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="section-eyebrow">Invoice Date</span>
            <input
              type="date"
              className={compactFieldClassName}
              value={invoiceDate}
              onChange={(event) => {
                setInvoiceDate(event.target.value);
                setDueDate(addDays(event.target.value, 30));
                setInvoiceNo(invoiceNumberFromInvoices(financeInvoices, event.target.value));
                setIsInvoiceGenerated(false);
                setMessage("");
              }}
            />
          </label>
          <label className="space-y-1.5">
            <span className="section-eyebrow">Due Date</span>
            <input
              type="date"
              className={compactFieldClassName}
              value={dueDate}
              onChange={(event) => {
                setDueDate(event.target.value);
                setIsInvoiceGenerated(false);
                setMessage("");
              }}
            />
          </label>
          <label className="space-y-1.5">
            <span className="section-eyebrow">Invoice #</span>
            <input
              className={compactFieldClassName}
              value={invoiceNo}
              onChange={(event) => {
                setInvoiceNo(event.target.value);
                setIsInvoiceGenerated(false);
                setMessage("");
              }}
            />
          </label>
          <label className="space-y-1.5">
            <span className="section-eyebrow">Werkly Bank Account</span>
            <select
              className={compactSelectClassName}
              value={selectedBankAccountId}
              onChange={(event) => {
                setSelectedBankAccountId(event.target.value);
                setIsInvoiceGenerated(false);
                setMessage("");
              }}
            >
              <option value="">
                {bankAccounts.length === 0 ? "Add bank details in Core Finance" : "Select bank account"}
              </option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {formatFinanceBankAccountLabel(account)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="accent-card overflow-hidden p-7">
        <div>
          <div>
            <p className="section-eyebrow">Invoice Items</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
              Joined candidates for selected client
            </h3>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[rgba(10,118,132,0.08)] text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                {[
                  "S.No",
                  "Candidate",
                  "CTC",
                  "DOJ from Stage",
                  "Job Details",
                  "Agreement %",
                  "Taxable",
                  "GST",
                  "Amount",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-white">
              {lines.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-[var(--color-muted)]" colSpan={9}>
                    {selectedClient
                      ? "No joined candidates found for this client yet."
                      : "Select a client to load joined candidate fillups."}
                  </td>
                </tr>
              ) : (
                lines.map((line) => {
                  const taxable = lineTaxableValue(line);
                  const gst = (taxable * gstRate * 2) / 100;
                  const amount = taxable + gst;
                  return (
                    <tr key={line.applicationId} className={!line.selected ? "opacity-55" : ""}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={line.selected}
                          onChange={(event) =>
                            updateLine(line.applicationId, { selected: event.target.checked })
                          }
                          className="h-4 w-4 accent-[var(--color-dark)]"
                        />
                      </td>
                      <td className="px-4 py-4 font-semibold text-[var(--color-ink)]">
                        {line.candidateName}
                      </td>
                      <td className="px-4 py-4">
                        <input
                          className="w-32 rounded-xl border border-[var(--color-border)] px-3 py-2"
                          value={line.ctc}
                          onChange={(event) => updateLine(line.applicationId, { ctc: event.target.value })}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="date"
                          className="w-40 rounded-xl border border-[var(--color-border)] px-3 py-2"
                          value={line.doj}
                          onChange={(event) => updateLine(line.applicationId, { doj: event.target.value })}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          className="w-44 rounded-xl border border-[var(--color-border)] px-3 py-2"
                          value={line.department}
                          onChange={(event) =>
                            updateLine(line.applicationId, { department: event.target.value })
                          }
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          className="w-24 rounded-xl border border-[var(--color-border)] px-3 py-2"
                          value={line.feePercent}
                          onChange={(event) =>
                            updateLine(line.applicationId, { feePercent: event.target.value })
                          }
                        />
                      </td>
                      <td className="px-4 py-4">{formatCurrency(taxable)}</td>
                      <td className="px-4 py-4">{formatCurrency(gst)}</td>
                      <td className="px-4 py-4 font-semibold text-[var(--color-ink)]">
                        {formatCurrency(amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          <label className="space-y-2">
            <span className="section-eyebrow">Payment / Invoice Notes</span>
            <textarea
              className={`${fieldClassName} min-h-[120px] resize-y`}
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setIsInvoiceGenerated(false);
                setMessage("");
              }}
            />
          </label>
          <div className="rounded-[1rem] border border-[var(--color-border)] bg-[rgba(255,252,247,0.8)] p-5">
            <div className="flex justify-between py-2 text-sm">
              <span>Taxable Amount</span>
              <strong>{formatCurrency(totals.taxable)}</strong>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span>CGST 9%</span>
              <strong>{formatCurrency(totals.cgst)}</strong>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span>SGST 9%</span>
              <strong>{formatCurrency(totals.sgst)}</strong>
            </div>
            <div className="mt-3 flex justify-between border-t border-[var(--color-border)] pt-4 text-base">
              <span className="font-semibold">Amount Payable</span>
              <strong>{formatCurrency(totals.total)}</strong>
            </div>
            <div className="mt-5 border-t border-[var(--color-border)] pt-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className={`${compactPrimaryButtonClassName} ${isInvoiceGenerated ? "" : "sm:col-span-2"}`}
                  onClick={() => void handleGenerateInvoice()}
                  disabled={!selectedClient || totals.count === 0}
                >
                  Generate Invoice
                </button>
                {isInvoiceGenerated ? (
                  <button
                    type="button"
                    className={compactSecondaryButtonClassName}
                    onClick={() => generateInvoice()}
                  >
                    Print
                  </button>
                ) : null}
                {isInvoiceGenerated && canDeleteInvoice ? (
                  <button
                    type="button"
                    className={`${compactDangerButtonClassName} sm:col-span-2`}
                    onClick={() => void handleDeleteGeneratedInvoice()}
                  >
                    Delete Invoice
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

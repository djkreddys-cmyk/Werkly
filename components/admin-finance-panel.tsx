"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminClientInvoicesPanel } from "@/components/admin-client-invoices-panel";
import {
  formatFinanceBankAccountLabel,
  hasFinanceStoreData,
  readFinanceStoreRecovery,
  readFinanceStoreFromBackend,
  writeFinanceStoreToBackend,
  type FinanceBankAccountRecord,
  type FinanceExpenditureRecord,
  type FinanceIncomeRecord,
  type FinanceInvoiceRecord,
  type FinanceStore,
} from "@/lib/finance";
import { buildPrintableInvoiceHtml, financeInvoiceToPrintableInvoice } from "@/lib/invoice-print";

type PaymentDraft = {
  paymentStatus: "unpaid" | "partial" | "paid";
  amountReceived: string;
  paymentDate: string;
  paymentMode: string;
  paymentReference: string;
  paymentNotes: string;
  bankAccountId: string;
};

type FinanceForm = {
  date: string;
  source: string;
  category: string;
  amount: string;
  mode: string;
  reference: string;
  notes: string;
  bankAccountId: string;
};

type BankAccountForm = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  openingBalance: string;
  isPrimary: boolean;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseAmount(value: string) {
  const parsed = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function makePaymentDraft(invoice: FinanceInvoiceRecord, defaultBankAccountId = ""): PaymentDraft {
  return {
    paymentStatus: invoice.paymentStatus || "unpaid",
    amountReceived: String(invoice.amountReceived || ""),
    paymentDate: invoice.paymentDate || todayKey(),
    paymentMode: invoice.paymentMode || "Bank Transfer",
    paymentReference: invoice.paymentReference || "",
    paymentNotes: invoice.paymentNotes || "",
    bankAccountId: invoice.bankAccountId || defaultBankAccountId,
  };
}

function emptyFinanceForm(): FinanceForm {
  return {
    date: todayKey(),
    source: "",
    category: "",
    amount: "",
    mode: "Bank Transfer",
    reference: "",
    notes: "",
    bankAccountId: "",
  };
}

function emptyBankAccountForm(): BankAccountForm {
  return {
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
    openingBalance: "",
    isPrimary: false,
  };
}

type FinancePanelView = "core" | "invoices";

export function AdminFinancePanel({ view = "core" }: { view?: FinancePanelView }) {
  const [invoices, setInvoices] = useState<FinanceInvoiceRecord[]>([]);
  const [bankAccounts, setBankAccounts] = useState<FinanceBankAccountRecord[]>([]);
  const [income, setIncome] = useState<FinanceIncomeRecord[]>([]);
  const [expenditure, setExpenditure] = useState<FinanceExpenditureRecord[]>([]);
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentDraft>>({});
  const [incomeForm, setIncomeForm] = useState<FinanceForm>(() => emptyFinanceForm());
  const [expenseForm, setExpenseForm] = useState<FinanceForm>(() => ({
    ...emptyFinanceForm(),
    mode: "UPI",
  }));
  const [bankForm, setBankForm] = useState<BankAccountForm>(() => emptyBankAccountForm());
  const [search, setSearch] = useState("");
  const [token, setToken] = useState("");
  const [authType, setAuthType] = useState("");
  const [authRole, setAuthRole] = useState("");
  const [message, setMessage] = useState("");
  const [invoiceToLoad, setInvoiceToLoad] = useState<FinanceInvoiceRecord | null>(null);
  const [paymentModalInvoiceId, setPaymentModalInvoiceId] = useState("");
  const [editingInvoice, setEditingInvoice] = useState<FinanceInvoiceRecord | null>(null);

  function applyFinanceStore(store: FinanceStore) {
    setInvoices(store.invoices);
    setBankAccounts(store.bankAccounts);
    setIncome(store.income);
    setExpenditure(store.expenditure);
    setPaymentDrafts(
      store.invoices.reduce<Record<string, PaymentDraft>>((drafts, invoice) => {
        const defaultBankAccountId = store.bankAccounts.find((account) => account.isPrimary)?.id || store.bankAccounts[0]?.id || "";
        drafts[invoice.id] = makePaymentDraft(invoice, defaultBankAccountId);
        return drafts;
      }, {})
    );
  }

  function currentFinanceStore(): FinanceStore {
    return { invoices, bankAccounts, income, expenditure };
  }

  async function refreshFinanceData(nextMessage?: string) {
    try {
      const store = await readFinanceStoreFromBackend(token || window.localStorage.getItem("werklyAdminToken") || "");
      applyFinanceStore(store);
      if (!hasFinanceStoreData(store)) {
        const localStore = readFinanceStoreRecovery();
        if (hasFinanceStoreData(localStore)) {
          const migratedStore = await writeFinanceStoreToBackend(localStore, token || window.localStorage.getItem("werklyAdminToken") || "");
          applyFinanceStore(migratedStore);
        }
      }
      if (nextMessage) {
        setMessage(nextMessage);
      }
    } catch (error) {
      const fallbackStore = readFinanceStoreRecovery();
      applyFinanceStore(fallbackStore);
      setMessage(error instanceof Error ? error.message : "Unable to load finance records.");
    }
  }

  async function persistFinanceStore(store: FinanceStore, nextMessage: string) {
    try {
      const savedStore = await writeFinanceStoreToBackend(store, token || window.localStorage.getItem("werklyAdminToken") || "");
      applyFinanceStore(savedStore);
      setMessage(nextMessage);
    } catch (error) {
      applyFinanceStore(store);
      setMessage(error instanceof Error ? error.message : "Unable to save finance records.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextToken = window.localStorage.getItem("werklyAdminToken") ?? "";
      setToken(nextToken);
      void refreshFinanceData();
      setAuthType(window.localStorage.getItem("werklyAuthType") ?? "");
      setAuthRole(window.localStorage.getItem("werklyAuthRole") ?? "");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const canDeleteInvoice =
    authType === "admin" || String(authRole).trim().toLowerCase() === "super-admin";

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return invoices;
    }

    return invoices.filter((invoice) =>
      [
        invoice.invoiceNo,
        invoice.clientName,
        invoice.clientGstNumber,
        invoice.clientPanNumber,
        invoice.lines.map((line) => line.candidateName).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [invoices, search]);

  const totals = useMemo(() => {
    const invoiceTotal = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const invoiceReceived = invoices.reduce((sum, invoice) => sum + (invoice.amountReceived || 0), 0);
    const incomeTotal = income.reduce((sum, item) => sum + item.amount, 0);
    const expenseTotal = expenditure.reduce((sum, item) => sum + item.amount, 0);
    const bankOpening = bankAccounts.reduce((sum, account) => sum + account.openingBalance, 0);
    return {
      invoices: invoices.length,
      candidates: invoices.reduce((sum, invoice) => sum + invoice.lines.length, 0),
      invoiceTotal,
      invoiceReceived,
      outstanding: Math.max(0, invoiceTotal - invoiceReceived),
      incomeTotal,
      expenseTotal,
      net: incomeTotal - expenseTotal,
      bankBalance: bankOpening + incomeTotal - expenseTotal,
    };
  }, [bankAccounts, expenditure, income, invoices]);

  const primaryBankAccountId = bankAccounts.find((account) => account.isPrimary)?.id || bankAccounts[0]?.id || "";

  const bankAccountTotals = useMemo(
    () =>
      bankAccounts.map((account) => {
        const accountIncome = income
          .filter((item) => item.bankAccountId === account.id)
          .reduce((sum, item) => sum + item.amount, 0);
        const accountExpense = expenditure
          .filter((item) => item.bankAccountId === account.id)
          .reduce((sum, item) => sum + item.amount, 0);
        return {
          ...account,
          income: accountIncome,
          expenditure: accountExpense,
          balance: account.openingBalance + accountIncome - accountExpense,
        };
      }),
    [bankAccounts, expenditure, income]
  );

  function updatePaymentDraft(invoiceId: string, patch: Partial<PaymentDraft>) {
    setPaymentDrafts((current) => ({
      ...current,
      [invoiceId]: {
        ...(current[invoiceId] || makePaymentDraft(invoices.find((invoice) => invoice.id === invoiceId)!, primaryBankAccountId)),
        ...patch,
      },
    }));
  }

  function handlePaymentStatusChange(invoice: FinanceInvoiceRecord, paymentStatus: PaymentDraft["paymentStatus"]) {
    if (paymentStatus === "paid") {
      updatePaymentDraft(invoice.id, {
        paymentStatus,
        amountReceived: String(invoice.total),
        paymentDate: todayKey(),
        bankAccountId: invoice.bankAccountId || primaryBankAccountId,
      });
      setPaymentModalInvoiceId(invoice.id);
      return;
    }

    updatePaymentDraft(invoice.id, {
      paymentStatus,
      amountReceived: "",
      paymentReference: "",
      paymentNotes: "",
    });
  }

  function handleSavePayment(invoice: FinanceInvoiceRecord) {
    const draft = paymentDrafts[invoice.id] || makePaymentDraft(invoice, primaryBankAccountId);
    const amountReceived =
      draft.paymentStatus === "paid" ? Math.min(parseAmount(draft.amountReceived) || invoice.total, invoice.total) : 0;
    const paymentStatus = draft.paymentStatus === "paid" ? "paid" : draft.paymentStatus;
    const updatedInvoice: FinanceInvoiceRecord = {
      ...invoice,
      paymentStatus,
      amountReceived,
      paymentDate: draft.paymentDate || todayKey(),
      paymentMode: draft.paymentMode,
      paymentReference: draft.paymentReference,
      paymentNotes: draft.paymentNotes,
      bankAccountId: draft.bankAccountId || primaryBankAccountId,
    };
    const nextInvoices = [updatedInvoice, ...invoices.filter((item) => item.id !== invoice.id)];

    const incomeId = `invoice-income-${invoice.id}`;
    let nextIncome = income.filter((item) => item.id !== incomeId);
    if (amountReceived > 0) {
      const existingIncome = income.find((item) => item.id === incomeId);
      nextIncome = [
        {
        id: incomeId,
        date: updatedInvoice.paymentDate || todayKey(),
        source: updatedInvoice.clientName,
        category: "Invoice Payment",
        amount: amountReceived,
        mode: updatedInvoice.paymentMode || "Bank Transfer",
        reference: updatedInvoice.paymentReference || updatedInvoice.invoiceNo,
        notes: updatedInvoice.paymentNotes || `Payment against invoice ${updatedInvoice.invoiceNo}`,
        bankAccountId: updatedInvoice.bankAccountId || primaryBankAccountId,
        invoiceId: updatedInvoice.id,
        invoiceNo: updatedInvoice.invoiceNo,
        clientName: updatedInvoice.clientName,
        createdAt: existingIncome?.createdAt || new Date().toISOString(),
        },
        ...nextIncome,
      ];
    }

    void persistFinanceStore(
      { ...currentFinanceStore(), invoices: nextInvoices, income: nextIncome },
      `Payment details saved for invoice ${invoice.invoiceNo}.`
    );
    setPaymentModalInvoiceId("");
  }

  function handleDelete(invoice: FinanceInvoiceRecord) {
    if (!canDeleteInvoice) {
      setMessage("Only admin users can delete generated invoices.");
      return;
    }

    const confirmed = window.confirm(`Delete generated invoice "${invoice.invoiceNo}" from Finance?`);
    if (!confirmed) {
      return;
    }

    void persistFinanceStore(
      {
        ...currentFinanceStore(),
        invoices: invoices.filter((item) => item.id !== invoice.id),
        income: income.filter((item) => item.id !== `invoice-income-${invoice.id}`),
      },
      `Invoice ${invoice.invoiceNo} deleted from Finance.`
    );
  }

  function handlePrint(invoice: FinanceInvoiceRecord) {
    const html = buildPrintableInvoiceHtml(financeInvoiceToPrintableInvoice(invoice, bankAccounts));
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setMessage("Popup blocked. Please allow popups to print the invoice.");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
    setMessage(`Invoice ${invoice.invoiceNo} opened for printing.`);
  }

  function handleLoadInvoice(invoice: FinanceInvoiceRecord) {
    setEditingInvoice({ ...invoice, lines: invoice.lines.map((line) => ({ ...line })) });
    setMessage("");
  }

  function updateEditingInvoice(patch: Partial<FinanceInvoiceRecord>) {
    setEditingInvoice((current) => (current ? { ...current, ...patch } : current));
  }

  function updateEditingInvoiceLine(index: number, patch: Partial<FinanceInvoiceRecord["lines"][number]>) {
    setEditingInvoice((current) =>
      current
        ? {
            ...current,
            lines: current.lines.map((line, lineIndex) =>
              lineIndex === index ? { ...line, ...patch } : line
            ),
          }
        : current
    );
  }

  function recalculateInvoice(invoice: FinanceInvoiceRecord): FinanceInvoiceRecord {
    const lines = invoice.lines.map((line) => {
      const taxable = (parseAmount(line.ctc) * Number(line.feePercent || 0)) / 100;
      const cgst = (taxable * 9) / 100;
      const sgst = (taxable * 9) / 100;
      return {
        ...line,
        taxable,
        cgst,
        sgst,
        amount: taxable + cgst + sgst,
      };
    });
    const taxable = lines.reduce((sum, line) => sum + line.taxable, 0);
    const cgst = lines.reduce((sum, line) => sum + line.cgst, 0);
    const sgst = lines.reduce((sum, line) => sum + line.sgst, 0);
    return {
      ...invoice,
      lines,
      taxable,
      cgst,
      sgst,
      total: Math.round(taxable + cgst + sgst),
    };
  }

  function handleUpdateInvoice() {
    if (!editingInvoice) {
      return;
    }

    const updatedInvoice = recalculateInvoice(editingInvoice);
    const nextInvoices = [
      updatedInvoice,
      ...invoices.filter((invoice) => invoice.id !== updatedInvoice.id),
    ];
    void persistFinanceStore(
      { ...currentFinanceStore(), invoices: nextInvoices },
      `Invoice ${updatedInvoice.invoiceNo} updated.`
    );
    setEditingInvoice(null);
  }

  function handleAddIncome() {
    const amount = parseAmount(incomeForm.amount);
    if (!incomeForm.source.trim() || amount <= 0) {
      setMessage("Add an income source and amount before saving.");
      return;
    }

    void persistFinanceStore(
      {
        ...currentFinanceStore(),
        income: [
          {
      id: `income-${Date.now()}`,
      date: incomeForm.date || todayKey(),
      source: incomeForm.source.trim(),
      category: incomeForm.category.trim() || "General Income",
      amount,
      mode: incomeForm.mode,
      reference: incomeForm.reference.trim(),
      notes: incomeForm.notes.trim(),
      bankAccountId: incomeForm.bankAccountId || primaryBankAccountId,
      createdAt: new Date().toISOString(),
          },
          ...income,
        ],
      },
      "Income record saved."
    );
    setIncomeForm(emptyFinanceForm());
  }

  function handleAddExpense() {
    const amount = parseAmount(expenseForm.amount);
    if (!expenseForm.source.trim() || amount <= 0) {
      setMessage("Add a vendor/payee and amount before saving expenditure.");
      return;
    }

    void persistFinanceStore(
      {
        ...currentFinanceStore(),
        expenditure: [
          {
      id: `expense-${Date.now()}`,
      date: expenseForm.date || todayKey(),
      vendor: expenseForm.source.trim(),
      category: expenseForm.category.trim() || "General Expense",
      amount,
      mode: expenseForm.mode,
      reference: expenseForm.reference.trim(),
      notes: expenseForm.notes.trim(),
      bankAccountId: expenseForm.bankAccountId || primaryBankAccountId,
      createdAt: new Date().toISOString(),
          },
          ...expenditure,
        ],
      },
      "Expenditure record saved."
    );
    setExpenseForm({ ...emptyFinanceForm(), mode: "UPI" });
  }

  function updateIncomeForm(patch: Partial<FinanceForm>) {
    setIncomeForm((current) => ({ ...current, ...patch }));
  }

  function updateExpenseForm(patch: Partial<FinanceForm>) {
    setExpenseForm((current) => ({ ...current, ...patch }));
  }

  function updateBankForm(patch: Partial<BankAccountForm>) {
    setBankForm((current) => ({ ...current, ...patch }));
  }

  function handleAddBankAccount() {
    if (!bankForm.accountName.trim() || !bankForm.bankName.trim() || !bankForm.accountNumber.trim()) {
      setMessage("Add account name, bank name, and account number before saving bank details.");
      return;
    }

    const nextRecord: FinanceBankAccountRecord = {
      id: `bank-${Date.now()}`,
      accountName: bankForm.accountName.trim(),
      bankName: bankForm.bankName.trim(),
      accountNumber: bankForm.accountNumber.trim(),
      ifscCode: bankForm.ifscCode.trim(),
      branch: bankForm.branch.trim(),
      openingBalance: parseAmount(bankForm.openingBalance),
      isPrimary: bankForm.isPrimary || bankAccounts.length === 0,
      createdAt: new Date().toISOString(),
    };
    const nextBankAccounts = [
      nextRecord,
      ...(nextRecord.isPrimary ? bankAccounts.map((account) => ({ ...account, isPrimary: false })) : bankAccounts),
    ];
    void persistFinanceStore(
      { ...currentFinanceStore(), bankAccounts: nextBankAccounts },
      "Werkly bank account saved."
    );
    setBankForm(emptyBankAccountForm());
  }

  const isCoreView = view === "core";
  const isInvoicesView = view === "invoices";
  const paymentModalInvoice = paymentModalInvoiceId
    ? invoices.find((invoice) => invoice.id === paymentModalInvoiceId)
    : undefined;
  const paymentModalDraft = paymentModalInvoice
    ? paymentDrafts[paymentModalInvoice.id] || makePaymentDraft(paymentModalInvoice, primaryBankAccountId)
    : undefined;
  const editingInvoicePreview = editingInvoice ? recalculateInvoice(editingInvoice) : undefined;

  return (
    <div className="space-y-6">
      {isInvoicesView ? (
        <AdminClientInvoicesPanel
          invoiceToLoad={invoiceToLoad}
          onFinanceInvoiceChange={() => {
            void refreshFinanceData("Invoice register updated.");
          }}
        />
      ) : null}

      {!isCoreView && message ? (
        <p className="rounded-[1rem] border border-[rgba(10,118,132,0.18)] bg-[rgba(10,118,132,0.06)] px-4 py-3 text-sm font-medium text-[var(--color-dark)]">
          {message}
        </p>
      ) : null}

      {isCoreView ? (
      <section className="accent-card p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-eyebrow">Finance</p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
              Core finance overview.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-muted)]">
              Review invoice receivables, bank balances, income, expenditure, and net position.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => {
            void refreshFinanceData("Finance records refreshed.");
          }}>
            Refresh
          </button>
        </div>

        {message ? (
          <p className="mt-5 rounded-[1rem] border border-[rgba(10,118,132,0.18)] bg-[rgba(10,118,132,0.06)] px-4 py-3 text-sm font-medium text-[var(--color-dark)]">
            {message}
          </p>
        ) : null}

        <div className="mt-7 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Invoices", String(totals.invoices)],
            ["Invoice Value", formatCurrency(totals.invoiceTotal)],
            ["Received", formatCurrency(totals.invoiceReceived)],
            ["Outstanding", formatCurrency(totals.outstanding)],
            ["Bank Balance", formatCurrency(totals.bankBalance)],
            ["Expenditure", formatCurrency(totals.expenseTotal)],
            ["Net Balance", formatCurrency(totals.net)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1rem] border border-[var(--color-border)] bg-white p-5">
              <p className="section-eyebrow">{label}</p>
              <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">{value}</p>
            </div>
          ))}
        </div>
      </section>
      ) : null}

      {isCoreView ? (
        <>
      <section className="accent-card p-7">
        <p className="section-eyebrow">Werkly Bank Details</p>
        <h3 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">Add bank account</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="Account name" value={bankForm.accountName} onChange={(event) => updateBankForm({ accountName: event.target.value })} />
          <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="Bank name" value={bankForm.bankName} onChange={(event) => updateBankForm({ bankName: event.target.value })} />
          <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="Account number" value={bankForm.accountNumber} onChange={(event) => updateBankForm({ accountNumber: event.target.value })} />
          <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="IFSC code" value={bankForm.ifscCode} onChange={(event) => updateBankForm({ ifscCode: event.target.value })} />
          <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="Branch" value={bankForm.branch} onChange={(event) => updateBankForm({ branch: event.target.value })} />
          <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="Opening balance" inputMode="decimal" value={bankForm.openingBalance} onChange={(event) => updateBankForm({ openingBalance: event.target.value })} />
          <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <input type="checkbox" checked={bankForm.isPrimary} onChange={(event) => updateBankForm({ isPrimary: event.target.checked })} />
            Primary account
          </label>
        </div>
        <button type="button" className="mt-4 rounded-full bg-[var(--color-dark)] px-5 py-2.5 text-sm font-semibold text-white" onClick={handleAddBankAccount}>
          Save Bank Details
        </button>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {bankAccountTotals.length === 0 ? (
            <p className="rounded-[1rem] border border-dashed border-[var(--color-border)] bg-[var(--color-soft)] p-5 text-sm text-[var(--color-muted)]">No bank accounts added yet.</p>
          ) : (
            bankAccountTotals.map((account) => (
              <div key={account.id} className="rounded-[1rem] border border-[var(--color-border)] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">{account.accountName}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{account.bankName} | {account.accountNumber}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">IFSC {account.ifscCode || "-"} | {account.branch || "-"}</p>
                  </div>
                  {account.isPrimary ? <span className="rounded-full bg-[rgba(10,118,132,0.1)] px-3 py-1 text-xs font-semibold text-[var(--color-dark)]">Primary</span> : null}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div><p className="section-eyebrow">Income</p><strong>{formatCurrency(account.income)}</strong></div>
                  <div><p className="section-eyebrow">Expense</p><strong>{formatCurrency(account.expenditure)}</strong></div>
                  <div><p className="section-eyebrow">Balance</p><strong>{formatCurrency(account.balance)}</strong></div>
                </div>
                <button type="button" className="mt-4 text-sm font-semibold text-red-700" onClick={() => {
                  void persistFinanceStore(
                    { ...currentFinanceStore(), bankAccounts: bankAccounts.filter((item) => item.id !== account.id) },
                    "Werkly bank account deleted."
                  );
                }}>
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="accent-card p-7">
          <p className="section-eyebrow">Income</p>
          <h3 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">Add income record</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" type="date" value={incomeForm.date} onChange={(event) => updateIncomeForm({ date: event.target.value })} />
            <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="Source / Client" value={incomeForm.source} onChange={(event) => updateIncomeForm({ source: event.target.value })} />
            <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="Category" value={incomeForm.category} onChange={(event) => updateIncomeForm({ category: event.target.value })} />
            <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="Amount" inputMode="decimal" value={incomeForm.amount} onChange={(event) => updateIncomeForm({ amount: event.target.value })} />
            <select className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" value={incomeForm.mode} onChange={(event) => updateIncomeForm({ mode: event.target.value })}>
              <option>Bank Transfer</option>
              <option>UPI</option>
              <option>Cash</option>
              <option>Cheque</option>
              <option>Card</option>
            </select>
            <select className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" value={incomeForm.bankAccountId} onChange={(event) => updateIncomeForm({ bankAccountId: event.target.value })}>
              <option value="">Select bank account</option>
              {bankAccounts.map((account) => <option key={account.id} value={account.id}>{formatFinanceBankAccountLabel(account)}</option>)}
            </select>
            <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="Reference" value={incomeForm.reference} onChange={(event) => updateIncomeForm({ reference: event.target.value })} />
            <textarea className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm md:col-span-2" placeholder="Notes" value={incomeForm.notes} onChange={(event) => updateIncomeForm({ notes: event.target.value })} />
          </div>
          <button type="button" className="mt-4 rounded-full bg-[var(--color-dark)] px-5 py-2.5 text-sm font-semibold text-white" onClick={handleAddIncome}>
            Save Income
          </button>
        </div>

        <div className="accent-card p-7">
          <p className="section-eyebrow">Expenditure</p>
          <h3 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">Add expenditure record</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" type="date" value={expenseForm.date} onChange={(event) => updateExpenseForm({ date: event.target.value })} />
            <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="Vendor / Payee" value={expenseForm.source} onChange={(event) => updateExpenseForm({ source: event.target.value })} />
            <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="Category" value={expenseForm.category} onChange={(event) => updateExpenseForm({ category: event.target.value })} />
            <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="Amount" inputMode="decimal" value={expenseForm.amount} onChange={(event) => updateExpenseForm({ amount: event.target.value })} />
            <select className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" value={expenseForm.mode} onChange={(event) => updateExpenseForm({ mode: event.target.value })}>
              <option>UPI</option>
              <option>Bank Transfer</option>
              <option>Cash</option>
              <option>Cheque</option>
              <option>Card</option>
            </select>
            <select className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" value={expenseForm.bankAccountId} onChange={(event) => updateExpenseForm({ bankAccountId: event.target.value })}>
              <option value="">Select bank account</option>
              {bankAccounts.map((account) => <option key={account.id} value={account.id}>{formatFinanceBankAccountLabel(account)}</option>)}
            </select>
            <input className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm" placeholder="Reference" value={expenseForm.reference} onChange={(event) => updateExpenseForm({ reference: event.target.value })} />
            <textarea className="rounded-[1rem] border border-[var(--color-border)] px-4 py-3 text-sm md:col-span-2" placeholder="Notes" value={expenseForm.notes} onChange={(event) => updateExpenseForm({ notes: event.target.value })} />
          </div>
          <button type="button" className="mt-4 rounded-full bg-[var(--color-dark)] px-5 py-2.5 text-sm font-semibold text-white" onClick={handleAddExpense}>
            Save Expenditure
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <FinanceRecordTable
          title="Income Records"
          records={income.map((record) => ({ ...record, accountName: bankAccounts.find((account) => account.id === record.bankAccountId)?.accountName || "-" }))}
          emptyText="No income records yet."
          onDelete={(id) => {
            void persistFinanceStore(
              { ...currentFinanceStore(), income: income.filter((item) => item.id !== id) },
              "Income record deleted."
            );
          }}
        />
        <FinanceRecordTable
          title="Expenditure Records"
          records={expenditure.map((record) => ({ ...record, source: record.vendor, accountName: bankAccounts.find((account) => account.id === record.bankAccountId)?.accountName || "-" }))}
          emptyText="No expenditure records yet."
          onDelete={(id) => {
            void persistFinanceStore(
              { ...currentFinanceStore(), expenditure: expenditure.filter((item) => item.id !== id) },
              "Expenditure record deleted."
            );
          }}
        />
      </section>
        </>
      ) : null}

      {isInvoicesView ? (
      <section className="accent-card p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow">Invoice Payments</p>
            <h3 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">Receivables register</h3>
          </div>
          <label className="w-full max-w-md space-y-2">
            <span className="section-eyebrow">Search</span>
            <input className="w-full rounded-[1rem] border border-[var(--color-border)] bg-white px-4 py-3 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice, client, GST, PAN, candidate" />
          </label>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="mt-6 rounded-[1rem] border border-dashed border-[var(--color-border)] bg-[var(--color-soft)] p-8 text-center">
            <p className="font-semibold text-[var(--color-ink)]">No finance invoices yet.</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Generate an invoice above and it will appear here automatically.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredInvoices.map((invoice) => {
              const draft = paymentDrafts[invoice.id] || makePaymentDraft(invoice, primaryBankAccountId);
              return (
                <div key={invoice.id} className="rounded-[1rem] border border-[var(--color-border)] bg-white p-4">
                  <div className="grid items-center gap-4 xl:grid-cols-[minmax(260px,1fr)_minmax(420px,1.35fr)_auto]">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-ink)]">{invoice.invoiceNo}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{invoice.clientName}</p>
                      <p className="mt-2 text-xs text-[var(--color-muted)]">Invoice: {formatDate(invoice.invoiceDate)} | Due: {formatDate(invoice.dueDate)}</p>
                      <p className="mt-3 text-lg font-semibold text-[var(--color-ink)]">{formatCurrency(invoice.total)}</p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center">
                      <select className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm md:w-40" value={draft.paymentStatus} onChange={(event) => handlePaymentStatusChange(invoice, event.target.value as PaymentDraft["paymentStatus"])}>
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                      </select>
                      <div className="flex min-h-10 flex-1 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-soft)] px-3 text-sm text-[var(--color-muted)]">
                        {draft.paymentStatus === "paid"
                          ? `Paid ${formatCurrency(parseAmount(draft.amountReceived) || invoice.total)}${draft.paymentReference ? ` | ${draft.paymentReference}` : ""}`
                          : "Transaction details open only after selecting Paid."}
                      </div>
                      {draft.paymentStatus === "paid" ? (
                        <button type="button" className="h-10 shrink-0 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]" onClick={() => setPaymentModalInvoiceId(invoice.id)}>
                          Edit Transaction
                        </button>
                      ) : null}
                    </div>
                    <div className="flex min-w-[250px] flex-wrap items-center gap-2 xl:justify-end">
                      <button type="button" className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]" onClick={() => handleLoadInvoice(invoice)}>Edit Invoice</button>
                      <button type="button" className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]" onClick={() => handleSavePayment(invoice)}>
                        {draft.paymentStatus === "paid" ? "Save Payment" : "Save Status"}
                      </button>
                      <button type="button" className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]" onClick={() => handlePrint(invoice)}>Print</button>
                      {canDeleteInvoice ? (
                        <button type="button" className="h-10 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100" onClick={() => handleDelete(invoice)}>Delete</button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      ) : null}
      {paymentModalInvoice && paymentModalDraft ? (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-2xl rounded-[1.5rem] border border-[var(--color-border)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-eyebrow">Transaction Details</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                  Invoice {paymentModalInvoice.invoiceNo}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{paymentModalInvoice.clientName}</p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setPaymentModalInvoiceId("")}>
                Close
              </button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input className="rounded-[1rem] border border-[var(--color-border)] px-3 py-2 text-sm" placeholder="Amount received" inputMode="decimal" value={paymentModalDraft.amountReceived} onChange={(event) => updatePaymentDraft(paymentModalInvoice.id, { amountReceived: event.target.value })} />
              <input className="rounded-[1rem] border border-[var(--color-border)] px-3 py-2 text-sm" type="date" value={paymentModalDraft.paymentDate} onChange={(event) => updatePaymentDraft(paymentModalInvoice.id, { paymentDate: event.target.value })} />
              <select className="rounded-[1rem] border border-[var(--color-border)] px-3 py-2 text-sm" value={paymentModalDraft.paymentMode} onChange={(event) => updatePaymentDraft(paymentModalInvoice.id, { paymentMode: event.target.value })}>
                <option>Bank Transfer</option>
                <option>UPI</option>
                <option>Cash</option>
                <option>Cheque</option>
                <option>Card</option>
              </select>
              <select className="rounded-[1rem] border border-[var(--color-border)] px-3 py-2 text-sm" value={paymentModalDraft.bankAccountId} onChange={(event) => updatePaymentDraft(paymentModalInvoice.id, { bankAccountId: event.target.value })}>
                <option value="">Select bank account</option>
                {bankAccounts.map((account) => <option key={account.id} value={account.id}>{formatFinanceBankAccountLabel(account)}</option>)}
              </select>
              <input className="rounded-[1rem] border border-[var(--color-border)] px-3 py-2 text-sm" placeholder="Transaction reference" value={paymentModalDraft.paymentReference} onChange={(event) => updatePaymentDraft(paymentModalInvoice.id, { paymentReference: event.target.value })} />
              <input className="rounded-[1rem] border border-[var(--color-border)] px-3 py-2 text-sm" placeholder="Payment notes" value={paymentModalDraft.paymentNotes} onChange={(event) => updatePaymentDraft(paymentModalInvoice.id, { paymentNotes: event.target.value })} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setPaymentModalInvoiceId("")}>Cancel</button>
              <button type="button" className="rounded-full bg-[var(--color-dark)] px-5 py-2.5 text-sm font-semibold text-white" onClick={() => handleSavePayment(paymentModalInvoice)}>
                Save Transaction
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editingInvoice && editingInvoicePreview ? (
        <div className="fixed inset-0 z-[180] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4">
          <div className="my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-border)] p-6">
              <div>
                <p className="section-eyebrow">Edit Invoice</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                  Invoice {editingInvoice.invoiceNo}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{editingInvoice.clientName}</p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setEditingInvoice(null)}>
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="grid gap-3 md:grid-cols-4">
                <label className="space-y-1.5">
                  <span className="section-eyebrow">Invoice #</span>
                  <input className="h-10 w-full rounded-xl border border-[var(--color-border)] px-3 text-sm" value={editingInvoice.invoiceNo} onChange={(event) => updateEditingInvoice({ invoiceNo: event.target.value })} />
                </label>
                <label className="space-y-1.5">
                  <span className="section-eyebrow">Invoice Date</span>
                  <input className="h-10 w-full rounded-xl border border-[var(--color-border)] px-3 text-sm" type="date" value={editingInvoice.invoiceDate} onChange={(event) => updateEditingInvoice({ invoiceDate: event.target.value })} />
                </label>
                <label className="space-y-1.5">
                  <span className="section-eyebrow">Due Date</span>
                  <input className="h-10 w-full rounded-xl border border-[var(--color-border)] px-3 text-sm" type="date" value={editingInvoice.dueDate} onChange={(event) => updateEditingInvoice({ dueDate: event.target.value })} />
                </label>
                <label className="space-y-1.5">
                  <span className="section-eyebrow">Bank Account</span>
                  <select className="h-10 w-full rounded-xl border border-[var(--color-border)] px-3 text-sm" value={editingInvoice.bankAccountId || ""} onChange={(event) => updateEditingInvoice({ bankAccountId: event.target.value })}>
                    <option value="">Select bank account</option>
                    {bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>{formatFinanceBankAccountLabel(account)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 block space-y-1.5">
                <span className="section-eyebrow">Notes</span>
                <textarea className="min-h-20 w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" value={editingInvoice.notes} onChange={(event) => updateEditingInvoice({ notes: event.target.value })} />
              </label>

              <div className="mt-5 overflow-x-auto rounded-[1rem] border border-[var(--color-border)]">
                <table className="min-w-[980px] w-full text-left text-sm">
                  <thead className="bg-[var(--color-soft)] text-[0.66rem] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    <tr>
                      {["Candidate", "CTC", "DOJ", "Job Details", "Agreement %", "Taxable", "GST", "Amount"].map((heading) => (
                        <th key={heading} className="px-3 py-3">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {editingInvoice.lines.map((line, index) => {
                      const taxable = (parseAmount(line.ctc) * Number(line.feePercent || 0)) / 100;
                      const gst = (taxable * 18) / 100;
                      return (
                        <tr key={`${line.applicationId}-${index}`}>
                          <td className="px-3 py-3">
                            <input className="w-44 rounded-lg border border-[var(--color-border)] px-2 py-2" value={line.candidateName} onChange={(event) => updateEditingInvoiceLine(index, { candidateName: event.target.value })} />
                          </td>
                          <td className="px-3 py-3">
                            <input className="w-32 rounded-lg border border-[var(--color-border)] px-2 py-2" value={line.ctc} onChange={(event) => updateEditingInvoiceLine(index, { ctc: event.target.value })} />
                          </td>
                          <td className="px-3 py-3">
                            <input className="w-36 rounded-lg border border-[var(--color-border)] px-2 py-2" type="date" value={line.doj} onChange={(event) => updateEditingInvoiceLine(index, { doj: event.target.value })} />
                          </td>
                          <td className="px-3 py-3">
                            <input className="w-48 rounded-lg border border-[var(--color-border)] px-2 py-2" value={line.department} onChange={(event) => updateEditingInvoiceLine(index, { department: event.target.value })} />
                          </td>
                          <td className="px-3 py-3">
                            <input className="w-24 rounded-lg border border-[var(--color-border)] px-2 py-2" value={line.feePercent} onChange={(event) => updateEditingInvoiceLine(index, { feePercent: event.target.value })} />
                          </td>
                          <td className="px-3 py-3">{formatCurrency(taxable)}</td>
                          <td className="px-3 py-3">{formatCurrency(gst)}</td>
                          <td className="px-3 py-3 font-semibold text-[var(--color-ink)]">{formatCurrency(taxable + gst)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-[var(--color-border)] p-4">
                  <p className="section-eyebrow">Taxable</p>
                  <p className="mt-2 font-semibold">{formatCurrency(editingInvoicePreview.taxable)}</p>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] p-4">
                  <p className="section-eyebrow">CGST</p>
                  <p className="mt-2 font-semibold">{formatCurrency(editingInvoicePreview.cgst)}</p>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] p-4">
                  <p className="section-eyebrow">SGST</p>
                  <p className="mt-2 font-semibold">{formatCurrency(editingInvoicePreview.sgst)}</p>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] p-4">
                  <p className="section-eyebrow">Total</p>
                  <p className="mt-2 font-semibold">{formatCurrency(editingInvoicePreview.total)}</p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--color-border)] p-5">
              <button type="button" className="btn-secondary" onClick={() => setEditingInvoice(null)}>Cancel</button>
              <button type="button" className="rounded-full bg-[var(--color-dark)] px-5 py-2.5 text-sm font-semibold text-white" onClick={handleUpdateInvoice}>
                Update Invoice
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FinanceRecordTable({
  title,
  records,
  emptyText,
  onDelete,
}: {
  title: string;
  records: Array<(FinanceIncomeRecord | FinanceExpenditureRecord) & { source: string; accountName?: string }>;
  emptyText: string;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="accent-card overflow-hidden p-7">
      <p className="section-eyebrow">{title}</p>
      {records.length === 0 ? (
        <p className="mt-5 rounded-[1rem] border border-dashed border-[var(--color-border)] bg-[var(--color-soft)] p-5 text-sm text-[var(--color-muted)]">{emptyText}</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-soft)] text-left text-[0.66rem] uppercase tracking-[0.22em] text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Bank Account</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Mode</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-white">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-3 py-3">{formatDate(record.date)}</td>
                  <td className="px-3 py-3 font-semibold text-[var(--color-ink)]">{record.source}</td>
                  <td className="px-3 py-3">{record.accountName || "-"}</td>
                  <td className="px-3 py-3">{record.category}</td>
                  <td className="px-3 py-3 font-semibold text-[var(--color-ink)]">{formatCurrency(record.amount)}</td>
                  <td className="px-3 py-3">{record.mode}</td>
                  <td className="px-3 py-3">
                    {"invoiceId" in record && record.invoiceId ? (
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                        Invoice
                      </span>
                    ) : (
                      <button type="button" className="text-sm font-semibold text-red-700" onClick={() => onDelete(record.id)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

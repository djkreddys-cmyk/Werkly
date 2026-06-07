"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClientRecord } from "@/lib/crm";
import type { JobApplication, JobSummary } from "@/lib/jobs";
import { removeFinanceInvoice, upsertFinanceInvoice } from "@/lib/finance";
import { formatPersonName } from "@/lib/format";

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

const selectClassName = `${fieldClassName} appearance-none pr-10`;
const gstRate = 9;
const werklyLegalDetails = {
  legalName: "Werkly Consulting (OPC) Private Limited",
  gstNumber: "37AAECW4103F1ZL",
  panNumber: "AAECW4103F",
  address:
    "Building No./Flat No: 2-155, Veerapanenigudem, Peerla Punja Centre, Near Veerapanenigudem Branch Post Office, Gannavaram Mandal, Veerapanenigudem, Krishna Dist, Andhra Pradesh - 521286",
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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

function invoiceNumber() {
  const date = new Date();
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `INV-${year}${month}${day}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function amountInWords(amount: number) {
  return `${formatCurrency(Math.round(amount)).replace("₹", "INR ")} Only`;
}

function escapePdfText(value: string) {
  return String(value || "")
    .replace(/[₹]/g, "INR")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\s+/g, " ")
    .trim();
}

function safePdfCurrency(value: number) {
  return formatCurrency(value).replace("â‚¹", "INR ");
}

function formatInrText(value: number) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)}`;
}

function buildInvoicePdfBytes(params: {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  selectedClient: ClientRecord;
  lines: InvoiceLine[];
  notes: string;
}) {
  const selectedLines = params.lines.filter((line) => line.selected);
  const taxable = selectedLines.reduce((sum, line) => sum + lineTaxableValue(line), 0);
  const cgst = (taxable * gstRate) / 100;
  const sgst = (taxable * gstRate) / 100;
  const total = Math.round(taxable + cgst + sgst);
  const content: string[] = [];

  function text(x: number, y: number, size: number, value: string, font = "F1") {
    content.push(`BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`);
  }

  function line(x1: number, y1: number, x2: number, y2: number) {
    content.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  }

  text(40, 800, 14, werklyLegalDetails.legalName, "F2");
  text(40, 782, 8, werklyLegalDetails.address.slice(0, 95));
  text(40, 766, 9, `GST: ${werklyLegalDetails.gstNumber} | PAN: ${werklyLegalDetails.panNumber} | hr@werkly.in`);
  text(390, 800, 10, `Invoice #: ${params.invoiceNo}`, "F2");
  text(390, 784, 10, `Date: ${formatDate(params.invoiceDate)}`);
  text(390, 768, 10, `Due Date: ${formatDate(params.dueDate)}`);
  line(40, 750, 555, 750);
  text(235, 735, 16, "TAX INVOICE", "F2");
  text(40, 710, 10, "Customer Details", "F2");
  text(40, 694, 11, params.selectedClient.companyName, "F2");
  text(40, 678, 9, params.selectedClient.communicationAddress || params.selectedClient.branch || "Billing address not added");
  text(40, 662, 9, params.selectedClient.contactEmail || "");
  text(40, 646, 9, params.selectedClient.contactPhone || "");
  text(40, 630, 9, `GST: ${params.selectedClient.gstNumber || ""}`);
  text(40, 614, 9, `CIN: ${params.selectedClient.cinNumber || ""} | PAN: ${params.selectedClient.panNumber || ""}`);

  let y = 590;
  text(34, y, 6, "#", "F2");
  text(48, y, 6, "Item", "F2");
  text(120, y, 6, "CTC", "F2");
  text(178, y, 6, "DOJ", "F2");
  text(228, y, 6, "Department", "F2");
  text(292, y, 6, "HSN/SAC", "F2");
  text(340, y, 6, "Rate", "F2");
  text(390, y, 6, "Qty", "F2");
  text(414, y, 6, "Taxable", "F2");
  text(462, y, 6, "CGST", "F2");
  text(505, y, 6, "SGST", "F2");
  text(546, y, 6, "Amount", "F2");
  line(40, y - 8, 555, y - 8);
  y -= 26;

  selectedLines.slice(0, 16).forEach((item, index) => {
    const rowTaxable = lineTaxableValue(item);
    const rowCgst = (rowTaxable * gstRate) / 100;
    const rowSgst = (rowTaxable * gstRate) / 100;
    const rowAmount = rowTaxable + rowCgst + rowSgst;
    text(34, y, 6, String(index + 1));
    text(48, y, 6, item.candidateName.slice(0, 17));
    text(120, y, 6, formatInrText(parseMoney(item.ctc)).replace("INR ", ""));
    text(178, y, 6, formatDate(item.doj));
    text(228, y, 6, item.department.slice(0, 13));
    text(292, y, 6, item.hsnSac);
    text(340, y, 6, formatInrText(rowTaxable).replace("INR ", ""));
    text(390, y, 6, "1");
    text(414, y, 6, formatInrText(rowTaxable).replace("INR ", ""));
    text(462, y, 6, formatInrText(rowCgst).replace("INR ", ""));
    text(505, y, 6, formatInrText(rowSgst).replace("INR ", ""));
    text(546, y, 6, formatInrText(rowAmount).replace("INR ", ""));
    y -= 22;
  });

  line(40, y, 555, y);
  y -= 24;
  text(40, y, 9, `Total Items / Qty: ${selectedLines.length} / ${selectedLines.length}`, "F2");
  y -= 18;
  text(40, y, 9, `Amount in words: ${amountInWords(total)}`);
  y -= 32;
  text(350, y, 10, `Taxable Amount: ${formatInrText(taxable)}`, "F2");
  y -= 18;
  text(350, y, 10, `CGST 9%: ${formatInrText(cgst)}`);
  y -= 18;
  text(350, y, 10, `SGST 9%: ${formatInrText(sgst)}`);
  y -= 18;
  text(350, y, 11, `Amount Payable: ${formatInrText(total)}`, "F2");
  y -= 40;
  text(40, y, 9, params.notes.slice(0, 110));
  text(400, 90, 10, "For Werkly Consulting", "F2");
  text(420, 60, 9, "Authorized Signatory");

  const stream = `q\n${content.join("\n")}\nQ`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  const parts = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(parts.join("").length);
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = parts.join("").length;
  parts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => {
    parts.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  parts.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return new TextEncoder().encode(parts.join(""));
}

function defaultLine(application: JobApplication): InvoiceLine {
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
      application.dateOfJoining ||
      joinedStageDate ||
      application.stageUpdatedAt?.slice(0, 10) ||
      todayKey(),
    department: application.sector || application.jobTitle || "Recruitment",
    hsnSac: "998512",
    feePercent: "8.33",
    selected: true,
  };
}

function lineTaxableValue(line: InvoiceLine) {
  return (parseMoney(line.ctc) * Number(line.feePercent || 0)) / 100;
}

function buildInvoiceHtml(params: {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  selectedClient?: ClientRecord;
  lines: InvoiceLine[];
  notes: string;
}) {
  const selectedLines = params.lines.filter((line) => line.selected);
  const rows = selectedLines
    .map((line, index) => {
      const taxable = lineTaxableValue(line);
      const cgst = (taxable * gstRate) / 100;
      const sgst = (taxable * gstRate) / 100;
      const amount = taxable + cgst + sgst;
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(line.candidateName)}</td>
        <td>${formatCurrency(parseMoney(line.ctc))}</td>
        <td>${formatDate(line.doj)}</td>
        <td>${escapeHtml(line.department)}</td>
        <td>${escapeHtml(line.hsnSac)}</td>
        <td>${formatCurrency(taxable)}</td>
        <td>1</td>
        <td>${formatCurrency(taxable)}</td>
        <td>${formatCurrency(cgst)}</td>
        <td>${formatCurrency(sgst)}</td>
        <td>${formatCurrency(amount)}</td>
      </tr>`;
    })
    .join("");

  const taxable = selectedLines.reduce((sum, line) => sum + lineTaxableValue(line), 0);
  const cgst = (taxable * gstRate) / 100;
  const sgst = (taxable * gstRate) / 100;
  const total = Math.round(taxable + cgst + sgst);
  const client = params.selectedClient;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(params.invoiceNo)} - ${escapeHtml(client?.companyName || "Client")}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: Arial, sans-serif; color: #102f3a; margin: 0; font-size: 12px; }
    h1, h2, p { margin: 0; }
    .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0a7684; padding-bottom: 12px; }
    .brand h1 { font-size: 22px; letter-spacing: 0.08em; }
    .brand p, .muted { color: #52666d; line-height: 1.55; }
    .title { text-align: center; margin: 16px 0; letter-spacing: 0.22em; font-size: 18px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: 1.3fr 0.9fr; gap: 18px; margin-bottom: 14px; }
    .box { border: 1px solid #cfdde2; padding: 12px; border-radius: 8px; }
    .box h2 { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #0a7684; margin-bottom: 8px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #eef5f6; color: #24424a; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
    th, td { border: 1px solid #d9e5e8; padding: 7px; vertical-align: top; text-align: left; }
    td span { color: #52666d; font-size: 10px; }
    .summary { display: grid; grid-template-columns: 1fr 280px; gap: 18px; margin-top: 14px; align-items: start; }
    .totals td:first-child { font-weight: 700; }
    .totals td:last-child { text-align: right; }
    .footer { display: flex; justify-content: space-between; gap: 20px; margin-top: 26px; }
    .sign { text-align: right; min-width: 220px; }
    .sign-space { height: 54px; }
    .notes { margin-top: 10px; white-space: pre-line; }
    .toolbar { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 12px; }
    .toolbar button { border: 1px solid #cfdde2; border-radius: 999px; background: #fff; color: #102f3a; cursor: pointer; font-weight: 700; padding: 9px 14px; }
    .toolbar button.primary { background: #0a7684; border-color: #0a7684; color: #fff; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <button type="button" onclick="if (window.opener) window.opener.focus(); window.close();">Edit Invoice Details</button>
    <button type="button" class="primary" onclick="window.print()">Print / Save PDF</button>
  </div>
  <div class="top">
    <div class="brand">
      <h1>${escapeHtml(werklyLegalDetails.legalName)}</h1>
      <p>${escapeHtml(werklyLegalDetails.address)}</p>
      <p>GST: ${escapeHtml(werklyLegalDetails.gstNumber)} | PAN: ${escapeHtml(werklyLegalDetails.panNumber)}</p>
      <p>Email: hr@werkly.in</p>
    </div>
    <div>
      <p><strong>Invoice #:</strong> ${escapeHtml(params.invoiceNo)}</p>
      <p><strong>Date:</strong> ${formatDate(params.invoiceDate)}</p>
      <p><strong>Due Date:</strong> ${formatDate(params.dueDate)}</p>
      <p><strong>Place of Supply:</strong> Telangana</p>
    </div>
  </div>
  <div class="title">TAX INVOICE</div>
  <div class="grid">
    <div class="box">
      <h2>Customer Details</h2>
      <p><strong>${escapeHtml(client?.companyName || "Client")}</strong></p>
      <p>${escapeHtml(client?.communicationAddress || client?.branch || "Billing address not added")}</p>
      <p>${escapeHtml(client?.contactEmail || "")}</p>
      <p>${escapeHtml(client?.contactPhone || "")}</p>
      <p><strong>GST:</strong> ${escapeHtml(client?.gstNumber || "")}</p>
      <p><strong>CIN:</strong> ${escapeHtml(client?.cinNumber || "")}</p>
      <p><strong>PAN:</strong> ${escapeHtml(client?.panNumber || "")}</p>
    </div>
    <div class="box">
      <h2>Recruitment Billing</h2>
      <p><strong>Total Items / Qty:</strong> ${selectedLines.length} / ${selectedLines.length}</p>
      <p><strong>Service:</strong> Permanent recruitment placement</p>
      <p><strong>HSN/SAC:</strong> 998512</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Item</th><th>CTC</th><th>DOJ</th><th>Department</th><th>HSN/SAC</th><th>Rate / Item</th><th>Qty</th><th>Taxable Value</th><th>CGST ${gstRate}%</th><th>SGST ${gstRate}%</th><th>Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="summary">
    <div class="box">
      <h2>Total amount in words</h2>
      <p>${escapeHtml(amountInWords(total))}</p>
      <div class="notes">${escapeHtml(params.notes)}</div>
      <h2 style="margin-top:14px;">Bank Details</h2>
      <p>Bank: Add bank name</p>
      <p>Account Holder: Werkly Consulting</p>
      <p>Account #: Add account number</p>
      <p>IFSC Code: Add IFSC</p>
    </div>
    <table class="totals">
      <tbody>
        <tr><td>Taxable Amount</td><td>${formatCurrency(taxable)}</td></tr>
        <tr><td>CGST ${gstRate}.0%</td><td>${formatCurrency(cgst)}</td></tr>
        <tr><td>SGST ${gstRate}.0%</td><td>${formatCurrency(sgst)}</td></tr>
        <tr><td>Total</td><td>${formatCurrency(total)}</td></tr>
        <tr><td>Amount Payable</td><td>${formatCurrency(total)}</td></tr>
      </tbody>
    </table>
  </div>
  <div class="footer">
    <p class="muted">This invoice is generated from Werkly CRM based on joined recruitment records.</p>
    <div class="sign">
      <div class="sign-space"></div>
      <p><strong>For Werkly Consulting</strong></p>
      <p>Authorized Signatory</p>
    </div>
  </div>
</body>
</html>`;
}

export function AdminClientInvoicesPanel() {
  const [token, setToken] = useState("");
  const [authType, setAuthType] = useState("");
  const [authRole, setAuthRole] = useState("");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [clientType, setClientType] = useState("onboarded");
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

  useEffect(() => {
    setToken(window.localStorage.getItem("werklyAdminToken") ?? "");
    setAuthType(window.localStorage.getItem("werklyAuthType") ?? "");
    setAuthRole(window.localStorage.getItem("werklyAuthRole") ?? "");
  }, []);

  const canDeleteInvoice =
    authType === "admin" || String(authRole).trim().toLowerCase() === "super-admin";

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

  const visibleClients = useMemo(() => {
    if (clientType === "onboarded") {
      return onboardedClients;
    }

    return onboardedClients;
  }, [clientType, onboardedClients]);

  const selectedClient = useMemo(
    () => visibleClients.find((client) => client.id === selectedClientId),
    [selectedClientId, visibleClients]
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
    setLines(clientJoinedApplications.map(defaultLine));
    setIsInvoiceGenerated(false);
    setMessage("");
  }, [clientJoinedApplications]);

  useEffect(() => {
    if (selectedClientId && !visibleClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId("");
    }
  }, [selectedClientId, visibleClients]);

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
    if (!selectedClient.cinNumber?.trim()) {
      missing.push("Client CIN number");
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

  function pushInvoiceToFinance(invoiceClient: ClientRecord) {
    const selectedLines = lines.filter((line) => line.selected);
    const financeInvoiceId = buildFinanceInvoiceId(invoiceClient.id);
    const generatedBy =
      window.localStorage.getItem("werklyAdminEmail") ||
      window.localStorage.getItem("werklyAuthName") ||
      authRole ||
      authType ||
      "Werkly User";

    upsertFinanceInvoice({
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
    });
    setGeneratedInvoiceId(financeInvoiceId);
  }

  function handleGenerateInvoice() {
    if (!validateInvoiceReady()) {
      setIsInvoiceGenerated(false);
      return;
    }

    if (!selectedClient) {
      setError("Select a client before generating invoice.");
      return;
    }

    pushInvoiceToFinance(selectedClient);
    setIsInvoiceGenerated(true);
    setMessage("Invoice generated and pushed to Finance. Review below, then download PDF or print.");
  }

  function handleDeleteGeneratedInvoice() {
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

    setIsInvoiceGenerated(false);
    removeFinanceInvoice(generatedInvoiceId || buildFinanceInvoiceId(selectedClientId));
    setGeneratedInvoiceId("");
    setMessage("Generated invoice deleted from Finance. Review the details and generate again when ready.");
    setError("");
  }

  function generateInvoice(action: "print" | "download") {
    if (!isInvoiceGenerated) {
      setError("Please generate the invoice before downloading or printing.");
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

    const html = buildInvoiceHtml({
      invoiceNo,
      invoiceDate,
      dueDate,
      selectedClient: invoiceClient,
      lines,
      notes,
    });

    if (action === "download") {
      const pdfBytes = buildInvoicePdfBytes({
        invoiceNo,
        invoiceDate,
        dueDate,
        selectedClient: invoiceClient,
        lines,
        notes,
      });
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoiceNo}_${invoiceClient.companyName}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Invoice downloaded. Need changes? Edit the fields below and download again.");
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      setError("Popup blocked. Please allow popups to print the invoice.");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
            <p className="section-eyebrow">Client Invoices</p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
              Generate invoice from joined recruitments.
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

        <div className="mt-7 grid gap-4 lg:grid-cols-5">
          <label className="space-y-2">
            <span className="section-eyebrow">Client Type</span>
            <select
              className={selectClassName}
              value={clientType}
              onChange={(event) => {
                setClientType(event.target.value);
                setIsInvoiceGenerated(false);
                setMessage("");
              }}
              disabled={isLoading}
            >
              <option value="onboarded">Onboarded Clients</option>
            </select>
          </label>
          <label className="space-y-2 lg:col-span-2">
            <span className="section-eyebrow">Client</span>
            <select
              className={selectClassName}
              value={selectedClientId}
              onChange={(event) => {
                setSelectedClientId(event.target.value);
                setIsInvoiceGenerated(false);
                setMessage("");
              }}
              disabled={isLoading}
            >
              <option value="">Select onboarded client</option>
              {visibleClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName} - Onboarded
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="section-eyebrow">Invoice #</span>
            <input
              className={fieldClassName}
              value={invoiceNo}
              onChange={(event) => {
                setInvoiceNo(event.target.value);
                setIsInvoiceGenerated(false);
                setMessage("");
              }}
            />
          </label>
          <label className="space-y-2">
            <span className="section-eyebrow">Invoice Date</span>
            <input
              type="date"
              className={fieldClassName}
              value={invoiceDate}
              onChange={(event) => {
                setInvoiceDate(event.target.value);
                setDueDate(addDays(event.target.value, 30));
                setIsInvoiceGenerated(false);
                setMessage("");
              }}
            />
          </label>
          <label className="space-y-2">
            <span className="section-eyebrow">Due Date</span>
            <input
              type="date"
              className={fieldClassName}
              value={dueDate}
              onChange={(event) => {
                setDueDate(event.target.value);
                setIsInvoiceGenerated(false);
                setMessage("");
              }}
            />
          </label>
        </div>
      </section>

      <section className="accent-card overflow-hidden p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-eyebrow">Invoice Items</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
              Joined candidates for selected client
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(8,96,108,0.18)] transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleGenerateInvoice}
              disabled={!selectedClient || totals.count === 0}
            >
              Generate Invoice
            </button>
            {isInvoiceGenerated ? (
              <>
                <button
                  type="button"
                  className="rounded-full border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
                  onClick={() => generateInvoice("download")}
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
                  onClick={() => generateInvoice("print")}
                >
                  Print / Save PDF
                </button>
                {canDeleteInvoice ? (
                  <button
                    type="button"
                    className="rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                    onClick={handleDeleteGeneratedInvoice}
                  >
                    Delete Invoice
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[rgba(10,118,132,0.08)] text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                {[
                  "Bill",
                  "Candidate",
                  "CTC",
                  "DOJ from Stage",
                  "Department",
                  "HSN/SAC",
                  "Fee %",
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
                  <td className="px-4 py-8 text-center text-[var(--color-muted)]" colSpan={10}>
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
                          className="w-28 rounded-xl border border-[var(--color-border)] px-3 py-2"
                          value={line.hsnSac}
                          onChange={(event) => updateLine(line.applicationId, { hsnSac: event.target.value })}
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
            <div className="mt-5 flex flex-col gap-2 border-t border-[var(--color-border)] pt-4">
              <button
                type="button"
                className="rounded-full bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(8,96,108,0.18)] transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleGenerateInvoice}
                disabled={!selectedClient || totals.count === 0}
              >
                Generate Invoice
              </button>
              {isInvoiceGenerated ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className="rounded-full border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)]"
                    onClick={() => generateInvoice("download")}
                  >
                    Download PDF
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)]"
                    onClick={() => generateInvoice("print")}
                  >
                    Print
                  </button>
                  {canDeleteInvoice ? (
                    <button
                      type="button"
                      className="rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 sm:col-span-2"
                      onClick={handleDeleteGeneratedInvoice}
                    >
                      Delete Invoice
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

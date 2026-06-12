import { readFinanceBankAccounts, type FinanceBankAccountRecord, type FinanceInvoiceRecord } from "@/lib/finance";

type PrintableInvoiceLine = {
  candidateName: string;
  ctc: string;
  doj: string;
  department: string;
  feePercent: string;
  selected?: boolean;
  taxable?: number;
  cgst?: number;
  sgst?: number;
  amount?: number;
};

type PrintableInvoiceClient = {
  companyName: string;
  communicationAddress?: string;
  branch?: string;
  contactEmail?: string;
  contactPhone?: string;
  gstNumber?: string;
  cinNumber?: string;
  panNumber?: string;
};

type PrintableBankAccount = Pick<
  FinanceBankAccountRecord,
  "accountName" | "bankName" | "accountNumber" | "ifscCode" | "branch"
>;

export type PrintableInvoice = {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  selectedClient?: PrintableInvoiceClient;
  bankAccount?: PrintableBankAccount;
  lines: PrintableInvoiceLine[];
  notes: string;
};

const gstRate = 9;
const letterheadImageUrl = "/invoice-assets/werkly-letterhead.jpg";
const werklyLegalDetails = {
  legalName: "Werkly Consulting (OPC) Private Limited",
  gstNumber: "37AAECW4103F1ZL",
  panNumber: "AAECW4103F",
};
const werklyAddressLines = [
  "Building No./Flat No: 2-155, Peerla Punja Centre,",
  "Veerapanenigudem, Gannavaram Mandal,",
  "Krishna Dist, Andhra Pradesh - 521286",
];
const werklyTaxLine = "GST: 37AAECW4103F1ZL | PAN: AAECW4103F";

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function belowThousand(value: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (value < 20) {
    return ones[value];
  }

  if (value < 100) {
    return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ""}`;
  }

  return `${ones[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${belowThousand(value % 100)}` : ""}`;
}

function numberToIndianWords(input: number) {
  let value = Math.max(0, Math.floor(input));
  if (value === 0) {
    return "Zero";
  }

  const parts: string[] = [];
  const crore = Math.floor(value / 10000000);
  value %= 10000000;
  const lakh = Math.floor(value / 100000);
  value %= 100000;
  const thousand = Math.floor(value / 1000);
  value %= 1000;

  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (value) parts.push(belowThousand(value));
  return parts.join(" ");
}

function amountInWords(amount: number) {
  return `INR ${numberToIndianWords(Math.round(amount))} Only`;
}

function lineTaxableValue(line: PrintableInvoiceLine) {
  return line.taxable ?? (parseMoney(line.ctc) * Number(line.feePercent || 0)) / 100;
}

export function financeInvoiceToPrintableInvoice(
  invoice: FinanceInvoiceRecord,
  financeBankAccounts?: FinanceBankAccountRecord[]
): PrintableInvoice {
  const bankAccounts = financeBankAccounts ?? readFinanceBankAccounts();
  const bankAccount =
    bankAccounts.find((account) => account.id === invoice.bankAccountId) ||
    bankAccounts.find((account) => account.isPrimary) ||
    bankAccounts[0];

  return {
    invoiceNo: invoice.invoiceNo,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    selectedClient: {
      companyName: invoice.clientName,
      communicationAddress: invoice.clientAddress,
      gstNumber: invoice.clientGstNumber,
      cinNumber: invoice.clientCinNumber,
      panNumber: invoice.clientPanNumber,
    },
    bankAccount,
    lines: invoice.lines.map((line) => ({ ...line, selected: true })),
    notes: invoice.notes,
  };
}

export function buildPrintableInvoiceHtml(params: PrintableInvoice) {
  const selectedLines = params.lines.filter((line) => line.selected !== false);
  const invoiceDensityClass =
    selectedLines.length > 10 ? "very-dense" : selectedLines.length > 5 ? "dense" : "normal";
  const rows = selectedLines
    .map((line, index) => {
      const taxable = lineTaxableValue(line);
      const cgst = line.cgst ?? (taxable * gstRate) / 100;
      const sgst = line.sgst ?? (taxable * gstRate) / 100;
      const amount = line.amount ?? taxable + cgst + sgst;
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(line.candidateName)}</td>
        <td>${formatCurrency(parseMoney(line.ctc))}</td>
        <td>${formatDate(line.doj)}</td>
        <td>${escapeHtml(line.department)}</td>
        <td>${escapeHtml(`${Number(line.feePercent || 0)}% of CTC`)}</td>
        <td>${formatCurrency(taxable)}</td>
        <td>${formatCurrency(cgst)}</td>
        <td>${formatCurrency(sgst)}</td>
        <td>${formatCurrency(amount)}</td>
      </tr>`;
    })
    .join("");

  const taxable = selectedLines.reduce((sum, line) => sum + lineTaxableValue(line), 0);
  const cgst = selectedLines.reduce((sum, line) => sum + (line.cgst ?? (lineTaxableValue(line) * gstRate) / 100), 0);
  const sgst = selectedLines.reduce((sum, line) => sum + (line.sgst ?? (lineTaxableValue(line) * gstRate) / 100), 0);
  const total = Math.round(taxable + cgst + sgst);
  const client = params.selectedClient;
  const bankAccount = params.bankAccount;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(params.invoiceNo)} - ${escapeHtml(client?.companyName || "Client")}</title>
  <style>
    @page { size: A4; margin: 0; }
    html, body { width: 210mm; min-height: 297mm; }
    body { font-family: Calibri, Arial, sans-serif; color: #102f3a; margin: 0; font-size: 12.7px; line-height: 1.55; background: #d9dde1; }
    h1, h2, p { margin: 0; }
    .invoice-page { position: relative; width: 210mm; height: 297mm; box-sizing: border-box; margin: 0 auto; overflow: hidden; background: #fff; }
    .letterhead-bg { position: absolute; inset: 0; width: 210mm; height: 297mm; object-fit: cover; z-index: 0; }
    .invoice-content { position: relative; z-index: 1; box-sizing: border-box; display: flex; flex-direction: column; width: 100%; height: 100%; padding: 38mm 14mm 26mm; }
    .invoice-main { flex: 1 1 auto; }
    .top { display: flex; justify-content: flex-end; border-bottom: 2px solid #0a7684; padding-bottom: 12px; align-items: start; }
    .brand { display: none; }
    .brand h1 { font-size: 24px; letter-spacing: 0.04em; }
    .brand p, .muted { color: #52666d; line-height: 1.55; }
    .brand .address { max-width: 420px; margin-top: 6px; }
    .brand .tax-line { margin-top: 6px; font-weight: 700; color: #24424a; }
    .invoice-meta { margin-left: auto; text-align: right; padding-top: 4px; min-width: 250px; }
    .invoice-meta p { margin-bottom: 7px; white-space: nowrap; }
    .title { text-align: center; margin: 17px 0; letter-spacing: 0.22em; font-size: 19px; font-weight: 700; }
    .details-grid { display: grid; grid-template-columns: 1.08fr 0.92fr; gap: 18px; margin-bottom: 16px; }
    .section h2 { border-bottom: 1px solid #cfdde2; padding-bottom: 5px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #0a7684; margin-bottom: 9px; }
    .section p { margin-top: 4px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #eef5f6; color: #24424a; font-size: 10.6px; letter-spacing: 0.07em; text-transform: uppercase; }
    th, td { border: 1px solid #d9e5e8; padding: 7px 5px; vertical-align: top; text-align: left; }
    td span { color: #52666d; font-size: 12px; }
    .summary { display: grid; grid-template-columns: 1fr 72mm; gap: 18px; margin-top: 18px; align-items: start; }
    .summary { break-inside: avoid; page-break-inside: avoid; }
    .totals td:first-child { font-weight: 700; }
    .totals td:last-child { text-align: right; }
    .footer { display: flex; justify-content: flex-end; gap: 20px; margin-top: auto; padding-top: 10px; padding-bottom: 26mm; }
    .sign { text-align: right; min-width: 220px; }
    .sign-space { height: 54px; }
    .notes { margin-top: 12px; white-space: pre-line; }
    .invoice-page.dense .invoice-content { padding-top: 36mm; padding-bottom: 23mm; }
    .invoice-page.dense { line-height: 1.35; }
    .invoice-page.dense .top { padding-bottom: 8px; }
    .invoice-page.dense .title { margin: 8px 0; font-size: 17px; }
    .invoice-page.dense .details-grid { gap: 12px; margin-bottom: 8px; }
    .invoice-page.dense .section h2 { margin-bottom: 4px; padding-bottom: 3px; }
    .invoice-page.dense th, .invoice-page.dense td { padding: 3.5px; font-size: 11px; }
    .invoice-page.dense th { font-size: 9.6px; }
    .invoice-page.dense .summary { margin-top: 8px; gap: 12px; }
    .invoice-page.dense .notes { margin-top: 5px; }
    .invoice-page.dense .footer { padding-top: 8px; padding-bottom: 20mm; }
    .invoice-page.dense .sign-space { height: 24px; }
    .invoice-page.very-dense .invoice-content { padding-top: 35mm; padding-bottom: 22mm; }
    .invoice-page.very-dense { font-size: 11.8px; line-height: 1.22; }
    .invoice-page.very-dense .top { padding-bottom: 6px; }
    .invoice-page.very-dense .title { margin: 6px 0; font-size: 16px; }
    .invoice-page.very-dense .details-grid { gap: 10px; margin-bottom: 6px; }
    .invoice-page.very-dense .section h2 { margin-bottom: 3px; padding-bottom: 2px; font-size: 10.6px; }
    .invoice-page.very-dense .section p { margin-top: 1px; }
    .invoice-page.very-dense th, .invoice-page.very-dense td { padding: 2.6px; font-size: 10px; line-height: 1.15; }
    .invoice-page.very-dense th { font-size: 8.8px; }
    .invoice-page.very-dense .summary { margin-top: 6px; gap: 10px; }
    .invoice-page.very-dense .notes { margin-top: 4px; }
    .invoice-page.very-dense .footer { padding-top: 6px; padding-bottom: 16mm; }
    .invoice-page.very-dense .sign-space { height: 16px; }
    .toolbar { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 12px; }
    .toolbar button { border: 1px solid #cfdde2; border-radius: 999px; background: #fff; color: #102f3a; cursor: pointer; font-weight: 700; padding: 9px 14px; }
    .toolbar button.primary { background: #0a7684; border-color: #0a7684; color: #fff; }
    @media screen { .invoice-page { box-shadow: 0 8px 26px rgba(16, 47, 58, 0.16); } }
    @media print { html, body { width: 210mm; height: 297mm; background: #fff; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } .invoice-page { width: 210mm; height: 297mm; margin: 0; box-shadow: none; page-break-after: avoid; } }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <button type="button" onclick="if (window.opener) window.opener.focus(); window.close();">Edit Invoice Details</button>
    <button type="button" class="primary" onclick="window.print()">Print / Save PDF</button>
  </div>
  <main class="invoice-page ${invoiceDensityClass}">
  <img class="letterhead-bg" src="${letterheadImageUrl}" alt="" />
  <div class="invoice-content">
  <div class="top">
    <div class="brand">
      <h1>${escapeHtml(werklyLegalDetails.legalName)}</h1>
      <p class="address">${werklyAddressLines.map((line) => escapeHtml(line)).join("<br />")}</p>
      <p class="tax-line">${escapeHtml(werklyTaxLine)}</p>
      <p>Email: hr@werkly.in</p>
    </div>
    <div class="invoice-meta">
      <p><strong>Invoice #:</strong> ${escapeHtml(params.invoiceNo)}</p>
      <p><strong>Invoice Date:</strong> ${formatDate(params.invoiceDate)}</p>
      <p><strong>Due Date:</strong> ${formatDate(params.dueDate)}</p>
    </div>
  </div>
  <div class="invoice-main">
  <div class="title">TAX INVOICE</div>
  <div class="details-grid">
    <div class="section">
      <h2>Customer Details</h2>
      <p><strong>${escapeHtml(client?.companyName || "Client")}</strong></p>
      <p>${escapeHtml(client?.communicationAddress || client?.branch || "Billing address not added")}</p>
      <p>${escapeHtml(client?.contactEmail || "")}</p>
      <p>${escapeHtml(client?.contactPhone || "")}</p>
      <p><strong>GST:</strong> ${escapeHtml(client?.gstNumber || "")}</p>
      <p><strong>CIN:</strong> ${escapeHtml(client?.cinNumber || "")}</p>
      <p><strong>PAN:</strong> ${escapeHtml(client?.panNumber || "")}</p>
    </div>
    <div class="section">
      <h2>Werkly Billing Details</h2>
      <p><strong>${escapeHtml(werklyLegalDetails.legalName)}</strong></p>
      <p>${werklyAddressLines.map((line) => escapeHtml(line)).join("<br />")}</p>
      <p>${escapeHtml(werklyTaxLine)}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>S.No</th><th>Candidate Name</th><th>CTC</th><th>DOJ</th><th>Job Details</th><th>Agreement %</th><th>Taxable Value</th><th>CGST ${gstRate}%</th><th>SGST ${gstRate}%</th><th>Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="summary">
    <div class="section">
      <h2>Total amount in words</h2>
      <p>${escapeHtml(amountInWords(total))}</p>
      <div class="notes">${escapeHtml(params.notes)}</div>
      <h2 style="margin-top:14px;">Bank Details</h2>
      <p>Bank: ${escapeHtml(bankAccount?.bankName || "Add bank name")}</p>
      <p>Account Holder: ${escapeHtml(bankAccount?.accountName || "Werkly Consulting")}</p>
      <p>Account #: ${escapeHtml(bankAccount?.accountNumber || "Add account number")}</p>
      <p>IFSC Code: ${escapeHtml(bankAccount?.ifscCode || "Add IFSC")}</p>
      ${bankAccount?.branch ? `<p>Branch: ${escapeHtml(bankAccount.branch)}</p>` : ""}
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
  </div>
  <div class="footer">
    <div class="sign">
      <div class="sign-space"></div>
    </div>
  </div>
  </div>
  </main>
</body>
</html>`;
}

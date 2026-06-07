"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClientRecord } from "@/lib/crm";
import type { JobApplication, JobSummary } from "@/lib/jobs";
import { readFinanceInvoices, removeFinanceInvoice, upsertFinanceInvoice } from "@/lib/finance";
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
const werklyAddressLines = [
  "Building No./Flat No: 2-155, Veerapanenigudem,",
  "Peerla Punja Centre,",
  "Near Veerapanenigudem Branch Post Office,",
  "Gannavaram Mandal, Krishna Dist,",
  "Andhra Pradesh - 521286",
];
const letterheadImageUrl = "/invoice-assets/werkly-letterhead.jpg";
const letterheadImageWidth = 4958;
const letterheadImageHeight = 7009;

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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function numberToIndianWords(value: number) {
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

  function belowThousand(number: number) {
    const parts: string[] = [];
    if (number >= 100) {
      parts.push(`${ones[Math.floor(number / 100)]} Hundred`);
      number %= 100;
    }
    if (number >= 20) {
      parts.push(tens[Math.floor(number / 10)]);
      number %= 10;
    }
    if (number > 0) {
      parts.push(ones[number]);
    }
    return parts.join(" ");
  }

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

function formatJobDesignations(lines: InvoiceLine[]) {
  const designations = Array.from(
    new Set(
      lines
        .map((line) => line.department.trim())
        .filter(Boolean)
    )
  );

  return designations.length > 0 ? designations.join(", ") : "Recruitment placement";
}

function buildInvoicePdfBytes(params: {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  selectedClient: ClientRecord;
  lines: InvoiceLine[];
  notes: string;
  letterheadImageBytes?: Uint8Array;
}) {
  const selectedLines = params.lines.filter((line) => line.selected);
  const jobDesignations = formatJobDesignations(selectedLines);
  const pdfRowStep = selectedLines.length > 10 ? 12 : selectedLines.length > 6 ? 14 : 18;
  const pdfRowFontSize = selectedLines.length > 6 ? 5 : 6;
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

  if (params.letterheadImageBytes?.length) {
    content.push("q 595 0 0 842 0 0 cm /LH Do Q");
  }

  text(405, 676, 10, `Invoice #: ${params.invoiceNo}`, "F2");
  text(405, 660, 10, `Invoice Date: ${formatDate(params.invoiceDate)}`);
  text(405, 644, 10, `Due Date: ${formatDate(params.dueDate)}`);
  text(235, 676, 16, "TAX INVOICE", "F2");
  line(40, 628, 555, 628);
  text(40, 608, 9, "Werkly Billing Details", "F2");
  text(40, 592, 10, werklyLegalDetails.legalName, "F2");
  werklyAddressLines.slice(0, 3).forEach((lineText, index) => {
    text(40, 578 - index * 12, 7, lineText);
  });
  text(40, 536, 8, `GST: ${werklyLegalDetails.gstNumber} | PAN: ${werklyLegalDetails.panNumber} | hr@werkly.in`);
  text(320, 608, 9, "Customer Details", "F2");
  text(320, 592, 10, params.selectedClient.companyName, "F2");
  text(320, 576, 8, (params.selectedClient.communicationAddress || params.selectedClient.branch || "Billing address not added").slice(0, 52));
  text(320, 560, 8, params.selectedClient.contactEmail || "");
  text(320, 544, 8, params.selectedClient.contactPhone || "");
  text(320, 528, 8, `GST: ${params.selectedClient.gstNumber || ""}`);
  text(320, 512, 8, `CIN: ${params.selectedClient.cinNumber || ""} | PAN: ${params.selectedClient.panNumber || ""}`);
  text(40, 500, 8, `Job Details: ${jobDesignations.slice(0, 88)}`);

  let y = 474;
  text(34, y, 6, "S.No", "F2");
  text(48, y, 6, "Candidate Name", "F2");
  text(130, y, 6, "CTC", "F2");
  text(190, y, 6, "DOJ", "F2");
  text(238, y, 6, "Job Details", "F2");
  text(316, y, 6, "Agreement %", "F2");
  text(374, y, 6, "Taxable", "F2");
  text(426, y, 6, "CGST", "F2");
  text(478, y, 6, "SGST", "F2");
  text(526, y, 6, "Amount", "F2");
  line(40, y - 8, 555, y - 8);
  y -= 26;

  selectedLines.slice(0, 16).forEach((item, index) => {
    const rowTaxable = lineTaxableValue(item);
    const rowCgst = (rowTaxable * gstRate) / 100;
    const rowSgst = (rowTaxable * gstRate) / 100;
    const rowAmount = rowTaxable + rowCgst + rowSgst;
    text(34, y, pdfRowFontSize, String(index + 1));
    text(48, y, pdfRowFontSize, item.candidateName.slice(0, 21));
    text(130, y, pdfRowFontSize, formatInrText(parseMoney(item.ctc)).replace("INR ", ""));
    text(190, y, pdfRowFontSize, formatDate(item.doj));
    text(238, y, pdfRowFontSize, item.department.slice(0, 18));
    text(316, y, pdfRowFontSize, `${Number(item.feePercent || 0)}% of CTC`);
    text(374, y, pdfRowFontSize, formatInrText(rowTaxable).replace("INR ", ""));
    text(426, y, pdfRowFontSize, formatInrText(rowCgst).replace("INR ", ""));
    text(478, y, pdfRowFontSize, formatInrText(rowSgst).replace("INR ", ""));
    text(526, y, pdfRowFontSize, formatInrText(rowAmount).replace("INR ", ""));
    y -= pdfRowStep;
  });

  line(40, y, 555, y);
  y -= selectedLines.length > 6 ? 16 : 22;
  text(40, y, 9, `Total Candidates: ${selectedLines.length}`, "F2");
  y -= selectedLines.length > 6 ? 14 : 18;
  text(40, y, 9, `Amount in words: ${amountInWords(total)}`);
  y -= selectedLines.length > 6 ? 22 : 30;
  text(350, y, 10, `Taxable Amount: ${formatInrText(taxable)}`, "F2");
  y -= 18;
  text(350, y, 10, `CGST 9%: ${formatInrText(cgst)}`);
  y -= 18;
  text(350, y, 10, `SGST 9%: ${formatInrText(sgst)}`);
  y -= 18;
  text(350, y, 11, `Amount Payable: ${formatInrText(total)}`, "F2");
  y -= 40;
  text(40, y, 9, params.notes.slice(0, 110));
  text(400, 165, 10, "For Werkly Consulting", "F2");
  text(420, 138, 9, "Authorized Signatory");

  const stream = `q\n${content.join("\n")}\nQ`;
  const hasLetterhead = Boolean(params.letterheadImageBytes?.length);
  const pageResources = hasLetterhead
    ? "<< /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /LH 7 0 R >> >>"
    : "<< /Font << /F1 4 0 R /F2 5 0 R >> >>";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources ${pageResources} /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Calibri >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Calibri-Bold >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];

  if (hasLetterhead && params.letterheadImageBytes) {
    const imageBytes = params.letterheadImageBytes;
    objects.push(
      `<< /Type /XObject /Subtype /Image /Width ${letterheadImageWidth} /Height ${letterheadImageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n${Array.from(
        imageBytes,
        (byte) => String.fromCharCode(byte)
      ).join("")}\nendstream`
    );
  }

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

  return Uint8Array.from(parts.join(""), (char) => char.charCodeAt(0));
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

function buildInvoiceHtml(params: {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  selectedClient?: ClientRecord;
  lines: InvoiceLine[];
  notes: string;
}) {
  const selectedLines = params.lines.filter((line) => line.selected);
  const jobDesignations = formatJobDesignations(selectedLines);
  const invoiceDensityClass =
    selectedLines.length > 10 ? "very-dense" : selectedLines.length > 5 ? "dense" : "normal";
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
        <td>${escapeHtml(`${Number(line.feePercent || 0)}% of CTC`)}</td>
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
    @page { size: A4; margin: 0; }
    html, body { width: 210mm; min-height: 297mm; }
    body { font-family: Calibri, Arial, sans-serif; color: #102f3a; margin: 0; font-size: 10.7px; line-height: 1.55; background: #d9dde1; }
    h1, h2, p { margin: 0; }
    .invoice-page { position: relative; width: 210mm; height: 297mm; box-sizing: border-box; margin: 0 auto; overflow: hidden; background: #fff; }
    .letterhead-bg { position: absolute; inset: 0; width: 210mm; height: 297mm; object-fit: cover; z-index: 0; }
    .invoice-content { position: relative; z-index: 1; box-sizing: border-box; display: flex; flex-direction: column; width: 100%; height: 100%; padding: 38mm 14mm 26mm; }
    .invoice-main { flex: 1 1 auto; }
    .top { display: flex; justify-content: flex-end; border-bottom: 2px solid #0a7684; padding-bottom: 12px; align-items: start; }
    .brand { display: none; }
    .brand h1 { font-size: 22px; letter-spacing: 0.04em; }
    .brand p, .muted { color: #52666d; line-height: 1.55; }
    .brand .address { max-width: 420px; margin-top: 6px; }
    .brand .tax-line { margin-top: 6px; font-weight: 700; color: #24424a; }
    .invoice-meta { margin-left: auto; text-align: right; padding-top: 4px; min-width: 250px; }
    .invoice-meta p { margin-bottom: 7px; white-space: nowrap; }
    .title { text-align: center; margin: 17px 0; letter-spacing: 0.22em; font-size: 17px; font-weight: 700; }
    .details-grid { display: grid; grid-template-columns: 1.08fr 0.92fr; gap: 18px; margin-bottom: 16px; }
    .section h2 { border-bottom: 1px solid #cfdde2; padding-bottom: 5px; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #0a7684; margin-bottom: 9px; }
    .section p { margin-top: 4px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #eef5f6; color: #24424a; font-size: 8.6px; letter-spacing: 0.07em; text-transform: uppercase; }
    th, td { border: 1px solid #d9e5e8; padding: 7px 5px; vertical-align: top; text-align: left; }
    td span { color: #52666d; font-size: 10px; }
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
    .invoice-page.dense .title { margin: 8px 0; font-size: 15px; }
    .invoice-page.dense .details-grid { gap: 12px; margin-bottom: 8px; }
    .invoice-page.dense .section h2 { margin-bottom: 4px; padding-bottom: 3px; }
    .invoice-page.dense th, .invoice-page.dense td { padding: 3.5px; font-size: 9px; }
    .invoice-page.dense th { font-size: 7.6px; }
    .invoice-page.dense .summary { margin-top: 8px; gap: 12px; }
    .invoice-page.dense .notes { margin-top: 5px; }
    .invoice-page.dense .footer { padding-top: 8px; padding-bottom: 20mm; }
    .invoice-page.dense .sign-space { height: 24px; }
    .invoice-page.very-dense .invoice-content { padding-top: 35mm; padding-bottom: 22mm; }
    .invoice-page.very-dense { font-size: 9.8px; }
    .invoice-page.very-dense { line-height: 1.22; }
    .invoice-page.very-dense .top { padding-bottom: 6px; }
    .invoice-page.very-dense .title { margin: 6px 0; font-size: 14px; }
    .invoice-page.very-dense .details-grid { gap: 10px; margin-bottom: 6px; }
    .invoice-page.very-dense .section h2 { margin-bottom: 3px; padding-bottom: 2px; font-size: 8.6px; }
    .invoice-page.very-dense .section p { margin-top: 1px; }
    .invoice-page.very-dense th, .invoice-page.very-dense td { padding: 2.6px; font-size: 8px; line-height: 1.15; }
    .invoice-page.very-dense th { font-size: 6.8px; }
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
      <p class="tax-line">GST: ${escapeHtml(werklyLegalDetails.gstNumber)} | PAN: ${escapeHtml(werklyLegalDetails.panNumber)}</p>
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
      <p><strong>GST:</strong> ${escapeHtml(werklyLegalDetails.gstNumber)} | <strong>PAN:</strong> ${escapeHtml(werklyLegalDetails.panNumber)}</p>
      <p><strong>Job Details:</strong> ${escapeHtml(jobDesignations)}</p>
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
  </div>
  <div class="footer">
    <div class="sign">
      <div class="sign-space"></div>
      <p><strong>For Werkly Consulting</strong></p>
      <p>Authorized Signatory</p>
    </div>
  </div>
  </div>
  </main>
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
  }, [clientJoinedApplications, jobs]);

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

  async function generateInvoice(action: "print" | "download") {
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
      const letterheadResponse = await fetch(letterheadImageUrl);
      if (!letterheadResponse.ok) {
        setError("Unable to load invoice letterhead. Please try again.");
        return;
      }
      const letterheadImageBytes = new Uint8Array(await letterheadResponse.arrayBuffer());
      const pdfBytes = buildInvoicePdfBytes({
        invoiceNo,
        invoiceDate,
        dueDate,
        selectedClient: invoiceClient,
        lines,
        notes,
        letterheadImageBytes,
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
                setInvoiceNo(invoiceNumber(event.target.value));
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

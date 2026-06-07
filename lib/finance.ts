export type FinanceInvoiceLine = {
  applicationId: string;
  candidateName: string;
  ctc: string;
  doj: string;
  department: string;
  hsnSac: string;
  feePercent: string;
  taxable: number;
  cgst: number;
  sgst: number;
  amount: number;
};

export type FinanceInvoiceRecord = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  clientId: string;
  clientName: string;
  clientGstNumber: string;
  clientCinNumber: string;
  clientPanNumber: string;
  clientAddress: string;
  taxable: number;
  cgst: number;
  sgst: number;
  total: number;
  notes: string;
  status: "generated";
  generatedAt: string;
  generatedBy: string;
  lines: FinanceInvoiceLine[];
};

const financeInvoicesStorageKey = "werklyFinanceInvoices";

export function readFinanceInvoices() {
  if (typeof window === "undefined") {
    return [] as FinanceInvoiceRecord[];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(financeInvoicesStorageKey) || "[]");
    return Array.isArray(parsed) ? (parsed as FinanceInvoiceRecord[]) : [];
  } catch {
    return [] as FinanceInvoiceRecord[];
  }
}

export function writeFinanceInvoices(invoices: FinanceInvoiceRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(financeInvoicesStorageKey, JSON.stringify(invoices));
}

export function upsertFinanceInvoice(invoice: FinanceInvoiceRecord) {
  const current = readFinanceInvoices();
  const next = [invoice, ...current.filter((item) => item.id !== invoice.id)];
  writeFinanceInvoices(next);
  return invoice;
}

export function removeFinanceInvoice(invoiceId: string) {
  writeFinanceInvoices(readFinanceInvoices().filter((item) => item.id !== invoiceId));
}

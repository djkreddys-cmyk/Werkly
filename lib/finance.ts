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
  paymentStatus?: "unpaid" | "partial" | "paid";
  amountReceived?: number;
  paymentDate?: string;
  paymentMode?: string;
  paymentReference?: string;
  paymentNotes?: string;
  bankAccountId?: string;
  lines: FinanceInvoiceLine[];
};

export type FinanceBankAccountRecord = {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  openingBalance: number;
  isPrimary: boolean;
  createdAt: string;
};

export type FinanceIncomeRecord = {
  id: string;
  date: string;
  source: string;
  category: string;
  amount: number;
  mode: string;
  reference: string;
  notes: string;
  bankAccountId?: string;
  invoiceId?: string;
  invoiceNo?: string;
  clientName?: string;
  createdAt: string;
};

export type FinanceExpenditureRecord = {
  id: string;
  date: string;
  vendor: string;
  category: string;
  amount: number;
  mode: string;
  reference: string;
  notes: string;
  bankAccountId?: string;
  createdAt: string;
};

const financeInvoicesStorageKey = "werklyFinanceInvoices";
const financeBankAccountsStorageKey = "werklyFinanceBankAccounts";
const financeIncomeStorageKey = "werklyFinanceIncome";
const financeExpenditureStorageKey = "werklyFinanceExpenditure";

function readStorageList<T>(key: string) {
  if (typeof window === "undefined") {
    return [] as T[];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [] as T[];
  }
}

function writeStorageList<T>(key: string, records: T[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(records));
}

export function readFinanceInvoices() {
  return readStorageList<FinanceInvoiceRecord>(financeInvoicesStorageKey);
}

export function writeFinanceInvoices(invoices: FinanceInvoiceRecord[]) {
  writeStorageList(financeInvoicesStorageKey, invoices);
}

export function upsertFinanceInvoice(invoice: FinanceInvoiceRecord) {
  const current = readFinanceInvoices();
  const next = [invoice, ...current.filter((item) => item.id !== invoice.id)];
  writeFinanceInvoices(next);
  return invoice;
}

export function removeFinanceInvoice(invoiceId: string) {
  writeFinanceInvoices(readFinanceInvoices().filter((item) => item.id !== invoiceId));
  removeFinanceIncome(`invoice-income-${invoiceId}`);
}

export function readFinanceBankAccounts() {
  return readStorageList<FinanceBankAccountRecord>(financeBankAccountsStorageKey);
}

export function formatFinanceBankAccountLabel(account?: Pick<FinanceBankAccountRecord, "bankName" | "accountNumber">) {
  if (!account) {
    return "";
  }

  const bankName = account.bankName.trim();
  const accountNumber = account.accountNumber.trim();
  return [bankName, accountNumber].filter(Boolean).join(" - ") || "Bank account";
}

export function writeFinanceBankAccounts(records: FinanceBankAccountRecord[]) {
  writeStorageList(financeBankAccountsStorageKey, records);
}

export function upsertFinanceBankAccount(record: FinanceBankAccountRecord) {
  const current = readFinanceBankAccounts();
  const normalizedCurrent = record.isPrimary
    ? current.map((item) => ({ ...item, isPrimary: false }))
    : current;
  const next = [record, ...normalizedCurrent.filter((item) => item.id !== record.id)];
  writeFinanceBankAccounts(next);
  return record;
}

export function removeFinanceBankAccount(recordId: string) {
  writeFinanceBankAccounts(readFinanceBankAccounts().filter((item) => item.id !== recordId));
}

export function readFinanceIncome() {
  return readStorageList<FinanceIncomeRecord>(financeIncomeStorageKey);
}

export function writeFinanceIncome(records: FinanceIncomeRecord[]) {
  writeStorageList(financeIncomeStorageKey, records);
}

export function upsertFinanceIncome(record: FinanceIncomeRecord) {
  const current = readFinanceIncome();
  const next = [record, ...current.filter((item) => item.id !== record.id)];
  writeFinanceIncome(next);
  return record;
}

export function removeFinanceIncome(recordId: string) {
  writeFinanceIncome(readFinanceIncome().filter((item) => item.id !== recordId));
}

export function readFinanceExpenditure() {
  return readStorageList<FinanceExpenditureRecord>(financeExpenditureStorageKey);
}

export function writeFinanceExpenditure(records: FinanceExpenditureRecord[]) {
  writeStorageList(financeExpenditureStorageKey, records);
}

export function upsertFinanceExpenditure(record: FinanceExpenditureRecord) {
  const current = readFinanceExpenditure();
  const next = [record, ...current.filter((item) => item.id !== record.id)];
  writeFinanceExpenditure(next);
  return record;
}

export function removeFinanceExpenditure(recordId: string) {
  writeFinanceExpenditure(readFinanceExpenditure().filter((item) => item.id !== recordId));
}

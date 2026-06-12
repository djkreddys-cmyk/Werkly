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

export type FinanceStore = {
  invoices: FinanceInvoiceRecord[];
  bankAccounts: FinanceBankAccountRecord[];
  income: FinanceIncomeRecord[];
  expenditure: FinanceExpenditureRecord[];
};

const financeInvoicesStorageKey = "werklyFinanceInvoices";
const financeBankAccountsStorageKey = "werklyFinanceBankAccounts";
const financeIncomeStorageKey = "werklyFinanceIncome";
const financeExpenditureStorageKey = "werklyFinanceExpenditure";
const financeStoreBackupStorageKey = "werklyFinanceStoreBackup";

export function emptyFinanceStore(): FinanceStore {
  return {
    invoices: [],
    bankAccounts: [],
    income: [],
    expenditure: [],
  };
}

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

export function readLocalFinanceStore(): FinanceStore {
  return {
    invoices: readFinanceInvoices(),
    bankAccounts: readFinanceBankAccounts(),
    income: readFinanceIncome(),
    expenditure: readFinanceExpenditure(),
  };
}

export function writeLocalFinanceStore(store: FinanceStore, options: { notify?: boolean } = {}) {
  writeFinanceInvoices(store.invoices);
  writeFinanceBankAccounts(store.bankAccounts);
  writeFinanceIncome(store.income);
  writeFinanceExpenditure(store.expenditure);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(financeStoreBackupStorageKey, JSON.stringify(store));
    if (options.notify) {
      window.dispatchEvent(new CustomEvent("werkly-finance-store-updated"));
    }
  }
}

export function hasFinanceStoreData(store: FinanceStore) {
  return (
    store.invoices.length > 0 ||
    store.bankAccounts.length > 0 ||
    store.income.length > 0 ||
    store.expenditure.length > 0
  );
}

function normalizeFinanceStore(store?: Partial<FinanceStore> | null): FinanceStore {
  return {
    invoices: Array.isArray(store?.invoices) ? store.invoices : [],
    bankAccounts: Array.isArray(store?.bankAccounts) ? store.bankAccounts : [],
    income: Array.isArray(store?.income) ? store.income : [],
    expenditure: Array.isArray(store?.expenditure) ? store.expenditure : [],
  };
}

export function mergeFinanceStoreWithFallback(primary: FinanceStore, fallback: FinanceStore): FinanceStore {
  return {
    invoices: primary.invoices.length ? primary.invoices : fallback.invoices,
    bankAccounts: primary.bankAccounts.length ? primary.bankAccounts : fallback.bankAccounts,
    income: primary.income.length ? primary.income : fallback.income,
    expenditure: primary.expenditure.length ? primary.expenditure : fallback.expenditure,
  };
}

export function readFinanceStoreBackup(): FinanceStore {
  if (typeof window === "undefined") {
    return emptyFinanceStore();
  }

  try {
    return normalizeFinanceStore(JSON.parse(window.localStorage.getItem(financeStoreBackupStorageKey) || "{}") as Partial<FinanceStore>);
  } catch {
    return emptyFinanceStore();
  }
}

export function readFinanceStoreRecovery(): FinanceStore {
  return mergeFinanceStoreWithFallback(readLocalFinanceStore(), readFinanceStoreBackup());
}

export function invoiceNumberFromInvoices(invoices: FinanceInvoiceRecord[], dateKey: string) {
  const invoiceDateKey = dateKey || new Date().toISOString().slice(0, 10);
  const date = new Date(`${invoiceDateKey}T00:00:00`);
  const year = date.getFullYear();
  const fiscalStartYear = date.getMonth() >= 3 ? year : year - 1;
  const start = `${fiscalStartYear}-04-01`;
  const end = `${fiscalStartYear + 1}-03-31`;
  const maxSequence = invoices.reduce((max, invoice) => {
    const match = String(invoice.invoiceNo || "").match(/^(\d{8})(\d+)$/);
    if (!match) {
      return max;
    }

    const invoiceKey = `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`;
    if (invoiceKey < start || invoiceKey > end) {
      return max;
    }

    return Math.max(max, Number(match[2]) || 0);
  }, 0);
  return `${invoiceDateKey.replaceAll("-", "")}${String(maxSequence + 1).padStart(3, "0")}`;
}

export async function readFinanceStoreFromBackend(token?: string): Promise<FinanceStore> {
  if (typeof window === "undefined") {
    return emptyFinanceStore();
  }

  const response = await fetch("/api/admin/finance", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  const result = (await response.json()) as Partial<FinanceStore> & { message?: string };
  if (!response.ok) {
    throw new Error(result.message || "Unable to load finance records.");
  }
  const store = mergeFinanceStoreWithFallback(normalizeFinanceStore(result), readFinanceStoreRecovery());
  writeLocalFinanceStore(store);
  return store;
}

export async function writeFinanceStoreToBackend(store: FinanceStore, token?: string): Promise<FinanceStore> {
  if (typeof window === "undefined") {
    return normalizeFinanceStore(store);
  }

  const normalizedStore = normalizeFinanceStore(store);
  writeLocalFinanceStore(normalizedStore, { notify: true });
  try {
    const response = await fetch("/api/admin/finance", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(normalizedStore),
    });
    const result = (await response.json()) as Partial<FinanceStore> & { message?: string };
    if (!response.ok) {
      throw new Error(result.message || "Unable to save finance records.");
    }
    const savedStore = mergeFinanceStoreWithFallback(normalizeFinanceStore(result), normalizedStore);
    writeLocalFinanceStore(savedStore, { notify: true });
    return savedStore;
  } catch {
    return normalizedStore;
  }
}

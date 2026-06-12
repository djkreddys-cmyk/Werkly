import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { emptyFinanceStore, type FinanceStore } from "@/lib/finance";

const financeStorePath = path.join(process.cwd(), "data", "finance-records.json");

function normalizeFinanceStore(store?: Partial<FinanceStore> | null): FinanceStore {
  return {
    invoices: Array.isArray(store?.invoices) ? store.invoices : [],
    bankAccounts: Array.isArray(store?.bankAccounts) ? store.bankAccounts : [],
    income: Array.isArray(store?.income) ? store.income : [],
    expenditure: Array.isArray(store?.expenditure) ? store.expenditure : [],
  };
}

export async function readServerFinanceStore(): Promise<FinanceStore> {
  try {
    const content = await readFile(financeStorePath, "utf8");
    return normalizeFinanceStore(JSON.parse(content) as Partial<FinanceStore>);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return emptyFinanceStore();
    }
    throw error;
  }
}

export async function writeServerFinanceStore(store: FinanceStore): Promise<FinanceStore> {
  const normalizedStore = normalizeFinanceStore(store);
  await mkdir(path.dirname(financeStorePath), { recursive: true });
  await writeFile(financeStorePath, JSON.stringify(normalizedStore, null, 2), "utf8");
  return normalizedStore;
}

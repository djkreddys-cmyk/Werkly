import { mkdir, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { emptyFinanceStore, type FinanceStore } from "@/lib/finance";

const financeStorePath = path.join("data", "finance-records.json");
const fallbackFinanceStorePath = path.join(tmpdir(), "werkly-finance-records.json");
let memoryFinanceStore: FinanceStore | null = null;

function normalizeFinanceStore(store?: Partial<FinanceStore> | null): FinanceStore {
  return {
    invoices: Array.isArray(store?.invoices) ? store.invoices : [],
    bankAccounts: Array.isArray(store?.bankAccounts) ? store.bankAccounts : [],
    income: Array.isArray(store?.income) ? store.income : [],
    expenditure: Array.isArray(store?.expenditure) ? store.expenditure : [],
  };
}

export async function readServerFinanceStore(): Promise<FinanceStore> {
  for (const storePath of [financeStorePath, fallbackFinanceStorePath]) {
    try {
      const content = await readFile(storePath, "utf8");
      const store = normalizeFinanceStore(JSON.parse(content) as Partial<FinanceStore>);
      memoryFinanceStore = store;
      return store;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        continue;
      }
    }
  }

  return memoryFinanceStore ?? emptyFinanceStore();
}

export async function writeServerFinanceStore(store: FinanceStore): Promise<FinanceStore> {
  const normalizedStore = normalizeFinanceStore(store);
  memoryFinanceStore = normalizedStore;
  const payload = JSON.stringify(normalizedStore, null, 2);

  for (const storePath of [financeStorePath, fallbackFinanceStorePath]) {
    try {
      await mkdir(path.dirname(storePath), { recursive: true });
      await writeFile(storePath, payload, "utf8");
      return normalizedStore;
    } catch {
      // Deployed hosts may make the app directory read-only; try the next store.
    }
  }

  return normalizedStore;
}

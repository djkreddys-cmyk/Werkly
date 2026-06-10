"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminClientInvoicesPanel } from "@/components/admin-client-invoices-panel";
import {
  readFinanceBankAccounts,
  readFinanceExpenditure,
  readFinanceIncome,
  readFinanceInvoices,
  removeFinanceBankAccount,
  removeFinanceExpenditure,
  removeFinanceIncome,
  removeFinanceInvoice,
  upsertFinanceBankAccount,
  upsertFinanceExpenditure,
  upsertFinanceIncome,
  writeFinanceInvoices,
  type FinanceBankAccountRecord,
  type FinanceExpenditureRecord,
  type FinanceIncomeRecord,
  type FinanceInvoiceRecord,
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

type FinancePanelView = "core" | "invoices" | "accounts";

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
  const [authType, setAuthType] = useState("");
  const [authRole, setAuthRole] = useState("");
  const [message, setMessage] = useState("");

  function refreshFinanceData(nextInvoices = readFinanceInvoices()) {
    setInvoices(nextInvoices);
    const nextBankAccounts = readFinanceBankAccounts();
    setBankAccounts(nextBankAccounts);
    setIncome(readFinanceIncome());
    setExpenditure(readFinanceExpenditure());
    setPaymentDrafts(
      nextInvoices.reduce<Record<string, PaymentDraft>>((drafts, invoice) => {
        const defaultBankAccountId = nextBankAccounts.find((account) => account.isPrimary)?.id || nextBankAccounts[0]?.id || "";
        drafts[invoice.id] = makePaymentDraft(invoice, defaultBankAccountId);
        return drafts;
      }, {})
    );
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshFinanceData();
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

  function handleSavePayment(invoice: FinanceInvoiceRecord) {
    const draft = paymentDrafts[invoice.id] || makePaymentDraft(invoice, primaryBankAccountId);
    const amountReceived = Math.min(parseAmount(draft.amountReceived), invoice.total);
    const paymentStatus = amountReceived <= 0 ? "unpaid" : amountReceived >= invoice.total ? "paid" : "partial";
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
    writeFinanceInvoices(nextInvoices);

    const incomeId = `invoice-income-${invoice.id}`;
    if (amountReceived > 0) {
      const existingIncome = readFinanceIncome().find((item) => item.id === incomeId);
      upsertFinanceIncome({
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
      });
    } else {
      removeFinanceIncome(incomeId);
    }

    refreshFinanceData(nextInvoices);
    setMessage(`Payment details saved for invoice ${invoice.invoiceNo}.`);
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

    removeFinanceInvoice(invoice.id);
    refreshFinanceData();
    setMessage(`Invoice ${invoice.invoiceNo} deleted from Finance.`);
  }

  function handlePrint(invoice: FinanceInvoiceRecord) {
    const html = buildPrintableInvoiceHtml(financeInvoiceToPrintableInvoice(invoice));
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

  function handleAddIncome() {
    const amount = parseAmount(incomeForm.amount);
    if (!incomeForm.source.trim() || amount <= 0) {
      setMessage("Add an income source and amount before saving.");
      return;
    }

    upsertFinanceIncome({
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
    });
    setIncomeForm(emptyFinanceForm());
    refreshFinanceData();
    setMessage("Income record saved.");
  }

  function handleAddExpense() {
    const amount = parseAmount(expenseForm.amount);
    if (!expenseForm.source.trim() || amount <= 0) {
      setMessage("Add a vendor/payee and amount before saving expenditure.");
      return;
    }

    upsertFinanceExpenditure({
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
    });
    setExpenseForm({ ...emptyFinanceForm(), mode: "UPI" });
    refreshFinanceData();
    setMessage("Expenditure record saved.");
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

    upsertFinanceBankAccount({
      id: `bank-${Date.now()}`,
      accountName: bankForm.accountName.trim(),
      bankName: bankForm.bankName.trim(),
      accountNumber: bankForm.accountNumber.trim(),
      ifscCode: bankForm.ifscCode.trim(),
      branch: bankForm.branch.trim(),
      openingBalance: parseAmount(bankForm.openingBalance),
      isPrimary: bankForm.isPrimary || bankAccounts.length === 0,
      createdAt: new Date().toISOString(),
    });
    setBankForm(emptyBankAccountForm());
    refreshFinanceData();
    setMessage("Werkly bank account saved.");
  }

  const isCoreView = view === "core";
  const isInvoicesView = view === "invoices";
  const showAccountsDetails = view === "core" || view === "accounts";

  return (
    <div className="space-y-6">
      {isInvoicesView ? (
        <AdminClientInvoicesPanel
          onFinanceInvoiceChange={() => {
            refreshFinanceData();
            setMessage("Invoice register updated.");
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
            refreshFinanceData();
            setMessage("Finance records refreshed.");
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

      {showAccountsDetails ? (
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
                <button type="button" className="mt-4 text-sm font-semibold text-red-700" onClick={() => { removeFinanceBankAccount(account.id); refreshFinanceData(); }}>
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
              {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.accountName}</option>)}
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
              {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.accountName}</option>)}
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
            removeFinanceIncome(id);
            refreshFinanceData();
          }}
        />
        <FinanceRecordTable
          title="Expenditure Records"
          records={expenditure.map((record) => ({ ...record, source: record.vendor, accountName: bankAccounts.find((account) => account.id === record.bankAccountId)?.accountName || "-" }))}
          emptyText="No expenditure records yet."
          onDelete={(id) => {
            removeFinanceExpenditure(id);
            refreshFinanceData();
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
                <div key={invoice.id} className="rounded-[1rem] border border-[var(--color-border)] bg-white p-5">
                  <div className="grid gap-4 xl:grid-cols-[1fr_1.6fr_auto]">
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">{invoice.invoiceNo}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{invoice.clientName}</p>
                      <p className="mt-2 text-xs text-[var(--color-muted)]">Invoice: {formatDate(invoice.invoiceDate)} | Due: {formatDate(invoice.dueDate)}</p>
                      <p className="mt-3 text-lg font-semibold text-[var(--color-ink)]">{formatCurrency(invoice.total)}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <select className="rounded-[1rem] border border-[var(--color-border)] px-3 py-2 text-sm" value={draft.paymentStatus} onChange={(event) => updatePaymentDraft(invoice.id, { paymentStatus: event.target.value as PaymentDraft["paymentStatus"] })}>
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                      </select>
                      <input className="rounded-[1rem] border border-[var(--color-border)] px-3 py-2 text-sm" placeholder="Amount received" inputMode="decimal" value={draft.amountReceived} onChange={(event) => updatePaymentDraft(invoice.id, { amountReceived: event.target.value })} />
                      <input className="rounded-[1rem] border border-[var(--color-border)] px-3 py-2 text-sm" type="date" value={draft.paymentDate} onChange={(event) => updatePaymentDraft(invoice.id, { paymentDate: event.target.value })} />
                      <select className="rounded-[1rem] border border-[var(--color-border)] px-3 py-2 text-sm" value={draft.paymentMode} onChange={(event) => updatePaymentDraft(invoice.id, { paymentMode: event.target.value })}>
                        <option>Bank Transfer</option>
                        <option>UPI</option>
                        <option>Cash</option>
                        <option>Cheque</option>
                        <option>Card</option>
                      </select>
                      <select className="rounded-[1rem] border border-[var(--color-border)] px-3 py-2 text-sm" value={draft.bankAccountId} onChange={(event) => updatePaymentDraft(invoice.id, { bankAccountId: event.target.value })}>
                        <option value="">Select bank account</option>
                        {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.accountName}</option>)}
                      </select>
                      <input className="rounded-[1rem] border border-[var(--color-border)] px-3 py-2 text-sm" placeholder="Reference" value={draft.paymentReference} onChange={(event) => updatePaymentDraft(invoice.id, { paymentReference: event.target.value })} />
                      <input className="rounded-[1rem] border border-[var(--color-border)] px-3 py-2 text-sm" placeholder="Payment notes" value={draft.paymentNotes} onChange={(event) => updatePaymentDraft(invoice.id, { paymentNotes: event.target.value })} />
                    </div>
                    <div className="flex flex-wrap items-start gap-2 xl:justify-end">
                      <button type="button" className="btn-secondary" onClick={() => handleSavePayment(invoice)}>Save Payment</button>
                      <button type="button" className="btn-secondary" onClick={() => handlePrint(invoice)}>Print</button>
                      {canDeleteInvoice ? (
                        <button type="button" className="btn-secondary border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleDelete(invoice)}>Delete</button>
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

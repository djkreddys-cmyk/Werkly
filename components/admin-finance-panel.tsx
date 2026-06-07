"use client";

import { useEffect, useMemo, useState } from "react";
import {
  readFinanceInvoices,
  removeFinanceInvoice,
  type FinanceInvoiceRecord,
} from "@/lib/finance";
import { buildPrintableInvoiceHtml, financeInvoiceToPrintableInvoice } from "@/lib/invoice-print";

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

export function AdminFinancePanel() {
  const [invoices, setInvoices] = useState<FinanceInvoiceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [authType, setAuthType] = useState("");
  const [authRole, setAuthRole] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setInvoices(readFinanceInvoices());
    setAuthType(window.localStorage.getItem("werklyAuthType") ?? "");
    setAuthRole(window.localStorage.getItem("werklyAuthRole") ?? "");
  }, []);

  const canDeleteInvoice =
    authType === "admin" || String(authRole).trim().toLowerCase() === "super-admin";

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return invoices;
    }

    return invoices.filter((invoice) => {
      return [
        invoice.invoiceNo,
        invoice.clientName,
        invoice.clientGstNumber,
        invoice.clientPanNumber,
        invoice.lines.map((line) => line.candidateName).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [invoices, search]);

  const totals = useMemo(
    () => ({
      invoices: filteredInvoices.length,
      candidates: filteredInvoices.reduce((sum, invoice) => sum + invoice.lines.length, 0),
      taxable: filteredInvoices.reduce((sum, invoice) => sum + invoice.taxable, 0),
      total: filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
    }),
    [filteredInvoices]
  );

  function refreshInvoices() {
    setInvoices(readFinanceInvoices());
    setMessage("Finance invoices refreshed.");
  }

  function handleDelete(invoice: FinanceInvoiceRecord) {
    if (!canDeleteInvoice) {
      setMessage("Only admin users can delete generated invoices.");
      return;
    }

    const confirmed = window.confirm(
      `Delete generated invoice "${invoice.invoiceNo}" from Finance?`
    );
    if (!confirmed) {
      return;
    }

    removeFinanceInvoice(invoice.id);
    setInvoices(readFinanceInvoices());
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

  return (
    <div className="space-y-6">
      <section className="accent-card p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-eyebrow">Finance</p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
              Generated invoice register.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-muted)]">
              Invoices generated from joined candidates are pushed here with client billing,
              candidate, tax, and payable details.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={refreshInvoices}>
            Refresh
          </button>
        </div>

        {message ? (
          <p className="mt-5 rounded-[1rem] border border-[rgba(10,118,132,0.18)] bg-[rgba(10,118,132,0.06)] px-4 py-3 text-sm font-medium text-[var(--color-dark)]">
            {message}
          </p>
        ) : null}

        <div className="mt-7 grid gap-4 md:grid-cols-4">
          <div className="rounded-[1rem] border border-[var(--color-border)] bg-white p-5">
            <p className="section-eyebrow">Invoices</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">{totals.invoices}</p>
          </div>
          <div className="rounded-[1rem] border border-[var(--color-border)] bg-white p-5">
            <p className="section-eyebrow">Candidates</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">{totals.candidates}</p>
          </div>
          <div className="rounded-[1rem] border border-[var(--color-border)] bg-white p-5">
            <p className="section-eyebrow">Taxable</p>
            <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
              {formatCurrency(totals.taxable)}
            </p>
          </div>
          <div className="rounded-[1rem] border border-[var(--color-border)] bg-white p-5">
            <p className="section-eyebrow">Amount Payable</p>
            <p className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
              {formatCurrency(totals.total)}
            </p>
          </div>
        </div>
      </section>

      <section className="accent-card p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow">Invoice Details</p>
            <h3 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
              Finance receivables
            </h3>
          </div>
          <label className="w-full max-w-md space-y-2">
            <span className="section-eyebrow">Search</span>
            <input
              className="w-full rounded-[1rem] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)] focus:ring-4 focus:ring-[rgba(10,118,132,0.12)]"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice, client, GST, PAN, candidate"
            />
          </label>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="mt-6 rounded-[1rem] border border-dashed border-[var(--color-border)] bg-[var(--color-soft)] p-8 text-center">
            <p className="font-semibold text-[var(--color-ink)]">No finance invoices yet.</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Generate an invoice from Client Invoices and it will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-[1rem] border border-[var(--color-border)]">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="sticky top-0 bg-[var(--color-soft)] text-left text-[0.66rem] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Candidates</th>
                  <th className="px-4 py-3">Taxable</th>
                  <th className="px-4 py-3">GST</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] bg-white">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="align-top hover:bg-[var(--color-soft)]">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[var(--color-ink)]">{invoice.invoiceNo}</p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        By {invoice.generatedBy}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[var(--color-ink)]">{invoice.clientName}</p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        GST {invoice.clientGstNumber || "-"} | PAN {invoice.clientPanNumber || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-[var(--color-muted)]">
                      <p>Invoice: {formatDate(invoice.invoiceDate)}</p>
                      <p>Due: {formatDate(invoice.dueDate)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[var(--color-ink)]">
                        {invoice.lines.length} item{invoice.lines.length === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 max-w-xs text-xs text-[var(--color-muted)]">
                        {invoice.lines.map((line) => line.candidateName).join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--color-ink)]">
                      {formatCurrency(invoice.taxable)}
                    </td>
                    <td className="px-4 py-4 text-[var(--color-muted)]">
                      {formatCurrency(invoice.cgst + invoice.sgst)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[var(--color-ink)]">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handlePrint(invoice)}
                        >
                          Print
                        </button>
                        {canDeleteInvoice ? (
                          <button
                            type="button"
                            className="btn-secondary border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(invoice)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

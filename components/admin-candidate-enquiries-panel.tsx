"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CandidateEnquiry, CandidateEnquiryPayload } from "@/lib/jobs";
import { formatPersonName } from "@/lib/format";

const emptyEnquiryForm: CandidateEnquiryPayload = {
  candidateName: "",
  candidateEmail: "",
  candidatePhone: "",
  experience: "",
  currentCompany: "",
  currentLocation: "",
  currentDesignation: "",
  preferredRole: "",
  currentCtc: "",
  expectedCtc: "",
  preferredLocation: "",
  preferredSector: "",
  candidateMessage: "",
  resumeFileName: "",
  resumeFileType: "",
  resumeFileData: "",
  sourceType: "manual_candidate_enquiry",
};

const fieldClassName =
  "w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]";

const enquiryFormFields: Array<{
  field: keyof CandidateEnquiryPayload;
  label: string;
  required?: boolean;
}> = [
  { field: "candidateName", label: "Candidate Name", required: true },
  { field: "candidateEmail", label: "Email" },
  { field: "candidatePhone", label: "Phone" },
  { field: "experience", label: "Experience" },
  { field: "currentCompany", label: "Current Company" },
  { field: "currentLocation", label: "Current Location" },
  { field: "currentDesignation", label: "Current Designation" },
  { field: "preferredRole", label: "Preferred Role" },
  { field: "preferredLocation", label: "Preferred Location" },
  { field: "preferredSector", label: "Preferred Sector" },
  { field: "currentCtc", label: "Current CTC" },
  { field: "expectedCtc", label: "Expected CTC" },
  { field: "sourceType", label: "Source" },
];

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mapImportRow(headers: string[], row: string[]): CandidateEnquiryPayload {
  const values = new Map<string, string>();
  headers.forEach((header, index) => values.set(normalizeHeader(header), row[index] ?? ""));
  const getValue = (...keys: string[]) =>
    keys.map((key) => values.get(normalizeHeader(key)) ?? "").find(Boolean) ?? "";

  return {
    candidateName: getValue("Candidate Name", "Name"),
    candidateEmail: getValue("Email", "Email ID", "Mail ID"),
    candidatePhone: getValue("Phone", "Mobile", "Mobile No", "Contact"),
    experience: getValue("Experience", "Total Exp", "Total Experience"),
    currentCompany: getValue("Current Company", "Company"),
    currentLocation: getValue("Current Location", "Location"),
    currentDesignation: getValue("Current Designation", "Designation"),
    preferredRole: getValue("Preferred Role", "Position", "Role"),
    currentCtc: getValue("Current CTC", "CTC"),
    expectedCtc: getValue("Expected CTC"),
    preferredLocation: getValue("Preferred Location"),
    preferredSector: getValue("Preferred Sector", "Sector"),
    candidateMessage: getValue("Remarks", "Notes", "Candidate Note"),
    sourceType: getValue("Source") || "excel_import",
  };
}

export function AdminCandidateEnquiriesPanel() {
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [authType] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthType") ?? "admin"
      : "admin"
  );
  const [authRole] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthRole") ?? "super-admin"
      : "super-admin"
  );
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [enquiries, setEnquiries] = useState<CandidateEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<CandidateEnquiryPayload>(emptyEnquiryForm);
  const isSuperAdmin = authType === "admin" || authRole === "super-admin";

  useEffect(() => {
    if (!token) {
      return;
    }

    fetch("/api/admin/candidate-enquiries", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          enquiries?: CandidateEnquiry[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(result.message || "Unable to load candidate enquiries.");
        }

        setEnquiries(result.enquiries ?? []);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load candidate enquiries."
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  function updateForm(field: keyof CandidateEnquiryPayload, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleResumeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Resume file must be 5 MB or smaller.");
      return;
    }

    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read the selected resume."));
      reader.readAsDataURL(file);
    });

    setForm((current) => ({
      ...current,
      resumeFileName: file.name,
      resumeFileType: file.type,
      resumeFileData: fileData,
    }));
  }

  async function saveCandidateEnquiry(payload: CandidateEnquiryPayload) {
    const response = await fetch("/api/admin/candidate-enquiries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as CandidateEnquiry & { message?: string };
    if (!response.ok) {
      throw new Error(result.message || "Unable to save candidate enquiry.");
    }
    return result;
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    if (!form.candidateName?.trim() || (!form.candidateEmail?.trim() && !form.candidatePhone?.trim())) {
      setError("Candidate name and either email or phone are required.");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const created = await saveCandidateEnquiry({
        ...form,
        sourceType: form.sourceType || "manual_candidate_enquiry",
      });
      setEnquiries((current) => [created, ...current]);
      setForm(emptyEnquiryForm);
      setIsAddOpen(false);
      setMessage("Candidate enquiry added successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save candidate enquiry.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!isSuperAdmin) {
      setError("Only Super Admin can import candidate enquiries.");
      return;
    }

    setIsImporting(true);
    setError("");
    setMessage("");

    try {
      const text = await file.text();
      const rows = parseCsvRows(text);
      const [headers, ...dataRows] = rows;
      if (!headers || dataRows.length === 0) {
        throw new Error("Import file must include headers and at least one candidate row.");
      }

      const payloads = dataRows
        .map((row) => mapImportRow(headers, row))
        .filter((payload) => payload.candidateName && (payload.candidateEmail || payload.candidatePhone));

      if (payloads.length === 0) {
        throw new Error("No valid candidate rows found. Candidate Name and Email or Phone are required.");
      }

      const existingKeys = new Set(
        enquiries.flatMap((enquiry) => [
          enquiry.candidateEmail ? `email:${enquiry.candidateEmail.toLowerCase()}` : "",
          enquiry.candidatePhone ? `phone:${enquiry.candidatePhone.replace(/\D/g, "")}` : "",
        ]).filter(Boolean)
      );
      const uniquePayloads = payloads.filter((payload) => {
        const emailKey = payload.candidateEmail ? `email:${payload.candidateEmail.toLowerCase()}` : "";
        const phoneKey = payload.candidatePhone ? `phone:${payload.candidatePhone.replace(/\D/g, "")}` : "";
        if ((emailKey && existingKeys.has(emailKey)) || (phoneKey && existingKeys.has(phoneKey))) {
          return false;
        }
        if (emailKey) existingKeys.add(emailKey);
        if (phoneKey) existingKeys.add(phoneKey);
        return true;
      });

      if (uniquePayloads.length === 0) {
        setMessage("No new rows imported. All valid rows already exist by email or phone.");
        return;
      }

      const created = await Promise.all(uniquePayloads.map((payload) => saveCandidateEnquiry(payload)));
      setEnquiries((current) => [...created, ...current]);
      setMessage(`Imported ${created.length} candidate enquiries. Skipped ${payloads.length - uniquePayloads.length} duplicate rows.`);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Unable to import candidate enquiries.");
    } finally {
      setIsImporting(false);
    }
  }

  const filteredEnquiries = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return enquiries;
    }

    return enquiries.filter((enquiry) =>
      [
        enquiry.candidateName,
        enquiry.candidateEmail,
        enquiry.candidatePhone,
        enquiry.preferredRole,
        enquiry.preferredLocation,
        enquiry.preferredSector,
        enquiry.currentCompany,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(trimmed))
    );
  }, [enquiries, query]);
  const duplicateEnquiryMatches = useMemo(() => {
    const normalizedEmail = String(form.candidateEmail || "").trim().toLowerCase();
    const normalizedPhone = String(form.candidatePhone || "").replace(/\D/g, "");

    if (!normalizedEmail && !normalizedPhone) {
      return [];
    }

    return enquiries.filter((enquiry) => {
      const enquiryEmail = String(enquiry.candidateEmail || "").trim().toLowerCase();
      const enquiryPhone = String(enquiry.candidatePhone || "").replace(/\D/g, "");
      return Boolean(
        (normalizedEmail && enquiryEmail === normalizedEmail) ||
          (normalizedPhone && enquiryPhone === normalizedPhone)
      );
    });
  }, [enquiries, form.candidateEmail, form.candidatePhone]);

  return (
    <section id="general-candidate-enquiries" className="accent-card scroll-mt-28 p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Candidate Enquiries</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
            Review general candidate enquiries from the website.
          </h2>
          <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
            These are candidates who submitted their profile through the website enquiry form without applying for a specific job.
          </p>
        </div>

        <div className="grid w-full gap-3 md:grid-cols-2 xl:max-w-4xl xl:grid-cols-[minmax(260px,1fr)_auto_auto] xl:items-end">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, phone, role, location"
              className={fieldClassName}
            />
          </label>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="h-[50px] rounded-2xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
          >
            Add Candidate Enquiry
          </button>
          {isSuperAdmin ? (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImportFile}
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={isImporting}
                className="h-[50px] rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isImporting ? "Importing..." : "Import Excel"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}
      {message ? <p className="mt-4 text-sm font-medium text-[var(--color-dark)]">{message}</p> : null}
      {isSuperAdmin ? (
        <p className="muted-copy mt-3 text-sm">
          Import supports Excel-compatible CSV files with headers like Candidate Name, Email, Phone,
          Experience, Current Company, Preferred Role, Preferred Location, Source, and Remarks.
        </p>
      ) : null}

      {isLoading ? (
        <p className="muted-copy mt-6 text-sm">Loading candidate enquiries...</p>
      ) : filteredEnquiries.length === 0 ? (
        <p className="muted-copy mt-6 text-sm">No general candidate enquiries found.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                  {[
                    "Candidate",
                    "Contact",
                    "Preferred Role",
                    "Current Profile",
                    "Resume",
                    "Submitted",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEnquiries.map((enquiry, index) => (
                  <tr
                    key={enquiry.id}
                    className={
                      index === filteredEnquiries.length - 1
                        ? "align-top"
                        : "align-top border-b border-[var(--color-line)]"
                    }
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[var(--color-ink)]">
                        {formatPersonName(enquiry.candidateName)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {enquiry.candidateMessage || "No additional note"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      <p>{enquiry.candidateEmail}</p>
                      {enquiry.candidatePhone ? <p className="mt-1">{enquiry.candidatePhone}</p> : null}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      <p className="font-medium text-[var(--color-ink)]">
                        {enquiry.preferredRole || "Not added"}
                      </p>
                      <p className="mt-1">
                        {enquiry.preferredLocation || "Location not added"}
                      </p>
                      {enquiry.preferredSector ? <p className="mt-1">{enquiry.preferredSector}</p> : null}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      <p>{enquiry.currentCompany || "Current company not added"}</p>
                      {enquiry.currentDesignation ? <p className="mt-1">{enquiry.currentDesignation}</p> : null}
                      {enquiry.experience ? <p className="mt-1">{enquiry.experience}</p> : null}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {enquiry.resumeFileData && enquiry.resumeFileName ? (
                        <a
                          href={enquiry.resumeFileData}
                          download={enquiry.resumeFileName}
                          className="font-medium text-[var(--color-accent-strong)]"
                        >
                          Download Resume
                        </a>
                      ) : (
                        "Not uploaded"
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {new Date(enquiry.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAddOpen ? (
        <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-slate-950/55 p-3 sm:p-4 lg:items-center">
          <div className="my-3 flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] sm:my-4 sm:max-h-[calc(100vh-2rem)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-line)] px-4 py-4 sm:px-6">
              <div>
                <p className="eyebrow">Candidate Enquiry</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  Add old or direct candidate profile.
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleManualSubmit}>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                {duplicateEnquiryMatches.length > 0 ? (
                  <div className="mb-4 rounded-2xl border border-[rgba(190,72,26,0.24)] bg-[rgba(190,72,26,0.08)] px-4 py-3 text-sm text-[var(--color-accent-strong)]">
                    Candidate enquiry already exists with the same
                    {String(form.candidateEmail || "").trim() &&
                    String(form.candidatePhone || "").trim()
                      ? " email or phone"
                      : String(form.candidateEmail || "").trim()
                        ? " email"
                        : " phone"}
                    . You can still save if this is intentionally a separate record.
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {enquiryFormFields.map(({ field, label, required }) => (
                    <label key={field} className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        {label}
                      </span>
                      <input
                        className={fieldClassName}
                        value={String(form[field] ?? "")}
                        onChange={(event) =>
                          updateForm(field, event.target.value)
                        }
                        required={Boolean(required)}
                      />
                    </label>
                  ))}
                  <label className="block sm:col-span-2 xl:col-span-3">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Remarks
                    </span>
                    <textarea
                      className={`${fieldClassName} min-h-[130px] resize-y`}
                      value={form.candidateMessage ?? ""}
                      onChange={(event) => updateForm("candidateMessage", event.target.value)}
                      placeholder="Old database note, reference details, or migration remarks"
                    />
                  </label>
                </div>

                <div className="mt-4 rounded-2xl border border-[var(--color-line)] bg-[rgba(8,96,108,0.03)] px-4 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center rounded-2xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]">
                      Upload Resume
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="sr-only"
                        onChange={handleResumeUpload}
                      />
                    </label>
                    <span className="text-sm text-[var(--color-muted)]">
                      {form.resumeFileName || "No file chosen"}
                    </span>
                    <span className="text-xs font-medium text-[var(--color-muted)]">
                      Will be saved as compressed PDF
                    </span>
                    {form.resumeFileData && form.resumeFileName ? (
                      <>
                        <a
                          href={form.resumeFileData}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-[var(--color-accent-strong)]"
                        >
                          View Resume
                        </a>
                        <a
                          href={form.resumeFileData}
                          download={form.resumeFileName}
                          className="text-sm font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
                        >
                          Download
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--color-line)] bg-white px-4 py-4 sm:flex-row sm:px-6">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Save Candidate Enquiry"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

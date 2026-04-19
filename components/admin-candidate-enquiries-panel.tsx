"use client";

import { useEffect, useMemo, useState } from "react";
import type { CandidateEnquiry } from "@/lib/jobs";

export function AdminCandidateEnquiriesPanel() {
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [enquiries, setEnquiries] = useState<CandidateEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

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

        <div className="w-full max-w-md">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, phone, role, location"
            className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
          />
        </div>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}

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
                        {enquiry.candidateName}
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
    </section>
  );
}

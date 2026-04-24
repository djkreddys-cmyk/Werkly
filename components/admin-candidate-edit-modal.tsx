"use client";

import { useEffect, useState } from "react";
import {
  type JobApplication,
  type JobApplicationUpdatePayload,
  updateJobApplicationDetails,
} from "@/lib/jobs";

const fieldClassName =
  "w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]";

const sourceOptions = [
  "Website",
  "Referral",
  "Vendor",
  "WhatsApp",
  "Naukri",
  "LinkedIn",
  "Internal Database",
  "Walk-in",
  "Other",
];

type CandidateEditFormState = {
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  experience: string;
  currentCompany: string;
  currentLocation: string;
  currentDesignation: string;
  preferredRole: string;
  currentCtc: string;
  expectedCtc: string;
  preferredLocation: string;
  preferredSector: string;
  sourceType: string;
  sourceNote: string;
  candidateMessage: string;
  resumeFileName: string;
  resumeFileType: string;
  resumeFileData: string;
};

function createFormState(application: JobApplication): CandidateEditFormState {
  return {
    candidateName: application.candidateName || "",
    candidateEmail: application.candidateEmail || "",
    candidatePhone: application.candidatePhone || "",
    experience: application.experience || "",
    currentCompany: application.currentCompany || "",
    currentLocation: application.currentLocation || "",
    currentDesignation: application.currentDesignation || "",
    preferredRole: application.preferredRole || "",
    currentCtc: application.currentCtc || "",
    expectedCtc: application.expectedCtc || "",
    preferredLocation: application.preferredLocation || "",
    preferredSector: application.preferredSector || "",
    sourceType: application.sourceType || "Website",
    sourceNote: application.sourceNote || "",
    candidateMessage: application.candidateMessage || "",
    resumeFileName: application.resumeFileName || "",
    resumeFileType: application.resumeFileType || "",
    resumeFileData: application.resumeFileData || "",
  };
}

export function AdminCandidateEditModal({
  token,
  application,
  canViewCompensation = true,
  onClose,
  onSaved,
}: {
  token: string;
  application: JobApplication | null;
  canViewCompensation?: boolean;
  onClose: () => void;
  onSaved: (application: JobApplication) => void;
}) {
  const [form, setForm] = useState<CandidateEditFormState | null>(
    application ? createFormState(application) : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!application) {
      setForm(null);
      setError("");
      setIsSaving(false);
      return;
    }

    setForm(createFormState(application));
    setError("");
    setIsSaving(false);
  }, [application]);

  useEffect(() => {
    if (!application || typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [application, onClose]);

  if (!application || !form) {
    return null;
  }

  const currentApplication = application;

  function updateField<Key extends keyof CandidateEditFormState>(
    key: Key,
    value: CandidateEditFormState[Key]
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleResumeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read the selected resume."));
      reader.readAsDataURL(file);
    });

    setForm((current) =>
      current
        ? {
            ...current,
            resumeFileName: file.name,
            resumeFileType: file.type,
            resumeFileData: fileData,
          }
        : current
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) {
      return;
    }

    if (!form.candidateName.trim()) {
      setError("Candidate name is required.");
      return;
    }

    if (!form.candidateEmail.trim() && !form.candidatePhone.trim()) {
      setError("At least email or phone number is required.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const payload: JobApplicationUpdatePayload = {
        candidateName: form.candidateName.trim(),
        candidateEmail: form.candidateEmail.trim() || undefined,
        candidatePhone: form.candidatePhone.trim() || undefined,
        experience: form.experience.trim() || undefined,
        currentCompany: form.currentCompany.trim() || undefined,
        currentLocation: form.currentLocation.trim() || undefined,
        currentDesignation: form.currentDesignation.trim() || undefined,
        preferredRole: form.preferredRole.trim() || undefined,
        currentCtc: form.currentCtc.trim() || undefined,
        expectedCtc: form.expectedCtc.trim() || undefined,
        preferredLocation: form.preferredLocation.trim() || undefined,
        preferredSector: form.preferredSector.trim() || undefined,
        sourceType: form.sourceType.trim() || undefined,
        sourceNote: form.sourceNote.trim() || undefined,
        candidateMessage: form.candidateMessage.trim() || undefined,
        resumeFileName: form.resumeFileName || undefined,
        resumeFileType: form.resumeFileType || undefined,
        resumeFileData: form.resumeFileData || undefined,
      };

      const updatedApplication = await updateJobApplicationDetails(
        currentApplication.id,
        payload,
        token
      );
      onSaved(updatedApplication);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to update candidate details."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[160] flex items-start justify-center overflow-y-auto bg-slate-950/55 p-3 sm:p-4 lg:items-center">
      <div className="my-3 flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.5rem] border border-[var(--color-line)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] sm:my-4 sm:max-h-[calc(100vh-2rem)] sm:rounded-[1.8rem]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-line)] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="eyebrow">Edit Candidate</p>
            <h3 className="mt-3 text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">
              {application.candidateName}
              {currentApplication.candidateName}
            </h3>
            <p className="muted-copy mt-2 text-sm">
              Update missing candidate details, contact info, profile summary fields, and resume.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
          >
            Close
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Candidate Name
                </span>
                <input
                  className={fieldClassName}
                  placeholder="Candidate name"
                  value={form.candidateName}
                  onChange={(event) => updateField("candidateName", event.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Email
                </span>
                <input
                  className={fieldClassName}
                  placeholder="Email"
                  value={form.candidateEmail}
                  onChange={(event) => updateField("candidateEmail", event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Phone
                </span>
                <input
                  className={fieldClassName}
                  placeholder="Phone"
                  value={form.candidatePhone}
                  onChange={(event) => updateField("candidatePhone", event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Experience
                </span>
                <input
                  className={fieldClassName}
                  placeholder="Experience"
                  value={form.experience}
                  onChange={(event) => updateField("experience", event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Current Company
                </span>
                <input
                  className={fieldClassName}
                  placeholder="Current company"
                  value={form.currentCompany}
                  onChange={(event) => updateField("currentCompany", event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Current Location
                </span>
                <input
                  className={fieldClassName}
                  placeholder="Current location"
                  value={form.currentLocation}
                  onChange={(event) => updateField("currentLocation", event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Current Designation
                </span>
                <input
                  className={fieldClassName}
                  placeholder="Current designation"
                  value={form.currentDesignation}
                  onChange={(event) => updateField("currentDesignation", event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Preferred Role
                </span>
                <input
                  className={fieldClassName}
                  placeholder="Preferred role"
                  value={form.preferredRole}
                  onChange={(event) => updateField("preferredRole", event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Preferred Location
                </span>
                <input
                  className={fieldClassName}
                  placeholder="Preferred location"
                  value={form.preferredLocation}
                  onChange={(event) => updateField("preferredLocation", event.target.value)}
                />
              </label>
              {canViewCompensation ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Current CTC
                    </span>
                    <input
                      className={fieldClassName}
                      placeholder="Current CTC"
                      value={form.currentCtc}
                      onChange={(event) => updateField("currentCtc", event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Expected CTC
                    </span>
                    <input
                      className={fieldClassName}
                      placeholder="Expected CTC"
                      value={form.expectedCtc}
                      onChange={(event) => updateField("expectedCtc", event.target.value)}
                    />
                  </label>
                </>
              ) : null}
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Preferred Sector
                </span>
                <input
                  className={fieldClassName}
                  placeholder="Preferred sector"
                  value={form.preferredSector}
                  onChange={(event) => updateField("preferredSector", event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Source
                </span>
                <select
                  className={fieldClassName}
                  value={form.sourceType}
                  onChange={(event) => updateField("sourceType", event.target.value)}
                >
                  {sourceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2 xl:col-span-3">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Remarks
                </span>
                <textarea
                  className={`${fieldClassName} min-h-[120px] resize-y`}
                  placeholder="Candidate remarks or profile summary"
                  value={form.candidateMessage}
                  onChange={(event) => updateField("candidateMessage", event.target.value)}
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--color-line)] bg-[rgba(8,96,108,0.03)] px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]">
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

            {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--color-line)] bg-white px-4 py-4 sm:flex-row sm:flex-wrap sm:px-6">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save Candidate"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

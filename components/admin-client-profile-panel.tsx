"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminJobIdTrigger } from "@/components/admin-job-id-trigger";
import type {
  ClientActivityRecord,
  ClientFollowUpStatus,
  ClientOnboardingStatus,
  ClientRecord,
} from "@/lib/crm";
import {
  isLeadOnboardingStatus,
  normalizeClientFollowUpStatus,
  normalizeGeneralClientFollowUpStatus,
} from "@/lib/crm";

function formatDateLabel(value?: string) {
  if (!value) {
    return "Not added";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeLabel(value?: string) {
  if (!value) {
    return "Not added";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatFollowUpStage(stage?: string, isLeadFlow = false) {
  const safeStage = isLeadFlow
    ? normalizeClientFollowUpStatus(stage)
    : normalizeGeneralClientFollowUpStatus(stage);
  return safeStage
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function FollowUpStatusPill({ status }: { status?: string }) {
  return (
    <span className="inline-flex rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
      {formatFollowUpStage(status)}
    </span>
  );
}

const defaultProposalMessage = `Dear Sir,

Greetings from Werkly Consulting!

It was nice talking to you over the phone last Friday. As discussed, please find the details below.

As a legacy-driven, diversity-powered recruitment partner, we are writing to express our keen interest in building a long-term, impactful partnership with your organization. We are confident that we can support you in meeting your hiring goals across all levels and functions.

Werkly Consulting is a recruitment solution provider with a pan-India presence, 2 branch offices in Hyderabad and Vijayawada, and a team of trained recruiters and HR professionals. We specialize in both technical and non-technical hiring, supporting some of the country's most respected brands.

Our Key Strengths:

Legacy of Trusted Performance: We bring strong credibility to the table, serving top clients across Non-IT and IT sectors.
Diversity Hiring Champions: We are proud to be a 100% diversity-driven organization with deep experience in supporting inclusive hiring across industries.
Industry-Specific Expertise: From Automobile, Pharma, Manufacturing, ITES, Healthcare, FMCG, Oil & Gas, Defense, and Aerospace, we understand the nuances of hiring in each sector.
Tech-Driven, Human-Led Recruitment: Our sourcing is powered by trained recruiters with technical knowledge and domain understanding, ensuring precision shortlisting and fast turnaround times.
Strong Offer-to-Join Ratio: 95%+ for Non-IT hires.
Deep Understanding of Business Needs: We take time to understand your business requirements, job specifications, and expectations from the hiring manager before initiating any search.
Partnership Approach: We believe in working as a recruitment partner, not just a vendor, fostering collaboration, open discussions, and shared success.

We take pride in delivering an exceptional candidate experience and consultative partnership with our clients. Our team works closely with C-suite leaders, providing market insights, identifying top talent, and structuring high-performing teams to meet organizational goals.

Why Partner with Werkly?

Trusted by Top Indian Brands
Proven Track Record Across Functions
Customizable Hiring Models
Agile & Transparent Process

Professional Charges for Permanent Employment - Non-IT Commercials:

Junior Management (Executive to Asst. Manager): 8.33%
Middle Management (Deputy Manager to DGM): 8.33%
Senior Management (GM / AVP / VP & Above): 10%
CXO Positions: 15%

Payment Schedule: Payment should be made within 30 days after the candidate joins your organization.

Replacement Guarantee: We provide a one-time free replacement guarantee at no additional cost in the event a candidate sourced, selected, and engaged by us leaves your organization within 90 working days from their date of joining.

Please feel free to reach out if you have any queries or would like to discuss further. We look forward to the opportunity to work together.

Awaiting a positive revert from your end.

Regards,
Werkly Consulting`;

function formatProposalHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => {
      const escaped = paragraph
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")
        .replace(/\n/g, "<br />");
      return `<p>${escaped}</p>`;
    })
    .join("");
}

type ProposalAttachment = {
  filename: string;
  content: string;
};

export function AdminClientProfilePanel({ clientId }: { clientId: string }) {
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [activity, setActivity] = useState<ClientActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [onboardingStatus, setOnboardingStatus] = useState<ClientOnboardingStatus>("new-lead");
  const [onboardingNotes, setOnboardingNotes] = useState("");
  const [followUpStatus, setFollowUpStatus] = useState<ClientFollowUpStatus>("pending");
  const [lastFollowUpDate, setLastFollowUpDate] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [proposalToEmails, setProposalToEmails] = useState("");
  const [proposalCcEmails, setProposalCcEmails] = useState("");
  const [copySender, setCopySender] = useState(true);
  const [proposalSubject, setProposalSubject] = useState(
    "Recruitment Partnership Proposal - Werkly Consulting"
  );
  const [proposalMessage, setProposalMessage] = useState(formatProposalHtml(defaultProposalMessage));
  const [proposalAttachments, setProposalAttachments] = useState<ProposalAttachment[]>([]);
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const proposalEditorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      fetch(`/api/admin/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/admin/clients/${clientId}/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([clientResponse, activityResponse]) => {
        const clientResult = (await clientResponse.json()) as ClientRecord & { message?: string };
        const activityResult = (await activityResponse.json()) as {
          activity?: ClientActivityRecord[];
          message?: string;
        };

        if (!clientResponse.ok) {
          throw new Error(clientResult.message || "Unable to load client.");
        }

        if (!activityResponse.ok) {
          throw new Error(activityResult.message || "Unable to load client activity.");
        }

        setClient(clientResult);
        setActivity(activityResult.activity ?? []);
        setOnboardingStatus(clientResult.onboardingStatus || "new-lead");
        setOnboardingNotes(clientResult.notes || "");
        setFollowUpStatus(
          isLeadOnboardingStatus(clientResult.onboardingStatus)
            ? normalizeClientFollowUpStatus(clientResult.followUpStatus)
            : normalizeGeneralClientFollowUpStatus(clientResult.followUpStatus)
        );
        setLastFollowUpDate(clientResult.lastFollowUpDate || "");
        setNextFollowUpDate(clientResult.nextFollowUpDate || "");
        setFollowUpNotes(clientResult.followUpNotes || "");
        setProposalToEmails(
          [clientResult.contactEmail, clientResult.secondaryContactEmail]
            .filter(Boolean)
            .join(", ")
        );
        setProposalMessage(formatProposalHtml(defaultProposalMessage));
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load client profile.");
      })
      .finally(() => setIsLoading(false));
  }, [clientId, token]);

  const historySummary = useMemo(
    () => ({
      total: activity.length,
      closed: activity.filter((item) => normalizeClientFollowUpStatus(item.toStatus) === "on-boarded").length,
      due: activity.filter((item) => normalizeClientFollowUpStatus(item.toStatus) === "positive-need-followup").length,
    }),
    [activity]
  );

  async function refreshActivity(clientRecord?: ClientRecord) {
    if (!token || !clientRecord) {
      return;
    }

    const activityResponse = await fetch(`/api/admin/clients/${clientRecord.id}/activity`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const activityResult = (await activityResponse.json()) as {
      activity?: ClientActivityRecord[];
      message?: string;
    };

    if (activityResponse.ok) {
      setActivity(activityResult.activity ?? []);
    }
  }

  async function handleSaveOnboarding() {
    if (!token || !client) {
      return;
    }

    setIsSavingOnboarding(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/clients/${client.id}/onboarding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          onboardingStatus,
          notes: onboardingNotes,
        }),
      });

      const result = (await response.json()) as ClientRecord & { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to save onboarding update.");
      }

      setClient(result);
      setMessage("Onboarding stage updated successfully.");
      await refreshActivity(result);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save onboarding update."
      );
    } finally {
      setIsSavingOnboarding(false);
    }
  }

  async function handleSaveFollowUp() {
    if (!token || !client) {
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/clients/${client.id}/follow-up`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          followUpStatus,
          lastFollowUpDate,
          nextFollowUpDate,
          followUpNotes,
        }),
      });

      const result = (await response.json()) as ClientRecord & { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to save follow-up.");
      }

      setClient(result);
      setMessage("Follow-up updated successfully.");
      await refreshActivity(result);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save follow-up.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendProposal() {
    if (!token || !client) {
      return;
    }

    const toEmails = proposalToEmails
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    const ccEmails = proposalCcEmails
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    if (!toEmails.length) {
      setError("Please add at least one client email before sending proposal mail.");
      return;
    }

    setIsSendingProposal(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/clients/${client.id}/proposal-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toEmails,
          ccEmails,
          copySender,
          subject: proposalSubject,
          message: proposalEditorRef.current?.innerText || "",
          htmlMessage: proposalEditorRef.current?.innerHTML || proposalMessage,
          attachments: proposalAttachments,
        }),
      });
      const result = (await response.json()) as {
        client?: ClientRecord;
        sentTo?: string[];
        message?: string;
      };

      if (!response.ok || !result.client) {
        throw new Error(result.message || "Unable to send proposal mail.");
      }

      setClient(result.client);
      setOnboardingStatus(result.client.onboardingStatus || "proposal-shared");
      setOnboardingNotes(result.client.notes || "");
      setFollowUpStatus(normalizeClientFollowUpStatus(result.client.followUpStatus));
      setLastFollowUpDate(result.client.lastFollowUpDate || "");
      setNextFollowUpDate(result.client.nextFollowUpDate || "");
      setFollowUpNotes(result.client.followUpNotes || "");
      setMessage(result.message || "Proposal email sent successfully.");
      await refreshActivity(result.client);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send proposal mail.");
    } finally {
      setIsSendingProposal(false);
    }
  }

  function applyProposalFormat(command: string, value?: string) {
    proposalEditorRef.current?.focus();
    document.execCommand(command, false, value);
    setProposalMessage(proposalEditorRef.current?.innerHTML || "");
  }

  async function handleProposalAttachmentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    const maxSize = 8 * 1024 * 1024;
    const oversized = files.find((file) => file.size > maxSize);
    if (oversized) {
      setError("Each proposal attachment must be 8 MB or smaller.");
      event.target.value = "";
      return;
    }

    const attachments = await Promise.all(
      files.map(
        (file) =>
          new Promise<ProposalAttachment>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = String(reader.result || "");
              resolve({
                filename: file.name,
                content: dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl,
              });
            };
            reader.onerror = () => reject(new Error("Unable to read proposal attachment."));
            reader.readAsDataURL(file);
          })
      )
    );

    setProposalAttachments((current) => [...current, ...attachments]);
    event.target.value = "";
  }

  if (!token) {
    return (
      <section className="accent-card p-6">
        <p className="eyebrow">Session Required</p>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
          Sign in to view the client profile.
        </h2>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="accent-card p-6">
        <p className="muted-copy text-sm">Loading client profile...</p>
      </section>
    );
  }

  if (error && !client) {
    return (
      <section className="accent-card p-6">
        <p className="text-sm font-medium text-red-700">{error}</p>
      </section>
    );
  }

  if (!client) {
    return (
      <section className="accent-card p-6">
        <p className="muted-copy text-sm">Client not found.</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="accent-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Client Profile</p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">
              {client.companyName}
            </h2>
            <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
              Review company details, onboarding stage, current follow-up status, linked jobs,
              and the latest CRM history for this account.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/clients/existing"
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
            >
              Back to Clients
            </Link>
            <Link
              href="/admin/reports/clients"
              className="rounded-2xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
            >
              Open Reports
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="accent-card p-5">
          <p className="eyebrow">Owner</p>
          <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            {client.assignedEmployeeName || "Not assigned"}
          </p>
        </article>
        <article className="accent-card p-5">
          <p className="eyebrow">Onboarding</p>
          <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            {formatFollowUpStage(client.onboardingStatus || "new-lead")}
          </p>
        </article>
        <article className="accent-card p-5">
          <p className="eyebrow">Follow-Up Status</p>
          <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            {formatFollowUpStage(client.followUpStatus)}
          </p>
        </article>
        <article className="accent-card p-5">
          <p className="eyebrow">Linked Jobs</p>
          <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            {client.linkedJobsCount}
          </p>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <article id="proposal-mail" className="accent-card p-6">
          <p className="eyebrow">Account Details</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Contact Person", client.contactPerson],
              ["Contact Email", client.contactEmail || "Not added"],
              ["Contact Phone", client.contactPhone || "Not added"],
              ["Second Contact Person", client.secondaryContactPerson || "Not added"],
              ["Second Contact Email", client.secondaryContactEmail || "Not added"],
              ["Second Contact Phone", client.secondaryContactPhone || "Not added"],
              ["Communication Address", client.communicationAddress || "Not added"],
              ["Sector", client.sector || "Not added"],
              ["Branch", client.branch || "Not added"],
              ["Client Status", formatFollowUpStage(client.status)],
              ["Onboarding Source", client.onboardingSource || "Not added"],
              ["Created On", formatDateLabel(client.createdAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.2rem] border border-[var(--color-line)] bg-white p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  {label}
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[1.2rem] border border-[var(--color-line)] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Onboarding Notes
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              {client.notes || "No onboarding notes added yet."}
            </p>
          </div>
        </article>

        <article className="accent-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Onboarding Update</p>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                Update client onboarding stage
              </h3>
            </div>
            <FollowUpStatusPill status={onboardingStatus} />
          </div>

          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Onboarding Stage
              </span>
              <select
                value={onboardingStatus}
                onChange={(event) =>
                  setOnboardingStatus(event.target.value as ClientOnboardingStatus)
                }
                className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              >
                <option value="new-lead">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="proposal-shared">Proposal Shared</option>
                <option value="negotiation">Negotiation</option>
                <option value="onboarded">Onboarded</option>
                <option value="hold">Hold</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Onboarding Notes
              </span>
              <textarea
                value={onboardingNotes}
                onChange={(event) => setOnboardingNotes(event.target.value)}
                className="mt-2 min-h-[150px] w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSaveOnboarding()}
              disabled={isSavingOnboarding}
              className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingOnboarding ? "Saving..." : "Save Onboarding"}
            </button>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <article className="accent-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Quick Update</p>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                Update client follow-up
              </h3>
            </div>
            <FollowUpStatusPill status={followUpStatus} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Follow-Up Status
              </span>
              <select
                value={followUpStatus}
                onChange={(event) =>
                  setFollowUpStatus(event.target.value as ClientFollowUpStatus)
                }
                className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              >
                {isLeadOnboardingStatus(client.onboardingStatus) ? (
                  <>
                    <option value="not-responding">Not Responding</option>
                    <option value="business-proposal-email-sent">Business Proposal Email Sent</option>
                    <option value="in-discussion">In Discussion</option>
                    <option value="no-vendor-support">No Vendor Support</option>
                    <option value="awaiting-response">Awaiting Response</option>
                    <option value="positive-need-followup">Positive Need Followup</option>
                    <option value="on-boarded">On-Boarded</option>
                  </>
                ) : (
                  <>
                    <option value="pending">Pending</option>
                    <option value="follow-up-due">Follow-Up Due</option>
                    <option value="in-progress">In Discussion</option>
                    <option value="awaiting-client">Awaiting Response</option>
                    <option value="closed">Closed</option>
                  </>
                )}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Last Follow-Up Date
              </span>
              <input
                type="date"
                value={lastFollowUpDate}
                onChange={(event) => setLastFollowUpDate(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Next Follow-Up Date
              </span>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(event) => setNextFollowUpDate(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Follow-Up Notes
              </span>
              <textarea
                value={followUpNotes}
                onChange={(event) => setFollowUpNotes(event.target.value)}
                className="mt-2 min-h-[160px] w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                placeholder="Add the latest client discussion, commitments, blockers, or next steps."
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSaveFollowUp()}
              disabled={isSaving}
              className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save Follow-Up"}
            </button>
            {message ? <p className="self-center text-sm text-[var(--color-dark)]">{message}</p> : null}
            {error ? <p className="self-center text-sm text-red-700">{error}</p> : null}
          </div>
        </article>

        <article className="accent-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Proposal Mail</p>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                Send business proposal to client
              </h3>
              <p className="muted-copy mt-3 text-sm leading-6">
                Review the proposal content, send it to the saved client email, and update CRM
                follow-up status automatically.
              </p>
            </div>
            <FollowUpStatusPill status="business-proposal-email-sent" />
          </div>

          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                To
              </span>
              <input
                value={proposalToEmails}
                onChange={(event) => setProposalToEmails(event.target.value)}
                placeholder="client@example.com, second@example.com"
                className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                CC
              </span>
              <input
                value={proposalCcEmails}
                onChange={(event) => setProposalCcEmails(event.target.value)}
                placeholder="manager@example.com, team@example.com"
                className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-ink)]">
              <input
                type="checkbox"
                checked={copySender}
                onChange={(event) => setCopySender(event.target.checked)}
                className="h-4 w-4 accent-[var(--color-dark)]"
              />
              Send copy to Werkly sender email
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Subject
              </span>
              <input
                value={proposalSubject}
                onChange={(event) => setProposalSubject(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Proposal Message
              </span>
              <div className="mt-2 flex flex-wrap gap-2 rounded-t-2xl border border-b-0 border-[var(--color-line)] bg-[rgba(8,96,108,0.04)] p-2">
                {[
                  ["Bold", "bold"],
                  ["Italic", "italic"],
                  ["Underline", "underline"],
                  ["Bullets", "insertUnorderedList"],
                  ["Numbers", "insertOrderedList"],
                ].map(([label, command]) => (
                  <button
                    key={command}
                    type="button"
                    onClick={() => applyProposalFormat(command)}
                    className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-ink)]"
                  >
                    {label}
                  </button>
                ))}
                <select
                  onChange={(event) => {
                    if (event.target.value) {
                      applyProposalFormat("fontName", event.target.value);
                    }
                    event.target.value = "";
                  }}
                  className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-ink)]"
                  defaultValue=""
                >
                  <option value="">Font</option>
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times</option>
                  <option value="Verdana">Verdana</option>
                </select>
                <select
                  onChange={(event) => {
                    if (event.target.value) {
                      applyProposalFormat("fontSize", event.target.value);
                    }
                    event.target.value = "";
                  }}
                  className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-ink)]"
                  defaultValue=""
                >
                  <option value="">Size</option>
                  <option value="2">Small</option>
                  <option value="3">Normal</option>
                  <option value="4">Large</option>
                </select>
              </div>
              <div
                ref={proposalEditorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => setProposalMessage(proposalEditorRef.current?.innerHTML || "")}
                dangerouslySetInnerHTML={{ __html: proposalMessage }}
                className="min-h-[320px] w-full overflow-y-auto rounded-b-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>

            <div className="rounded-2xl border border-[var(--color-line)] bg-white p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Attachment
              </span>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]">
                  Upload File
                  <input
                    type="file"
                    multiple
                    onChange={(event) => void handleProposalAttachmentUpload(event)}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-[var(--color-muted)]">
                  {proposalAttachments.length
                    ? `${proposalAttachments.length} file(s) selected`
                    : "No attachment selected"}
                </p>
              </div>
              {proposalAttachments.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {proposalAttachments.map((attachment) => (
                    <button
                      key={attachment.filename}
                      type="button"
                      onClick={() =>
                        setProposalAttachments((current) =>
                          current.filter((item) => item.filename !== attachment.filename)
                        )
                      }
                      className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-dark)]"
                    >
                      {attachment.filename} x
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSendProposal()}
              disabled={isSendingProposal}
              className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSendingProposal ? "Sending..." : "Send Proposal Mail"}
            </button>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
        <article className="accent-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Linked Jobs</p>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                Jobs mapped to this client
              </h3>
            </div>
            <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
              {client.linkedJobsCount} jobs
            </span>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.35rem] border border-[var(--color-line)] bg-white">
            {client.linkedJobs.length === 0 ? (
              <p className="muted-copy p-5 text-sm">No jobs are linked to this client yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                      {["Job ID", "Title", "Status"].map((heading) => (
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
                    {client.linkedJobs.map((job, index) => (
                      <tr
                        key={job.id}
                        className={
                          index === client.linkedJobs.length - 1
                            ? "align-top"
                            : "align-top border-b border-[var(--color-line)]"
                        }
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-[var(--color-accent-strong)]">
                          <AdminJobIdTrigger
                            jobId={job.id}
                            jobCode={job.jobCode}
                            fallbackLabel="Pending"
                          />
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-ink)]">{job.title}</td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          <FollowUpStatusPill status={job.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </article>

        <article className="accent-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Follow-Up Timeline</p>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                CRM follow-up history
              </h3>
            </div>
            <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
              {historySummary.total} entries
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              ["History Items", historySummary.total],
              ["Closed Updates", historySummary.closed],
              ["Due Updates", historySummary.due],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.2rem] border border-[var(--color-line)] bg-white p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{value}</p>
              </div>
            ))}
          </div>

          {activity.length === 0 ? (
            <div className="mt-6 rounded-[1.25rem] border border-[var(--color-line)] bg-white p-5">
              <p className="muted-copy text-sm">No client activity is available yet.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {activity.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-[1.25rem] border border-[var(--color-line)] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">
                        {entry.actorName || "Werkly User"}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {entry.actorRole ? formatFollowUpStage(entry.actorRole) : "Internal user"}
                      </p>
                    </div>
                    <FollowUpStatusPill status={entry.toStatus} />
                  </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        Activity
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-ink)]">
                        {entry.title}
                        </p>
                      </div>
                      <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        Updated On
                      </p>
                        <p className="mt-1 text-sm text-[var(--color-ink)]">
                          {formatDateTimeLabel(entry.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        Stage / Change
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-ink)]">
                        {entry.fromStatus
                          ? `${formatFollowUpStage(entry.fromStatus)} -> ${formatFollowUpStage(entry.toStatus)}`
                          : formatFollowUpStage(entry.toStatus)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        Effective Date
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-ink)]">
                        {formatDateLabel(entry.effectiveDate)}
                        </p>
                      </div>
                    </div>
                  <div className="mt-4 rounded-2xl bg-[rgba(8,96,108,0.03)] px-4 py-3 text-sm leading-6 text-[var(--color-muted)]">
                    {entry.summary || "No remarks added for this activity."}
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientRecord } from "@/lib/crm";

type ProposalAttachment = {
  filename: string;
  content: string;
};

const defaultProposalHtml = `
<div style="font-family:Arial, Helvetica, sans-serif;font-size:13px;line-height:1.45;color:#111827;">
  <p style="margin:0 0 22px;">Dear Madam,</p>
  <p style="margin:0 0 22px;">Greetings from Werkly Consulting!</p>
  <p style="margin:0 0 22px;">It was nice talking to you over the phone! As discussed please find the details below</p>

  <p style="margin:0;">
    As a legacy-driven, diversity-powered recruitment We are writing to express our keen interest in building a long-term, impactful partnership with your organization.
    We are confident we can support you in meeting your hiring goals across all levels and functions.
  </p>
  <p style="margin:0;">
    Werkly consulting is a recruitment solution provider with a pan-India presence, 2 branch offices (Hyderabad and Vijayawada), and a team of trained recruiters and HR professionals.
    We specialize in both technical and non-technical hiring, supporting some of the country's most respected brands.
  </p>

  <p style="margin:0 0 8px;"><strong>Our Key Strengths:</strong></p>
  <ul style="margin:0 0 10px 28px;padding:0;">
    <li><strong>Legacy of Trusted Performance:</strong> We bring unmatched credibility to the table, serving top clients of Non-IT &amp; IT Sector</li>
    <li><strong>Diversity Hiring Champions:</strong> We are proud to be a 100% diversity-driven organization with deep experience in supporting inclusive hiring across industries.</li>
    <li><strong>Industry-Specific Expertise:</strong> From Automobile, Pharma, Real Estate, Manufacturing, ITES, Healthcare, FMCG, Oil &amp; Gas, Defense and Aerospace, we understand the nuances of hiring in each sector.</li>
    <li><strong>Tech-Driven, Human-Led Recruitment:</strong> Our sourcing isn't just keyword-based; it's powered by trained recruiters with technical knowledge and domain understanding, ensuring precision shortlisting and fast turnaround times.</li>
    <li><strong>Strong Offer-to-Join Ratio:</strong>
      <ul style="margin:0 0 0 28px;padding:0;">
        <li>95%+ for Non-IT hires</li>
      </ul>
    </li>
    <li><strong>Deep Understanding of Business Needs</strong><br />We take time to understand your business requirements, job specifications, and expectations from the hiring manager before initiating any search.</li>
    <li><strong>Partnership Approach</strong><br />We believe in working as a recruitment partner, not just a vendor &mdash; fostering collaboration, open discussions, and shared success.</li>
  </ul>

  <p style="margin:0 0 22px;">
    We take pride in delivering an exceptional candidate experience and consultative partnership with our clients. Our team works closely with C-suite leaders,
    providing market insights, identifying top talent, and structuring high-performing teams to meet organizational goals.
  </p>

  <p style="margin:0 0 8px;"><strong>Why Partner with Werkly?</strong></p>
  <ul style="margin:0 0 18px 28px;padding:0;list-style:none;">
    <li>&#10004; Trusted by Top Indian Brands</li>
    <li>&#10004; Proven Track Record Across Functions</li>
    <li>&#10004; Customizable Hiring Models</li>
    <li>&#10004; Agile &amp; Transparent Process</li>
  </ul>

  <p style="margin:0 0 14px;">We look forward to an opportunity to collaborate and support your hiring initiatives.</p>

  <p style="margin:0 0 8px;"><strong>Professional Charges for Permanent Employment NOT IT&nbsp;&nbsp; Commercials</strong></p>
  <ul style="margin:0 0 24px 28px;padding:0;">
    <li><strong>Junior Management (Executive to Asst. Manager):</strong> 8.33%</li>
    <li><strong>Middle Management (Deputy Manager to DGM):</strong> 8.33%</li>
    <li><strong>Senior Management (GM / AVP / VP &amp; Above):</strong> 10%</li>
    <li><strong>CXO Positions:</strong> 15%</li>
  </ul>

  <p style="margin:0;"><strong>Payment Schedule:</strong> Payment should be made within 30 days after the candidate joins your organization.</p>
  <p style="margin:0;"><strong>Replacement Guarantee:</strong> We provide a one-time free replacement guarantee at no additional cost in the event a candidate sourced, selected, and engaged by us leaves your organization within 90 working days from their date of joining.</p>
  <p style="margin:0 0 22px;">Please feel free to reach out if you have any queries or would like to discuss further. We look forward to the opportunity to work together.</p>

  <p style="margin:0;">Awaiting a positive revert from your end</p>
</div>`;

export function ProposalMailModal({
  client,
  token,
  onClose,
  onSent,
}: {
  client: ClientRecord;
  token: string;
  onClose: () => void;
  onSent?: (client: ClientRecord) => void | Promise<void>;
}) {
  const [toEmails, setToEmails] = useState("");
  const [ccEmails, setCcEmails] = useState("hr@werkly.in");
  const [copySender, setCopySender] = useState(false);
  const [subject, setSubject] = useState("Recruitment Partnership Proposal - Werkly Consulting");
  const [messageHtml, setMessageHtml] = useState(defaultProposalHtml);
  const [attachments, setAttachments] = useState<ProposalAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const closeTimerRef = useRef<number | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setToEmails([client.contactEmail, client.secondaryContactEmail].filter(Boolean).join(", "));
    setCcEmails("hr@werkly.in");
    setCopySender(false);
    setSubject("Recruitment Partnership Proposal - Werkly Consulting");
    setMessageHtml(defaultProposalHtml);
    setAttachments([]);
    setError("");
    setSentMessage("");
  }, [client]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  function applyFormat(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setMessageHtml(editorRef.current?.innerHTML || "");
  }

  async function handleAttachmentUpload(event: React.ChangeEvent<HTMLInputElement>) {
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

    const nextAttachments = await Promise.all(
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

    setAttachments((current) => [...current, ...nextAttachments]);
    event.target.value = "";
  }

  async function handleSend() {
    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    const parsedToEmails = toEmails
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    const parsedCcEmails = ccEmails
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    if (!parsedToEmails.length) {
      setError("Please add at least one client email before sending proposal mail.");
      return;
    }

    setIsSending(true);
    setError("");
    setSentMessage("");

    try {
      const response = await fetch(`/api/admin/clients/${client.id}/proposal-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toEmails: parsedToEmails,
          ccEmails: parsedCcEmails,
          copySender,
          subject,
          message: editorRef.current?.innerText || "",
          htmlMessage: editorRef.current?.innerHTML || messageHtml,
          attachments,
        }),
      });
      const result = (await response.json()) as {
        client?: ClientRecord;
        message?: string;
      };

      if (!response.ok || !result.client) {
        throw new Error(result.message || "Unable to send proposal mail.");
      }

      setSentMessage(result.message || "Proposal email sent successfully.");
      await onSent?.(result.client);
      closeTimerRef.current = window.setTimeout(onClose, 1400);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send proposal mail.");
    } finally {
      setIsSending(false);
    }
  }

  const hasSent = Boolean(sentMessage);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.8rem] border border-[var(--color-line)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-5">
          <div>
            <p className="eyebrow">Proposal Mail</p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
              Send proposal to {client.companyName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {hasSent ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(8,96,108,0.10)] text-5xl font-semibold text-[var(--color-dark)]">
                ✓
              </div>
              <h4 className="mt-5 text-2xl font-semibold text-[var(--color-ink)]">Mail sent</h4>
              <p className="muted-copy mt-2 max-w-md text-sm">{sentMessage}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    To
                  </span>
                  <input
                    value={toEmails}
                    onChange={(event) => setToEmails(event.target.value)}
                    placeholder="client@example.com, second@example.com"
                    className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    CC
                  </span>
                  <input
                    value={ccEmails}
                    onChange={(event) => setCcEmails(event.target.value)}
                    placeholder="manager@example.com, team@example.com"
                    className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  />
                </label>
              </div>

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
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
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
                      onClick={() => applyFormat(command)}
                      className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-ink)]"
                    >
                      {label}
                    </button>
                  ))}
                  <select
                    onChange={(event) => {
                      if (event.target.value) {
                        applyFormat("fontName", event.target.value);
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
                        applyFormat("fontSize", event.target.value);
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
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => setMessageHtml(editorRef.current?.innerHTML || "")}
                  dangerouslySetInnerHTML={{ __html: messageHtml }}
                  className="min-h-[300px] w-full overflow-y-auto rounded-b-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
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
                      onChange={(event) => void handleAttachmentUpload(event)}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-[var(--color-muted)]">
                    {attachments.length
                      ? `${attachments.length} file(s) selected`
                      : "No attachment selected"}
                  </p>
                </div>
                {attachments.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <button
                        key={attachment.filename}
                        type="button"
                        onClick={() =>
                          setAttachments((current) =>
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

              {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
            </div>
          )}
        </div>

        {!hasSent ? (
          <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--color-line)] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isSending}
              className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSending ? "Sending..." : "Send Proposal Mail"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

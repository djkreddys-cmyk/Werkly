"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientRecord } from "@/lib/crm";

type AgreementAttachment = {
  filename: string;
  content: string;
};

function escapeHtml(value?: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function agreementAttachmentFromClient(client: ClientRecord): AgreementAttachment[] {
  if (!client.agreementFileName || !client.agreementFileData) {
    return [];
  }

  const content = client.agreementFileData.includes(",")
    ? client.agreementFileData.split(",")[1]
    : client.agreementFileData;

  return [{ filename: client.agreementFileName, content }];
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
}

async function loadDefaultAgreementTemplate() {
  const response = await fetch("/agreement-template.docx");
  if (!response.ok) {
    return [];
  }

  return [
    {
      filename: "Agreement.docx",
      content: arrayBufferToBase64(await response.arrayBuffer()),
    },
  ];
}

function assetUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }

  return `${window.location.origin}${path}`;
}

function buildDefaultAgreementHtml(client: ClientRecord) {
  const clientName = escapeHtml(client.companyName || "Client");
  const clientAddress = escapeHtml(client.communicationAddress || client.branch || "client registered office");
  const billingTerms = String(client.billingTerms || "").trim();
  const feeLines = billingTerms
    ? billingTerms
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [
        "Junior Management (Executive to Asst. Manager): 7%",
        "Middle Management (Deputy Manager to DGM): 7%",
        "Senior Management (GM / AVP / VP & Above): 7%",
        "CXO Positions: 7%",
      ];
  const paymentTerms =
    feeLines.find((line) => /payment|days|invoice/i.test(line)) ||
    "Payment should be made within 90 days from the date of candidate joining.";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#18343a;background:#ffffff;line-height:1.55;font-size:14px;">
      <img src="${assetUrl("/agreement-assets/letterhead.png")}" alt="Werkly letterhead" style="display:block;width:100%;max-width:760px;height:auto;margin:0 0 22px;" />
      <div style="max-width:760px;margin:0 auto;padding:0 10px;">
        <p style="margin:0 0 16px;">This Agreement is made on ${new Date().toLocaleDateString("en-GB")} BETWEEN <strong>Werkly Consulting Private Limited</strong>, having its registered office at Hyderabad and Vijayawada, and <strong>${clientName}</strong>, having its registered office at ${clientAddress}.</p>

        <h3 style="margin:18px 0 8px;color:#0a7684;font-size:16px;">Scope of Services</h3>
        <p style="margin:0 0 14px;">Werkly Consulting Private Limited agrees to provide recruitment services to ${clientName} for various roles as mutually agreed.</p>

        <h3 style="margin:18px 0 8px;color:#0a7684;font-size:16px;">Fee Structure</h3>
        <p style="margin:0 0 8px;"><strong>Professional Charges for Permanent Employment Commercials</strong></p>
        <ul style="margin:0 0 14px 22px;padding:0;">
          ${feeLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
        </ul>
        <p style="margin:0 0 14px;">${escapeHtml(paymentTerms)}</p>

        <h3 style="margin:18px 0 8px;color:#0a7684;font-size:16px;">Candidate Ownership</h3>
        <p style="margin:0 0 6px;">A candidate submitted by either party will remain valid for 6 months.</p>
        <p style="margin:0 0 14px;">Ownership belongs to the party who first introduced the candidate.</p>

        <h3 style="margin:18px 0 8px;color:#0a7684;font-size:16px;">Replacement Policy</h3>
        <p style="margin:0 0 6px;">In case the candidate leaves within 90 days, a free replacement will be provided.</p>
        <p style="margin:0 0 14px;">No refund shall be applicable.</p>

        <h3 style="margin:18px 0 8px;color:#0a7684;font-size:16px;">Payment Terms</h3>
        <p style="margin:0 0 14px;">Payment must be made within the agreed timeline.</p>

        <h3 style="margin:18px 0 8px;color:#0a7684;font-size:16px;">Confidentiality</h3>
        <p style="margin:0 0 14px;">Both parties agree to maintain confidentiality of all shared information, including candidate data and business details.</p>

        <h3 style="margin:18px 0 8px;color:#0a7684;font-size:16px;">Non-Solicitation</h3>
        <p style="margin:0 0 14px;">Both parties agree not to hire or approach each other's employees or clients during the agreement period and up to 1 year after termination.</p>

        <h3 style="margin:18px 0 8px;color:#0a7684;font-size:16px;">Jurisdiction</h3>
        <p style="margin:0 0 20px;">This Agreement shall be governed by the laws of India, and disputes shall be subject to the jurisdiction of courts in Hyderabad.</p>

        <table style="width:100%;border-collapse:collapse;margin-top:20px;">
          <tr>
            <td style="width:50%;vertical-align:bottom;padding:8px 20px 8px 0;">
              <p style="margin:0 0 12px;"><strong>For Werkly Consulting Private Limited</strong></p>
              <img src="${assetUrl("/agreement-assets/signature.png")}" alt="Authorized signature" style="display:block;width:180px;max-width:100%;height:auto;margin:8px 0;" />
              <p style="margin:0;">Authorized Signatory</p>
            </td>
            <td style="width:50%;vertical-align:bottom;padding:8px 0 8px 20px;">
              <p style="margin:0 0 56px;"><strong>For ${clientName}</strong></p>
              <p style="margin:0;">Authorized Signatory</p>
            </td>
          </tr>
        </table>
      </div>
      <img src="${assetUrl("/agreement-assets/footer.png")}" alt="Werkly footer" style="display:block;width:100%;max-width:760px;height:auto;margin:22px 0 0;" />
    </div>`;
}

export function AgreementMailModal({
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
  const [subject, setSubject] = useState("");
  const [messageHtml, setMessageHtml] = useState("");
  const [attachments, setAttachments] = useState<AgreementAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const closeTimerRef = useRef<number | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isActive = true;
    setToEmails([client.contactEmail, client.secondaryContactEmail].filter(Boolean).join(", "));
    setCcEmails("hr@werkly.in");
    setCopySender(false);
    setSubject(`Recruitment Agreement - ${client.companyName}`);
    setMessageHtml(buildDefaultAgreementHtml(client));
    const clientAttachments = agreementAttachmentFromClient(client);
    setAttachments(clientAttachments);
    if (!clientAttachments.length) {
      void loadDefaultAgreementTemplate()
        .then((templateAttachments) => {
          if (isActive && templateAttachments.length) {
            setAttachments(templateAttachments);
          }
        })
        .catch(() => undefined);
    }
    setError("");
    setSentMessage("");
    return () => {
      isActive = false;
    };
  }, [client]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  async function handleAttachmentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    const maxSize = 8 * 1024 * 1024;
    const oversized = files.find((file) => file.size > maxSize);
    if (oversized) {
      setError("Each agreement attachment must be 8 MB or smaller.");
      event.target.value = "";
      return;
    }

    const nextAttachments = await Promise.all(
      files.map(
        (file) =>
          new Promise<AgreementAttachment>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = String(reader.result || "");
              resolve({
                filename: file.name,
                content: dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl,
              });
            };
            reader.onerror = () => reject(new Error("Unable to read agreement attachment."));
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
      setError("Please add at least one client email before sharing agreement.");
      return;
    }

    setIsSending(true);
    setError("");
    setSentMessage("");

    try {
      const response = await fetch(`/api/admin/clients/${client.id}/agreement-email`, {
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
        throw new Error(result.message || "Unable to share agreement.");
      }

      setSentMessage(result.message || "Agreement shared successfully.");
      await onSent?.(result.client);
      closeTimerRef.current = window.setTimeout(onClose, 1400);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to share agreement.");
    } finally {
      setIsSending(false);
    }
  }

  const hasSent = Boolean(sentMessage);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.8rem] border border-[var(--color-line)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-5">
          <div>
            <p className="eyebrow">Agreement</p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
              Share agreement with {client.companyName}
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
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <h4 className="text-2xl font-semibold text-[var(--color-ink)]">Agreement shared</h4>
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
                  Agreement Mail Body
                </span>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => setMessageHtml(editorRef.current?.innerHTML || "")}
                  dangerouslySetInnerHTML={{ __html: messageHtml }}
                  className="mt-2 max-h-[420px] min-h-[300px] w-full overflow-y-auto rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm leading-6 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                />
              </label>

              <div className="rounded-2xl border border-[var(--color-line)] bg-white p-4">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Agreement Attachment
                </span>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]">
                    Upload File
                    <input type="file" multiple onChange={(event) => void handleAttachmentUpload(event)} className="hidden" />
                  </label>
                  <p className="text-sm text-[var(--color-muted)]">
                    {attachments.length ? `${attachments.length} file(s) selected` : "No agreement attachment selected"}
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
              {isSending ? "Sharing..." : "Share Agreement"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

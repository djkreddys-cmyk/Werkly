"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientRecord } from "@/lib/crm";
import { generateAgreementPdf, pdfBytesToBase64 } from "@/lib/agreement-pdf";

const MAIL_BODY = `Dear Team,

We are sharing the recruitment agreement for your review. Please check and revert back with your confirmation or suggested changes.

Regards,
Werkly Consulting`;
const CONFIDENTIALITY_USAGE_LINE =
  "Confidential information shall be used only for recruitment services under this Agreement and shall not be disclosed to any third party without prior written consent.";

function buildDefaultAgreementText(client: ClientRecord) {
  const clientName = client.companyName || "Client";
  const clientAddress = client.communicationAddress || client.branch || "client registered office";
  const billingTerms = String(client.billingTerms || "").trim();
  const feeLines = billingTerms
    ? billingTerms.split(/\n+/).map((line) => line.trim()).filter(Boolean)
    : [
        "Junior Management (Executive to Asst. Manager): 7%",
        "Middle Management (Deputy Manager to DGM): 7%",
        "Senior Management (GM / AVP / VP & Above): 7%",
        "CXO Positions: 7%",
      ];
  const paymentTerms =
    feeLines.find((line) => /payment|days|invoice/i.test(line)) ||
    "Payment should be made within 90 days from the date of candidate joining.";
  const commercialFeeLines = feeLines.filter((line) => line !== paymentTerms);

  return [
    `This Agreement is made on ${new Date().toLocaleDateString("en-GB")} BETWEEN Werkly Consulting Private Limited, having its registered office at Hyderabad and Vijayawada, and ${clientName}, having its registered office at ${clientAddress}.`,
    "Scope of Services",
    `Werkly Consulting Private Limited agrees to provide recruitment services to ${clientName} for various roles as mutually agreed.`,
    "Fee Structure",
    "Professional Charges for Permanent Employment Commercials",
    ...commercialFeeLines,
    "Candidate Ownership",
    "A candidate submitted by either party will remain valid for 6 months.",
    "Ownership belongs to the party who first introduced the candidate.",
    "Replacement Policy",
    "In case the candidate leaves within 90 days, a free replacement will be provided.",
    "No refund shall be applicable.",
    "Payment Terms",
    paymentTerms,
    "Confidentiality",
    "Both parties agree to maintain confidentiality of all shared information, including candidate data and business details.",
    CONFIDENTIALITY_USAGE_LINE,
    "Non-Solicitation",
    "Both parties agree not to hire or approach each other's employees or clients during the agreement period and up to 1 year after termination.",
    "Jurisdiction",
    "This Agreement shall be governed by the laws of India, and disputes shall be subject to the jurisdiction of courts in Hyderabad.",
    "For Werkly Consulting Private Limited",
    "Authorized Signatory",
    `For ${clientName}`,
    "Authorized Signatory",
  ].join("\n\n");
}

function ensureConfidentialityLine(value: string) {
  if (value.includes(CONFIDENTIALITY_USAGE_LINE)) {
    return value;
  }

  if (value.includes("Confidentiality")) {
    return value.replace(
      /(Confidentiality[\s\S]*?business details\.)/,
      `$1\n\n${CONFIDENTIALITY_USAGE_LINE}`
    );
  }

  return `${value.trim()}\n\nConfidentiality\n\nBoth parties agree to maintain confidentiality of all shared information, including candidate data and business details.\n\n${CONFIDENTIALITY_USAGE_LINE}`;
}

function emailBodyHtml() {
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#18343a;line-height:1.65;font-size:15px;">
    ${MAIL_BODY.split(/\n{2,}/).map((paragraph) => `<p style="margin:0 0 14px;">${paragraph.replace(/\n/g, "<br />")}</p>`).join("")}
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
  const [subject, setSubject] = useState("");
  const [agreementText, setAgreementText] = useState("");
  const [pdfContent, setPdfContent] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isUploadingSignedCopy, setIsUploadingSignedCopy] = useState(false);
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const closeTimerRef = useRef<number | null>(null);
  const isConfirmed = client.agreementStatus === "confirmed";

  useEffect(() => {
    setToEmails([client.contactEmail, client.secondaryContactEmail].filter(Boolean).join(", "));
    setSubject(client.agreementSubject || `Recruitment Agreement - ${client.companyName}`);
    setAgreementText(ensureConfidentialityLine(client.agreementContent || buildDefaultAgreementText(client)));
    setPdfContent("");
    setPdfUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    setError("");
    setSentMessage("");
  }, [client]);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  async function createPdf() {
    if (!agreementText.trim()) throw new Error("Agreement content is required.");
    const bytes = await generateAgreementPdf(agreementText, [
      "Werkly Consulting Private Limited",
      client.companyName || "Client",
    ]);
    const pdfBuffer = Uint8Array.from(bytes).buffer;
    const blob = new Blob([pdfBuffer], { type: "application/pdf" });
    const nextUrl = URL.createObjectURL(blob);
    setPdfUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextUrl;
    });
    const base64 = pdfBytesToBase64(bytes);
    setPdfContent(base64);
    return base64;
  }

  function buildClientUpdatePayload(overrides: Partial<ClientRecord>) {
    return {
      companyName: client.companyName,
      contactPerson: client.contactPerson,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone,
      secondaryContactPerson: client.secondaryContactPerson,
      secondaryContactEmail: client.secondaryContactEmail,
      secondaryContactPhone: client.secondaryContactPhone,
      communicationAddress: client.communicationAddress,
      sector: client.sector,
      branch: client.branch,
      billingTerms: client.billingTerms,
      gstNumber: client.gstNumber,
      cinNumber: client.cinNumber,
      panNumber: client.panNumber,
      assignedEmployeeId: client.assignedEmployeeId,
      status: client.status,
      onboardingStatus: client.onboardingStatus,
      followUpStatus: client.followUpStatus,
      nextFollowUpDate: client.nextFollowUpDate,
      lastFollowUpDate: client.lastFollowUpDate,
      onboardingSource: client.onboardingSource,
      notes: client.notes,
      followUpNotes: client.followUpNotes,
      agreementStatus: client.agreementStatus,
      agreementSubject: client.agreementSubject,
      agreementContent: client.agreementContent,
      agreementPdfFileName: client.agreementPdfFileName,
      agreementPdfFileType: client.agreementPdfFileType,
      agreementPdfFileData: client.agreementPdfFileData,
      agreementConfirmedAt: client.agreementConfirmedAt,
      agreementFileName: client.agreementFileName,
      agreementFileType: client.agreementFileType,
      agreementFileData: client.agreementFileData,
      ...overrides,
    };
  }

  async function updateClientAgreement(overrides: Partial<ClientRecord>, fallbackMessage: string) {
    const response = await fetch(`/api/admin/clients/${client.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(buildClientUpdatePayload(overrides)),
    });
    const result = (await response.json()) as ClientRecord & { message?: string };
    if (!response.ok) throw new Error(result.message || fallbackMessage);
    await onSent?.(result);
    return result;
  }

  async function handleGeneratePdf() {
    setIsGenerating(true);
    setError("");
    try {
      await createPdf();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Unable to generate agreement PDF.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSend() {
    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }
    const parsedToEmails = toEmails.split(",").map((email) => email.trim()).filter(Boolean);
    if (!parsedToEmails.length) {
      setError("Please add at least one client email before sharing agreement.");
      return;
    }

    setIsSending(true);
    setError("");
    try {
      const attachmentContent = pdfContent || await createPdf();
      const safeClientName = (client.companyName || "Client").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
      const attachmentFileName = `${safeClientName || "Client"}-Recruitment-Agreement.pdf`;
      const response = await fetch(`/api/admin/clients/${client.id}/agreement-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          toEmails: parsedToEmails,
          subject,
          message: MAIL_BODY,
          htmlMessage: emailBodyHtml(),
          agreementSubject: subject,
          agreementContent: agreementText,
          agreementPdfFileName: attachmentFileName,
          agreementPdfFileType: "application/pdf",
          agreementPdfFileData: `data:application/pdf;base64,${attachmentContent}`,
          attachments: [{ filename: attachmentFileName, content: attachmentContent }],
        }),
      });
      const result = (await response.json()) as { client?: ClientRecord; message?: string };
      if (!response.ok || !result.client) throw new Error(result.message || "Unable to share agreement.");
      setSentMessage(result.message || "Agreement shared successfully.");
      await onSent?.(result.client);
      closeTimerRef.current = window.setTimeout(onClose, 1400);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to share agreement.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleConfirmAgreement() {
    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    const confirmed = window.confirm("Confirm this agreement? After confirmation, editing will be locked.");
    if (!confirmed) return;

    setIsConfirming(true);
    setError("");
    try {
      await updateClientAgreement(
        {
          agreementStatus: "confirmed",
          agreementSubject: subject,
          agreementContent: agreementText,
          agreementConfirmedAt: new Date().toISOString(),
        },
        "Unable to confirm agreement."
      );
      setSentMessage("Agreement confirmed. Editing is now locked for this client.");
      closeTimerRef.current = window.setTimeout(onClose, 1400);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Unable to confirm agreement.");
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleSignedCopyUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    if (file.type !== "application/pdf") {
      setError("Signed agreement must be uploaded as a PDF.");
      event.target.value = "";
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError("Signed agreement PDF must be 4 MB or smaller.");
      event.target.value = "";
      return;
    }

    setIsUploadingSignedCopy(true);
    setError("");
    try {
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Unable to read the signed agreement PDF."));
        reader.readAsDataURL(file);
      });
      await updateClientAgreement(
        {
          agreementFileName: file.name,
          agreementFileType: file.type,
          agreementFileData: fileData,
        },
        "Unable to upload signed agreement."
      );
      setSentMessage("Signed agreement copy uploaded successfully.");
      closeTimerRef.current = window.setTimeout(onClose, 1400);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload signed agreement.");
    } finally {
      setIsUploadingSignedCopy(false);
      event.target.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[var(--color-line)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-4">
          <div>
            <p className="eyebrow">Agreement</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
              {isConfirmed ? "Confirmed agreement" : "Share agreement"} with {client.companyName}
            </h3>
            <p className="muted-copy mt-2 text-sm">
              Status: {client.agreementStatus ? client.agreementStatus.toUpperCase() : "DRAFT"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]">Close</button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {sentMessage ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <h4 className="text-2xl font-semibold text-[var(--color-ink)]">Agreement shared</h4>
              <p className="muted-copy mt-2 max-w-md text-sm">{sentMessage}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-[var(--color-muted)]">Client Email</span>
                <input value={toEmails} onChange={(event) => setToEmails(event.target.value)} disabled={isConfirmed} placeholder="client@example.com" className="mt-2 w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-sm outline-none focus:border-[var(--color-dark)] disabled:bg-slate-100" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-[var(--color-muted)]">Subject</span>
                <input value={subject} onChange={(event) => setSubject(event.target.value)} disabled={isConfirmed} className="mt-2 w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-sm outline-none focus:border-[var(--color-dark)] disabled:bg-slate-100" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-[var(--color-muted)]">Agreement Content</span>
                <textarea
                  value={agreementText}
                  disabled={isConfirmed}
                  onChange={(event) => {
                    setAgreementText(event.target.value);
                    setPdfContent("");
                    setPdfUrl((current) => {
                      if (current) URL.revokeObjectURL(current);
                      return "";
                    });
                  }}
                  className="mt-2 min-h-[320px] w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-sm leading-6 text-[var(--color-ink)] outline-none focus:border-[var(--color-dark)] disabled:bg-slate-100"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => void handleGeneratePdf()} disabled={isGenerating || isConfirmed} className="rounded-lg bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {isGenerating ? "Generating..." : "Generate PDF"}
                </button>
                {pdfUrl ? <a href={pdfUrl} download={`${client.companyName || "Client"}-Recruitment-Agreement.pdf`} className="rounded-lg border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]">Download PDF</a> : null}
                {client.agreementPdfFileData && client.agreementPdfFileName ? (
                  <a href={client.agreementPdfFileData} download={client.agreementPdfFileName} className="rounded-lg border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]">Download Shared PDF</a>
                ) : null}
                {client.agreementFileData && client.agreementFileName ? (
                  <a href={client.agreementFileData} download={client.agreementFileName} className="rounded-lg border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]">Download Signed Copy</a>
                ) : null}
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]">
                  {isUploadingSignedCopy ? "Uploading..." : "Upload Signed Copy"}
                  <input type="file" accept="application/pdf" className="sr-only" onChange={(event) => void handleSignedCopyUpload(event)} disabled={isUploadingSignedCopy} />
                </label>
              </div>

              {pdfUrl ? (
                <div className="overflow-hidden rounded-lg border border-[var(--color-line)] bg-slate-100">
                  <div className="border-b border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-ink)]">Agreement PDF Preview</div>
                  <iframe title="Agreement PDF preview" src={pdfUrl} className="h-[560px] w-full bg-white" />
                </div>
              ) : null}
              {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
            </div>
          )}
        </div>

        {!sentMessage ? (
          <div className="flex justify-end gap-3 border-t border-[var(--color-line)] px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]">Cancel</button>
            {!isConfirmed ? (
              <button type="button" onClick={() => void handleConfirmAgreement()} disabled={isConfirming || isSending || isGenerating} className="rounded-lg border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-60">
                {isConfirming ? "Confirming..." : "Confirm Agreement"}
              </button>
            ) : null}
            <button type="button" onClick={() => void handleSend()} disabled={isSending || isGenerating || isConfirmed} className="rounded-lg bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {isSending ? "Sending..." : "Send Agreement"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

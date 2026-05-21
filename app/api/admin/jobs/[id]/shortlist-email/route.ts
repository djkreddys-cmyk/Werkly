import { NextResponse, type NextRequest } from "next/server";
import { getClientById } from "@/lib/crm";
import { getAdminJobById, getJobApplications, type JobApplication } from "@/lib/jobs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ResendAttachment = {
  filename: string;
  content: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEmailBody(value: string) {
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 14px;">${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function sanitizeHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\sjavascript:/gi, "");
}

function sanitizeExportCell(value?: string) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : "-";
}

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function toBase64Content(fileData?: string) {
  const raw = String(fileData || "").trim();
  if (!raw) {
    return "";
  }

  return raw.includes(",") ? raw.split(",").pop()?.trim() || "" : raw;
}

function buildShortlistReportAttachment(
  jobTitle: string,
  jobCode: string | undefined,
  applications: JobApplication[]
): ResendAttachment {
  const downloadedDate = new Date().toLocaleDateString("en-GB");
  const rows = applications
    .map(
      (application, index) => `
        <tr>
          <td>${escapeHtml(String(index + 1))}</td>
          <td>${escapeHtml(downloadedDate)}</td>
          <td>${escapeHtml(sanitizeExportCell(application.jobTitle || jobTitle))}</td>
          <td>${escapeHtml(sanitizeExportCell(application.candidateName))}</td>
          <td>${escapeHtml(sanitizeExportCell(application.candidatePhone))}</td>
          <td>${escapeHtml(sanitizeExportCell(application.candidateEmail))}</td>
          <td>${escapeHtml(sanitizeExportCell(application.currentCompany))}</td>
          <td>${escapeHtml(sanitizeExportCell(application.experience))}</td>
          <td>${escapeHtml(sanitizeExportCell(application.currentCtc))}</td>
          <td>${escapeHtml(sanitizeExportCell(application.expectedCtc))}</td>
          <td>${escapeHtml(sanitizeExportCell(application.stageNote || "Shortlisted"))}</td>
          <td>${escapeHtml(
            sanitizeExportCell(application.currentLocation || application.preferredLocation)
          )}</td>
        </tr>
      `
    )
    .join("");
  const markup = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #111827; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #b9e6f2; font-weight: 700; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>S No</th>
              <th>Date</th>
              <th>Position Name</th>
              <th>Candidate Name</th>
              <th>Mobile No.</th>
              <th>Email ID</th>
              <th>Current Company</th>
              <th>Total Exp</th>
              <th>Current CTC</th>
              <th>Expected CTC</th>
              <th>Notice Period</th>
              <th>Current Location</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;

  return {
    filename: `${safeFileName(jobCode || jobTitle || "shortlist")}-shortlist-report.xls`,
    content: Buffer.from(markup, "utf8").toString("base64"),
  };
}

function buildResumeAttachments(applications: JobApplication[]): ResendAttachment[] {
  const usedNames = new Set<string>();

  return applications
    .map((application, index) => {
      const content = toBase64Content(application.resumeFileData);
      if (!content) {
        return null;
      }

      const candidateName = safeFileName(application.candidateName || `candidate-${index + 1}`);
      const originalName = safeFileName(application.resumeFileName || "");
      const fallbackName = `${candidateName || `candidate-${index + 1}`}-resume.pdf`;
      let filename = originalName || fallbackName;

      if (!/\.[a-z0-9]{2,5}$/i.test(filename)) {
        filename = `${filename}.pdf`;
      }

      if (usedNames.has(filename.toLowerCase())) {
        filename = `${candidateName || "candidate"}-${index + 1}-${filename}`;
      }
      usedNames.add(filename.toLowerCase());

      return {
        filename,
        content,
      };
    })
    .filter((attachment): attachment is ResendAttachment => Boolean(attachment));
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const senderEmail = process.env.SHORTLIST_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
    const senderName = process.env.SHORTLIST_FROM_NAME || "Werkly Consulting";
    const apiKey = process.env.RESEND_API_KEY;
    const replyToEmail = process.env.SHORTLIST_REPLY_TO_EMAIL || "hr@werkly.in";
    const defaultCcEmails = String(process.env.SHORTLIST_DEFAULT_CC_EMAILS || "hr@werkly.in")
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    if (!apiKey || !senderEmail) {
      return NextResponse.json(
        { message: "Email delivery is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL." },
        { status: 500 }
      );
    }

    const { id } = await context.params;
    const job = await getAdminJobById(id, token);

    if (!job) {
      return NextResponse.json({ message: "Job not found." }, { status: 404 });
    }

    const body = (await request.json()) as {
      toEmails?: string[];
      ccEmails?: string[];
      subject?: string;
      message?: string;
      htmlMessage?: string;
    };
    let fallbackClientEmails: Array<string | undefined> = [];

    if (!body.toEmails?.length && job.clientId) {
      const client = await getClientById(job.clientId, token);
      fallbackClientEmails = [client.contactEmail, client.secondaryContactEmail];
    }

    const applications = await getJobApplications(id, token);
    const shortlistedApplications = applications.filter(
      (application) => (application.stage ?? "applied") === "shortlisted"
    );
    const profilesToSend = shortlistedApplications.length ? shortlistedApplications : applications;
    const toEmails = Array.from(
      new Set(
        (body.toEmails?.length ? body.toEmails : fallbackClientEmails)
          .map((email) => String(email || "").trim())
          .filter(Boolean)
      )
    );
    const ccEmails = Array.from(
      new Set(
        [...defaultCcEmails, ...(body.ccEmails ?? [])]
          .map((email) => String(email || "").trim())
          .filter(Boolean)
      )
    );
    const subject =
      String(body.subject || "").trim() || `Shortlisted profiles for ${job.title}`;
    const message = String(body.message || "").trim();
    const htmlMessage = String(body.htmlMessage || "").trim();

    if (!toEmails.length) {
      return NextResponse.json(
        { message: "Client email is required before sending shortlist mail." },
        { status: 400 }
      );
    }

    if (!profilesToSend.length) {
      return NextResponse.json(
        { message: "No candidates are available to send for this job." },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json({ message: "Shortlist message is required." }, { status: 400 });
    }

    const reportAttachment = buildShortlistReportAttachment(
      job.title,
      job.jobCode,
      profilesToSend
    );
    const resumeAttachments = buildResumeAttachments(profilesToSend);
    const attachments = [reportAttachment, ...resumeAttachments];

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: toEmails,
        cc: ccEmails.length ? ccEmails : undefined,
        reply_to: replyToEmail || undefined,
        subject,
        html: htmlMessage
          ? sanitizeHtml(htmlMessage)
          : `
          <div style="font-family:Arial,sans-serif;color:#18343a;line-height:1.65;font-size:15px;">
            ${formatEmailBody(message)}
          </div>
        `,
        attachments,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(errorText || "Unable to send shortlist email.");
    }

    return NextResponse.json({
      sentTo: toEmails,
      cc: ccEmails,
      candidatesCount: profilesToSend.length,
      resumeAttachmentsCount: resumeAttachments.length,
      reportAttached: true,
      usedAllApplications: shortlistedApplications.length === 0,
      message: `Shortlist email sent with report and ${resumeAttachments.length} resume attachment(s).`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send shortlist email.";
    console.error("[shortlist-email] failed", {
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ message }, { status: 500 });
  }
}

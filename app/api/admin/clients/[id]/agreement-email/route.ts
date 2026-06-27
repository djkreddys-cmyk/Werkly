import { NextResponse, type NextRequest } from "next/server";
import { getClientById, updateClientFollowUp } from "@/lib/crm";

type RouteContext = {
  params: Promise<{ id: string }>;
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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const senderEmail = process.env.AGREEMENT_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
    const senderName = process.env.AGREEMENT_FROM_NAME || "Werkly Consulting";
    const apiKey = process.env.RESEND_API_KEY;
    const replyToEmail = process.env.AGREEMENT_REPLY_TO_EMAIL || "hr@werkly.in";
    const defaultCcEmails = String(process.env.AGREEMENT_DEFAULT_CC_EMAILS || "")
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
    const client = await getClientById(id, token);
    const body = (await request.json()) as {
      toEmails?: string[];
      ccEmails?: string[];
      copySender?: boolean;
      subject?: string;
      message?: string;
      htmlMessage?: string;
      attachments?: Array<{
        filename?: string;
        content?: string;
      }>;
    };

    const toEmails = Array.from(
      new Set(
        (body.toEmails ?? [client.contactEmail, client.secondaryContactEmail])
          .map((email) => String(email || "").trim())
          .filter(Boolean)
      )
    );
    const ccEmails = Array.from(
      new Set(
        [
          ...defaultCcEmails,
          ...(body.ccEmails ?? []),
          ...(body.copySender && senderEmail ? [senderEmail] : []),
        ]
          .map((email) => String(email || "").trim())
          .filter(Boolean)
      )
    );
    const subject =
      String(body.subject || "").trim() || `Recruitment Agreement - ${client.companyName}`;
    const message = String(body.message || "").trim();
    const htmlMessage = String(body.htmlMessage || "").trim();
    const attachments = (body.attachments ?? [])
      .map((attachment) => ({
        filename: String(attachment.filename || "").trim(),
        content: String(attachment.content || "").trim(),
      }))
      .filter((attachment) => attachment.filename && attachment.content);

    if (!toEmails.length) {
      return NextResponse.json(
        { message: "Client email is required before sharing agreement." },
        { status: 400 }
      );
    }

    if (!message && !htmlMessage) {
      return NextResponse.json({ message: "Agreement message is required." }, { status: 400 });
    }

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
        attachments: attachments.length ? attachments : undefined,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(errorText || "Unable to send agreement email.");
    }

    const sentNote = `Agreement shared to ${toEmails.join(", ")}${
      ccEmails.length ? ` with CC to ${ccEmails.join(", ")}` : ""
    }${attachments.length ? ` with ${attachments.length} attachment(s)` : ""}.`;
    const updatedClient = await updateClientFollowUp(
      id,
      {
        followUpStatus: client.followUpStatus || "in-progress",
        lastFollowUpDate: new Date().toISOString().slice(0, 10),
        nextFollowUpDate: client.nextFollowUpDate,
        followUpNotes: [client.followUpNotes, sentNote].filter(Boolean).join("\n\n"),
      },
      token
    );

    return NextResponse.json({
      client: updatedClient,
      sentTo: toEmails,
      message: "Agreement shared and CRM follow-up updated.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send agreement email.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

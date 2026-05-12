import { NextResponse, type NextRequest } from "next/server";
import {
  getClientById,
  isLeadOnboardingStatus,
  updateClientFollowUp,
  updateClientOnboarding,
} from "@/lib/crm";

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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const senderEmail = process.env.RESEND_FROM_EMAIL;
    const senderName = process.env.RESEND_FROM_NAME || "Werkly Consulting";
    const apiKey = process.env.RESEND_API_KEY;

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
      subject?: string;
      message?: string;
    };
    const toEmails = Array.from(
      new Set(
        (body.toEmails ?? [client.contactEmail, client.secondaryContactEmail])
          .map((email) => String(email || "").trim())
          .filter(Boolean)
      )
    );
    const subject =
      String(body.subject || "").trim() ||
      `Recruitment Partnership Proposal - Werkly Consulting`;
    const message = String(body.message || "").trim();

    if (!toEmails.length) {
      return NextResponse.json(
        { message: "Client email is required before sending proposal mail." },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json({ message: "Proposal message is required." }, { status: 400 });
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
        subject,
        html: `
          <div style="font-family:Arial,sans-serif;color:#18343a;line-height:1.65;font-size:15px;">
            ${formatEmailBody(message)}
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(errorText || "Unable to send proposal email.");
    }

    let updatedClient = client;
    const sentNote = `Business proposal email sent to ${toEmails.join(", ")}.`;

    if (isLeadOnboardingStatus(client.onboardingStatus)) {
      updatedClient = await updateClientOnboarding(
        id,
        {
          onboardingStatus: "proposal-shared",
          notes: [client.notes, sentNote].filter(Boolean).join("\n\n"),
        },
        token
      );
    }

    updatedClient = await updateClientFollowUp(
      id,
      {
        followUpStatus: "business-proposal-email-sent",
        lastFollowUpDate: new Date().toISOString().slice(0, 10),
        nextFollowUpDate: updatedClient.nextFollowUpDate,
        followUpNotes: [updatedClient.followUpNotes, sentNote].filter(Boolean).join("\n\n"),
      },
      token
    );

    return NextResponse.json({
      client: updatedClient,
      sentTo: toEmails,
      message: "Proposal email sent and CRM follow-up updated.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send proposal email.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { bulkUpdateClientFollowUp, type ClientBulkFollowUpPayload } from "@/lib/crm";

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as ClientBulkFollowUpPayload;
    const result = await bulkUpdateClientFollowUp(body, token);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update lead follow-up details.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

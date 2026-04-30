import { NextResponse } from "next/server";
import { bulkAssignClients, type ClientBulkAssignmentPayload } from "@/lib/crm";

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as ClientBulkAssignmentPayload;
    const result = await bulkAssignClients(body, token);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update lead assignment.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

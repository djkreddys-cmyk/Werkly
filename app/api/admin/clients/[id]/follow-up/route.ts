import { NextResponse, type NextRequest } from "next/server";
import { updateClientFollowUp, type ClientFormPayload } from "@/lib/crm";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as Pick<
      ClientFormPayload,
      "followUpStatus" | "nextFollowUpDate" | "lastFollowUpDate" | "followUpNotes"
    >;
    const { id } = await context.params;
    const client = await updateClientFollowUp(id, body, token);
    return NextResponse.json(client);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update client follow-up.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { reviewApprovalRequest } from "@/lib/workflow";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const payload = await request.json();
    const approval = await reviewApprovalRequest(id, payload, token);
    return NextResponse.json(approval);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to review approval request.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

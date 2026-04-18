import { NextResponse } from "next/server";
import { updateLeaveRequestStatus } from "@/lib/leave";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      status: "pending" | "approved" | "rejected";
      adminNote?: string;
    };
    const leaveRequest = await updateLeaveRequestStatus(id, body, token);
    return NextResponse.json(leaveRequest);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update leave request.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

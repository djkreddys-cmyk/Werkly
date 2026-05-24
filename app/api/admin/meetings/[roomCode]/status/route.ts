import { NextResponse } from "next/server";
import { updateInternalMeetingStatus, type InternalMeetingStatus } from "@/lib/crm";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim() || "";
}

export async function PUT(
  request: Request,
  context: RouteContext<"/api/admin/meetings/[roomCode]/status">
) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as { status?: InternalMeetingStatus };
    const { roomCode } = await context.params;
    const meeting = await updateInternalMeetingStatus(roomCode, body.status || "scheduled", token);
    return NextResponse.json(meeting);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update meeting on backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

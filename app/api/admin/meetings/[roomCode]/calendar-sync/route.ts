import { NextResponse } from "next/server";
import { syncInternalMeetingCalendar } from "@/lib/crm";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim() || "";
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/meetings/[roomCode]/calendar-sync">
) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { roomCode } = await context.params;
    const result = await syncInternalMeetingCalendar(roomCode, token);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync meeting calendars.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

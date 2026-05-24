import { NextResponse } from "next/server";
import { getInternalMeeting } from "@/lib/crm";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim() || "";
}

export async function GET(request: Request, context: RouteContext<"/api/admin/meetings/[roomCode]">) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { roomCode } = await context.params;
    const meeting = await getInternalMeeting(roomCode, token);
    return NextResponse.json(meeting);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load meeting from backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import {
  deleteInternalMeeting,
  getInternalMeeting,
  updateInternalMeeting,
} from "@/lib/crm";
import type { InternalMeetingPayload } from "@/lib/crm";

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

export async function PUT(request: Request, context: RouteContext<"/api/admin/meetings/[roomCode]">) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { roomCode } = await context.params;
    const body = (await request.json()) as InternalMeetingPayload;
    const meeting = await updateInternalMeeting(roomCode, body, token);
    return NextResponse.json(meeting);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update meeting on backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/admin/meetings/[roomCode]">
) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { roomCode } = await context.params;
    const result = await deleteInternalMeeting(roomCode, token);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete meeting on backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

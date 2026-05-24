import { NextResponse } from "next/server";
import { clearInternalMeetings, createInternalMeeting, getInternalMeetings } from "@/lib/crm";
import type { InternalMeetingPayload } from "@/lib/crm";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim() || "";
}

export async function GET(request: Request) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const meetings = await getInternalMeetings(token);
    return NextResponse.json({ meetings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load meetings.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as InternalMeetingPayload;
    const meeting = await createInternalMeeting(body, token);
    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create meeting.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const result = await clearInternalMeetings(token);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to clear meetings.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import {
  createInternalMeeting,
  getInternalMeetings,
  type InternalMeetingPayload,
} from "@/lib/crm";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim() || "";
}

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const meetings = await getInternalMeetings(token);
    return NextResponse.json({ meetings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load meetings from backend.";
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
    const message =
      error instanceof Error ? error.message : "Unable to create meeting on backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

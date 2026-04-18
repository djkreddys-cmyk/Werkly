import { NextResponse } from "next/server";
import { createLeaveRequest, getLeaveRequests } from "@/lib/leave";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const requests = await getLeaveRequests(token);
    return NextResponse.json({ requests });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load leave requests.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as {
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      reason: string;
    };
    const leaveRequest = await createLeaveRequest(body, token);
    return NextResponse.json(leaveRequest, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create leave request.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

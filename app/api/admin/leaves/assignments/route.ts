import { NextResponse } from "next/server";
import { assignLeaveBalance, getLeaveAssignments } from "@/lib/leave";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const assignments = await getLeaveAssignments(token);
    return NextResponse.json({ assignments });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load leave assignments.";
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
      employeeId: string;
      leaveTypeId: string;
      allocatedDays: number;
    };
    const assignment = await assignLeaveBalance(body, token);
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to assign leave balance.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createLeaveType, getLeaveTypes } from "@/lib/leave";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const leaveTypes = await getLeaveTypes(token);
    return NextResponse.json({ leaveTypes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load leave types.";
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
      name: string;
      description?: string;
      isActive?: boolean;
    };
    const leaveType = await createLeaveType(body, token);
    return NextResponse.json(leaveType, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create leave type.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

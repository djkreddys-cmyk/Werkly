import { NextResponse, type NextRequest } from "next/server";
import { createShiftAssignment, getShiftAssignments } from "@/lib/shifts";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const assignments = await getShiftAssignments(token);
    return NextResponse.json({ assignments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load shift assignments.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as Parameters<typeof createShiftAssignment>[0];
    const assignment = await createShiftAssignment(body, token);
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create shift assignment.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

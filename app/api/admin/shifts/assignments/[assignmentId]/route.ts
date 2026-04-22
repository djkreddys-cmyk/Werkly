import { NextResponse, type NextRequest } from "next/server";
import { updateShiftAssignment } from "@/lib/shifts";

type RouteContext = {
  params: Promise<{ assignmentId: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { assignmentId } = await context.params;
    const body = (await request.json()) as Parameters<typeof updateShiftAssignment>[1];
    const assignment = await updateShiftAssignment(assignmentId, body, token);
    return NextResponse.json(assignment);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update shift assignment.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

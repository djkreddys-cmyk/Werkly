import { NextResponse } from "next/server";
import { deleteJobApplication } from "@/lib/jobs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await deleteJobApplication(id, token);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete candidate from backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { updateJobApplicationDetails, type JobApplicationUpdatePayload } from "@/lib/jobs";

export async function PUT(
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
    const body = (await request.json()) as JobApplicationUpdatePayload;
    const application = await updateJobApplicationDetails(id, body, token);
    return NextResponse.json(application);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update candidate details.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

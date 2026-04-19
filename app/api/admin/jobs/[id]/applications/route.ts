import { NextResponse } from "next/server";
import { createManualJobApplication, getJobApplications } from "@/lib/jobs";

export async function GET(
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
    const applications = await getJobApplications(id, token);
    return NextResponse.json({ applications });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load job applications.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(
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
    const body = (await request.json()) as Parameters<typeof createManualJobApplication>[1];
    const application = await createManualJobApplication(id, body, token);
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to add candidate to job.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

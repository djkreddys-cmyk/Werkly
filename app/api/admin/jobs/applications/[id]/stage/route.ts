import { NextResponse } from "next/server";
import {
  updateJobApplicationStage,
  type JobApplicationStage,
} from "@/lib/jobs";

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
    const body = (await request.json()) as {
      stage?: JobApplicationStage;
      stageNote?: string;
      stageDate?: string;
      interviewScheduledAt?: string;
      interviewMode?: string;
      interviewPanel?: string;
      interviewReminderAt?: string;
      finalCtc?: string;
      dateOfJoining?: string;
    };
    const application = await updateJobApplicationStage(
      id,
      body.stage ?? "applied",
      body.stageNote ?? "",
      body.stageDate ?? "",
      token,
      {
        interviewScheduledAt: body.interviewScheduledAt,
        interviewMode: body.interviewMode,
        interviewPanel: body.interviewPanel,
        interviewReminderAt: body.interviewReminderAt,
        finalCtc: body.finalCtc,
        dateOfJoining: body.dateOfJoining,
      }
    );
    return NextResponse.json(application);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update application stage.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

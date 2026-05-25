import { NextResponse } from "next/server";
import {
  assignCandidateApplicationToJob,
  type JobApplicationStage,
} from "@/lib/jobs";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim() || "";
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/jobs/applications/[id]/assign-job">
) {
  try {
    const token = getToken(request);

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      jobId?: string;
      initialStage?: JobApplicationStage;
      stageNote?: string;
      stageDate?: string;
    };

    if (!body.jobId) {
      return NextResponse.json({ message: "Target job is required." }, { status: 400 });
    }

    const application = await assignCandidateApplicationToJob(
      id,
      {
        jobId: body.jobId,
        initialStage: body.initialStage,
        stageNote: body.stageNote,
        stageDate: body.stageDate,
      },
      token
    );

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to assign candidate to job.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

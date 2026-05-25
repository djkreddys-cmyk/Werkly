import { NextResponse } from "next/server";
import { getResumeBuilderSubmissions, type ResumeBuilderSubmission } from "@/lib/jobs";

function slimSubmission(submission: ResumeBuilderSubmission): ResumeBuilderSubmission {
  const { resumeFileData, resumePayload, ...rest } = submission;
  return {
    ...rest,
    resumeAvailable: Boolean(submission.resumeAvailable || resumeFileData),
  };
}

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const submissions = await getResumeBuilderSubmissions(token);
    const url = new URL(request.url);
    const shouldSlim = url.searchParams.get("slim") === "1";
    return NextResponse.json({
      submissions: shouldSlim ? submissions.map(slimSubmission) : submissions,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load resume builder submissions.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

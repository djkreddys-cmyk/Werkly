import { NextResponse } from "next/server";
import { getResumeBuilderSubmissions } from "@/lib/jobs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const submissions = await getResumeBuilderSubmissions(token);
    const submission = submissions.find((item) => item.id === id);

    if (!submission?.resumeFileData || !submission.resumeFileName) {
      return NextResponse.json({ message: "Resume is not available." }, { status: 404 });
    }

    return NextResponse.json({
      resumeFileName: submission.resumeFileName,
      resumeFileType: submission.resumeFileType,
      resumeFileData: submission.resumeFileData,
      resumePayload: submission.resumePayload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load resume.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

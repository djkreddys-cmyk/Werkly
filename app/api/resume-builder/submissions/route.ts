import { NextResponse } from "next/server";
import { createResumeBuilderSubmission } from "@/lib/jobs";

export async function POST(request: Request) {
  try {
    const submission = await createResumeBuilderSubmission(await request.json());
    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save resume builder submission.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { mergeJobs } from "@/lib/jobs";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const primaryJobCode = String(body.primaryJobCode || "").trim();
    const duplicateJobCode = String(body.duplicateJobCode || "").trim();

    if (!primaryJobCode || !duplicateJobCode || primaryJobCode === duplicateJobCode) {
      return NextResponse.json(
        { message: "Primary and duplicate job codes are required." },
        { status: 400 }
      );
    }

    const result = await mergeJobs(primaryJobCode, duplicateJobCode, token);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to merge jobs.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

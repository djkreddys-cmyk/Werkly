import { NextResponse } from "next/server";
import { getJobs } from "@/lib/jobs";

export async function GET() {
  try {
    const jobs = await getJobs();
    return NextResponse.json({ jobs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load public jobs.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getJobBySlug } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const job = await getJobBySlug(slug);

    if (!job) {
      return NextResponse.json({ message: "Job not found." }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load public job detail.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

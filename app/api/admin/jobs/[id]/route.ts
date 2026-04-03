import { NextResponse } from "next/server";
import { deleteJob, splitMultiline, updateJob, type JobFormPayload, type JobStatus } from "@/lib/jobs";

function normalizePayload(body: Record<string, unknown>): JobFormPayload {
  return {
    title: String(body.title ?? ""),
    slug: String(body.slug ?? ""),
    location: String(body.location ?? ""),
    sector: String(body.sector ?? ""),
    experience: String(body.experience ?? ""),
    employmentType: String(body.employmentType ?? "Full Time"),
    salary: body.salary ? String(body.salary) : undefined,
    packagePerAnnum: body.packagePerAnnum ? String(body.packagePerAnnum) : undefined,
    status: (body.status as JobStatus) ?? "draft",
    summary: String(body.summary ?? ""),
    description: String(body.description ?? ""),
    skills: splitMultiline(String(body.skills ?? "")),
    responsibilities: splitMultiline(String(body.responsibilities ?? "")),
    requirements: splitMultiline(String(body.requirements ?? "")),
    applyUrl: body.applyUrl ? String(body.applyUrl) : undefined,
  };
}

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
    const body = (await request.json()) as Record<string, unknown>;
    const payload = normalizePayload(body);
    const job = await updateJob(id, payload, token);
    return NextResponse.json(job);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update job on backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
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
    const result = await deleteJob(id, token);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete job on backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

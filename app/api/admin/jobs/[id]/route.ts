import { NextResponse } from "next/server";
import {
  deleteJob,
  getAdminJobById,
  splitMultiline,
  updateJob,
  type JobFormPayload,
  type JobStatus,
} from "@/lib/jobs";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePayload(body: Record<string, unknown>): JobFormPayload {
  const title = String(body.title ?? "");
  const location = String(body.location ?? "");
  const sector = String(body.sector ?? "");
  const experience = String(body.experience ?? "");
  const positionsCount = Math.max(1, Math.floor(Number(body.positionsCount ?? 1) || 1));
  return {
    title,
    slug: slugify(String(body.slug ?? title)),
    clientId: body.clientId ? String(body.clientId) : undefined,
    recruiterId: body.recruiterId ? String(body.recruiterId) : undefined,
    location,
    sector,
    experience,
    employmentType: String(body.employmentType ?? "Full Time"),
    salary: body.salary ? String(body.salary) : undefined,
    packagePerAnnum: body.packagePerAnnum ? String(body.packagePerAnnum) : undefined,
    positionsCount,
    status: (body.status as JobStatus) ?? "draft",
    isHidden: Boolean(body.isHidden),
    postedAt: body.postedAt ? String(body.postedAt) : undefined,
    lastDateToApply: body.lastDateToApply ? String(body.lastDateToApply) : undefined,
    description:
      String(body.description ?? "").trim() ||
      `${title} opening in ${location} for ${sector} hiring with ${experience} experience expectations.`,
    responsibilities: splitMultiline(String(body.responsibilities ?? "")),
    requirements: splitMultiline(String(body.requirements ?? "")),
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
    const job = await getAdminJobById(id, token);

    if (!job) {
      return NextResponse.json({ message: "Job not found." }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load job details.";
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
      error instanceof Error ? error.message : "Unable to delete job from backend.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

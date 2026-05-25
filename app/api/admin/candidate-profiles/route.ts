import { NextResponse } from "next/server";
import { buildUniversalCandidateProfiles } from "@/lib/candidate-profiles";
import {
  getAdminApplications,
  getAdminCandidateEnquiries,
  getResumeBuilderSubmissions,
  type CandidateEnquiry,
  type JobApplication,
  type ResumeBuilderSubmission,
} from "@/lib/jobs";

function stripProfileResumeData<T extends { resumeFileData?: string; resumeAvailable?: boolean }>(
  profile: T
) {
  const { resumeFileData, ...rest } = profile;
  return {
    ...rest,
    resumeAvailable: Boolean(profile.resumeAvailable || resumeFileData),
  };
}

async function safeLoad<T>(loader: () => Promise<T>, fallback: T) {
  try {
    return await loader();
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ message: "Missing admin token." }, { status: 401 });
  }

  const [applications, enquiries, submissions] = await Promise.all([
    safeLoad(() => getAdminApplications(token), [] as JobApplication[]),
    safeLoad(() => getAdminCandidateEnquiries(token), [] as CandidateEnquiry[]),
    safeLoad(() => getResumeBuilderSubmissions(token), [] as ResumeBuilderSubmission[]),
  ]);

  const profiles = buildUniversalCandidateProfiles(applications, enquiries, submissions);
  const url = new URL(request.url);
  const shouldSlim = url.searchParams.get("slim") === "1";
  const shouldReturnSummaryOnly = url.searchParams.get("summary") === "1";

  const totals = {
    applications: applications.length,
    enquiries: enquiries.length,
    resumeBuilderSubmissions: submissions.length,
    profiles: profiles.length,
    mergedDuplicates:
      applications.length + enquiries.length + submissions.length - profiles.length,
  };

  if (shouldReturnSummaryOnly) {
    return NextResponse.json({ totals });
  }

  return NextResponse.json({
    profiles: shouldSlim ? profiles.map(stripProfileResumeData) : profiles,
    totals,
  });
}

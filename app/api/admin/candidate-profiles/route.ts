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

  return NextResponse.json({
    profiles,
    totals: {
      applications: applications.length,
      enquiries: enquiries.length,
      resumeBuilderSubmissions: submissions.length,
      profiles: profiles.length,
      mergedDuplicates:
        applications.length + enquiries.length + submissions.length - profiles.length,
    },
  });
}

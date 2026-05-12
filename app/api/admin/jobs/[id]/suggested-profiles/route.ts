import { NextResponse } from "next/server";
import {
  getAdminApplications,
  getAdminCandidateEnquiries,
  getAdminJobById,
  getResumeBuilderSubmissions,
  type CandidateEnquiry,
  type JobApplication,
  type JobDetail,
  type ResumeBuilderSubmission,
} from "@/lib/jobs";

type CrmProfile = {
  id: string;
  source: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  currentDesignation?: string;
  preferredRole?: string;
  currentCompany?: string;
  experience?: string;
  currentLocation?: string;
  preferredLocation?: string;
  preferredSector?: string;
  skills?: string;
  resumeFileName?: string;
  resumeFileType?: string;
  resumeFileData?: string;
  lastActivityAt?: string;
  profileText: string;
};

type CandidateSuggestion = CrmProfile & {
  matchScore: number;
  matchLevel: "Strong" | "Good" | "Possible";
  matchReasons: string[];
};

function normalizeText(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();
}

function tokenize(value?: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function uniqueTokens(values: Array<string | undefined>) {
  return Array.from(new Set(values.flatMap((value) => tokenize(value))));
}

function countTokenMatches(source: string | undefined, tokens: string[]) {
  const normalized = ` ${normalizeText(source)} `;
  return tokens.filter((token) => normalized.includes(` ${token} `)).length;
}

function extractExperienceYears(value?: string) {
  const numbers = String(value || "").match(/\d+(?:\.\d+)?/g);
  if (!numbers?.length) {
    return undefined;
  }

  return Math.max(...numbers.map(Number).filter((item) => Number.isFinite(item)));
}

function mergeProfile(existing: CrmProfile, next: CrmProfile): CrmProfile {
  const sourceParts = Array.from(new Set([...existing.source.split(", "), next.source]));
  return {
    ...existing,
    source: sourceParts.join(", "),
    candidateName: existing.candidateName || next.candidateName,
    candidateEmail: existing.candidateEmail || next.candidateEmail,
    candidatePhone: existing.candidatePhone || next.candidatePhone,
    currentDesignation: existing.currentDesignation || next.currentDesignation,
    preferredRole: existing.preferredRole || next.preferredRole,
    currentCompany: existing.currentCompany || next.currentCompany,
    experience: existing.experience || next.experience,
    currentLocation: existing.currentLocation || next.currentLocation,
    preferredLocation: existing.preferredLocation || next.preferredLocation,
    preferredSector: existing.preferredSector || next.preferredSector,
    skills: existing.skills || next.skills,
    resumeFileName: existing.resumeFileName || next.resumeFileName,
    resumeFileType: existing.resumeFileType || next.resumeFileType,
    resumeFileData: existing.resumeFileData || next.resumeFileData,
    lastActivityAt:
      new Date(next.lastActivityAt || 0).getTime() > new Date(existing.lastActivityAt || 0).getTime()
        ? next.lastActivityAt
        : existing.lastActivityAt,
    profileText: `${existing.profileText} ${next.profileText}`,
  };
}

function profileKey(profile: CrmProfile) {
  const email = normalizeText(profile.candidateEmail);
  const phone = normalizeText(profile.candidatePhone).replace(/\s+/g, "");

  if (email) {
    return `email:${email}`;
  }
  if (phone) {
    return `phone:${phone}`;
  }

  return `profile:${normalizeText(profile.candidateName)}:${normalizeText(profile.currentLocation)}`;
}

function applicationToProfile(application: JobApplication): CrmProfile {
  const profileText = [
    application.candidateName,
    application.currentDesignation,
    application.preferredRole,
    application.experience,
    application.currentCompany,
    application.currentLocation,
    application.preferredLocation,
    application.preferredSector,
    application.candidateMessage,
    application.jobTitle,
    application.sector,
  ].join(" ");

  return {
    id: application.id,
    source: "Job Applicants",
    candidateName: application.candidateName,
    candidateEmail: application.candidateEmail,
    candidatePhone: application.candidatePhone,
    currentDesignation: application.currentDesignation,
    preferredRole: application.preferredRole || application.jobTitle,
    currentCompany: application.currentCompany,
    experience: application.experience,
    currentLocation: application.currentLocation,
    preferredLocation: application.preferredLocation,
    preferredSector: application.preferredSector || application.sector,
    resumeFileName: application.resumeFileName,
    resumeFileType: application.resumeFileType,
    resumeFileData: application.resumeFileData,
    lastActivityAt: application.appliedAt,
    profileText,
  };
}

function enquiryToProfile(enquiry: CandidateEnquiry): CrmProfile {
  const profileText = [
    enquiry.candidateName,
    enquiry.currentDesignation,
    enquiry.preferredRole,
    enquiry.experience,
    enquiry.currentCompany,
    enquiry.currentLocation,
    enquiry.preferredLocation,
    enquiry.preferredSector,
    enquiry.candidateMessage,
  ].join(" ");

  return {
    id: enquiry.id,
    source: "Candidate Enquiries",
    candidateName: enquiry.candidateName,
    candidateEmail: enquiry.candidateEmail,
    candidatePhone: enquiry.candidatePhone,
    currentDesignation: enquiry.currentDesignation,
    preferredRole: enquiry.preferredRole,
    currentCompany: enquiry.currentCompany,
    experience: enquiry.experience,
    currentLocation: enquiry.currentLocation,
    preferredLocation: enquiry.preferredLocation,
    preferredSector: enquiry.preferredSector,
    resumeFileName: enquiry.resumeFileName,
    resumeFileType: enquiry.resumeFileType,
    resumeFileData: enquiry.resumeFileData,
    lastActivityAt: enquiry.createdAt,
    profileText,
  };
}

function resumeBuilderToProfile(submission: ResumeBuilderSubmission): CrmProfile {
  const profileText = [
    submission.candidateName,
    submission.targetRole,
    submission.location,
    submission.yearsExperience,
    submission.skills,
  ].join(" ");

  return {
    id: submission.id,
    source: "Resume Builders",
    candidateName: submission.candidateName,
    candidateEmail: submission.candidateEmail,
    candidatePhone: submission.candidatePhone,
    preferredRole: submission.targetRole,
    experience: submission.yearsExperience,
    currentLocation: submission.location,
    preferredLocation: submission.location,
    skills: submission.skills,
    resumeFileName: submission.resumeFileName,
    resumeFileType: submission.resumeFileType,
    resumeFileData: submission.resumeFileData,
    lastActivityAt: submission.updatedAt || submission.createdAt,
    profileText,
  };
}

function scoreProfile(job: JobDetail, profile: CrmProfile): CandidateSuggestion {
  const reasons: string[] = [];
  const jobRoleText = [job.title, job.summary, job.description, ...(job.requirements ?? [])].join(" ");
  const jobSkillTokens = uniqueTokens([...(job.skills ?? []), ...(job.requirements ?? [])]);
  const jobLocationTokens = uniqueTokens([job.location]);
  const jobSectorTokens = uniqueTokens([job.sector]);
  const profileRoleText = [profile.preferredRole, profile.currentDesignation, profile.profileText].join(" ");
  const profileLocationText = [profile.preferredLocation, profile.currentLocation].join(" ");

  let score = 0;

  const roleMatches = countTokenMatches(profileRoleText, uniqueTokens([job.title]));
  if (roleMatches > 0) {
    score += 25;
    reasons.push(`Role matches ${job.title}`);
  }

  const skillMatches = countTokenMatches([profile.skills, profile.profileText].join(" "), jobSkillTokens);
  if (skillMatches > 0) {
    const skillScore = Math.min(25, skillMatches * 6);
    score += skillScore;
    reasons.push(`${skillMatches} skill/requirement match${skillMatches === 1 ? "" : "es"}`);
  }

  const sectorMatches = countTokenMatches([profile.preferredSector, profile.profileText].join(" "), jobSectorTokens);
  if (sectorMatches > 0) {
    score += 15;
    reasons.push(`Sector fit: ${job.sector}`);
  }

  const locationMatches = countTokenMatches(profileLocationText, jobLocationTokens);
  if (locationMatches > 0) {
    score += 15;
    reasons.push(`Location fit: ${job.location}`);
  }

  const requiredYears = extractExperienceYears(job.experience);
  const candidateYears = extractExperienceYears(profile.experience);
  if (candidateYears !== undefined && requiredYears !== undefined) {
    if (candidateYears >= Math.max(0, requiredYears - 1)) {
      score += 10;
      reasons.push(`Experience fit: ${profile.experience}`);
    } else if (candidateYears > 0) {
      score += 4;
      reasons.push(`Some experience: ${profile.experience}`);
    }
  } else if (profile.experience) {
    score += 5;
    reasons.push(`Experience available: ${profile.experience}`);
  }

  const broadMatches = countTokenMatches(profile.profileText, uniqueTokens([jobRoleText]));
  if (broadMatches > 1 && roleMatches === 0) {
    score += Math.min(10, broadMatches * 2);
    reasons.push("Profile text overlaps with job details");
  }

  if (profile.resumeFileData) {
    score += 5;
    reasons.push("Resume available");
  }

  if (profile.lastActivityAt) {
    const activityAgeDays =
      (Date.now() - new Date(profile.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
    if (Number.isFinite(activityAgeDays) && activityAgeDays <= 90) {
      score += 5;
      reasons.push("Recent CRM activity");
    }
  }

  const matchScore = Math.min(100, Math.round(score));
  return {
    ...profile,
    matchScore,
    matchLevel: matchScore >= 70 ? "Strong" : matchScore >= 45 ? "Good" : "Possible",
    matchReasons: reasons.slice(0, 4),
  };
}

async function safeLoad<T>(loader: () => Promise<T>, fallback: T) {
  try {
    return await loader();
  } catch {
    return fallback;
  }
}

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
    const job = await getAdminJobById(id, token);

    if (!job) {
      return NextResponse.json({ message: "Job not found." }, { status: 404 });
    }

    const [applications, enquiries, resumeSubmissions] = await Promise.all([
      safeLoad(() => getAdminApplications(token), [] as JobApplication[]),
      safeLoad(() => getAdminCandidateEnquiries(token), [] as CandidateEnquiry[]),
      safeLoad(() => getResumeBuilderSubmissions(token), [] as ResumeBuilderSubmission[]),
    ]);

    const profiles = new Map<string, CrmProfile>();
    const addProfile = (profile: CrmProfile) => {
      const key = profileKey(profile);
      const existing = profiles.get(key);
      profiles.set(key, existing ? mergeProfile(existing, profile) : profile);
    };

    applications
      .filter((application) => application.jobId !== job.id)
      .map(applicationToProfile)
      .forEach(addProfile);
    enquiries.map(enquiryToProfile).forEach(addProfile);
    resumeSubmissions.map(resumeBuilderToProfile).forEach(addProfile);

    const suggestions = Array.from(profiles.values())
      .map((profile) => scoreProfile(job, profile))
      .filter((profile) => profile.matchScore >= 25)
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
      })
      .slice(0, 25);

    return NextResponse.json({
      jobId: job.id,
      suggestions,
      totalProfilesReviewed: profiles.size,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load suggested CRM profiles.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

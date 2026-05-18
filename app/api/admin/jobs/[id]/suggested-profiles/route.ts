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
  aiMatchScore?: number;
  aiMatchLevel?: "Strong" | "Good" | "Possible";
  aiSummary?: string;
  aiStrengths?: string[];
  aiConcerns?: string[];
};

const ignoredMatchTokens = new Set([
  "and",
  "are",
  "for",
  "from",
  "job",
  "role",
  "the",
  "this",
  "with",
  "work",
  "years",
  "year",
  "experience",
  "experienced",
  "strong",
  "good",
  "ability",
  "team",
  "teams",
  "support",
  "manage",
  "manager",
  "management",
  "required",
  "preferred",
  "candidate",
  "profile",
]);

const tokenAliases: Record<string, string[]> = {
  bd: ["business", "development", "sales"],
  bde: ["business", "development", "sales"],
  hr: ["human", "resources", "recruiter", "recruitment", "talent"],
  recruiter: ["recruitment", "talent", "acquisition", "sourcing"],
  recruitment: ["recruiter", "talent", "acquisition", "sourcing"],
  civil: ["construction", "site", "project"],
  construction: ["civil", "site", "project"],
  accounts: ["accounting", "finance"],
  finance: ["accounts", "accounting"],
  sales: ["business", "development", "bd"],
  marketing: ["brand", "digital"],
  production: ["manufacturing", "operations"],
  manufacturing: ["production", "plant", "operations"],
  qa: ["quality", "assurance"],
  qc: ["quality", "control"],
  quality: ["qa", "qc"],
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
    .filter((token) => token.length > 2 && !ignoredMatchTokens.has(token));
}

function uniqueTokens(values: Array<string | undefined>) {
  const baseTokens = values.flatMap((value) => tokenize(value));
  const expandedTokens = baseTokens.flatMap((token) => [token, ...(tokenAliases[token] ?? [])]);
  return Array.from(new Set(expandedTokens));
}

function countTokenMatches(source: string | undefined, tokens: string[]) {
  const normalized = ` ${normalizeText(source)} `;
  return tokens.filter((token) => normalized.includes(` ${token} `)).length;
}

function extractImportantPhrases(values: Array<string | undefined>) {
  const phrases = new Set<string>();

  values.forEach((value) => {
    const tokens = tokenize(value);
    for (let size = 2; size <= 4; size += 1) {
      for (let index = 0; index <= tokens.length - size; index += 1) {
        const phrase = tokens.slice(index, index + size).join(" ");
        if (phrase.length >= 8) {
          phrases.add(phrase);
        }
      }
    }
  });

  return Array.from(phrases).slice(0, 30);
}

function countPhraseMatches(source: string | undefined, phrases: string[]) {
  const normalized = normalizeText(source);
  return phrases.filter((phrase) => normalized.includes(phrase)).length;
}

function extractExperienceYears(value?: string) {
  const numbers = String(value || "").match(/\d+(?:\.\d+)?/g);
  if (!numbers?.length) {
    return undefined;
  }

  return Math.max(...numbers.map(Number).filter((item) => Number.isFinite(item)));
}

function extractExperienceRange(value?: string) {
  const numbers = String(value || "")
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((item) => Number.isFinite(item));

  if (!numbers?.length) {
    return {};
  }

  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  };
}

function isFlexibleLocation(value?: string) {
  const normalized = normalizeText(value);
  return [
    "remote",
    "hybrid",
    "pan india",
    "anywhere",
    "any location",
    "multiple location",
    "multiple locations",
  ].some((token) => normalized.includes(token));
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
  const jobTitleTokens = uniqueTokens([job.title]);
  const jobLocationTokens = uniqueTokens([job.location]);
  const jobSectorTokens = uniqueTokens([job.sector]);
  const importantPhrases = extractImportantPhrases([
    job.title,
    ...(job.skills ?? []),
    ...(job.requirements ?? []),
  ]);
  const profileRoleText = [profile.preferredRole, profile.currentDesignation, profile.profileText].join(" ");
  const profileLocationText = [profile.preferredLocation, profile.currentLocation].join(" ");
  const fullProfileText = [profile.skills, profile.profileText].join(" ");

  let score = 0;

  const roleMatches = countTokenMatches(profileRoleText, jobTitleTokens);
  if (roleMatches > 0) {
    const roleCoverage = jobTitleTokens.length ? roleMatches / jobTitleTokens.length : 0;
    score += roleCoverage >= 0.65 ? 25 : Math.min(16, roleMatches * 7);
    reasons.push(
      roleCoverage >= 0.65 ? `Role matches ${job.title}` : `Partial role fit for ${job.title}`
    );
  }

  const phraseMatches = countPhraseMatches(fullProfileText, importantPhrases);
  if (phraseMatches > 0) {
    score += Math.min(18, phraseMatches * 6);
    reasons.push(`${phraseMatches} exact job phrase match${phraseMatches === 1 ? "" : "es"}`);
  }

  const skillMatches = countTokenMatches(fullProfileText, jobSkillTokens);
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
  } else if (isFlexibleLocation(job.location) || isFlexibleLocation(profileLocationText)) {
    score += 8;
    reasons.push("Flexible location fit");
  }

  const requiredYears = extractExperienceRange(job.experience);
  const candidateYears = extractExperienceYears(profile.experience);
  if (candidateYears !== undefined && requiredYears.min !== undefined) {
    const lowerBound = Math.max(0, requiredYears.min - 1);
    const upperBound = requiredYears.max;
    if (candidateYears >= lowerBound && (upperBound === undefined || candidateYears <= upperBound + 3)) {
      score += 12;
      reasons.push(`Experience fit: ${profile.experience}`);
    } else if (candidateYears >= lowerBound) {
      score += 8;
      reasons.push(`Senior experience available: ${profile.experience}`);
    } else if (candidateYears > 0) {
      score += 3;
      reasons.push(`Below target experience: ${profile.experience}`);
      score -= 4;
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

  const hasContact = Boolean(profile.candidateEmail || profile.candidatePhone);
  const hasRole = Boolean(profile.preferredRole || profile.currentDesignation);
  if (hasContact && hasRole) {
    score += 4;
    reasons.push("Profile has contact and role details");
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

function extractResponseText(response: Record<string, unknown>) {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const output = Array.isArray(response.output) ? response.output : [];
  return output
    .flatMap((item) => {
      const content = item && typeof item === "object" && "content" in item ? item.content : [];
      return Array.isArray(content) ? content : [];
    })
    .map((item) => {
      if (item && typeof item === "object" && "text" in item) {
        return String(item.text || "");
      }
      return "";
    })
    .join("");
}

async function applyAiMatching(job: JobDetail, suggestions: CandidateSuggestion[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model =
    process.env.OPENAI_PROFILE_MATCHING_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";

  if (!apiKey || suggestions.length === 0) {
    return {
      suggestions,
      matchingMode: "rule-based" as const,
      aiModel: "",
      aiError: "",
    };
  }

  try {
    const candidates = suggestions.slice(0, 60).map((profile) => ({
      candidateId: profile.id,
      source: profile.source,
      candidateName: profile.candidateName,
      currentDesignation: profile.currentDesignation,
      preferredRole: profile.preferredRole,
      experience: profile.experience,
      currentLocation: profile.currentLocation,
      preferredLocation: profile.preferredLocation,
      preferredSector: profile.preferredSector,
      skills: profile.skills,
      ruleScore: profile.matchScore,
      ruleReasons: profile.matchReasons,
      hasResume: Boolean(profile.resumeFileData),
      profileText: profile.profileText.slice(0, 1500),
    }));

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "You rank CRM candidate profiles for recruiter job matching. Return JSON only. Use the candidateId exactly as provided. Score fit for the specific job, not general quality. Be strict about must-have role, domain, experience, and location gaps.",
          },
          {
            role: "user",
            content: JSON.stringify({
              job: {
                id: job.id,
                title: job.title,
                location: job.location,
                sector: job.sector,
                experience: job.experience,
                employmentType: job.employmentType,
                salary: job.salary || job.packagePerAnnum,
                summary: job.summary,
                description: job.description,
                responsibilities: job.responsibilities,
                requirements: job.requirements,
                skills: job.skills,
              },
              candidates,
              instructions:
                "Rank candidates by practical recruiter fit. Consider title/role intent, domain, skills, location preference, experience range, resume availability, recency, and missing data. Do not over-score candidates with weak role intent just because they share generic words. Use concise recruiter-facing summaries and include concerns when critical data is missing.",
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "crm_profile_matches",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["rankings"],
              properties: {
                rankings: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "candidateId",
                      "aiScore",
                      "aiLevel",
                      "aiSummary",
                      "strengths",
                      "concerns",
                    ],
                    properties: {
                      candidateId: { type: "string" },
                      aiScore: { type: "integer" },
                      aiLevel: { type: "string", enum: ["Strong", "Good", "Possible"] },
                      aiSummary: { type: "string" },
                      strengths: {
                        type: "array",
                        items: { type: "string" },
                      },
                      concerns: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = (await response.json()) as Record<string, unknown>;
    const parsed = JSON.parse(extractResponseText(data)) as {
      rankings?: Array<{
        candidateId: string;
        aiScore: number;
        aiLevel: "Strong" | "Good" | "Possible";
        aiSummary: string;
        strengths: string[];
        concerns: string[];
      }>;
    };

    const rankings = new Map(
      (parsed.rankings ?? []).map((item) => [String(item.candidateId), item])
    );
    const aiSuggestions = suggestions
      .map((profile) => {
        const ranking = rankings.get(profile.id);
        if (!ranking) {
          return profile;
        }

        return {
          ...profile,
          aiMatchScore: Math.max(0, Math.min(100, Math.round(Number(ranking.aiScore) || 0))),
          aiMatchLevel: ranking.aiLevel,
          aiSummary: ranking.aiSummary,
          aiStrengths: ranking.strengths ?? [],
          aiConcerns: ranking.concerns ?? [],
        };
      })
      .sort((a, b) => {
        const aiDifference = (b.aiMatchScore ?? -1) - (a.aiMatchScore ?? -1);
        if (aiDifference !== 0) {
          return aiDifference;
        }
        return b.matchScore - a.matchScore;
      });

    return {
      suggestions: aiSuggestions,
      matchingMode: "ai" as const,
      aiModel: model,
      aiError: "",
    };
  } catch (error) {
    return {
      suggestions,
      matchingMode: "rule-based" as const,
      aiModel: model,
      aiError: error instanceof Error ? error.message : "AI matching failed.",
    };
  }
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

    const ruleBasedSuggestions = Array.from(profiles.values())
      .map((profile) => scoreProfile(job, profile))
      .filter((profile) => profile.matchScore >= 15)
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
      })
      .slice(0, 35);
    const matchingResult = await applyAiMatching(job, ruleBasedSuggestions);

    return NextResponse.json({
      jobId: job.id,
      suggestions: matchingResult.suggestions,
      totalProfilesReviewed: profiles.size,
      matchingMode: matchingResult.matchingMode,
      aiModel: matchingResult.aiModel,
      aiError: matchingResult.aiError,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load suggested CRM profiles.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

import type { CandidateEnquiry, JobApplication, ResumeBuilderSubmission } from "@/lib/jobs";

export type UniversalCandidateProfile = {
  id: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  experience?: string;
  currentCompany?: string;
  currentLocation?: string;
  currentDesignation?: string;
  preferredRole?: string;
  preferredLocation?: string;
  preferredSector?: string;
  skills?: string;
  resumeFileName?: string;
  resumeFileData?: string;
  resumeAvailable?: boolean;
  sources: string[];
  sourceCount: number;
  applicationIds: string[];
  enquiryIds: string[];
  resumeBuilderIds: string[];
  jobs: string[];
  clients: string[];
  latestStage?: string;
  latestActivityAt?: string;
  profileText: string;
};

function normalizeText(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePhone(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function firstFilled(...values: Array<string | undefined>) {
  return values.find((value) => String(value || "").trim())?.trim();
}

function unique(values: Array<string | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean))
  );
}

function profileKey(name?: string, email?: string, phone?: string) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);

  if (normalizedEmail) {
    return `email:${normalizedEmail}`;
  }
  if (normalizedPhone) {
    return `phone:${normalizedPhone}`;
  }

  return `name:${normalizeText(name) || crypto.randomUUID()}`;
}

function dateValue(value?: string) {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function createProfile(id: string): UniversalCandidateProfile {
  return {
    id,
    candidateName: "",
    sources: [],
    sourceCount: 0,
    applicationIds: [],
    enquiryIds: [],
    resumeBuilderIds: [],
    jobs: [],
    clients: [],
    profileText: "",
  };
}

function rebuildProfileText(profile: UniversalCandidateProfile) {
  profile.sourceCount = profile.sources.length;
  profile.profileText = [
    profile.candidateName,
    profile.candidateEmail,
    profile.candidatePhone,
    profile.experience,
    profile.currentCompany,
    profile.currentLocation,
    profile.currentDesignation,
    profile.preferredRole,
    profile.preferredLocation,
    profile.preferredSector,
    profile.skills,
    ...profile.jobs,
    ...profile.clients,
    ...profile.sources,
  ]
    .join(" ")
    .toLowerCase();
}

function touchLatest(profile: UniversalCandidateProfile, value?: string) {
  if (!value) {
    return;
  }

  if (!profile.latestActivityAt || dateValue(value) > dateValue(profile.latestActivityAt)) {
    profile.latestActivityAt = value;
  }
}

export function buildUniversalCandidateProfiles(
  applications: JobApplication[],
  enquiries: CandidateEnquiry[],
  submissions: ResumeBuilderSubmission[]
) {
  const profiles = new Map<string, UniversalCandidateProfile>();

  applications.forEach((application) => {
    const key = profileKey(
      application.candidateName,
      application.candidateEmail,
      application.candidatePhone
    );
    const profile = profiles.get(key) ?? createProfile(key);

    profile.candidateName = firstFilled(profile.candidateName, application.candidateName) ?? "";
    profile.candidateEmail = firstFilled(profile.candidateEmail, application.candidateEmail);
    profile.candidatePhone = firstFilled(profile.candidatePhone, application.candidatePhone);
    profile.experience = firstFilled(profile.experience, application.experience);
    profile.currentCompany = firstFilled(profile.currentCompany, application.currentCompany);
    profile.currentLocation = firstFilled(profile.currentLocation, application.currentLocation);
    profile.currentDesignation = firstFilled(
      profile.currentDesignation,
      application.currentDesignation
    );
    profile.preferredRole = firstFilled(profile.preferredRole, application.preferredRole);
    profile.preferredLocation = firstFilled(profile.preferredLocation, application.preferredLocation);
    profile.preferredSector = firstFilled(profile.preferredSector, application.preferredSector);
    profile.resumeFileName = firstFilled(profile.resumeFileName, application.resumeFileName);
    profile.resumeFileData = firstFilled(profile.resumeFileData, application.resumeFileData);
    profile.resumeAvailable =
      profile.resumeAvailable || Boolean(application.resumeAvailable || application.resumeFileData);
    profile.latestStage = application.stage ?? profile.latestStage;
    profile.sources = unique([...profile.sources, application.sourceType || "Job Applicants"]);
    profile.applicationIds = unique([...profile.applicationIds, application.id]);
    profile.jobs = unique([...profile.jobs, application.jobTitle, application.jobCode]);
    profile.clients = unique([...profile.clients, application.clientName]);
    touchLatest(profile, application.stageUpdatedAt || application.appliedAt);
    profiles.set(key, profile);
  });

  enquiries.forEach((enquiry) => {
    const key = profileKey(enquiry.candidateName, enquiry.candidateEmail, enquiry.candidatePhone);
    const profile = profiles.get(key) ?? createProfile(key);

    profile.candidateName = firstFilled(profile.candidateName, enquiry.candidateName) ?? "";
    profile.candidateEmail = firstFilled(profile.candidateEmail, enquiry.candidateEmail);
    profile.candidatePhone = firstFilled(profile.candidatePhone, enquiry.candidatePhone);
    profile.experience = firstFilled(profile.experience, enquiry.experience);
    profile.currentCompany = firstFilled(profile.currentCompany, enquiry.currentCompany);
    profile.currentLocation = firstFilled(profile.currentLocation, enquiry.currentLocation);
    profile.currentDesignation = firstFilled(profile.currentDesignation, enquiry.currentDesignation);
    profile.preferredRole = firstFilled(profile.preferredRole, enquiry.preferredRole);
    profile.preferredLocation = firstFilled(profile.preferredLocation, enquiry.preferredLocation);
    profile.preferredSector = firstFilled(profile.preferredSector, enquiry.preferredSector);
    profile.resumeFileName = firstFilled(profile.resumeFileName, enquiry.resumeFileName);
    profile.resumeFileData = firstFilled(profile.resumeFileData, enquiry.resumeFileData);
    profile.resumeAvailable =
      profile.resumeAvailable || Boolean(enquiry.resumeAvailable || enquiry.resumeFileData);
    profile.sources = unique([...profile.sources, enquiry.sourceType || "Candidate Enquiries"]);
    profile.enquiryIds = unique([...profile.enquiryIds, enquiry.id]);
    touchLatest(profile, enquiry.createdAt);
    profiles.set(key, profile);
  });

  submissions.forEach((submission) => {
    const key = profileKey(
      submission.candidateName,
      submission.candidateEmail,
      submission.candidatePhone
    );
    const profile = profiles.get(key) ?? createProfile(key);

    profile.candidateName = firstFilled(profile.candidateName, submission.candidateName) ?? "";
    profile.candidateEmail = firstFilled(profile.candidateEmail, submission.candidateEmail);
    profile.candidatePhone = firstFilled(profile.candidatePhone, submission.candidatePhone);
    profile.experience = firstFilled(profile.experience, submission.yearsExperience);
    profile.currentLocation = firstFilled(profile.currentLocation, submission.location);
    profile.preferredRole = firstFilled(profile.preferredRole, submission.targetRole);
    profile.skills = firstFilled(profile.skills, submission.skills);
    profile.resumeFileName = firstFilled(profile.resumeFileName, submission.resumeFileName);
    profile.resumeFileData = firstFilled(profile.resumeFileData, submission.resumeFileData);
    profile.resumeAvailable =
      profile.resumeAvailable || Boolean(submission.resumeAvailable || submission.resumeFileData);
    profile.sources = unique([...profile.sources, submission.sourceType || "Resume Builder"]);
    profile.resumeBuilderIds = unique([...profile.resumeBuilderIds, submission.id]);
    touchLatest(profile, submission.updatedAt || submission.createdAt);
    profiles.set(key, profile);
  });

  return Array.from(profiles.values())
    .map((profile) => {
      rebuildProfileText(profile);
      return profile;
    })
    .sort((first, second) => dateValue(second.latestActivityAt) - dateValue(first.latestActivityAt));
}

export function countMatchingUniversalProfiles(
  job: {
    title?: string;
    sector?: string;
    location?: string;
    experience?: string;
    skills?: string[];
    responsibilities?: string[] | string;
    requirements?: string[] | string;
  },
  profiles: UniversalCandidateProfile[]
) {
  const tokens = unique([
    ...normalizeText(job.title).split(/\s+/),
    ...normalizeText(job.sector).split(/\s+/),
    ...normalizeText(job.location).split(/\s+/),
    ...normalizeText(job.experience).split(/\s+/),
    ...(job.skills ?? []).flatMap((skill) => normalizeText(skill).split(/\s+/)),
  ]).filter((token) => token.length > 2);

  if (tokens.length === 0) {
    return 0;
  }

  return profiles.filter((profile) => {
    const score = tokens.reduce(
      (total, token) => total + (profile.profileText.includes(token) ? 1 : 0),
      0
    );
    return score >= Math.min(2, tokens.length);
  }).length;
}

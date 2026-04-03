export type JobStatus = "draft" | "open" | "closed";

export type JobSummary = {
  id: string;
  jobCode?: string;
  slug: string;
  title: string;
  location: string;
  sector: string;
  experience: string;
  employmentType: string;
  salary?: string;
  packagePerAnnum?: string;
  status: JobStatus;
  postedAt: string;
  lastDateToApply?: string;
  summary: string;
  skills: string[];
};

export type JobDetail = JobSummary & {
  description: string;
  responsibilities: string[];
  requirements: string[];
  packagePerAnnum?: string;
  applyUrl?: string;
};

export type JobsResponse = {
  jobs: JobSummary[];
};

export type AdminLoginResponse = {
  token: string;
  admin: {
    name: string;
    email: string;
  };
};

export type JobFormPayload = {
  title: string;
  slug: string;
  location: string;
  sector: string;
  experience: string;
  employmentType: string;
  salary?: string;
  packagePerAnnum?: string;
  status: JobStatus;
  postedAt?: string;
  lastDateToApply?: string;
  summary: string;
  description: string;
  skills: string[];
  responsibilities: string[];
  requirements: string[];
};

const demoJobs: JobDetail[] = [
  {
    id: "job-erp-manager",
    jobCode: "26040001",
    slug: "erp-manager-hyderabad",
    title: "ERP Manager",
    location: "Hyderabad",
    sector: "Education Technology",
    experience: "8+ years",
    employmentType: "Full Time",
    salary: "As per experience",
    packagePerAnnum: "12 - 18 LPA",
    status: "open",
    postedAt: "2026-04-03",
    lastDateToApply: "2026-04-30",
    summary:
      "Lead ERP operations, stakeholder alignment, and rollout discipline for a growing education-focused organization.",
    description:
      "We are looking for an ERP Manager who can align business users, delivery teams, and leadership priorities while keeping execution structured and measurable.",
    skills: ["ERP", "Stakeholder Management", "Operations", "MIS Reporting"],
    responsibilities: [
      "Own ERP delivery priorities across business teams and partner stakeholders.",
      "Drive implementation follow-ups, issue resolution, and user adoption planning.",
      "Coordinate with leadership on reporting, process improvements, and execution timelines.",
    ],
    requirements: [
      "8+ years of experience in ERP or enterprise operations roles.",
      "Strong communication and stakeholder management capability.",
      "Experience in process-driven delivery environments.",
    ],
  },
  {
    id: "job-pharma-qc",
    jobCode: "26040002",
    slug: "quality-control-specialist-vijayawada",
    title: "Quality Control Specialist",
    location: "Vijayawada",
    sector: "Pharma & Life Sciences",
    experience: "4+ years",
    employmentType: "Full Time",
    salary: "Competitive",
    packagePerAnnum: "6 - 9 LPA",
    status: "open",
    postedAt: "2026-04-01",
    lastDateToApply: "2026-04-24",
    summary:
      "Support regulated quality processes, documentation discipline, and batch-release readiness in a pharma setting.",
    description:
      "This role is ideal for professionals with hands-on quality control experience who can support documentation accuracy and compliance workflows.",
    skills: ["QC", "Documentation", "GMP", "Compliance"],
    responsibilities: [
      "Review quality records and support documentation discipline.",
      "Assist with sample analysis, batch support, and release coordination.",
      "Work with manufacturing and QA teams on issue escalation and closure.",
    ],
    requirements: [
      "4+ years of experience in pharma quality control.",
      "Good understanding of GMP and documentation systems.",
      "Ability to work in structured process environments.",
    ],
  },
  {
    id: "job-construction-sales",
    jobCode: "26030001",
    slug: "regional-sales-manager-building-materials",
    title: "Regional Sales Manager",
    location: "Hyderabad / AP",
    sector: "Building Materials & Construction Systems",
    experience: "6+ years",
    employmentType: "Full Time",
    salary: "Incentive based",
    packagePerAnnum: "10 - 14 LPA",
    status: "open",
    postedAt: "2026-03-29",
    lastDateToApply: "2026-04-20",
    summary:
      "Drive dealer and project sales growth across building materials, channel development, and regional expansion.",
    description:
      "We are hiring a Regional Sales Manager to own business growth across channel partners, projects, and sales planning within the building materials sector.",
    skills: ["Channel Sales", "Project Sales", "Dealer Network", "Revenue Growth"],
    responsibilities: [
      "Manage dealer and project sales relationships across assigned regions.",
      "Drive revenue growth through channel expansion and account planning.",
      "Collaborate with leadership on forecasts, conversion, and market strategy.",
    ],
    requirements: [
      "6+ years of sales experience in building materials or allied industries.",
      "Strong regional network and business development capability.",
      "Comfortable with structured reporting and target ownership.",
    ],
  },
];

function getBaseUrl() {
  return (
    process.env.RAILWAY_API_BASE_URL ||
    process.env.NEXT_PUBLIC_RAILWAY_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
}

function normalizeJobSummary(job: Partial<JobDetail>): JobSummary {
  return {
    id: String(job.id ?? ""),
    jobCode: job.jobCode ? String(job.jobCode) : undefined,
    slug: String(job.slug ?? ""),
    title: String(job.title ?? ""),
    location: String(job.location ?? ""),
    sector: String(job.sector ?? ""),
    experience: String(job.experience ?? ""),
    employmentType: String(job.employmentType ?? "Full Time"),
    salary: job.salary ? String(job.salary) : undefined,
    packagePerAnnum: job.packagePerAnnum ? String(job.packagePerAnnum) : undefined,
    status: (job.status as JobStatus) ?? "open",
    postedAt: String(job.postedAt ?? ""),
    lastDateToApply: job.lastDateToApply ? String(job.lastDateToApply) : undefined,
    summary: String(job.summary ?? ""),
    skills: Array.isArray(job.skills) ? job.skills.map(String) : [],
  };
}

function normalizeJobDetail(job: Partial<JobDetail>): JobDetail {
  return {
    ...normalizeJobSummary(job),
    description: String(job.description ?? ""),
    responsibilities: Array.isArray(job.responsibilities)
      ? job.responsibilities.map(String)
      : [],
    requirements: Array.isArray(job.requirements) ? job.requirements.map(String) : [],
    packagePerAnnum: job.packagePerAnnum ? String(job.packagePerAnnum) : undefined,
  };
}

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error("Railway API base URL is not configured.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Railway request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getJobs(): Promise<JobSummary[]> {
  try {
    const data = await readJson<JobsResponse | JobSummary[]>("/jobs");
    const jobs = Array.isArray(data) ? data : data.jobs;
    return jobs.map(normalizeJobSummary);
  } catch {
    return demoJobs.map(normalizeJobSummary);
  }
}

export async function getJobBySlug(slug: string): Promise<JobDetail | null> {
  try {
    const job = await readJson<JobDetail>(`/jobs/${slug}`);
    return normalizeJobDetail(job);
  } catch {
    return demoJobs.find((job) => job.slug === slug) ?? null;
  }
}

export async function adminLogin(email: string, password: string) {
  return readJson<AdminLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function createJob(payload: JobFormPayload, token: string) {
  return readJson<JobDetail>("/admin/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateJob(id: string, payload: JobFormPayload, token: string) {
  return readJson<JobDetail>(`/admin/jobs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function deleteJob(id: string, token: string) {
  return readJson<{ success: boolean }>(`/admin/jobs/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function splitMultiline(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

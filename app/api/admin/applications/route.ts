import { NextResponse } from "next/server";
import { getClients, getEmployees } from "@/lib/crm";
import {
  getAdminApplications,
  getAdminJobs,
  getJobApplications,
  type JobApplication,
} from "@/lib/jobs";

function slimApplication(application: JobApplication): JobApplication {
  const { resumeFileData, ...rest } = application;
  return {
    ...rest,
    resumeAvailable: Boolean(application.resumeAvailable || resumeFileData),
  };
}

const upstreamTimeoutMs = 12_000;
const fallbackBatchSize = 5;

async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function loadApplicationsFallback(token: string, shouldSlim: boolean) {
  const [jobs, clients, employees] = await Promise.all([
    getAdminJobs(token),
    getClients(token),
    getEmployees(token),
  ]);
  const jobsWithApplications = jobs.filter((job) => job.applicationsCount > 0);
  const applications: JobApplication[] = [];
  let failedJobs = 0;

  for (let index = 0; index < jobsWithApplications.length; index += fallbackBatchSize) {
    const batch = jobsWithApplications.slice(index, index + fallbackBatchSize);
    const results = await Promise.allSettled(
      batch.map(async (job) => {
        const client = clients.find((item) => item.id === job.clientId);
        const recruiter = employees.find((item) => item.id === client?.assignedEmployeeId);
        const items = await withTimeout((signal) =>
          getJobApplications(job.id, token, { slim: shouldSlim, signal })
        );

        return items.map((application) => ({
          ...application,
          stage: application.stage ?? "applied",
          clientId: job.clientId,
          jobCode: job.jobCode,
          clientName: job.clientName ?? client?.companyName,
          recruiterName: recruiter?.fullName,
          recruiterEmail: recruiter?.email,
          jobLocation: job.location,
          sector: job.sector,
          jobTitle: application.jobTitle || job.title,
        }));
      })
    );

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        applications.push(...result.value);
      } else {
        failedJobs += 1;
      }
    });
  }

  if (failedJobs > 0) {
    console.warn("[api/admin/applications] fallback returned partial data", {
      failedJobs,
      queriedJobs: jobsWithApplications.length,
    });
  }

  return applications.sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
  );
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    let applications;
    const url = new URL(request.url);
    const shouldSlim = url.searchParams.get("slim") === "1";

    try {
      applications = await withTimeout((signal) =>
        getAdminApplications(token, { slim: shouldSlim, signal })
      );
    } catch (directError) {
      console.warn("[api/admin/applications] direct request failed; using bounded fallback", {
        error: directError instanceof Error ? directError.message : String(directError),
      });
      applications = await loadApplicationsFallback(token, shouldSlim);
    }

    return NextResponse.json({
      applications: shouldSlim ? applications.map(slimApplication) : applications,
    });
  } catch (error) {
    console.error("[api/admin/applications] request failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    const message =
      error instanceof Error ? error.message : "Unable to load admin applications.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

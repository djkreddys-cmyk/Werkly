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
      applications = await getAdminApplications(token, { slim: shouldSlim });
    } catch {
      const [jobs, clients, employees] = await Promise.all([
        getAdminJobs(token),
        getClients(token),
        getEmployees(token),
      ]);

      const jobApplications = await Promise.all(
        jobs.map(async (job) => {
          const client = clients.find((item) => item.id === job.clientId);
          const recruiter = employees.find(
            (item) => item.id === client?.assignedEmployeeId
          );
          const items = await getJobApplications(job.id, token, { slim: shouldSlim });

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

      applications = jobApplications.flat().sort(
        (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      );
    }

    return NextResponse.json({
      applications: shouldSlim ? applications.map(slimApplication) : applications,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load admin applications.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

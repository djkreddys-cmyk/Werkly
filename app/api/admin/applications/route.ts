import { NextResponse } from "next/server";
import { getClients, getEmployees } from "@/lib/crm";
import { getAdminApplications, getAdminJobs, getJobApplications } from "@/lib/jobs";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const jobs = await getAdminJobs(token);
    let applications;

    try {
      applications = await getAdminApplications(token);
    } catch {
      const [clients, employees] = await Promise.all([getClients(token), getEmployees(token)]);

      const jobApplications = await Promise.all(
        jobs.map(async (job) => {
          const client = clients.find((item) => item.id === job.clientId);
          const recruiter = employees.find(
            (item) => item.id === client?.assignedEmployeeId
          );
          const items = await getJobApplications(job.id, token);

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

    const jobsById = new Map(jobs.map((job) => [job.id, job]));
    applications = applications.map((application) => {
      const job = jobsById.get(application.jobId);
      return {
        ...application,
        clientId: application.clientId || job?.clientId,
        clientName: application.clientName || job?.clientName,
        jobCode: application.jobCode || job?.jobCode,
        jobTitle: application.jobTitle || job?.title,
      };
    });

    return NextResponse.json({ applications });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load admin applications.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

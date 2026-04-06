import "dotenv/config";
import cors from "cors";
import express from "express";
import { createAdminToken, requireAdmin, validateAdmin } from "./auth.js";
import {
  createClient,
  createEmployee,
  ensureCrmSchema,
  listClients,
  listEmployees,
} from "./crm.js";
import {
  createJob,
  ensureJobsSchema,
  getJobBySlug,
  listJobApplications,
  listAdminJobs,
  listJobs,
  recordJobApplication,
  updateJob,
} from "./jobs.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/auth/login", async (request, response) => {
  const { email, password } = request.body ?? {};

  if (!email || !password) {
    return response.status(400).json({ message: "Email and password are required." });
  }

  const isValid = await validateAdmin(email, password);

  if (!isValid) {
    return response.status(401).json({ message: "Invalid credentials." });
  }

  const token = createAdminToken(email);
  return response.json({
    token,
    admin: {
      email,
      name: "Werkly Admin",
    },
  });
});

app.get("/jobs", async (_request, response) => {
  try {
    const jobs = await listJobs();
    response.json({ jobs });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load jobs.",
    });
  }
});

app.get("/admin/jobs", requireAdmin, async (_request, response) => {
  try {
    const jobs = await listAdminJobs();
    response.json({ jobs });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load admin jobs.",
    });
  }
});

app.get("/jobs/:slug", async (request, response) => {
  try {
    const job = await getJobBySlug(request.params.slug);

    if (!job) {
      return response.status(404).json({ message: "Job not found." });
    }

    response.json(job);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load job.",
    });
  }
});

app.post("/jobs/:slug/applications", async (request, response) => {
  try {
    const {
      candidateName,
      candidateEmail,
      candidatePhone,
      experience,
      currentCompany,
      currentLocation,
      currentDesignation,
      preferredRole,
      currentCtc,
      expectedCtc,
      preferredLocation,
      preferredSector,
      candidateMessage,
      jobTitle,
    } = request.body ?? {};

    if (!candidateName || !candidateEmail) {
      return response.status(400).json({
        message: "Candidate name and email are required.",
      });
    }

    const job = await recordJobApplication(request.params.slug, {
      candidateName,
      candidateEmail,
      candidatePhone,
      experience,
      currentCompany,
      currentLocation,
      currentDesignation,
      preferredRole,
      currentCtc,
      expectedCtc,
      preferredLocation,
      preferredSector,
      candidateMessage,
      jobTitle,
    });

    if (!job) {
      return response.status(404).json({ message: "Job not found." });
    }

    response.json(job);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update application count.",
    });
  }
});

app.get("/admin/jobs/:id/applications", requireAdmin, async (request, response) => {
  try {
    const applications = await listJobApplications(request.params.id);
    response.json({ applications });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load job applications.",
    });
  }
});

app.get("/admin/employees", requireAdmin, async (_request, response) => {
  try {
    const employees = await listEmployees();
    response.json({ employees });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load employees.",
    });
  }
});

app.post("/admin/employees", requireAdmin, async (request, response) => {
  try {
    const { fullName, email, phone, role, password, status } = request.body ?? {};

    if (!fullName || !email || !role || !password) {
      return response.status(400).json({
        message: "Full name, email, role, and password are required.",
      });
    }

    const employee = await createEmployee({
      fullName,
      email,
      phone,
      role,
      password,
      status,
    });

    response.status(201).json(employee);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create employee.",
    });
  }
});

app.get("/admin/clients", requireAdmin, async (_request, response) => {
  try {
    const clients = await listClients();
    response.json({ clients });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load clients.",
    });
  }
});

app.post("/admin/clients", requireAdmin, async (request, response) => {
  try {
    const {
      companyName,
      contactPerson,
      contactEmail,
      contactPhone,
      sector,
      branch,
      assignedEmployeeId,
      assignedEmployeeName,
      status,
      notes,
    } = request.body ?? {};

    if (!companyName || !contactPerson) {
      return response.status(400).json({
        message: "Company name and contact person are required.",
      });
    }

    const client = await createClient({
      companyName,
      contactPerson,
      contactEmail,
      contactPhone,
      sector,
      branch,
      assignedEmployeeId,
      assignedEmployeeName,
      status,
      notes,
    });

    response.status(201).json(client);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create client.",
    });
  }
});

app.post("/admin/jobs", requireAdmin, async (request, response) => {
  try {
    const job = await createJob(request.body);
    response.status(201).json(job);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create job.",
    });
  }
});

app.put("/admin/jobs/:id", requireAdmin, async (request, response) => {
  try {
    const job = await updateJob(request.params.id, request.body);

    if (!job) {
      return response.status(404).json({ message: "Job not found." });
    }

    response.json(job);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update job.",
    });
  }
});

Promise.all([ensureJobsSchema(), ensureCrmSchema()])
  .then(() => {
    app.listen(port, () => {
      console.log(`Werkly Railway backend listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize jobs schema", error);
    process.exit(1);
  });

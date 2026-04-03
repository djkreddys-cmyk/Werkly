import "dotenv/config";
import cors from "cors";
import express from "express";
import { createAdminToken, requireAdmin, validateAdmin } from "./auth.js";
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
    const { candidateName, candidateEmail } = request.body ?? {};

    if (!candidateName || !candidateEmail) {
      return response.status(400).json({
        message: "Candidate name and email are required.",
      });
    }

    const job = await recordJobApplication(request.params.slug, {
      candidateName,
      candidateEmail,
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

ensureJobsSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Werkly Railway backend listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize jobs schema", error);
    process.exit(1);
  });

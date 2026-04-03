import "dotenv/config";
import cors from "cors";
import express from "express";
import { createAdminToken, requireAdmin, validateAdmin } from "./auth.js";
import {
  createJob,
  deleteJob,
  ensureJobsSchema,
  getJobBySlug,
  incrementApplicationsCount,
  listJobs,
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
    const job = await incrementApplicationsCount(request.params.slug);

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

app.delete("/admin/jobs/:id", requireAdmin, async (request, response) => {
  try {
    const success = await deleteJob(request.params.id);

    if (!success) {
      return response.status(404).json({ message: "Job not found." });
    }

    response.json({ success: true });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to delete job.",
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

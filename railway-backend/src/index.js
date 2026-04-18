import "dotenv/config";
import cors from "cors";
import express from "express";
import {
  createAdminToken,
  createEmployeeToken,
  requireAdmin,
  requireInternalUser,
  requirePasswordChangeEligibleUser,
  validateAdmin,
} from "./auth.js";
import {
  authenticateEmployee,
  changeEmployeePassword,
  createClient,
  createEmployee,
  ensureCrmSchema,
  listClients,
  listEmployees,
  updateEmployee,
} from "./crm.js";
import {
  createJob,
  ensureJobsSchema,
  getJobBySlug,
  listAdminApplications,
  listApplicationStageHistory,
  listJobApplications,
  listAdminJobs,
  listJobs,
  recordJobApplication,
  updateJobApplicationStage,
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
app.use(express.json({ limit: "12mb" }));

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/auth/login", async (request, response) => {
  const { identifier, email, password } = request.body ?? {};
  const loginIdentifier = String(identifier ?? email ?? "").trim();

  if (!loginIdentifier || !password) {
    return response
      .status(400)
      .json({ message: "Employee code or admin email, and password are required." });
  }

  const isAdminLogin = loginIdentifier.includes("@");

  if (isAdminLogin) {
    const isValid = await validateAdmin(loginIdentifier, password);

    if (!isValid) {
      return response.status(401).json({ message: "Invalid credentials." });
    }

    const token = createAdminToken(loginIdentifier);
    return response.json({
      token,
      requiresPasswordChange: false,
      user: {
        type: "admin",
        role: "admin",
        email: loginIdentifier,
        name: "Werkly Admin",
      },
    });
  }

  try {
    const employee = await authenticateEmployee(loginIdentifier, password);

    if (!employee) {
      return response.status(401).json({ message: "Invalid credentials." });
    }

    const token = createEmployeeToken(employee);
    return response.json({
      token,
      requiresPasswordChange: employee.mustChangePassword,
      user: {
        type: "employee",
        id: employee.id,
        role: employee.role,
        name: employee.fullName,
        email: employee.email,
        employeeCode: employee.employeeCode,
      },
    });
  } catch (error) {
    return response.status(403).json({
      message: error instanceof Error ? error.message : "Unable to log in.",
    });
  }
});

app.post(
  "/auth/change-password",
  requirePasswordChangeEligibleUser,
  async (request, response) => {
    try {
      if (request.user?.type !== "employee" || !request.user?.id) {
        return response.status(400).json({
          message: "Only employee logins can change passwords here.",
        });
      }

      const { newPassword } = request.body ?? {};

      if (!newPassword || String(newPassword).trim().length < 6) {
        return response.status(400).json({
          message: "New password must be at least 6 characters long.",
        });
      }

      const employee = await changeEmployeePassword(
        request.user.id,
        String(newPassword).trim()
      );

      if (!employee) {
        return response.status(404).json({ message: "Employee not found." });
      }

      const token = createEmployeeToken(employee);
      return response.json({
        token,
        requiresPasswordChange: false,
        user: {
          type: "employee",
          id: employee.id,
          role: employee.role,
          name: employee.fullName,
          email: employee.email,
          employeeCode: employee.employeeCode,
        },
      });
    } catch (error) {
      return response.status(500).json({
        message: error instanceof Error ? error.message : "Unable to change password.",
      });
    }
  }
);

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

app.get("/admin/jobs", requireInternalUser, async (_request, response) => {
  try {
    const jobs = await listAdminJobs(
      _request.user?.type === "employee" ? _request.user.id : null
    );
    response.json({ jobs });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load admin jobs.",
    });
  }
});

app.get("/admin/applications", requireInternalUser, async (_request, response) => {
  try {
    const applications = await listAdminApplications(
      _request.user?.type === "employee" ? _request.user.id : null
    );
    response.json({ applications });
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to load candidate applications.",
    });
  }
});

app.get("/admin/applications/history", requireInternalUser, async (_request, response) => {
  try {
    const history = await listApplicationStageHistory(
      _request.user?.type === "employee" ? _request.user.id : null
    );
    response.json({ history });
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to load application history.",
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

app.get("/admin/jobs/:id/applications", requireInternalUser, async (request, response) => {
  try {
    const applications = await listJobApplications(
      request.params.id,
      request.user?.type === "employee" ? request.user.id : null
    );
    response.json({ applications });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load job applications.",
    });
  }
});

app.put(
  "/admin/jobs/applications/:id/stage",
  requireInternalUser,
  async (request, response) => {
    try {
      const { stage, stageNote, stageDate } = request.body ?? {};
      const allowedStages = [
        "applied",
        "shortlisted",
        "interview",
        "offered",
        "joined",
        "rejected",
      ];

      if (!allowedStages.includes(stage)) {
        return response.status(400).json({ message: "Invalid application stage." });
      }

      const application = await updateJobApplicationStage(
        request.params.id,
        stage,
        stageNote,
        stageDate,
        request.user?.type === "employee" ? request.user.id : null
      );

      if (!application) {
        return response.status(404).json({ message: "Application not found." });
      }

      response.json(application);
    } catch (error) {
      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Unable to update application stage.",
      });
    }
  }
);

app.get("/admin/employees", requireInternalUser, async (_request, response) => {
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
    const { fullName, email, phone, role, password, status, inactiveDate, inactiveRemarks } =
      request.body ?? {};

    if (!fullName || !email || !role || !password) {
      return response.status(400).json({
        message: "Full name, email, role, and password are required.",
      });
    }

    if (status === "inactive" && (!inactiveDate || !inactiveRemarks)) {
      return response.status(400).json({
        message: "Inactive date and remarks are required when employee is inactive.",
      });
    }

    const employee = await createEmployee({
      fullName,
      email,
      phone,
      role,
      password,
      status,
      inactiveDate,
      inactiveRemarks,
    });

    response.status(201).json(employee);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create employee.",
    });
  }
});

app.put("/admin/employees/:id", requireAdmin, async (request, response) => {
  try {
    const { fullName, email, phone, role, password, status, inactiveDate, inactiveRemarks } =
      request.body ?? {};

    if (!fullName || !email || !role) {
      return response.status(400).json({
        message: "Full name, email, and role are required.",
      });
    }

    if (status === "inactive" && (!inactiveDate || !inactiveRemarks)) {
      return response.status(400).json({
        message: "Inactive date and remarks are required when employee is inactive.",
      });
    }

    const employee = await updateEmployee(request.params.id, {
      fullName,
      email,
      phone,
      role,
      password,
      status,
      inactiveDate,
      inactiveRemarks,
    });

    if (!employee) {
      return response.status(404).json({ message: "Employee not found." });
    }

    response.json(employee);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update employee.",
    });
  }
});

app.get("/admin/clients", requireInternalUser, async (_request, response) => {
  try {
    const clients = await listClients(
      _request.user?.type === "employee" ? _request.user.id : null
    );
    response.json({ clients });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load clients.",
    });
  }
});

app.post("/admin/clients", requireInternalUser, async (request, response) => {
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
      agreementFileName,
      agreementFileType,
      agreementFileData,
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
      agreementFileName,
      agreementFileType,
      agreementFileData,
    });

    response.status(201).json(client);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create client.",
    });
  }
});

app.post("/admin/jobs", requireInternalUser, async (request, response) => {
  try {
    const job = await createJob(request.body);
    response.status(201).json(job);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create job.",
    });
  }
});

app.put("/admin/jobs/:id", requireInternalUser, async (request, response) => {
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

ensureCrmSchema()
  .then(() => ensureJobsSchema())
  .then(() => {
    app.listen(port, () => {
      console.log(`Werkly Railway backend listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize jobs schema", error);
    process.exit(1);
  });

import "dotenv/config";
import cors from "cors";
import express from "express";
import { randomUUID } from "crypto";
import {
  ensureAuthAuditSchema,
  listAttendanceSessions,
  listScreenActivity,
  recordLoginSession,
  recordLogoutSession,
  recordScreenActivity,
} from "./audit.js";
import {
  createAdminToken,
  createEmployeeToken,
  requireAdmin,
  requireInternalUser,
  requirePasswordChangeEligibleUser,
  validateAdmin,
} from "./auth.js";
import {
  adminResetEmployeePassword,
  authenticateEmployee,
  changeEmployeePassword,
  createClient,
  createClientTransferRequest,
  createNotificationLog,
  createEmployee,
  ensureCrmSchema,
  getClientById,
  getCrmSettings,
  listClientActivity,
  listClientFollowUpHistory,
  listClients,
  listClientTransferRequests,
  listEmployees,
  listNotificationLogs,
  markNotificationRead,
  reassignClient,
  reviewClientTransferRequest,
  updateCrmSettings,
  updateClientOnboarding,
  updateClientFollowUp,
  updateEmployee,
} from "./crm.js";
import {
  createLeaveRequest,
  createLeaveType,
  ensureLeaveSchema,
  listLeaveAssignments,
  listLeaveRequests,
  listLeaveTypes,
  updateLeaveRequestStatus,
  upsertLeaveAssignment,
} from "./leave.js";
import {
  createManualJobApplication,
  createCandidateEnquiry,
  createJob,
  ensureJobsSchema,
  getAdminJobById,
  getJobBySlug,
  listAdminApplications,
  listCandidateEnquiries,
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
  const {
    identifier,
    email,
    password,
    clientTime,
    clientTimezone,
    clientUtcOffsetMinutes,
  } = request.body ?? {};
  const loginIdentifier = String(identifier ?? email ?? "").trim();
  const normalizedIdentifier = loginIdentifier.toLowerCase();

  if (!loginIdentifier || !password) {
    return response
      .status(400)
      .json({ message: "Employee code or admin email, and password are required." });
  }

  const isAdminLogin = normalizedIdentifier === String(process.env.ADMIN_EMAIL ?? "").toLowerCase();

  if (isAdminLogin) {
    const isValid = await validateAdmin(loginIdentifier, password);

    if (!isValid) {
      return response.status(401).json({ message: "Invalid credentials." });
    }

    const sessionId = randomUUID();
    await recordLoginSession({
      sessionId,
      userType: "admin",
      userIdentifier: loginIdentifier,
      userName: "Werkly Super Admin",
      userRole: "super-admin",
      clientTime,
      clientTimezone,
      clientUtcOffsetMinutes,
    });

    const token = createAdminToken(loginIdentifier, sessionId);
    return response.json({
      token,
      sessionId,
      requiresPasswordChange: false,
      user: {
        type: "admin",
        role: "super-admin",
        email: loginIdentifier,
        name: "Werkly Super Admin",
      },
    });
  }

  try {
    const employee = await authenticateEmployee(loginIdentifier, password);

    if (!employee) {
      return response.status(401).json({ message: "Invalid credentials." });
    }

    const sessionId = randomUUID();
    await recordLoginSession({
      sessionId,
      userType: "employee",
      userId: employee.id,
      userIdentifier: employee.employeeCode ?? employee.email,
      userName: employee.fullName,
      userRole: employee.role,
      clientTime,
      clientTimezone,
      clientUtcOffsetMinutes,
    });

    const token = createEmployeeToken(employee, sessionId);
    return response.json({
      token,
      sessionId,
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

app.post("/auth/logout", requireInternalUser, async (request, response) => {
  try {
    const { clientTime, clientTimezone, clientUtcOffsetMinutes } = request.body ?? {};

    if (request.user?.sessionId) {
      await recordLogoutSession({
        sessionId: request.user.sessionId,
        clientTime,
        clientTimezone,
        clientUtcOffsetMinutes,
      });
    }

    return response.json({ success: true });
  } catch (error) {
    return response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to record logout time.",
    });
  }
});

app.get("/admin/attendance", requireInternalUser, async (request, response) => {
  try {
    const attendance = await listAttendanceSessions(
      request.user?.type === "employee" ? request.user.id : null
    );
    response.json({ attendance });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load attendance.",
    });
  }
});

app.get("/admin/activity", requireInternalUser, async (request, response) => {
  try {
    const activity = await listScreenActivity(
      request.user?.type === "employee" ? request.user.id : null
    );
    response.json({ activity });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load screen activity.",
    });
  }
});

app.post("/admin/activity", requireInternalUser, async (request, response) => {
  try {
    const { routePath, routeLabel, activeSeconds, idleSeconds, clientTime } =
      request.body ?? {};

    if (!routePath || typeof routePath !== "string") {
      return response.status(400).json({ message: "Route path is required." });
    }

    if (!request.user?.sessionId) {
      return response.status(400).json({ message: "Session id is missing." });
    }

    await recordScreenActivity({
      sessionId: request.user.sessionId,
      userType: request.user.type,
      userId: request.user.id,
      userIdentifier:
        request.user.employeeCode || request.user.email || request.user.name || "internal-user",
      userName: request.user.name,
      userRole: request.user.role,
      routePath,
      routeLabel,
      activeSeconds,
      idleSeconds,
      clientTime,
    });

    response.json({ success: true });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to record screen activity.",
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

      const token = createEmployeeToken(employee, request.user.sessionId);
      return response.json({
        token,
        sessionId: request.user.sessionId,
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

app.get("/admin/jobs/:id", requireInternalUser, async (request, response) => {
  try {
    const job = await getAdminJobById(request.params.id);

    if (!job) {
      return response.status(404).json({ message: "Job not found." });
    }

    response.json(job);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load job details.",
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

app.get("/admin/candidate-enquiries", requireInternalUser, async (_request, response) => {
  try {
    const enquiries = await listCandidateEnquiries();
    response.json({ enquiries });
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to load candidate enquiries.",
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

app.post("/candidate-enquiries", async (request, response) => {
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
      resumeFileName,
      resumeFileType,
      resumeFileData,
      sourceType,
    } = request.body ?? {};

    if (!candidateName || !candidateEmail || !candidatePhone || !preferredRole) {
      return response.status(400).json({
        message: "Candidate name, email, phone, and preferred role are required.",
      });
    }

    const enquiry = await createCandidateEnquiry({
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
      resumeFileName,
      resumeFileType,
      resumeFileData,
      sourceType,
    });

    response.status(201).json(enquiry);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to save candidate enquiry.",
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

app.post("/admin/jobs/:id/applications", requireInternalUser, async (request, response) => {
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
      sourceType,
      sourceNote,
      initialStage,
      stageNote,
      stageDate,
      resumeFileName,
      resumeFileType,
      resumeFileData,
      jobTitle,
    } = request.body ?? {};

    if (!candidateName || (!candidateEmail && !candidatePhone)) {
      return response.status(400).json({
        message: "Candidate name and either email or phone are required.",
      });
    }

    const application = await createManualJobApplication(
      request.params.id,
      {
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
        sourceType,
        sourceNote,
        initialStage,
        stageNote,
        stageDate,
        resumeFileName,
        resumeFileType,
        resumeFileData,
        jobTitle,
      },
      request.user?.type === "employee" ? request.user.id : null
    );

    if (!application) {
      return response.status(404).json({ message: "Job not found." });
    }

    response.status(201).json(application);
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to add candidate to this job.",
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
    const {
      fullName,
      email,
      phone,
      role,
      dateOfBirth,
      dateOfJoining,
      educationQualification,
      previousExperience,
      educationDetails,
      experienceDetails,
      password,
      status,
      inactiveDate,
      inactiveRemarks,
    } =
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
      dateOfBirth,
      dateOfJoining,
      educationQualification,
      previousExperience,
      educationDetails,
      experienceDetails,
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
    const {
      fullName,
      email,
      phone,
      role,
      dateOfBirth,
      dateOfJoining,
      educationQualification,
      previousExperience,
      educationDetails,
      experienceDetails,
      password,
      status,
      inactiveDate,
      inactiveRemarks,
    } =
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
      dateOfBirth,
      dateOfJoining,
      educationQualification,
      previousExperience,
      educationDetails,
      experienceDetails,
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

app.post("/admin/employees/:id/reset-password", requireAdmin, async (request, response) => {
  try {
    const { password, mustChangePassword } = request.body ?? {};

    if (!password || String(password).trim().length < 6) {
      return response.status(400).json({
        message: "New password must be at least 6 characters long.",
      });
    }

    const employee = await adminResetEmployeePassword(
      request.params.id,
      String(password).trim(),
      mustChangePassword !== false
    );

    if (!employee) {
      return response.status(404).json({ message: "Employee not found." });
    }

    response.json(employee);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to reset employee password.",
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

app.get("/admin/leaves/types", requireInternalUser, async (_request, response) => {
  try {
    const leaveTypes = await listLeaveTypes();
    response.json({ leaveTypes });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load leave types.",
    });
  }
});

app.post("/admin/leaves/types", requireAdmin, async (request, response) => {
  try {
    const { name, description, isActive } = request.body ?? {};

    if (!name) {
      return response.status(400).json({ message: "Leave type name is required." });
    }

    const leaveType = await createLeaveType({ name, description, isActive });
    response.status(201).json(leaveType);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create leave type.",
    });
  }
});

app.get("/admin/leaves/assignments", requireInternalUser, async (request, response) => {
  try {
    const assignments = await listLeaveAssignments(
      request.user?.type === "employee" ? request.user.id : null
    );
    response.json({ assignments });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load leave assignments.",
    });
  }
});

app.post("/admin/leaves/assignments", requireAdmin, async (request, response) => {
  try {
    const { employeeId, leaveTypeId, allocatedDays } = request.body ?? {};

    if (!employeeId || !leaveTypeId) {
      return response.status(400).json({
        message: "Employee and leave type are required.",
      });
    }

    const days = Number(allocatedDays ?? 0);
    if (!Number.isFinite(days) || days < 0) {
      return response.status(400).json({
        message: "Allocated days must be zero or more.",
      });
    }

    const assignment = await upsertLeaveAssignment({
      employeeId,
      leaveTypeId,
      allocatedDays: days,
    });
    response.status(201).json(assignment);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to assign leave balance.",
    });
  }
});

app.get("/admin/leaves/requests", requireInternalUser, async (request, response) => {
  try {
    const requests = await listLeaveRequests(
      request.user?.type === "employee" ? request.user.id : null
    );
    response.json({ requests });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load leave requests.",
    });
  }
});

app.post("/admin/leaves/requests", requireInternalUser, async (request, response) => {
  try {
    if (request.user?.type !== "employee" || !request.user?.id) {
      return response.status(403).json({
        message: "Only employee accounts can apply for leave.",
      });
    }

    const { leaveTypeId, startDate, endDate, reason } = request.body ?? {};
    if (!leaveTypeId || !startDate || !endDate || !reason) {
      return response.status(400).json({
        message: "Leave type, start date, end date, and reason are required.",
      });
    }

    const leaveRequest = await createLeaveRequest(request.user.id, {
      leaveTypeId,
      startDate,
      endDate,
      reason,
    });
    response.status(201).json(leaveRequest);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to submit leave request.",
    });
  }
});

app.put("/admin/leaves/requests/:id", requireAdmin, async (request, response) => {
  try {
    const { status, adminNote, leaveTypeId, startDate, endDate, reason } = request.body ?? {};
    if (!["approved", "rejected", "pending"].includes(status)) {
      return response.status(400).json({ message: "Invalid leave request status." });
    }

    const leaveRequest = await updateLeaveRequestStatus(request.params.id, {
      status,
      adminNote,
      leaveTypeId,
      startDate,
      endDate,
      reason,
    });

    if (!leaveRequest) {
      return response.status(404).json({ message: "Leave request not found." });
    }

    response.json(leaveRequest);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update leave request.",
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

app.get("/admin/clients/:id", requireInternalUser, async (request, response) => {
  try {
    const client = await getClientById(request.params.id);

    if (!client) {
      return response.status(404).json({ message: "Client not found." });
    }

    if (
      request.user?.type === "employee" &&
      request.user?.id &&
      client.assignedEmployeeId !== request.user.id
    ) {
      return response.status(403).json({ message: "You do not have access to this client." });
    }

    response.json(client);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load client details.",
    });
  }
});

app.get("/admin/clients/:id/history", requireInternalUser, async (request, response) => {
  try {
    const client = await getClientById(request.params.id);

    if (!client) {
      return response.status(404).json({ message: "Client not found." });
    }

    if (
      request.user?.type === "employee" &&
      request.user?.id &&
      client.assignedEmployeeId !== request.user.id
    ) {
      return response.status(403).json({ message: "You do not have access to this client." });
    }

    const history = await listClientFollowUpHistory(request.params.id);
    response.json({ history });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load client history.",
    });
  }
});

app.get("/admin/clients/:id/activity", requireInternalUser, async (request, response) => {
  try {
    const client = await getClientById(request.params.id);

    if (!client) {
      return response.status(404).json({ message: "Client not found." });
    }

    if (
      request.user?.type === "employee" &&
      request.user?.id &&
      client.assignedEmployeeId !== request.user.id
    ) {
      return response.status(403).json({ message: "You do not have access to this client." });
    }

    const activity = await listClientActivity(request.params.id);
    response.json({ activity });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load client activity.",
    });
  }
});

app.put("/admin/clients/:id/onboarding", requireInternalUser, async (request, response) => {
  try {
    const { onboardingStatus, notes } = request.body ?? {};

    if (!onboardingStatus) {
      return response.status(400).json({
        message: "Onboarding status is required.",
      });
    }

    const client = await updateClientOnboarding(request.params.id, {
      onboardingStatus,
      notes,
      actorEmployeeId: request.user?.type === "employee" ? request.user.id : null,
      actorName: request.user?.name || "Werkly User",
      actorRole: request.user?.role || request.user?.type || "internal-user",
    });

    if (!client) {
      return response.status(404).json({ message: "Client not found." });
    }

    response.json(client);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update client onboarding.",
    });
  }
});

app.put("/admin/clients/:id/reassign", requireAdmin, async (request, response) => {
  try {
    const { assignedEmployeeId } = request.body ?? {};

    if (!assignedEmployeeId) {
      return response.status(400).json({
        message: "Target employee is required.",
      });
    }

    const client = await reassignClient(request.params.id, assignedEmployeeId);

    if (!client) {
      return response.status(404).json({ message: "Client not found." });
    }

    response.json(client);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to reassign client.",
    });
  }
});

app.put("/admin/clients/:id/follow-up", requireInternalUser, async (request, response) => {
  try {
    const { followUpStatus, nextFollowUpDate, lastFollowUpDate, followUpNotes } = request.body ?? {};

    if (!followUpStatus) {
      return response.status(400).json({
        message: "Follow-up status is required.",
      });
    }

    const client = await updateClientFollowUp(request.params.id, {
      followUpStatus,
      nextFollowUpDate,
      lastFollowUpDate,
      followUpNotes,
      actorEmployeeId: request.user?.type === "employee" ? request.user.id : null,
      actorName: request.user?.name || "Werkly User",
      actorRole: request.user?.role || request.user?.type || "internal-user",
    });

    if (!client) {
      return response.status(404).json({ message: "Client not found." });
    }

    response.json(client);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update client follow-up.",
    });
  }
});

app.get("/admin/settings", requireInternalUser, async (_request, response) => {
  try {
    const settings = await getCrmSettings();
    response.json(settings);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load CRM settings.",
    });
  }
});

app.put("/admin/settings", requireAdmin, async (request, response) => {
  try {
    const settings = await updateCrmSettings(request.body ?? {});
    response.json(settings);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update CRM settings.",
    });
  }
});

app.get("/admin/notifications", requireInternalUser, async (request, response) => {
  try {
    const notifications = await listNotificationLogs(
      request.user?.type === "employee" ? request.user.id : null,
      request.user?.type === "admin"
    );
    response.json({ notifications });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load notifications.",
    });
  }
});

app.post("/admin/notifications", requireInternalUser, async (request, response) => {
  try {
    const {
      title,
      message,
      category,
      severity,
      targetType,
      targetEmployeeId,
      deliveryChannels,
      isRead,
    } = request.body ?? {};

    if (!title || !message) {
      return response.status(400).json({
        message: "Notification title and message are required.",
      });
    }

    const notification = await createNotificationLog({
      title,
      message,
      category,
      severity,
      targetType:
        request.user?.type === "employee"
          ? "employee"
          : targetType || "all",
      targetEmployeeId:
        request.user?.type === "employee"
          ? request.user.id
          : targetType === "employee"
            ? targetEmployeeId
            : null,
      deliveryChannels,
      isRead,
    });

    response.status(201).json(notification);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create notification.",
    });
  }
});

app.put("/admin/notifications/:id", requireInternalUser, async (request, response) => {
  try {
    const notification = await markNotificationRead(
      request.params.id,
      request.user?.type === "employee" ? request.user.id : null,
      request.user?.type === "admin"
    );

    if (!notification) {
      return response.status(404).json({ message: "Notification not found." });
    }

    response.json(notification);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update notification.",
    });
  }
});

app.get("/admin/client-transfer-requests", requireInternalUser, async (request, response) => {
  try {
    const requests = await listClientTransferRequests(
      request.user?.type === "employee" ? request.user.id : null,
      request.user?.type === "admin"
    );
    response.json({ requests });
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to load client transfer requests.",
    });
  }
});

app.post("/admin/client-transfer-requests", requireInternalUser, async (request, response) => {
  try {
    if (request.user?.type !== "employee" || !request.user?.id) {
      return response.status(403).json({
        message: "Only employee logins can request client reassignment.",
      });
    }

    const { clientId, requestedToEmployeeId, effectiveFromDate, reason } = request.body ?? {};
    if (!clientId || !requestedToEmployeeId || !effectiveFromDate) {
      return response.status(400).json({
        message: "Client, target employee, and effective from date are required.",
      });
    }

    const transferRequest = await createClientTransferRequest({
      clientId,
      requestedByEmployeeId: request.user.id,
      requestedToEmployeeId,
      effectiveFromDate,
      reason,
    });
    response.status(201).json(transferRequest);
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to create client transfer request.",
    });
  }
});

app.put("/admin/client-transfer-requests/:id", requireAdmin, async (request, response) => {
  try {
    const { status, adminNote } = request.body ?? {};
    if (!["approved", "rejected"].includes(status)) {
      return response.status(400).json({ message: "Invalid transfer request status." });
    }

    const reviewed = await reviewClientTransferRequest(request.params.id, {
      status,
      adminNote,
      reviewedByEmployeeId: null,
    });

    if (!reviewed) {
      return response.status(404).json({ message: "Transfer request not found." });
    }

    response.json(reviewed);
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to review client transfer request.",
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
  .then(() => ensureAuthAuditSchema())
  .then(() => ensureLeaveSchema())
  .then(() => {
    app.listen(port, () => {
      console.log(`Werkly Railway backend listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize jobs schema", error);
    process.exit(1);
  });

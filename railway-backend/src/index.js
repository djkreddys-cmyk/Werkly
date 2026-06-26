import "dotenv/config";
import cors from "cors";
import express from "express";
import { randomUUID } from "crypto";
import {
  createAuditLog,
  ensureAuthAuditSchema,
  listAuditLogs,
  listAttendanceSessions,
  listScreenActivity,
  recordLoginSession,
  recordLogoutSession,
  recordScreenActivity,
} from "./audit.js";
import {
  createAdminToken,
  createCandidateToken,
  createEmployeeToken,
  createPasswordResetToken,
  requireAdmin,
  requireCandidate,
  requireInternalUser,
  requirePermission,
  requirePasswordChangeEligibleUser,
  validateAdmin,
  verifyPasswordResetToken,
} from "./auth.js";
import {
  adminResetEmployeePassword,
  authenticateEmployee,
  changeEmployeePassword,
  consumeEmployeePasswordResetRequest,
  createEmployeePasswordResetRequest,
  createClient,
  bulkAssignClients,
  createClientTransferRequest,
  createNotificationLog,
  deleteClient,
  createEmployee,
  ensureCrmSchema,
  findEmployeeForPasswordReset,
  getClientById,
  getCrmSettings,
  getEmployeeById,
  listClientActivity,
  listClientFollowUpHistory,
  listClients,
  listClientTransferRequests,
  listEmployees,
  listNotificationLogs,
  markNotificationRead,
  reassignClient,
  reviewClientTransferRequest,
  verifyEmployeePasswordResetOtp,
  updateCrmSettings,
  updateClientOnboarding,
  updateClientFollowUp,
  updateClient,
  updateEmployee,
} from "./crm.js";
import {
  createApprovalRequest,
  createTimelineEvent,
  ensureWorkflowSchema,
  listApprovalRequests,
  listSavedViews,
  listSlaRules,
  listTimelineEvents,
  reviewApprovalRequest,
  reviewPendingApprovalByEntity,
  runSlaEscalations,
  updateSlaRules,
  upsertSavedView,
  deleteSavedView,
} from "./workflow.js";
import {
  createLeaveRequest,
  createLeaveType,
  createAttendanceException,
  createHoliday,
  ensureLeaveSchema,
  listAttendanceExceptions,
  listHolidays,
  listLeaveAssignments,
  listLeaveRequests,
  listLeaveTypes,
  updateLeaveRequestStatus,
  upsertLeaveAssignment,
} from "./leave.js";
import {
  createShift,
  createShiftAssignment,
  ensureShiftSchema,
  listShiftAssignments,
  listShifts,
  updateShiftAssignment,
} from "./shifts.js";
import {
  createMeetingSignal,
  createMeeting,
  deleteAllMeetings,
  deleteMeeting,
  ensureMeetingsSchema,
  getMeetingByRoomCode,
  getMeetingWithParticipants,
  leaveMeetingParticipant,
  listMeetingSignals,
  listMeetingParticipants,
  listMeetings,
  updateMeeting,
  updateMeetingStatus,
  upsertMeetingParticipant,
} from "./meetings.js";
import {
  buildMeetingIcs,
  connectCalendarProvider,
  createCalendarAuthUrl,
  deleteMeetingFromCalendars,
  disconnectCalendarProvider,
  ensureCalendarSchema,
  listCalendarConnections,
  syncMeetingToCalendars,
} from "./calendar.js";
import { processResumeUpload } from "./resume.js";
import {
  createManualJobApplication,
  authenticateCandidate,
  createCandidateAccount,
  createCandidateEnquiry,
  createResumeBuilderSubmission,
  deleteCandidateSavedJob,
  createJob,
  deleteJob,
  deleteJobApplication,
  ensureJobsSchema,
  getAdminJobById,
  getCandidateById,
  getCandidateProfile,
  getJobBySlug,
  listAdminApplications,
  listCandidateApplications,
  listCandidateEnquiries,
  listCandidateSavedJobs,
  listResumeBuilderSubmissions,
  listApplicationStageHistory,
  listJobApplications,
  listAdminJobs,
  listJobs,
  mergeJobsByCode,
  recordJobApplication,
  recordCandidateJobApplication,
  saveCandidateJob,
  assignCandidateApplicationToJob,
  assignJobApplication,
  updateJobApplicationDetails,
  updateJobApplicationStage,
  updateJob,
  updateCandidateProfile,
} from "./jobs.js";
import {
  buildEmployeeScope,
  canAccessEntity,
  canManageClientWork,
  canUpdateClientFollowUp,
} from "./permissions.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = Array.from(
  new Set(
    [
      "http://localhost:3000",
      "http://localhost:51270",
      "http://localhost:51271",
      "http://127.0.0.1:51270",
      "http://127.0.0.1:51271",
      "https://werkly.in",
      "https://www.werkly.in",
      "https://admin.werkly.in",
      ...(process.env.CORS_ORIGIN || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ].map((origin) => origin.replace(/\/$/, ""))
  )
);

function getActorDetails(request) {
  const scope = buildEmployeeScope(request.user);
  return {
    actorType: request.user?.type || "internal-user",
    actorId: scope.employeeId,
    actorIdentifier:
      request.user?.employeeCode || request.user?.email || request.user?.name || "internal-user",
    actorName: request.user?.name || "Werkly User",
    actorRole: scope.roleKey,
  };
}

async function recordTimeline(request, payload) {
  const actor = getActorDetails(request);
  return createTimelineEvent({
    ...payload,
    actorType: actor.actorType,
    actorId: actor.actorId,
    actorIdentifier: actor.actorIdentifier,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
  });
}

function maskEmailAddress(email) {
  const safeEmail = String(email || "").trim();
  const [localPart, domain = ""] = safeEmail.split("@");
  if (!localPart || !domain) {
    return safeEmail;
  }

  const visibleStart = localPart.slice(0, 2);
  const maskedLocal =
    visibleStart + "*".repeat(Math.max(localPart.length - visibleStart.length, 2));

  return `${maskedLocal}@${domain}`;
}

async function sendPasswordResetOtpEmail({ email, employeeCode, otp }) {
  const senderEmail = process.env.RESEND_FROM_EMAIL;
  const senderName = process.env.RESEND_FROM_NAME || "Werkly CRM";
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !senderEmail || !email) {
    throw new Error(
      "Password reset email is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL."
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: `${senderName} <${senderEmail}>`,
      to: [email],
      subject: `Werkly CRM password reset OTP - ${employeeCode || "Employee Login"}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#18343a;line-height:1.6;">
          <h2 style="margin:0 0 12px;">Werkly CRM Password Reset</h2>
          <p style="margin:0 0 12px;">Use the OTP below to verify your employee login and continue with password reset.</p>
          <div style="display:inline-block;padding:14px 18px;border-radius:12px;background:#eaf2f4;border:1px solid #cfdde2;font-size:24px;font-weight:700;letter-spacing:0.3em;color:#0a5561;">
            ${String(otp)}
          </div>
          <p style="margin:16px 0 0;">This OTP will expire in 10 minutes.</p>
          <p style="margin:8px 0 0;">If you did not request this reset, please ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Unable to send password reset OTP email.");
  }
}

const candidateStageSequence = ["applied", "shortlisted", "interview", "offered", "joined"];

function requiresStageOverrideApproval(currentStage, nextStage) {
  const safeCurrent = String(currentStage || "applied").toLowerCase();
  const safeNext = String(nextStage || "applied").toLowerCase();

  if (!safeCurrent || !safeNext || safeCurrent === safeNext) {
    return false;
  }

  if (safeCurrent === "joined" || safeCurrent === "screen-rejection" || safeCurrent === "rejected") {
    return true;
  }

  const currentIndex = candidateStageSequence.indexOf(safeCurrent);
  const nextIndex = candidateStageSequence.indexOf(safeNext);

  if (currentIndex === -1 || nextIndex === -1) {
    return false;
  }

  return nextIndex < currentIndex;
}

async function getApplicationById(applicationId) {
  const applications = await listAdminApplications(null);
  return applications.find((application) => application.id === applicationId) || null;
}

function getEntityActionUrl(entityType, entityId) {
  if (!entityId) {
    return "/admin/settings/workflows";
  }

  if (entityType === "candidate") {
    return `/admin/candidates/${entityId}`;
  }
  if (entityType === "client") {
    return `/admin/clients/${entityId}`;
  }
  if (entityType === "employee") {
    return `/admin/employees/${entityId}`;
  }
  if (entityType === "job") {
    return `/admin/jobs/${entityId}`;
  }

  return "/admin/settings/workflows";
}

async function notifyApprovalLifecycle(approval, eventType) {
  const isCreated = eventType === "created";
  const targetEmployeeId =
    approval.requestedByEmployeeId || approval.assignedApproverEmployeeId || null;

  await createNotificationLog({
    title: isCreated
      ? `${approval.entityLabel || approval.requestType}: approval raised`
      : `${approval.entityLabel || approval.requestType}: approval ${approval.requestStatus}`,
    message: isCreated
      ? approval.reason || "A sensitive CRM action is waiting for review."
      : `Approval request was ${approval.requestStatus}.`,
    category: "approval",
    severity: isCreated ? "warning" : approval.requestStatus === "approved" ? "info" : "warning",
    targetType: targetEmployeeId ? "employee" : "all",
    targetEmployeeId,
    actionUrl: getEntityActionUrl(approval.entityType, approval.entityId),
    entityType: approval.entityType,
    entityId: approval.entityId,
    metadata: {
      approvalId: approval.id,
      requestType: approval.requestType,
      requestStatus: approval.requestStatus,
    },
  });
}

async function applyApprovedWorkflowAction(request, approval) {
  if (!approval || approval.requestStatus !== "approved") {
    return null;
  }

  const requestedData = approval.requestedData || {};

  if (approval.requestType === "candidate-transfer") {
    const previousApplication = await getApplicationById(approval.entityId);
    const application = await assignJobApplication(
      approval.entityId,
      {
        assignedEmployeeId: requestedData.assignedEmployeeId || null,
        assignmentType: requestedData.assignmentType || approval.metadata?.assignmentType || "ownership-transfer",
        effectiveFromDate: requestedData.effectiveFromDate || approval.effectiveFromDate || null,
        effectiveToDate: requestedData.effectiveToDate || approval.effectiveToDate || null,
        note: approval.reason || requestedData.note || "Candidate transfer approved.",
      },
      null
    );

    if (application) {
      await createAuditLog({
        actionType:
          (requestedData.assignmentType || approval.metadata?.assignmentType) === "follow-up-support"
            ? "candidate.followup-assigned-approved"
            : "candidate.reassigned-approved",
        entityType: "application",
        entityId: application.id,
        ...getActorDetails(request),
        beforeData: previousApplication || {},
        afterData: application,
        metadata: {
          approvalId: approval.id,
          requestType: approval.requestType,
        },
      });

      await recordTimeline(request, {
        entityType: "candidate",
        entityId: application.id,
        entityLabel: application.candidateName,
        eventType: "candidate.transfer-approved",
        title: "Candidate transfer approved",
        summary: approval.reason || "Candidate assignment was applied after approval.",
        beforeData: previousApplication || {},
        afterData: application,
        metadata: {
          approvalId: approval.id,
        },
      });
    }

    return application;
  }

  if (approval.requestType === "client-transfer") {
    const previousClient = await getClientById(approval.entityId);
    const client = await reassignClient(approval.entityId, {
      assignedEmployeeId: requestedData.assignedEmployeeId || requestedData.requestedToEmployeeId || null,
      assignmentType: requestedData.assignmentType || approval.metadata?.assignmentType || "ownership-transfer",
      effectiveFromDate: requestedData.effectiveFromDate || approval.effectiveFromDate || null,
      effectiveToDate: requestedData.effectiveToDate || approval.effectiveToDate || null,
      reason: approval.reason || "Client transfer approved.",
    });

    if (client) {
      await createAuditLog({
        actionType:
          (requestedData.assignmentType || approval.metadata?.assignmentType) === "follow-up-support"
            ? "client.followup-assigned-approved"
            : "client.reassigned-approved",
        entityType: "client",
        entityId: client.id,
        ...getActorDetails(request),
        beforeData: previousClient || {},
        afterData: client,
        metadata: {
          approvalId: approval.id,
          requestType: approval.requestType,
        },
      });

      await recordTimeline(request, {
        entityType: "client",
        entityId: client.id,
        entityLabel: client.companyName,
        eventType: "client.transfer-approved",
        title: "Client transfer approved",
        summary: approval.reason || "Client assignment was applied after approval.",
        beforeData: previousClient || {},
        afterData: client,
        metadata: {
          approvalId: approval.id,
        },
      });
    }

    return client;
  }

  if (approval.requestType === "employee-inactivation") {
    const currentEmployee = await getEmployeeById(approval.entityId);
    const nextEmployee = await updateEmployee(approval.entityId, {
      ...(approval.beforeData || currentEmployee || {}),
      ...(requestedData || {}),
    });

    if (nextEmployee) {
      await createAuditLog({
        actionType: "employee.inactivation-approved",
        entityType: "employee",
        entityId: nextEmployee.id,
        ...getActorDetails(request),
        beforeData: currentEmployee || {},
        afterData: nextEmployee,
        metadata: {
          approvalId: approval.id,
        },
      });

      await recordTimeline(request, {
        entityType: "employee",
        entityId: nextEmployee.id,
        entityLabel: nextEmployee.fullName,
        eventType: "employee.inactivation-approved",
        title: "Employee inactivation approved",
        summary: approval.reason || "Employee was marked inactive after approval.",
        beforeData: currentEmployee || {},
        afterData: nextEmployee,
        metadata: {
          approvalId: approval.id,
        },
      });
    }

    return nextEmployee;
  }

  if (approval.requestType === "candidate-stage-override") {
    const previousApplication = await getApplicationById(approval.entityId);
    const application = await updateJobApplicationStage(
      approval.entityId,
      requestedData.stage,
      requestedData.stageNote,
      requestedData.stageDate,
      null,
      {
        finalCtc: requestedData.finalCtc,
        dateOfJoining: requestedData.dateOfJoining,
      }
    );

    if (application) {
      await createAuditLog({
        actionType: "candidate.stage-override-approved",
        entityType: "application",
        entityId: application.id,
        ...getActorDetails(request),
        beforeData: previousApplication || {},
        afterData: application,
        metadata: {
          approvalId: approval.id,
          requestType: approval.requestType,
        },
      });

      await recordTimeline(request, {
        entityType: "candidate",
        entityId: application.id,
        entityLabel: application.candidateName,
        eventType: "candidate.stage-override-approved",
        title: "Candidate stage override approved",
        summary: approval.reason || "Candidate stage change was applied after approval.",
        beforeData: previousApplication || {},
        afterData: application,
        metadata: {
          approvalId: approval.id,
        },
      });
    }

    return application;
  }

  return null;
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.includes(origin.replace(/\/$/, "")) ? origin : false);
    },
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

app.post("/candidate/auth/register", async (request, response) => {
  try {
    const candidate = await createCandidateAccount(request.body ?? {});
    const token = createCandidateToken(candidate);
    const profile = await getCandidateProfile(candidate.id);

    response.status(201).json({ token, candidate, profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create candidate account.";
    const status = message.includes("duplicate key") ? 409 : 400;
    response.status(status).json({
      message: message.includes("duplicate key")
        ? "Candidate account already exists for this email or phone."
        : message,
    });
  }
});

app.post("/candidate/auth/login", async (request, response) => {
  try {
    const { identifier, email, phone, password } = request.body ?? {};
    const loginIdentifier = String(identifier ?? email ?? phone ?? "").trim();
    const candidate = await authenticateCandidate(loginIdentifier, password);

    if (!candidate) {
      return response.status(401).json({ message: "Invalid candidate credentials." });
    }

    const token = createCandidateToken(candidate);
    const profile = await getCandidateProfile(candidate.id);
    response.json({ token, candidate, profile });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to log in candidate.",
    });
  }
});

app.post("/candidate/auth/logout", requireCandidate, async (_request, response) => {
  response.json({ success: true });
});

app.get("/candidate/me", requireCandidate, async (request, response) => {
  try {
    const candidate = await getCandidateById(request.candidate.id);
    if (!candidate) {
      return response.status(404).json({ message: "Candidate account not found." });
    }

    const profile = await getCandidateProfile(request.candidate.id);
    response.json({ candidate, profile });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load candidate profile.",
    });
  }
});

app.put("/candidate/me/profile", requireCandidate, async (request, response) => {
  try {
    const profile = await updateCandidateProfile(request.candidate.id, request.body ?? {});
    response.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update candidate profile.";
    response.status(message.includes("duplicate key") ? 409 : 400).json({
      message: message.includes("duplicate key")
        ? "Email or phone is already used by another candidate."
        : message,
    });
  }
});

app.get("/candidate/applications", requireCandidate, async (request, response) => {
  try {
    const applications = await listCandidateApplications(request.candidate.id);
    response.json({ applications });
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to load candidate applications.",
    });
  }
});

app.get("/candidate/applications/:id", requireCandidate, async (request, response) => {
  try {
    const applications = await listCandidateApplications(request.candidate.id);
    const application = applications.find((item) => item.id === request.params.id);
    if (!application) {
      return response.status(404).json({ message: "Candidate application not found." });
    }

    response.json({ application });
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to load candidate application.",
    });
  }
});

app.post("/candidate/jobs/:slug/apply", requireCandidate, async (request, response) => {
  try {
    const job = await recordCandidateJobApplication(
      request.candidate.id,
      request.params.slug,
      request.body ?? {}
    );
    if (!job) {
      return response.status(404).json({ message: "Job was not found." });
    }

    const applications = await listCandidateApplications(request.candidate.id);
    response.status(201).json({ job, applications });
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : "Unable to apply to this job.",
    });
  }
});

app.get("/candidate/saved-jobs", requireCandidate, async (request, response) => {
  try {
    const jobs = await listCandidateSavedJobs(request.candidate.id);
    response.json({ jobs });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load saved jobs.",
    });
  }
});

app.post("/candidate/saved-jobs", requireCandidate, async (request, response) => {
  try {
    const jobs = await saveCandidateJob(request.candidate.id, request.body ?? {});
    if (!jobs) {
      return response.status(404).json({ message: "Job was not found." });
    }

    response.status(201).json({ jobs });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to save job.",
    });
  }
});

app.delete("/candidate/saved-jobs/:jobId", requireCandidate, async (request, response) => {
  try {
    const jobs = await deleteCandidateSavedJob(request.candidate.id, request.params.jobId);
    response.json({ jobs });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to remove saved job.",
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

app.get("/admin/meetings", requireInternalUser, async (_request, response) => {
  try {
    const meetings = await listMeetings();
    response.json({ meetings });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load meetings.",
    });
  }
});

app.delete("/admin/meetings", requireAdmin, async (_request, response) => {
  try {
    const deletedCount = await deleteAllMeetings();
    response.json({ success: true, deletedCount });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to clear meetings.",
    });
  }
});

app.get("/admin/calendar-connections", requireInternalUser, async (_request, response) => {
  try {
    const connections = await listCalendarConnections();
    response.json({ connections });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load calendar connections.",
    });
  }
});

app.get(
  "/admin/calendar-connections/:provider/auth-url",
  requireInternalUser,
  async (request, response) => {
    try {
      const redirectUri = String(request.query.redirectUri || "");
      if (!redirectUri) {
        return response.status(400).json({ message: "Calendar redirect URI is required." });
      }

      response.json({
        url: createCalendarAuthUrl(request.params.provider, redirectUri),
      });
    } catch (error) {
      response.status(500).json({
        message: error instanceof Error ? error.message : "Unable to start calendar sync.",
      });
    }
  }
);

app.post(
  "/admin/calendar-connections/:provider/callback",
  requireInternalUser,
  async (request, response) => {
    try {
      const { code, redirectUri } = request.body || {};
      if (!code || !redirectUri) {
        return response.status(400).json({ message: "Calendar code and redirect URI are required." });
      }

      const connection = await connectCalendarProvider(
        request.params.provider,
        String(code),
        String(redirectUri)
      );
      response.status(201).json(connection);
    } catch (error) {
      response.status(500).json({
        message: error instanceof Error ? error.message : "Unable to connect calendar.",
      });
    }
  }
);

app.delete("/admin/calendar-connections/:provider", requireInternalUser, async (request, response) => {
  try {
    const result = await disconnectCalendarProvider(request.params.provider);
    response.json(result);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to disconnect calendar.",
    });
  }
});

app.get("/meetings/:roomCode", async (request, response) => {
  try {
    const meeting = await getMeetingWithParticipants(request.params.roomCode);
    if (!meeting || meeting.status === "cancelled") {
      return response.status(404).json({ message: "Meeting link was not found." });
    }

    response.json(meeting);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load meeting.",
    });
  }
});

app.get("/meetings/:roomCode/ics", async (request, response) => {
  try {
    const meeting = await getMeetingByRoomCode(request.params.roomCode);
    if (!meeting || meeting.status === "cancelled") {
      return response.status(404).json({ message: "Meeting link was not found." });
    }

    response.setHeader("Content-Type", "text/calendar; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${meeting.roomCode}.ics"`
    );
    response.send(buildMeetingIcs(meeting));
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create calendar file.",
    });
  }
});

app.get("/meetings/:roomCode/participants", async (request, response) => {
  try {
    const participants = await listMeetingParticipants(request.params.roomCode);
    response.json({ participants });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load meeting participants.",
    });
  }
});

app.post("/meetings/:roomCode/participants", async (request, response) => {
  try {
    const participant = await upsertMeetingParticipant(request.params.roomCode, request.body);
    if (!participant) {
      return response.status(404).json({ message: "Meeting link was not found." });
    }

    response.status(201).json(participant);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to join meeting.",
    });
  }
});

app.delete("/meetings/:roomCode/participants/:participantKey", async (request, response) => {
  try {
    await leaveMeetingParticipant(request.params.roomCode, request.params.participantKey);
    response.json({ success: true });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to leave meeting.",
    });
  }
});

app.get("/meetings/:roomCode/signals/:participantKey", async (request, response) => {
  try {
    const signals = await listMeetingSignals(
      request.params.roomCode,
      request.params.participantKey,
      request.query.since
    );
    response.json({ signals });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load meeting signals.",
    });
  }
});

app.post("/meetings/:roomCode/signals", async (request, response) => {
  try {
    const signal = await createMeetingSignal(request.params.roomCode, request.body);
    if (!signal) {
      return response.status(404).json({ message: "Meeting link was not found." });
    }

    response.status(201).json(signal);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to send meeting signal.",
    });
  }
});

app.post("/admin/meetings", requireInternalUser, async (request, response) => {
  try {
    const meeting = await createMeeting(request.body, getActorDetails(request));
    const meetingTime = meeting.startsAt
      ? new Date(meeting.startsAt).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Kolkata",
        })
      : "an open time";
    const notificationTargets = meeting.participantEmployeeIds.length
      ? meeting.participantEmployeeIds
      : [null];

    await createAuditLog({
      actionType: "meeting.created",
      entityType: "meeting",
      entityId: meeting.id,
      ...getActorDetails(request),
      beforeData: {},
      afterData: meeting,
      metadata: {
        roomCode: meeting.roomCode,
      },
    });

    await Promise.all(
      notificationTargets.map((employeeId) =>
        createNotificationLog({
          notificationKey: `meeting-${meeting.id}-${employeeId || "all"}`,
          title: `Meeting scheduled: ${meeting.title}`,
          message: `${meeting.createdByName || "Werkly User"} scheduled a team meeting for ${meetingTime}.`,
          category: "meeting",
          severity: "info",
          targetType: employeeId ? "employee" : "all",
          targetEmployeeId: employeeId,
          deliveryChannels: ["in-app"],
          actionUrl: `/meet/${meeting.roomCode}`,
          entityType: "meeting",
          entityId: meeting.id,
          metadata: {
            roomCode: meeting.roomCode,
            startsAt: meeting.startsAt,
            endsAt: meeting.endsAt,
            participantEmployeeIds: meeting.participantEmployeeIds,
          },
        })
      )
    );

    try {
      await syncMeetingToCalendars(meeting);
    } catch (calendarError) {
      console.error("Calendar sync failed after meeting create", calendarError);
    }

    response.status(201).json(meeting);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create meeting.",
    });
  }
});

app.get("/admin/meetings/:roomCode", requireInternalUser, async (request, response) => {
  try {
    const meeting = await getMeetingWithParticipants(request.params.roomCode);
    if (!meeting || meeting.status === "cancelled") {
      return response.status(404).json({ message: "Meeting link was not found." });
    }

    response.json(meeting);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load meeting.",
    });
  }
});

app.put("/admin/meetings/:roomCode", requireInternalUser, async (request, response) => {
  try {
    const beforeMeeting = await getMeetingByRoomCode(request.params.roomCode);
    const meeting = await updateMeeting(request.params.roomCode, request.body);
    if (!meeting) {
      return response.status(404).json({ message: "Meeting link was not found." });
    }

    await createAuditLog({
      actionType: "meeting.updated",
      entityType: "meeting",
      entityId: meeting.id,
      ...getActorDetails(request),
      beforeData: beforeMeeting || {},
      afterData: meeting,
      metadata: {
        roomCode: meeting.roomCode,
      },
    });

    try {
      await syncMeetingToCalendars(meeting);
    } catch (calendarError) {
      console.error("Calendar sync failed after meeting update", calendarError);
    }

    response.json(meeting);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update meeting.",
    });
  }
});

app.delete("/admin/meetings/:roomCode", requireInternalUser, async (request, response) => {
  try {
    const meeting = await deleteMeeting(request.params.roomCode);
    if (!meeting) {
      return response.status(404).json({ message: "Meeting link was not found." });
    }

    try {
      await deleteMeetingFromCalendars(meeting);
    } catch (calendarError) {
      console.error("Calendar sync failed after meeting delete", calendarError);
    }

    await createAuditLog({
      actionType: "meeting.deleted",
      entityType: "meeting",
      entityId: meeting.id,
      ...getActorDetails(request),
      beforeData: meeting,
      afterData: {},
      metadata: {
        roomCode: meeting.roomCode,
      },
    });

    response.json({ success: true, meeting });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to delete meeting.",
    });
  }
});

app.post("/admin/meetings/:roomCode/calendar-sync", requireInternalUser, async (request, response) => {
  try {
    const meeting = await getMeetingByRoomCode(request.params.roomCode);
    if (!meeting || meeting.status === "cancelled") {
      return response.status(404).json({ message: "Meeting link was not found." });
    }

    const syncs = await syncMeetingToCalendars(meeting);
    response.json({ syncs });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to sync meeting calendars.",
    });
  }
});

app.put("/admin/meetings/:roomCode/status", requireInternalUser, async (request, response) => {
  try {
    const meeting = await updateMeetingStatus(request.params.roomCode, request.body?.status);
    if (!meeting) {
      return response.status(404).json({ message: "Meeting link was not found." });
    }

    response.json(meeting);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update meeting.",
    });
  }
});

app.get("/admin/audit-logs", requirePermission("audit.view"), async (request, response) => {
  try {
    const { entityType, entityId, actorId, limit } = request.query ?? {};
    const logs = await listAuditLogs({
      entityType: entityType ? String(entityType) : null,
      entityId: entityId ? String(entityId) : null,
      actorId: actorId ? String(actorId) : null,
      limit: limit ? Number(limit) : 100,
    });
    response.json({ logs });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load audit logs.",
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

app.post("/auth/forgot-password/request", async (request, response) => {
  try {
    const { identifier, dateOfBirth } = request.body ?? {};

    if (!identifier || !dateOfBirth) {
      return response.status(400).json({
        message: "Employee ID and date of birth are required.",
      });
    }

    const employee = await findEmployeeForPasswordReset(identifier, dateOfBirth);
    if (!employee) {
      return response.status(404).json({
        message: "Employee ID and DOB do not match our records.",
      });
    }

    if (!employee.email) {
      return response.status(400).json({
        message: "Registered email is missing for this employee login.",
      });
    }

    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    const resetRequest = await createEmployeePasswordResetRequest(employee.id, otp);
    await sendPasswordResetOtpEmail({
      email: employee.email,
      employeeCode: employee.employeeCode,
      otp,
    });

    return response.json({
      requestId: resetRequest.id,
      maskedEmail: maskEmailAddress(employee.email),
      resendCooldownSeconds: resetRequest.resendCooldownSeconds,
      message: "OTP sent to your registered email address.",
    });
  } catch (error) {
    const retryAfterSeconds =
      error instanceof Error && "retryAfterSeconds" in error
        ? Number(error.retryAfterSeconds)
        : null;
    return response.status(retryAfterSeconds ? 429 : 500).json({
      message:
        error instanceof Error ? error.message : "Unable to start forgot password flow.",
      retryAfterSeconds,
    });
  }
});

app.post("/auth/forgot-password/verify", async (request, response) => {
  try {
    const { requestId, identifier, dateOfBirth, otp } = request.body ?? {};

    if (!requestId || !identifier || !dateOfBirth || !otp) {
      return response.status(400).json({
        message: "Request, employee ID, DOB, and OTP are required.",
      });
    }

    const verified = await verifyEmployeePasswordResetOtp({
      requestId,
      identifier,
      dateOfBirth,
      otp,
    });

    if (!verified) {
      return response.status(404).json({
        message: "Unable to verify this password reset request.",
      });
    }

    const resetToken = createPasswordResetToken({
      requestId: verified.requestId,
      employeeId: verified.employee.id,
      employeeCode: verified.employee.employeeCode,
      email: verified.employee.email,
    });

    return response.json({
      resetToken,
      employee: {
        employeeCode: verified.employee.employeeCode,
        name: verified.employee.fullName,
        email: verified.employee.email,
      },
      message: "OTP verified successfully. You can now set a new password.",
    });
  } catch (error) {
    return response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to verify OTP.",
    });
  }
});

app.post("/auth/forgot-password/reset", async (request, response) => {
  try {
    const { resetToken, newPassword } = request.body ?? {};

    if (!resetToken || !newPassword) {
      return response.status(400).json({
        message: "Reset token and new password are required.",
      });
    }

    if (String(newPassword).trim().length < 6) {
      return response.status(400).json({
        message: "New password must be at least 6 characters long.",
      });
    }

    const decoded = verifyPasswordResetToken(String(resetToken));
    const consumed = await consumeEmployeePasswordResetRequest(
      decoded.requestId,
      decoded.employeeId
    );

    if (!consumed) {
      return response.status(400).json({
        message: "Password reset session is invalid or expired.",
      });
    }

    const employee = await changeEmployeePassword(
      decoded.employeeId,
      String(newPassword).trim()
    );

    if (!employee) {
      return response.status(404).json({
        message: "Employee not found.",
      });
    }

    return response.json({
      success: true,
      message: "Password changed successfully. Please sign in with your new password.",
    });
  } catch (error) {
    return response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to reset password.",
    });
  }
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

    if (
      request.user?.type === "employee" &&
      !canAccessEntity(request.user, {
        type: "job",
        assignedEmployeeId: job.recruiterId,
        clientAssignedEmployeeId: job.clientAssignedEmployeeId,
        clientFollowUpEmployeeId: job.clientFollowUpEmployeeId,
        recruiterEmail: job.recruiterEmail,
      })
    ) {
      return response.status(403).json({ message: "You do not have access to this job." });
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
      _request.user?.type === "employee" ? _request.user.id : null,
      { slim: _request.query.slim === "1" }
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
    const enquiries = await listCandidateEnquiries({ slim: _request.query.slim === "1" });
    response.json({ enquiries });
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to load candidate enquiries.",
    });
  }
});

app.post("/admin/candidate-enquiries", requirePermission("candidates.manage"), async (request, response) => {
  try {
    const {
      candidateName,
      candidateEmail,
      candidatePhone,
      gender,
      motherTongue,
      otherLanguages,
      experience,
      currentCompany,
      currentLocation,
      currentDesignation,
      preferredRole,
      currentCtc,
      expectedCtc,
      noticePeriod,
      preferredLocation,
      preferredSector,
      candidateMessage,
      resumeFileName,
      resumeFileType,
      resumeFileData,
      sourceType,
    } = request.body ?? {};

    if (!candidateName || (!candidateEmail && !candidatePhone)) {
      return response.status(400).json({
        message: "Candidate name and either email or phone are required.",
      });
    }

    const resumeUpload = await processResumeUpload({
      candidateName,
      currentDesignation,
      resumeFileName,
      resumeFileType,
      resumeFileData,
    });

    const enquiry = await createCandidateEnquiry({
      candidateName,
      candidateEmail: candidateEmail || "",
      candidatePhone,
      gender,
      motherTongue,
      otherLanguages,
      experience,
      currentCompany,
      currentLocation,
      currentDesignation,
      preferredRole,
      currentCtc,
      expectedCtc,
      noticePeriod,
      preferredLocation,
      preferredSector,
      candidateMessage,
      ...resumeUpload,
      sourceType: sourceType || "manual_candidate_enquiry",
    });

    response.status(201).json(enquiry);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to save candidate enquiry.",
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
      gender,
      motherTongue,
      otherLanguages,
      experience,
      currentCompany,
      currentLocation,
      currentDesignation,
      preferredRole,
      currentCtc,
      expectedCtc,
      noticePeriod,
      preferredLocation,
      preferredSector,
      candidateMessage,
      resumeFileName,
      resumeFileType,
      resumeFileData,
      jobTitle,
    } = request.body ?? {};

    if (!candidateName || !candidateEmail) {
      return response.status(400).json({
        message: "Candidate name and email are required.",
      });
    }

    const resumeUpload = await processResumeUpload({
      candidateName,
      currentDesignation,
      resumeFileName,
      resumeFileType,
      resumeFileData,
    });

    const job = await recordJobApplication(request.params.slug, {
      candidateName,
      candidateEmail,
      candidatePhone,
      gender,
      motherTongue,
      otherLanguages,
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
      ...resumeUpload,
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

    const resumeUpload = await processResumeUpload({
      candidateName,
      currentDesignation,
      resumeFileName,
      resumeFileType,
      resumeFileData,
    });

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
      ...resumeUpload,
      sourceType,
    });

    response.status(201).json(enquiry);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to save candidate enquiry.",
    });
  }
});

app.post("/resume-builder-submissions", async (request, response) => {
  try {
    const {
      candidateName,
      candidateEmail,
      candidatePhone,
      gender,
      motherTongue,
      otherLanguages,
      targetRole,
      location,
      yearsExperience,
      skills,
      resumeFileName,
      resumeFileType,
      resumeFileData,
      resumePayload,
    } = request.body ?? {};

    if (!String(candidateName ?? "").trim() || !String(candidateEmail ?? "").trim()) {
      return response.status(400).json({
        message: "Candidate name and email are required.",
      });
    }

    const resumeUpload = await processResumeUpload({
      candidateName,
      currentDesignation: "",
      resumeFileName,
      resumeFileType,
      resumeFileData,
    });

    const submission = await createResumeBuilderSubmission({
      candidateName: String(candidateName).trim(),
      candidateEmail: String(candidateEmail).trim(),
      candidatePhone: String(candidatePhone ?? "").trim() || undefined,
      gender: String(gender ?? "").trim() || undefined,
      motherTongue: String(motherTongue ?? "").trim() || undefined,
      otherLanguages: String(otherLanguages ?? "").trim() || undefined,
      targetRole: String(targetRole ?? "").trim() || undefined,
      location: String(location ?? "").trim() || undefined,
      yearsExperience: String(yearsExperience ?? "").trim() || undefined,
      skills: String(skills ?? "").trim() || undefined,
      ...resumeUpload,
      resumePayload: resumePayload || {},
    });

    response.status(201).json(submission);
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to save resume builder submission.",
    });
  }
});

app.get("/admin/resume-builder-submissions", requireInternalUser, async (_request, response) => {
  try {
    const submissions = await listResumeBuilderSubmissions({ slim: _request.query.slim === "1" });
    response.json({ submissions });
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to load resume builder submissions.",
    });
  }
});

app.get("/admin/jobs/:id/applications", requireInternalUser, async (request, response) => {
  try {
    const applications = await listJobApplications(
      request.params.id,
      request.user?.type === "employee" ? request.user.id : null,
      { slim: request.query.slim === "1" }
    );
    response.json({ applications });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load job applications.",
    });
  }
});

app.post("/admin/jobs/:id/applications", requirePermission("candidates.manage"), async (request, response) => {
  try {
    const {
      candidateName,
      candidateEmail,
      candidatePhone,
      gender,
      motherTongue,
      otherLanguages,
      experience,
      currentCompany,
      currentLocation,
      currentDesignation,
      preferredRole,
      currentCtc,
      expectedCtc,
      noticePeriod,
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

    const resumeUpload = await processResumeUpload({
      candidateName,
      currentDesignation,
      resumeFileName,
      resumeFileType,
      resumeFileData,
    });

    const application = await createManualJobApplication(
      request.params.id,
      {
        candidateName,
        candidateEmail,
        candidatePhone,
        gender,
        motherTongue,
        otherLanguages,
        experience,
        currentCompany,
        currentLocation,
        currentDesignation,
        preferredRole,
        currentCtc,
        expectedCtc,
        noticePeriod,
        preferredLocation,
        preferredSector,
        candidateMessage,
        sourceType,
        sourceNote,
        initialStage,
        stageNote,
        stageDate,
        ...resumeUpload,
        jobTitle,
      },
      request.user?.type === "employee" ? request.user.id : null
    );

    if (!application) {
      return response.status(404).json({ message: "Job not found." });
    }

    await createAuditLog({
      actionType: "candidate.manual-added",
      entityType: "application",
      entityId: application.id,
      ...getActorDetails(request),
      beforeData: {},
      afterData: application,
      metadata: {
        jobId: request.params.id,
        jobCode: application.jobCode,
        candidateName: application.candidateName,
      },
    });

    await recordTimeline(request, {
      entityType: "candidate",
      entityId: application.id,
      entityLabel: application.candidateName,
      eventType: "candidate.created",
      title: "Candidate added manually",
      summary: `${application.candidateName} was added against ${application.jobTitle || "the selected job"}.`,
      beforeData: {},
      afterData: application,
      metadata: {
        jobId: application.jobId,
        jobCode: application.jobCode,
      },
    });

    response.status(201).json(application);
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to add candidate to this job.",
    });
  }
});

app.put(
  "/admin/jobs/applications/:id",
  requirePermission("candidates.manage"),
  async (request, response) => {
    try {
      const {
        candidateName,
        candidateEmail,
        candidatePhone,
        gender,
        motherTongue,
        otherLanguages,
        experience,
        currentCompany,
        currentLocation,
        currentDesignation,
        preferredRole,
        currentCtc,
        expectedCtc,
        noticePeriod,
        preferredLocation,
        preferredSector,
        sourceType,
        sourceNote,
        candidateMessage,
        resumeFileName,
        resumeFileType,
        resumeFileData,
        interviewScheduledAt,
        interviewMode,
        interviewPanel,
        interviewReminderAt,
        finalCtc,
        dateOfJoining,
      } = request.body ?? {};

      if (!String(candidateName ?? "").trim()) {
        return response.status(400).json({ message: "Candidate name is required." });
      }

      if (!String(candidateEmail ?? "").trim() && !String(candidatePhone ?? "").trim()) {
        return response.status(400).json({
          message: "At least email or phone number is required.",
        });
      }

      const resumeUpload = await processResumeUpload({
        candidateName,
        currentDesignation,
        resumeFileName,
        resumeFileType,
        resumeFileData,
      });

      const previousApplication = await getApplicationById(request.params.id);
      if (!previousApplication) {
        return response.status(404).json({ message: "Candidate not found." });
      }

      const application = await updateJobApplicationDetails(
        request.params.id,
        {
          candidateName: String(candidateName).trim(),
          candidateEmail: String(candidateEmail ?? "").trim() || undefined,
          candidatePhone: String(candidatePhone ?? "").trim() || undefined,
          gender: String(gender ?? "").trim() || undefined,
          motherTongue: String(motherTongue ?? "").trim() || undefined,
          otherLanguages: String(otherLanguages ?? "").trim() || undefined,
          experience: String(experience ?? "").trim() || undefined,
          currentCompany: String(currentCompany ?? "").trim() || undefined,
          currentLocation: String(currentLocation ?? "").trim() || undefined,
          currentDesignation: String(currentDesignation ?? "").trim() || undefined,
          preferredRole: String(preferredRole ?? "").trim() || undefined,
          currentCtc: String(currentCtc ?? "").trim() || undefined,
          expectedCtc: String(expectedCtc ?? "").trim() || undefined,
          noticePeriod: String(noticePeriod ?? "").trim() || undefined,
          preferredLocation: String(preferredLocation ?? "").trim() || undefined,
          preferredSector: String(preferredSector ?? "").trim() || undefined,
          sourceType: String(sourceType ?? "").trim() || undefined,
          sourceNote: String(sourceNote ?? "").trim() || undefined,
          candidateMessage: String(candidateMessage ?? "").trim() || undefined,
          ...resumeUpload,
          interviewScheduledAt: String(interviewScheduledAt ?? "").trim() || undefined,
          interviewMode: String(interviewMode ?? "").trim() || undefined,
          interviewPanel: String(interviewPanel ?? "").trim() || undefined,
          interviewReminderAt: String(interviewReminderAt ?? "").trim() || undefined,
        },
        request.user?.type === "employee" ? request.user.id : null
      );

      if (!application) {
        return response.status(404).json({ message: "Candidate not found." });
      }

      await createAuditLog({
        actionType: "candidate.updated",
        entityType: "application",
        entityId: application.id,
        ...getActorDetails(request),
        beforeData: previousApplication,
        afterData: application,
        metadata: {
          candidateName: application.candidateName,
          jobId: application.jobId,
          jobCode: application.jobCode,
        },
      });

      await recordTimeline(request, {
        entityType: "candidate",
        entityId: application.id,
        entityLabel: application.candidateName,
        eventType: "candidate.updated",
        title: "Candidate details updated",
        summary: `${application.candidateName} details were updated.`,
        beforeData: previousApplication,
        afterData: application,
        metadata: {
          jobId: application.jobId,
          jobCode: application.jobCode,
        },
      });

      response.json(application);
    } catch (error) {
      response.status(500).json({
        message:
          error instanceof Error ? error.message : "Unable to update candidate details.",
      });
    }
  }
);

app.post(
  "/admin/jobs/applications/:id/assign-job",
  requirePermission("candidates.manage"),
  async (request, response) => {
    try {
      const { jobId, initialStage, stageNote, stageDate } = request.body ?? {};
      if (!jobId) {
        return response.status(400).json({ message: "Target job is required." });
      }

      const previousApplication = await getApplicationById(request.params.id);
      const application = await assignCandidateApplicationToJob(
        request.params.id,
        String(jobId),
        {
          initialStage,
          stageNote,
          stageDate,
        },
        request.user?.type === "employee" ? request.user.id : null
      );

      if (!application) {
        return response.status(404).json({ message: "Candidate or target job not found." });
      }

      await createAuditLog({
        actionType: "candidate.assigned-to-job",
        entityType: "application",
        entityId: application.id,
        ...getActorDetails(request),
        beforeData: previousApplication || {},
        afterData: application,
        metadata: {
          sourceApplicationId: request.params.id,
          targetJobId: jobId,
          targetJobCode: application.jobCode,
          candidateName: application.candidateName,
        },
      });

      await recordTimeline(request, {
        entityType: "candidate",
        entityId: application.id,
        entityLabel: application.candidateName,
        eventType: "candidate.assigned-to-job",
        title: "Candidate assigned to job",
        summary: `${application.candidateName} was assigned to ${application.jobTitle || "the selected job"}.`,
        beforeData: previousApplication || {},
        afterData: application,
        metadata: {
          sourceApplicationId: request.params.id,
          targetJobId: application.jobId,
          targetJobCode: application.jobCode,
        },
      });

      response.status(201).json(application);
    } catch (error) {
      response.status(500).json({
        message:
          error instanceof Error ? error.message : "Unable to assign candidate to job.",
      });
    }
  }
);

app.put(
  "/admin/jobs/applications/:id/stage",
  requirePermission("candidates.manage"),
  async (request, response) => {
    try {
      const {
        stage,
        stageNote,
        stageDate,
        interviewScheduledAt,
        interviewMode,
        interviewPanel,
        interviewReminderAt,
        finalCtc,
        dateOfJoining,
      } = request.body ?? {};
      const allowedStages = [
        "applied",
        "shortlisted",
        "interview",
        "offered",
        "joined",
        "screen-rejection",
        "rejected",
      ];

      if (!allowedStages.includes(stage)) {
        return response.status(400).json({ message: "Invalid application stage." });
      }
      if (!String(stageNote ?? "").trim() || !stageDate) {
        return response.status(400).json({
          message: "Stage remark and effective date are required.",
        });
      }
      if (stage === "joined" && (!String(finalCtc ?? "").trim() || !dateOfJoining)) {
        return response.status(400).json({
          message: "Final CTC and date of joining are required for joined candidates.",
        });
      }

      const currentApplication = await getApplicationById(request.params.id);
      if (!currentApplication) {
        return response.status(404).json({ message: "Application not found." });
      }

      if (
        request.user?.type !== "admin" &&
        requiresStageOverrideApproval(currentApplication.stage, stage)
      ) {
        const approval = await createApprovalRequest({
          requestType: "candidate-stage-override",
          entityType: "candidate",
          entityId: request.params.id,
          entityLabel: currentApplication.candidateName,
          requestedByEmployeeId: request.user?.type === "employee" ? request.user.id : null,
          effectiveFromDate: stageDate,
          reason: stageNote,
          beforeData: currentApplication,
          requestedData: {
            stage,
            stageNote,
            stageDate,
            interviewScheduledAt,
            interviewMode,
            interviewPanel,
            interviewReminderAt,
            finalCtc,
            dateOfJoining,
          },
          metadata: {
            jobId: currentApplication.jobId,
            jobCode: currentApplication.jobCode,
            fromStage: currentApplication.stage,
            toStage: stage,
          },
        });

        await recordTimeline(request, {
          entityType: "candidate",
          entityId: currentApplication.id,
          entityLabel: currentApplication.candidateName,
          eventType: "candidate.stage-override-requested",
          title: "Candidate stage override requested",
          summary: `Stage move from ${currentApplication.stage || "applied"} to ${stage} is waiting for approval.`,
          beforeData: currentApplication,
          afterData: {
            stage,
            stageNote,
            stageDate,
          },
          metadata: {
            approvalId: approval.id,
          },
        });

        await notifyApprovalLifecycle(approval, "created");

        return response.status(202).json({
          approvalPending: true,
          approval,
          message: "This stage override was sent for approval.",
        });
      }

      let application = await updateJobApplicationStage(
        request.params.id,
        stage,
        stageNote,
        stageDate,
        request.user?.type === "employee" ? request.user.id : null,
        stage === "joined"
          ? {
              finalCtc: String(finalCtc ?? "").trim() || null,
              dateOfJoining: dateOfJoining || stageDate,
            }
          : {}
      );

      if (!application) {
        return response.status(404).json({ message: "Application not found." });
      }

      const hasInterviewScheduleUpdate =
        stage === "interview" &&
        [interviewScheduledAt, interviewMode, interviewPanel, interviewReminderAt].some((value) =>
          String(value ?? "").trim()
        );

      if (hasInterviewScheduleUpdate) {
        const scheduledApplication = await updateJobApplicationDetails(
          request.params.id,
          {
            candidateName: currentApplication.candidateName,
            candidateEmail: currentApplication.candidateEmail || undefined,
            candidatePhone: currentApplication.candidatePhone || undefined,
            experience: currentApplication.experience || undefined,
            currentCompany: currentApplication.currentCompany || undefined,
            currentLocation: currentApplication.currentLocation || undefined,
            currentDesignation: currentApplication.currentDesignation || undefined,
            preferredRole: currentApplication.preferredRole || undefined,
            currentCtc: currentApplication.currentCtc || undefined,
            expectedCtc: currentApplication.expectedCtc || undefined,
            noticePeriod: currentApplication.noticePeriod || undefined,
            preferredLocation: currentApplication.preferredLocation || undefined,
            preferredSector: currentApplication.preferredSector || undefined,
            sourceType: currentApplication.sourceType || undefined,
            sourceNote: currentApplication.sourceNote || undefined,
            candidateMessage: currentApplication.candidateMessage || undefined,
            resumeFileName: currentApplication.resumeFileName || undefined,
            resumeFileType: currentApplication.resumeFileType || undefined,
            resumeFileData: currentApplication.resumeFileData || undefined,
            interviewScheduledAt: String(interviewScheduledAt ?? "").trim() || undefined,
            interviewMode: String(interviewMode ?? "").trim() || undefined,
            interviewPanel: String(interviewPanel ?? "").trim() || undefined,
            interviewReminderAt: String(interviewReminderAt ?? "").trim() || undefined,
          },
          request.user?.type === "employee" ? request.user.id : null
        );

        if (scheduledApplication) {
          application = {
            ...application,
            interviewScheduledAt: scheduledApplication.interviewScheduledAt,
            interviewMode: scheduledApplication.interviewMode,
            interviewPanel: scheduledApplication.interviewPanel,
            interviewReminderAt: scheduledApplication.interviewReminderAt,
          };
        }
      }

      await createAuditLog({
        actionType: "candidate.stage-updated",
        entityType: "application",
        entityId: application.id,
        ...getActorDetails(request),
        beforeData: {},
        afterData: {
          stage: application.stage,
          stageNote: application.stageNote,
          stageDate: application.stageDate,
          interviewScheduledAt: application.interviewScheduledAt,
          interviewMode: application.interviewMode,
          interviewPanel: application.interviewPanel,
          interviewReminderAt: application.interviewReminderAt,
          finalCtc: application.finalCtc,
          dateOfJoining: application.dateOfJoining,
        },
        metadata: {
          jobId: application.jobId,
          candidateName: application.candidateName,
        },
      });

      await recordTimeline(request, {
        entityType: "candidate",
        entityId: application.id,
        entityLabel: application.candidateName,
        eventType: "candidate.stage-updated",
        title: "Candidate stage updated",
        summary: `${application.candidateName} moved to ${application.stage || stage}.`,
        beforeData: {},
        afterData: {
          stage: application.stage,
          stageNote: application.stageNote,
          stageDate: application.stageDate,
          interviewScheduledAt: application.interviewScheduledAt,
          interviewMode: application.interviewMode,
          interviewPanel: application.interviewPanel,
          interviewReminderAt: application.interviewReminderAt,
          finalCtc: application.finalCtc,
          dateOfJoining: application.dateOfJoining,
        },
        metadata: {
          jobId: application.jobId,
          jobCode: application.jobCode,
        },
      });

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

app.put(
      "/admin/jobs/applications/:id/assignment",
  requirePermission("candidates.manage"),
  async (request, response) => {
    try {
      const {
        assignedEmployeeId,
        assignmentType,
        effectiveFromDate,
        effectiveToDate,
        note,
      } = request.body ?? {};

      if (!assignedEmployeeId) {
        return response.status(400).json({ message: "Target employee is required." });
      }
      if (!String(note ?? "").trim()) {
        return response.status(400).json({
          message: "Transfer remarks are required for candidate assignment changes.",
        });
      }

      const currentApplication = await getApplicationById(request.params.id);
      if (!currentApplication) {
        return response.status(404).json({ message: "Application not found." });
      }

      if (
        request.user?.type !== "admin" &&
        (assignmentType || "ownership-transfer") === "ownership-transfer"
      ) {
        const approval = await createApprovalRequest({
          requestType: "candidate-transfer",
          entityType: "candidate",
          entityId: request.params.id,
          entityLabel: currentApplication.candidateName,
          requestedByEmployeeId: request.user?.type === "employee" ? request.user.id : null,
          effectiveFromDate,
          effectiveToDate,
          reason: note,
          beforeData: currentApplication,
          requestedData: {
            assignedEmployeeId,
            assignmentType: assignmentType || "ownership-transfer",
            effectiveFromDate,
            effectiveToDate,
            note,
          },
          metadata: {
            jobId: currentApplication.jobId,
            jobCode: currentApplication.jobCode,
            assignmentType: assignmentType || "ownership-transfer",
          },
        });

        await recordTimeline(request, {
          entityType: "candidate",
          entityId: currentApplication.id,
          entityLabel: currentApplication.candidateName,
          eventType: "candidate.transfer-requested",
          title: "Candidate transfer requested",
          summary: note || "Candidate transfer is waiting for approval.",
          beforeData: currentApplication,
          afterData: {
            assignedEmployeeId,
            assignmentType: assignmentType || "ownership-transfer",
            effectiveFromDate,
            effectiveToDate,
          },
          metadata: {
            approvalId: approval.id,
          },
        });

        await notifyApprovalLifecycle(approval, "created");

        return response.status(202).json({
          approvalPending: true,
          approval,
          message: "Candidate transfer request submitted for approval.",
        });
      }

      const application = await assignJobApplication(
        request.params.id,
        {
          assignedEmployeeId,
          assignmentType,
          effectiveFromDate,
          effectiveToDate,
          note,
        },
        request.user?.type === "employee" ? request.user.id : null
      );

      if (!application) {
        return response.status(404).json({ message: "Application not found." });
      }

      await createAuditLog({
        actionType:
          assignmentType === "follow-up-support"
            ? "candidate.followup-assigned"
            : "candidate.reassigned",
        entityType: "application",
        entityId: application.id,
        ...getActorDetails(request),
        beforeData: {},
        afterData: {
          assignedEmployeeId: application.assignedEmployeeId,
          followUpEmployeeId: application.followUpEmployeeId,
          followUpFromDate: application.followUpFromDate,
          followUpToDate: application.followUpToDate,
          followUpAssignmentNote: application.followUpAssignmentNote,
        },
        metadata: {
          candidateName: application.candidateName,
          assignmentType: assignmentType || "ownership-transfer",
        },
      });

      await recordTimeline(request, {
        entityType: "candidate",
        entityId: application.id,
        entityLabel: application.candidateName,
        eventType:
          assignmentType === "follow-up-support"
            ? "candidate.follow-up-assigned"
            : "candidate.reassigned",
        title:
          assignmentType === "follow-up-support"
            ? "Candidate follow-up assigned"
            : "Candidate ownership transferred",
        summary: String(note || "Candidate assignment updated."),
        beforeData: {},
        afterData: {
          assignedEmployeeId: application.assignedEmployeeId,
          followUpEmployeeId: application.followUpEmployeeId,
          followUpFromDate: application.followUpFromDate,
          followUpToDate: application.followUpToDate,
        },
        metadata: {
          assignmentType: assignmentType || "ownership-transfer",
        },
      });

      response.json(application);
    } catch (error) {
      response.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Unable to update candidate assignment.",
      });
    }
  }
);

app.delete("/admin/applications/:id", requireAdmin, async (request, response) => {
  try {
    const previousApplication = await getApplicationById(request.params.id);
    if (!previousApplication) {
      return response.status(404).json({ message: "Candidate not found." });
    }

    const deleted = await deleteJobApplication(request.params.id);
    if (!deleted) {
      return response.status(404).json({ message: "Candidate not found." });
    }

    await createAuditLog({
      actionType: "candidate.deleted",
      entityType: "application",
      entityId: request.params.id,
      ...getActorDetails(request),
      beforeData: previousApplication,
      afterData: {},
      metadata: {
        candidateName: previousApplication.candidateName,
        jobTitle: previousApplication.jobTitle,
        jobCode: previousApplication.jobCode,
      },
    });

    response.json({ success: true });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to delete candidate.",
    });
  }
});

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

app.get("/admin/employees/:id", requireInternalUser, async (request, response) => {
  try {
    const employee = await getEmployeeById(request.params.id);

    if (!employee) {
      return response.status(404).json({ message: "Employee not found." });
    }

    response.json(employee);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load employee details.",
    });
  }
});

app.post("/admin/employees", requirePermission("employees.manage"), async (request, response) => {
  try {
    const {
      fullName,
      email,
      phone,
      role,
      reportingManagerId,
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
      reportingManagerId,
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

    await createAuditLog({
      actionType: "employee.created",
      entityType: "employee",
      entityId: employee.id,
      ...getActorDetails(request),
      beforeData: {},
      afterData: employee,
    });

    await recordTimeline(request, {
      entityType: "employee",
      entityId: employee.id,
      entityLabel: employee.fullName,
      eventType: "employee.created",
      title: "Employee created",
      summary: `${employee.fullName} was added to Werkly CRM.`,
      beforeData: {},
      afterData: employee,
    });

    response.status(201).json(employee);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create employee.",
    });
  }
});

app.put("/admin/employees/:id", requirePermission("employees.manage"), async (request, response) => {
  try {
    const {
      fullName,
      email,
      phone,
      role,
      reportingManagerId,
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

    const previousEmployee = await getEmployeeById(request.params.id);
    if (!previousEmployee) {
      return response.status(404).json({ message: "Employee not found." });
    }

    if (
      request.user?.type !== "admin" &&
      status === "inactive" &&
      previousEmployee.status !== "inactive"
    ) {
      const approval = await createApprovalRequest({
        requestType: "employee-inactivation",
        entityType: "employee",
        entityId: previousEmployee.id,
        entityLabel: previousEmployee.fullName,
        requestedByEmployeeId: request.user?.type === "employee" ? request.user.id : null,
        effectiveFromDate: inactiveDate,
        reason: inactiveRemarks,
        beforeData: previousEmployee,
        requestedData: {
          fullName,
          email,
          phone,
          role,
          reportingManagerId,
          dateOfBirth,
          dateOfJoining,
          educationQualification,
          previousExperience,
          educationDetails,
          experienceDetails,
          status,
          inactiveDate,
          inactiveRemarks,
        },
      });

      await recordTimeline(request, {
        entityType: "employee",
        entityId: previousEmployee.id,
        entityLabel: previousEmployee.fullName,
        eventType: "employee.inactivation-requested",
        title: "Employee inactivation requested",
        summary: inactiveRemarks || "Employee inactivation is waiting for approval.",
        beforeData: previousEmployee,
        afterData: {
          status,
          inactiveDate,
          inactiveRemarks,
        },
        metadata: {
          approvalId: approval.id,
        },
      });

      await notifyApprovalLifecycle(approval, "created");

      return response.status(202).json({
        approvalPending: true,
        approval,
        message: "Employee inactivation request submitted for approval.",
      });
    }

    const employee = await updateEmployee(request.params.id, {
      fullName,
      email,
      phone,
      role,
      reportingManagerId,
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

    await createAuditLog({
      actionType: "employee.updated",
      entityType: "employee",
      entityId: employee.id,
      ...getActorDetails(request),
      beforeData: previousEmployee || {},
      afterData: employee,
    });

    await recordTimeline(request, {
      entityType: "employee",
      entityId: employee.id,
      entityLabel: employee.fullName,
      eventType:
        status === "inactive" && previousEmployee?.status !== "inactive"
          ? "employee.inactivated"
          : "employee.updated",
      title:
        status === "inactive" && previousEmployee?.status !== "inactive"
          ? "Employee marked inactive"
          : "Employee updated",
      summary:
        status === "inactive" && inactiveRemarks
          ? inactiveRemarks
          : `${employee.fullName} details were updated.`,
      beforeData: previousEmployee || {},
      afterData: employee,
    });

    response.json(employee);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update employee.",
    });
  }
});

app.post("/admin/employees/:id/reset-password", requirePermission("employees.manage"), async (request, response) => {
  try {
    const { password, mustChangePassword } = request.body ?? {};

    if (!password || String(password).trim().length < 6) {
      return response.status(400).json({
        message: "New password must be at least 6 characters long.",
      });
    }

    const previousEmployee = await getEmployeeById(request.params.id);
    const employee = await adminResetEmployeePassword(
      request.params.id,
      String(password).trim(),
      mustChangePassword !== false
    );

    if (!employee) {
      return response.status(404).json({ message: "Employee not found." });
    }

    await createAuditLog({
      actionType: "employee.password-reset",
      entityType: "employee",
      entityId: employee.id,
      ...getActorDetails(request),
      beforeData: {
        mustChangePassword: previousEmployee?.mustChangePassword,
      },
      afterData: {
        mustChangePassword: employee.mustChangePassword,
      },
    });

    await recordTimeline(request, {
      entityType: "employee",
      entityId: employee.id,
      entityLabel: employee.fullName,
      eventType: "employee.password-reset",
      title: "Password reset",
      summary: `${employee.fullName}'s password was reset.`,
      beforeData: {
        mustChangePassword: previousEmployee?.mustChangePassword,
      },
      afterData: {
        mustChangePassword: employee.mustChangePassword,
      },
    });

    response.json(employee);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to reset employee password.",
    });
  }
});

app.get("/admin/clients", requireInternalUser, async (_request, response) => {
  try {
    const includeDirectReports = _request.query?.scope === "team";
    const clients = await listClients(
      _request.user?.type === "employee" ? _request.user.id : null,
      { includeDirectReports }
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

    const { leaveTypeId, startDate, endDate, reason, leavePortion, halfDaySession } =
      request.body ?? {};
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
      leavePortion,
      halfDaySession,
    });

    await createAuditLog({
      actionType: "leave.requested",
      entityType: "leave-request",
      entityId: leaveRequest.id,
      ...getActorDetails(request),
      beforeData: {},
      afterData: leaveRequest,
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
    const {
      status,
      adminNote,
      leaveTypeId,
      startDate,
      endDate,
      reason,
      leavePortion,
      halfDaySession,
    } = request.body ?? {};
    if (!["approved", "rejected", "pending"].includes(status)) {
      return response.status(400).json({ message: "Invalid leave request status." });
    }

    const previousRequests = await listLeaveRequests();
    const previousLeaveRequest =
      previousRequests.find((item) => item.id === request.params.id) || null;

    const leaveRequest = await updateLeaveRequestStatus(request.params.id, {
      status,
      adminNote,
      leaveTypeId,
      startDate,
      endDate,
      reason,
      leavePortion,
      halfDaySession,
    });

    if (!leaveRequest) {
      return response.status(404).json({ message: "Leave request not found." });
    }

    await createAuditLog({
      actionType: "leave.updated",
      entityType: "leave-request",
      entityId: leaveRequest.id,
      ...getActorDetails(request),
      beforeData: previousLeaveRequest || {},
      afterData: leaveRequest,
      metadata: {
        leavePortion: leaveRequest.leavePortion,
        halfDaySession: leaveRequest.halfDaySession,
      },
    });

    response.json(leaveRequest);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update leave request.",
    });
  }
});

app.get("/admin/leaves/holidays", requireInternalUser, async (_request, response) => {
  try {
    const holidays = await listHolidays();
    response.json({ holidays });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load holiday calendar.",
    });
  }
});

app.post("/admin/leaves/holidays", requireAdmin, async (request, response) => {
  try {
    const { holidayDate, name, holidayType, notes } = request.body ?? {};
    if (!holidayDate || !String(name ?? "").trim()) {
      return response.status(400).json({ message: "Holiday date and name are required." });
    }

    const holiday = await createHoliday({
      holidayDate,
      name: String(name).trim(),
      holidayType,
      notes,
    });

    await createAuditLog({
      actionType: "holiday.upserted",
      entityType: "holiday",
      entityId: holiday.id,
      ...getActorDetails(request),
      beforeData: {},
      afterData: holiday,
    });

    response.status(201).json(holiday);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to save holiday.",
    });
  }
});

app.get("/admin/leaves/attendance-exceptions", requireInternalUser, async (request, response) => {
  try {
    const exceptions = await listAttendanceExceptions(
      request.user?.type === "employee" ? request.user.id : null
    );
    response.json({ exceptions });
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to load attendance exceptions.",
    });
  }
});

app.post("/admin/leaves/attendance-exceptions", requireAdmin, async (request, response) => {
  try {
    const { employeeId, exceptionDate, exceptionType, reason, status, adminNote } =
      request.body ?? {};
    if (!employeeId || !exceptionDate || !String(reason ?? "").trim()) {
      return response.status(400).json({
        message: "Employee, exception date, and reason are required.",
      });
    }

    const exception = await createAttendanceException({
      employeeId,
      exceptionDate,
      exceptionType,
      reason: String(reason).trim(),
      status,
      adminNote,
    });

    await createAuditLog({
      actionType: "attendance-exception.created",
      entityType: "attendance-exception",
      entityId: exception.id,
      ...getActorDetails(request),
      beforeData: {},
      afterData: exception,
    });

    response.status(201).json(exception);
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to save attendance exception.",
    });
  }
});

app.get("/admin/shifts", requireInternalUser, async (_request, response) => {
  try {
    const shifts = await listShifts();
    response.json({ shifts });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load shifts.",
    });
  }
});

app.post("/admin/shifts", requireAdmin, async (request, response) => {
  try {
    const {
      name,
      code,
      startTime,
      endTime,
      breakMinutes,
      graceMinutes,
      workingDays,
      notes,
      isActive,
    } = request.body ?? {};

    if (!name || !startTime || !endTime) {
      return response.status(400).json({
        message: "Shift name, start time, and end time are required.",
      });
    }

    const shift = await createShift({
      name,
      code,
      startTime,
      endTime,
      breakMinutes,
      graceMinutes,
      workingDays,
      notes,
      isActive,
    });

    await createAuditLog({
      actionType: "shift.created",
      entityType: "shift",
      entityId: shift.id,
      ...getActorDetails(request),
      beforeData: {},
      afterData: shift,
    });

    response.status(201).json(shift);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create shift.",
    });
  }
});

app.get("/admin/shifts/assignments", requireInternalUser, async (request, response) => {
  try {
    const assignments = await listShiftAssignments(
      request.user?.type === "employee" ? request.user.id : null
    );
    response.json({ assignments });
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to load shift assignments.",
    });
  }
});

app.post("/admin/shifts/assignments", requireAdmin, async (request, response) => {
  try {
    const {
      employeeId,
      shiftId,
      effectiveFromDate,
      effectiveToDate,
      assignmentNote,
    } = request.body ?? {};

    if (!employeeId || !shiftId || !effectiveFromDate) {
      return response.status(400).json({
        message: "Employee, shift, and effective from date are required.",
      });
    }

    const assignment = await createShiftAssignment({
      employeeId,
      shiftId,
      effectiveFromDate,
      effectiveToDate,
      assignmentNote,
    });

    if (!assignment) {
      return response.status(404).json({ message: "Unable to create shift assignment." });
    }

    await createAuditLog({
      actionType: "shift.assigned",
      entityType: "shift-assignment",
      entityId: assignment.id,
      ...getActorDetails(request),
      beforeData: {},
      afterData: assignment,
      metadata: {
        shiftId: assignment.shiftId,
        shiftName: assignment.shiftName,
        employeeId: assignment.employeeId,
        employeeName: assignment.employeeName,
      },
    });

    response.status(201).json(assignment);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to assign shift.",
    });
  }
});

app.put("/admin/shifts/assignments/:id", requireAdmin, async (request, response) => {
  try {
    const {
      employeeId,
      shiftId,
      effectiveFromDate,
      effectiveToDate,
      assignmentNote,
    } = request.body ?? {};

    if (!employeeId || !shiftId || !effectiveFromDate) {
      return response.status(400).json({
        message: "Employee, shift, and effective from date are required.",
      });
    }

    const previousAssignment = (await listShiftAssignments()).find(
      (assignment) => assignment.id === request.params.id
    );

    const assignment = await updateShiftAssignment(request.params.id, {
      employeeId,
      shiftId,
      effectiveFromDate,
      effectiveToDate,
      assignmentNote,
    });

    if (!assignment) {
      return response.status(404).json({ message: "Shift assignment was not found." });
    }

    await createAuditLog({
      actionType: "shift.assignment.updated",
      entityType: "shift-assignment",
      entityId: assignment.id,
      ...getActorDetails(request),
      beforeData: previousAssignment || {},
      afterData: assignment,
      metadata: {
        shiftId: assignment.shiftId,
        shiftName: assignment.shiftName,
        employeeId: assignment.employeeId,
        employeeName: assignment.employeeName,
      },
    });

    response.json(assignment);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update shift assignment.",
    });
  }
});

app.post("/admin/clients", requirePermission("clients.manage"), async (request, response) => {
  try {
    const {
      companyName,
      contactPerson,
      contactEmail,
      contactPhone,
      secondaryContactPerson,
      secondaryContactEmail,
      secondaryContactPhone,
      communicationAddress,
      sector,
      branch,
      assignedEmployeeId,
      assignedEmployeeName,
      status,
      onboardingStatus,
      followUpStatus,
      nextFollowUpDate,
      lastFollowUpDate,
      onboardingSource,
      notes,
      followUpNotes,
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
        secondaryContactPerson,
        secondaryContactEmail,
        secondaryContactPhone,
        communicationAddress,
        sector,
        branch,
        assignedEmployeeId,
        assignedEmployeeName,
        status,
        onboardingStatus,
        followUpStatus,
        nextFollowUpDate,
        lastFollowUpDate,
        onboardingSource,
        notes,
        followUpNotes,
        agreementFileName,
        agreementFileType,
        agreementFileData,
      });

    await createAuditLog({
      actionType: "client.created",
      entityType: "client",
      entityId: client.id,
      ...getActorDetails(request),
      beforeData: {},
      afterData: client,
    });

    await recordTimeline(request, {
      entityType: "client",
      entityId: client.id,
      entityLabel: client.companyName,
      eventType: "client.created",
      title: "Client onboarded",
      summary: `${client.companyName} was added to the CRM.`,
      beforeData: {},
      afterData: client,
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
      !canAccessEntity(request.user, { type: "client", ...client })
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

app.put("/admin/clients/:id", requirePermission("clients.manage"), async (request, response) => {
  try {
    const previousClient = await getClientById(request.params.id);
    if (!previousClient) {
      return response.status(404).json({ message: "Client not found." });
    }

    if (
      request.user?.type === "employee" &&
      !canAccessEntity(request.user, { type: "client", ...previousClient })
    ) {
      return response.status(403).json({ message: "You do not have access to update this client." });
    }

    const client = await updateClient(request.params.id, request.body ?? {});
    if (!client) {
      return response.status(404).json({ message: "Client not found." });
    }

    await createAuditLog({
      actionType: "client.updated",
      entityType: "client",
      entityId: client.id,
      ...getActorDetails(request),
      beforeData: previousClient,
      afterData: client,
    });

    response.json(client);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update client.",
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
      !canAccessEntity(request.user, { type: "client", ...client })
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
      !canAccessEntity(request.user, { type: "client", ...client })
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

app.put("/admin/clients/:id/onboarding", requirePermission("clients.manage"), async (request, response) => {
  try {
    const { onboardingStatus, notes } = request.body ?? {};

    if (!onboardingStatus) {
      return response.status(400).json({
        message: "Onboarding status is required.",
      });
    }

    const previousClient = await getClientById(request.params.id);
    if (
      previousClient &&
      request.user?.type === "employee" &&
      !canAccessEntity(request.user, { type: "client", ...previousClient })
    ) {
      return response.status(403).json({
        message: "You do not have access to update this client.",
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

    await createAuditLog({
      actionType: "client.onboarding-updated",
      entityType: "client",
      entityId: client.id,
      ...getActorDetails(request),
      beforeData: previousClient || {},
      afterData: client,
    });

    await recordTimeline(request, {
      entityType: "client",
      entityId: client.id,
      entityLabel: client.companyName,
      eventType: "client.onboarding-updated",
      title: "Client onboarding updated",
      summary: notes || `Onboarding moved to ${onboardingStatus}.`,
      beforeData: previousClient || {},
      afterData: client,
    });

    response.json(client);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update client onboarding.",
    });
  }
});

app.put("/admin/clients/:id/reassign", requireAdmin, async (request, response) => {
  try {
    const { assignedEmployeeId, assignmentType, effectiveFromDate, effectiveToDate, reason } =
      request.body ?? {};

    if (!assignedEmployeeId) {
      return response.status(400).json({
        message: "Target employee is required.",
      });
    }
    if (!String(reason ?? "").trim()) {
      return response.status(400).json({
        message: "Transfer reason is required.",
      });
    }

    const previousClient = await getClientById(request.params.id);
    const client = await reassignClient(request.params.id, {
      assignedEmployeeId,
      assignmentType,
      effectiveFromDate,
      effectiveToDate,
      reason,
    });

    if (!client) {
      return response.status(404).json({ message: "Client not found." });
    }

    await createAuditLog({
      actionType:
        assignmentType === "follow-up-support"
          ? "client.followup-assigned"
          : "client.reassigned",
      entityType: "client",
      entityId: client.id,
      ...getActorDetails(request),
      beforeData: previousClient || {},
      afterData: client,
      metadata: {
        assignmentType: assignmentType || "ownership-transfer",
        effectiveFromDate,
        effectiveToDate,
        reason,
      },
    });

    await recordTimeline(request, {
      entityType: "client",
      entityId: client.id,
      entityLabel: client.companyName,
      eventType:
        assignmentType === "follow-up-support"
          ? "client.follow-up-assigned"
          : "client.reassigned",
      title:
        assignmentType === "follow-up-support"
          ? "Client follow-up assigned"
          : "Client ownership transferred",
      summary: reason || "Client assignment updated.",
      beforeData: previousClient || {},
      afterData: client,
      metadata: {
        assignmentType: assignmentType || "ownership-transfer",
      },
    });

    response.json(client);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to reassign client.",
    });
  }
});

app.put("/admin/clients/bulk-assignment", requireAdmin, async (request, response) => {
  try {
    const { clientIds, assignedEmployeeId, action } = request.body ?? {};

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return response.status(400).json({ message: "Please select at least one lead." });
    }

    if (action !== "assign" && action !== "unassign") {
      return response.status(400).json({ message: "Invalid bulk action." });
    }

    if (action === "assign" && !assignedEmployeeId) {
      return response.status(400).json({ message: "Target employee is required." });
    }

    const previousClients = await Promise.all(
      clientIds.map((clientId) => getClientById(clientId))
    );
    const clients = await bulkAssignClients(clientIds, {
      action,
      assignedEmployeeId,
    });

    for (const client of clients) {
      const previousClient = previousClients.find((item) => item?.id === client.id) || {};
      await createAuditLog({
        actionType: action === "assign" ? "client.bulk-assigned" : "client.bulk-unassigned",
        entityType: "client",
        entityId: client.id,
        ...getActorDetails(request),
        beforeData: previousClient,
        afterData: client,
        metadata: {
          bulkAction: action,
          assignedEmployeeId: assignedEmployeeId || null,
        },
      });

      await recordTimeline(request, {
        entityType: "client",
        entityId: client.id,
        entityLabel: client.companyName,
        eventType: action === "assign" ? "client.bulk-assigned" : "client.bulk-unassigned",
        title: action === "assign" ? "Lead assigned" : "Lead unassigned",
        summary:
          action === "assign"
            ? `${client.companyName} was assigned from the leads screen.`
            : `${client.companyName} was unassigned from the leads screen.`,
        beforeData: previousClient || {},
        afterData: client,
        metadata: {
          bulkAction: action,
          assignedEmployeeId: assignedEmployeeId || null,
        },
      });
    }

    response.json({ clients, updatedCount: clients.length });
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to update lead assignment.",
    });
  }
});

app.put("/admin/clients/:id/follow-up", requirePermission("clients.followup"), async (request, response) => {
  try {
    const { followUpStatus, nextFollowUpDate, lastFollowUpDate, followUpNotes } = request.body ?? {};

    if (!followUpStatus) {
      return response.status(400).json({
        message: "Follow-up status is required.",
      });
    }
    if (followUpStatus === "closed" && !String(followUpNotes ?? "").trim()) {
      return response.status(400).json({
        message: "Follow-up notes are required before closing the client follow-up.",
      });
    }

    const previousClient = await getClientById(request.params.id);
    if (
      previousClient &&
      request.user?.type === "employee" &&
      !canUpdateClientFollowUp(request.user, { type: "client", ...previousClient })
    ) {
      return response.status(403).json({
        message: "You do not have follow-up access to this client.",
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

    await createAuditLog({
      actionType: "client.followup-updated",
      entityType: "client",
      entityId: client.id,
      ...getActorDetails(request),
      beforeData: previousClient || {},
      afterData: client,
    });

    await recordTimeline(request, {
      entityType: "client",
      entityId: client.id,
      entityLabel: client.companyName,
      eventType: "client.follow-up-updated",
      title: "Client follow-up updated",
      summary: followUpNotes || `Follow-up moved to ${followUpStatus}.`,
      beforeData: previousClient || {},
      afterData: client,
    });

    response.json(client);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update client follow-up.",
    });
  }
});

app.put("/admin/clients/bulk-follow-up", requireAdmin, async (request, response) => {
  try {
    const { clientIds, followUpStatus, nextFollowUpDate, lastFollowUpDate, followUpNotes } =
      request.body ?? {};

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return response.status(400).json({ message: "Please select at least one lead." });
    }

    if (!followUpStatus) {
      return response.status(400).json({ message: "Follow-up status is required." });
    }

    const updatedClients = [];

    for (const clientId of clientIds) {
      const previousClient = await getClientById(clientId);
      if (!previousClient) {
        continue;
      }

      const client = await updateClientFollowUp(clientId, {
        followUpStatus,
        nextFollowUpDate,
        lastFollowUpDate,
        followUpNotes,
        actorEmployeeId: null,
        actorName: request.user?.name || "Werkly User",
        actorRole: request.user?.role || request.user?.type || "internal-user",
      });

      if (!client) {
        continue;
      }

      await createAuditLog({
        actionType: "client.bulk-followup-updated",
        entityType: "client",
        entityId: client.id,
        ...getActorDetails(request),
        beforeData: previousClient,
        afterData: client,
        metadata: {
          bulkAction: "follow-up",
        },
      });

      await recordTimeline(request, {
        entityType: "client",
        entityId: client.id,
        entityLabel: client.companyName,
        eventType: "client.bulk-follow-up-updated",
        title: "Lead follow-up updated",
        summary: followUpNotes || `Lead follow-up moved to ${followUpStatus}.`,
        beforeData: previousClient,
        afterData: client,
        metadata: {
          bulkAction: "follow-up",
        },
      });

      updatedClients.push(client);
    }

    response.json({ clients: updatedClients, updatedCount: updatedClients.length });
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to update lead follow-up details.",
    });
  }
});

app.delete("/admin/clients/:id", requireAdmin, async (request, response) => {
  try {
    const previousClient = await getClientById(request.params.id);
    if (!previousClient) {
      return response.status(404).json({ message: "Client not found." });
    }

    const deleted = await deleteClient(request.params.id);
    if (!deleted) {
      return response.status(404).json({ message: "Client not found." });
    }

    await createAuditLog({
      actionType: "client.deleted",
      entityType: "client",
      entityId: request.params.id,
      ...getActorDetails(request),
      beforeData: previousClient,
      afterData: {},
      metadata: {
        companyName: previousClient.companyName,
      },
    });

    response.json({ success: true });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to delete client.",
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

app.get("/admin/approvals", requireInternalUser, async (request, response) => {
  try {
    const approvals = await listApprovalRequests({
      employeeId: request.user?.type === "employee" ? request.user.id : null,
      isAdmin: request.user?.type === "admin",
      requestStatus: request.query.status || null,
      requestType: request.query.requestType || null,
      entityType: request.query.entityType || null,
    });
    response.json({ approvals });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load approvals.",
    });
  }
});

app.post("/admin/approvals", requireInternalUser, async (request, response) => {
  try {
    const { requestType, entityType, entityId, entityLabel, effectiveFromDate, effectiveToDate, reason, remarks, beforeData, requestedData, metadata } =
      request.body ?? {};

    if (!requestType || !entityType || !entityId) {
      return response.status(400).json({
        message: "Request type, entity type, and entity id are required.",
      });
    }

    const approval = await createApprovalRequest({
      requestType,
      entityType,
      entityId,
      entityLabel,
      requestedByEmployeeId: request.user?.type === "employee" ? request.user.id : null,
      effectiveFromDate,
      effectiveToDate,
      reason,
      remarks,
      beforeData,
      requestedData,
      metadata,
    });

    await recordTimeline(request, {
      entityType: "approval-request",
      entityId: approval.id,
      entityLabel: approval.entityLabel || approval.requestType,
      eventType: "approval-request.created",
      title: "Approval request created",
      summary: approval.reason || "A new approval request was raised.",
      beforeData: {},
      afterData: approval,
    });

    await notifyApprovalLifecycle(approval, "created");

    response.status(201).json(approval);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create approval request.",
    });
  }
});

app.put("/admin/approvals/:id", requireAdmin, async (request, response) => {
  try {
    const { requestStatus, reviewedData } = request.body ?? {};

    if (!["approved", "rejected", "cancelled"].includes(requestStatus)) {
      return response.status(400).json({
        message: "Invalid approval status.",
      });
    }

    const approval = await reviewApprovalRequest(request.params.id, {
      requestStatus,
      reviewedData,
      reviewedByEmployeeId: null,
    });

    if (!approval) {
      return response.status(404).json({ message: "Approval request not found." });
    }

    const appliedEntity = await applyApprovedWorkflowAction(request, approval);

    await recordTimeline(request, {
      entityType: "approval-request",
      entityId: approval.id,
      entityLabel: approval.entityLabel || approval.requestType,
      eventType: "approval-request.reviewed",
      title: "Approval request reviewed",
      summary: `Approval request marked as ${requestStatus}.`,
      beforeData: {},
      afterData: approval,
      metadata: {
        appliedEntityId: appliedEntity?.id || null,
      },
    });

    await notifyApprovalLifecycle(approval, "reviewed");

    response.json(approval);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to review approval request.",
    });
  }
});

app.post("/admin/workflows/run-sla", requireAdmin, async (_request, response) => {
  try {
    await runSlaEscalations();
    response.json({ success: true });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to run reminder workflow.",
    });
  }
});

app.get("/admin/timeline", requireInternalUser, async (request, response) => {
  try {
    const timeline = await listTimelineEvents({
      entityType: request.query.entityType || null,
      entityId: request.query.entityId || null,
      actorId: request.query.actorId || null,
      limit: request.query.limit || 80,
    });
    response.json({ timeline });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load timeline.",
    });
  }
});

app.get("/admin/saved-views", requireInternalUser, async (request, response) => {
  try {
    const views = await listSavedViews({
      moduleKey: request.query.moduleKey || null,
      ownerEmployeeId: request.user?.type === "employee" ? request.user.id : null,
      isAdmin: request.user?.type === "admin",
      includeAll: request.query.scope === "all",
    });
    response.json({ views });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load saved views.",
    });
  }
});

app.post("/admin/saved-views", requireInternalUser, async (request, response) => {
  try {
    const { id, moduleKey, viewKey, viewName, ownerType, roleKey, isShared, filters, columns } =
      request.body ?? {};

    if (!moduleKey || !viewKey || !viewName) {
      return response.status(400).json({
        message: "Module, view key, and view name are required.",
      });
    }

    const view = await upsertSavedView({
      id,
      moduleKey,
      viewKey,
      viewName,
      ownerType: request.user?.type === "admin" ? ownerType || "admin" : "employee",
      ownerEmployeeId: request.user?.type === "employee" ? request.user.id : null,
      roleKey,
      isShared,
      filters,
      columns,
    });

    response.status(id ? 200 : 201).json(view);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to save current view.",
    });
  }
});

app.delete("/admin/saved-views/:id", requireInternalUser, async (request, response) => {
  try {
    const deleted = await deleteSavedView(
      request.params.id,
      request.user?.type === "employee" ? request.user.id : null,
      request.user?.type === "admin"
    );

    if (!deleted) {
      return response.status(404).json({ message: "Saved view not found." });
    }

    response.json({ success: true });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to delete saved view.",
    });
  }
});

app.get("/admin/sla-rules", requireAdmin, async (_request, response) => {
  try {
    const rules = await listSlaRules();
    response.json({ rules });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load SLA rules.",
    });
  }
});

app.put("/admin/sla-rules", requireAdmin, async (request, response) => {
  try {
    const rules = Array.isArray(request.body?.rules) ? request.body.rules : [];
    const updatedRules = await updateSlaRules(rules);
    response.json({ rules: updatedRules });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update SLA rules.",
    });
  }
});

app.get("/admin/notifications", requireInternalUser, async (request, response) => {
  try {
    try {
      await runSlaEscalations();
    } catch (workflowError) {
      console.error("Notification SLA refresh failed:", workflowError);
    }
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
      notificationKey,
      actionUrl,
      entityType,
      entityId,
      metadata,
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
      notificationKey,
      actionUrl,
      entityType,
      entityId,
      metadata,
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

    const {
      clientId,
      requestedToEmployeeId,
      assignmentType,
      effectiveFromDate,
      effectiveToDate,
      reason,
    } = request.body ?? {};
    if (!clientId || !requestedToEmployeeId || !effectiveFromDate) {
      return response.status(400).json({
        message: "Client, target employee, and effective from date are required.",
      });
    }
    if (
      (assignmentType || "ownership-transfer") !== "ownership-transfer" &&
      !effectiveToDate
    ) {
      return response.status(400).json({
        message: "Effective to date is required for temporary client access.",
      });
    }

    const transferRequest = await createClientTransferRequest({
      clientId,
      requestedByEmployeeId: request.user.id,
      requestedToEmployeeId,
      effectiveFromDate,
      reason,
    });

    await createApprovalRequest({
      requestType: "client-transfer",
      entityType: "client",
      entityId: clientId,
      entityLabel: transferRequest.clientName,
      requestedByEmployeeId: request.user.id,
      effectiveFromDate,
      reason,
      beforeData: {},
      requestedData: {
        requestedToEmployeeId,
        assignmentType: assignmentType || "ownership-transfer",
        effectiveFromDate,
        effectiveToDate,
      },
      metadata: {
        legacyTransferRequestId: transferRequest.id,
        assignmentType: assignmentType || "ownership-transfer",
        effectiveToDate: effectiveToDate || null,
      },
    });

    await recordTimeline(request, {
      entityType: "client",
      entityId: clientId,
      entityLabel: transferRequest.clientName,
      eventType: "client.transfer-request-created",
      title: "Client transfer requested",
      summary: reason || "Client transfer request raised for approval.",
      beforeData: {},
      afterData: transferRequest,
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

    await createAuditLog({
      actionType: "client.transfer-request-reviewed",
      entityType: "client-transfer-request",
      entityId: reviewed.id,
      ...getActorDetails(request),
      beforeData: {},
      afterData: reviewed,
      metadata: {
        status,
      },
    });

    await reviewPendingApprovalByEntity("client", reviewed.clientId, "client-transfer", {
      requestStatus: status,
      reviewedData: reviewed,
      reviewedByEmployeeId: null,
    });

    await recordTimeline(request, {
      entityType: "client",
      entityId: reviewed.clientId,
      entityLabel: reviewed.clientName,
      eventType: "client.transfer-request-reviewed",
      title: "Client transfer reviewed",
      summary: adminNote || `Client transfer request marked ${status}.`,
      beforeData: {},
      afterData: reviewed,
      metadata: {
        status,
      },
    });

    response.json(reviewed);
  } catch (error) {
    response.status(500).json({
      message:
        error instanceof Error ? error.message : "Unable to review client transfer request.",
    });
  }
});

app.post("/admin/jobs", requirePermission("jobs.manage"), async (request, response) => {
  try {
    if (request.user?.type === "employee" && request.body?.clientId) {
      const client = await getClientById(request.body.clientId);
      if (
        !client ||
        !canManageClientWork(request.user, { type: "client", ...client })
      ) {
        return response.status(403).json({
          message: "You do not have full access to create jobs for this client.",
        });
      }
    }
    const job = await createJob(request.body);

    await createAuditLog({
      actionType: "job.created",
      entityType: "job",
      entityId: job.id,
      ...getActorDetails(request),
      beforeData: {},
      afterData: job,
    });

    await recordTimeline(request, {
      entityType: "job",
      entityId: job.id,
      entityLabel: job.title,
      eventType: "job.created",
      title: "Job created",
      summary: `${job.title} was added to the CRM.`,
      beforeData: {},
      afterData: job,
    });

    response.status(201).json(job);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to create job.",
    });
  }
});

app.put("/admin/jobs/:id", requirePermission("jobs.manage"), async (request, response) => {
  try {
    const previousJob = await getAdminJobById(request.params.id);
    if (
      request.user?.type === "employee" &&
      previousJob?.clientId
    ) {
      const client = await getClientById(previousJob.clientId);
      if (
        !client ||
        !canManageClientWork(request.user, { type: "client", ...client })
      ) {
        return response.status(403).json({
          message: "You do not have full access to update jobs for this client.",
        });
      }
    }
    const job = await updateJob(request.params.id, request.body);

    if (!job) {
      return response.status(404).json({ message: "Job not found." });
    }

    await createAuditLog({
      actionType: "job.updated",
      entityType: "job",
      entityId: job.id,
      ...getActorDetails(request),
      beforeData: previousJob || {},
      afterData: job,
    });

    await recordTimeline(request, {
      entityType: "job",
      entityId: job.id,
      entityLabel: job.title,
      eventType: "job.updated",
      title: "Job updated",
      summary: `${job.title} details were updated.`,
      beforeData: previousJob || {},
      afterData: job,
    });

    response.json(job);
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to update job.",
    });
  }
});

app.post("/admin/jobs/merge", requireAdmin, async (request, response) => {
  try {
    const primaryJobCode = String(request.body?.primaryJobCode || "").trim();
    const duplicateJobCode = String(request.body?.duplicateJobCode || "").trim();

    if (!primaryJobCode || !duplicateJobCode || primaryJobCode === duplicateJobCode) {
      return response.status(400).json({
        message: "Primary and duplicate job codes are required.",
      });
    }

    const merged = await mergeJobsByCode(primaryJobCode, duplicateJobCode);

    if (!merged?.job) {
      return response.status(404).json({
        message: "One or both job codes were not found.",
      });
    }

    await createAuditLog({
      actionType: "job.merged",
      entityType: "job",
      entityId: merged.job.id,
      ...getActorDetails(request),
      beforeData: {
        duplicateJob: merged.mergedFrom,
      },
      afterData: merged.job,
      metadata: {
        primaryJobCode,
        duplicateJobCode,
        movedApplicationsCount: merged.movedApplicationsCount,
      },
    });

    await recordTimeline(request, {
      entityType: "job",
      entityId: merged.job.id,
      entityLabel: merged.job.title,
      eventType: "job.merged",
      title: "Duplicate job merged",
      summary: `${duplicateJobCode} was merged into ${primaryJobCode}.`,
      beforeData: {
        duplicateJob: merged.mergedFrom,
      },
      afterData: merged.job,
      metadata: {
        primaryJobCode,
        duplicateJobCode,
        movedApplicationsCount: merged.movedApplicationsCount,
      },
    });

    response.json({ success: true, ...merged });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to merge jobs.",
    });
  }
});

app.delete("/admin/jobs/:id", requireAdmin, async (request, response) => {
  try {
    const previousJob = await getAdminJobById(request.params.id);
    if (!previousJob) {
      return response.status(404).json({ message: "Job not found." });
    }

    const deleted = await deleteJob(request.params.id);
    if (!deleted) {
      return response.status(404).json({ message: "Job not found." });
    }

    await createAuditLog({
      actionType: "job.deleted",
      entityType: "job",
      entityId: request.params.id,
      ...getActorDetails(request),
      beforeData: previousJob,
      afterData: {},
      metadata: {
        jobTitle: previousJob.title,
        jobCode: previousJob.jobCode,
      },
    });

    response.json({ success: true });
  } catch (error) {
    response.status(500).json({
      message: error instanceof Error ? error.message : "Unable to delete job.",
    });
  }
});

ensureCrmSchema()
  .then(() => ensureJobsSchema())
  .then(async () => {
    const merged = await mergeJobsByCode("26050011", "26050013");
    if (merged?.job) {
      console.log(
        `Merged duplicate job 26050013 into 26050011; moved ${merged.movedApplicationsCount} applications.`
      );
    }
  })
  .then(() => ensureAuthAuditSchema())
  .then(() => ensureLeaveSchema())
  .then(() => ensureShiftSchema())
  .then(() => ensureWorkflowSchema())
  .then(() => ensureMeetingsSchema())
  .then(() => ensureCalendarSchema())
  .then(() => {
    app.listen(port, () => {
      console.log(`Werkly Railway backend listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize jobs schema", error);
    process.exit(1);
  });

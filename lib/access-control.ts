export type CrmAccessRoleKey = "recruiter" | "delivery" | "leadership";
export type CrmModuleAccessKey =
  | "dashboard"
  | "hr"
  | "jobs"
  | "candidates"
  | "clients"
  | "reports"
  | "settings"
  | "activity-center";
export type CrmFieldAccessKey =
  | "dashboard.summaryCards"
  | "dashboard.followUpCalendar"
  | "dashboard.alertWidgets"
  | "hr.manageEmployees"
  | "hr.employeeDates"
  | "hr.resetPassword"
  | "hr.markInactive"
  | "jobs.createEdit"
  | "jobs.assignment"
  | "jobs.compensation"
  | "jobs.hideToggle"
  | "jobs.addCandidate"
  | "candidates.updateStage"
  | "candidates.transfer"
  | "candidates.resume"
  | "candidates.compensation"
  | "clients.onboarding"
  | "clients.communicationAddress"
  | "clients.transfer"
  | "clients.followUp"
  | "clients.agreement"
  | "reports.download"
  | "settings.kpi"
  | "settings.notifications"
  | "settings.accessControl"
  | "settings.activityCenter"
  | "activity-center.auditLogs"
  | "activity-center.notifications"
  | "activity-center.transfers";

export type CrmRoleAccessConfig = {
  modules: Record<CrmModuleAccessKey, boolean>;
  fields: Record<CrmFieldAccessKey, boolean>;
};

export type CrmAccessControlMatrix = Record<CrmAccessRoleKey, CrmRoleAccessConfig>;

export type CrmEmployeeAccessOverride = {
  employeeId?: string;
  employeeCode?: string;
  email?: string;
  employeeName?: string;
  role?: string;
  modules?: Partial<Record<CrmModuleAccessKey, boolean>>;
  fields?: Partial<Record<CrmFieldAccessKey, boolean>>;
};

export const crmModuleAccessDefinitions: Array<{
  key: CrmModuleAccessKey;
  label: string;
  description: string;
}> = [
  { key: "dashboard", label: "Dashboard", description: "Home dashboard and summary cards." },
  { key: "hr", label: "HR", description: "Employees, leave, and HR work areas." },
  { key: "jobs", label: "Jobs", description: "Job creation, existing jobs, and mandate work." },
  {
    key: "candidates",
    label: "Candidates",
    description: "Applicants, enquiries, and pipeline work.",
  },
  { key: "clients", label: "Clients", description: "Client onboarding and assigned accounts." },
  { key: "reports", label: "Reports", description: "Report pages across modules." },
  { key: "activity-center", label: "Activity Center", description: "Audit and CRM activity hub." },
  { key: "settings", label: "Settings", description: "CRM settings page." },
];

export const crmFieldAccessDefinitions: Array<{
  key: CrmFieldAccessKey;
  label: string;
  description: string;
}> = [
  {
    key: "dashboard.summaryCards",
    label: "Dashboard summary cards",
    description: "Show KPI cards, work counts, and dashboard summary tiles.",
  },
  {
    key: "dashboard.followUpCalendar",
    label: "Follow-up calendar",
    description: "Show follow-up calendar, date popup, and schedule views on dashboard.",
  },
  {
    key: "dashboard.alertWidgets",
    label: "Dashboard alerts",
    description: "Show upcoming follow-ups, overdue alerts, and productivity widgets.",
  },
  {
    key: "hr.manageEmployees",
    label: "Employee create/edit",
    description: "Show employee creation and edit controls.",
  },
  {
    key: "hr.employeeDates",
    label: "DOB and DOJ fields",
    description: "Show date of birth and date of joining fields.",
  },
  {
    key: "hr.resetPassword",
    label: "Reset password",
    description: "Show reset password actions in employee screens.",
  },
  {
    key: "hr.markInactive",
    label: "Inactive controls",
    description: "Show inactivate and inactive-date controls.",
  },
  {
    key: "jobs.createEdit",
    label: "Job create/edit",
    description: "Show new job and edit job controls.",
  },
  {
    key: "jobs.assignment",
    label: "Job assignment fields",
    description: "Show client and recruiter assignment fields.",
  },
  {
    key: "jobs.compensation",
    label: "Job compensation fields",
    description: "Show salary and package fields in job forms.",
  },
  {
    key: "jobs.hideToggle",
    label: "Hide or unhide jobs",
    description: "Show job hide and unhide actions.",
  },
  {
    key: "jobs.addCandidate",
    label: "Add candidate",
    description: "Show manual candidate add actions against jobs.",
  },
  {
    key: "candidates.updateStage",
    label: "Update stage",
    description: "Show candidate stage update controls.",
  },
  {
    key: "candidates.transfer",
    label: "Transfer candidate",
    description: "Show candidate transfer actions.",
  },
  {
    key: "candidates.resume",
    label: "Resume visibility",
    description: "Show resume details and resume-view controls.",
  },
  {
    key: "candidates.compensation",
    label: "Candidate CTC fields",
    description: "Show current and expected CTC fields.",
  },
  {
    key: "clients.onboarding",
    label: "Client onboarding",
    description: "Show new client onboarding forms and actions.",
  },
  {
    key: "clients.communicationAddress",
    label: "Communication address",
    description: "Show communication address in client forms.",
  },
  {
    key: "clients.transfer",
    label: "Client transfer",
    description: "Show transfer client actions.",
  },
  {
    key: "clients.followUp",
    label: "Client follow-up",
    description: "Show client follow-up controls.",
  },
  {
    key: "clients.agreement",
    label: "Agreement upload",
    description: "Show agreement upload and agreement details.",
  },
  {
    key: "reports.download",
    label: "Download reports",
    description: "Show export and download controls on report screens.",
  },
  {
    key: "settings.kpi",
    label: "KPI settings",
    description: "Show productivity target settings and KPI target controls.",
  },
  {
    key: "settings.notifications",
    label: "Notification settings",
    description: "Show browser, email, and WhatsApp reminder setting controls.",
  },
  {
    key: "settings.accessControl",
    label: "Access control settings",
    description: "Show module access, field access, and employee override controls.",
  },
  {
    key: "settings.activityCenter",
    label: "Activity center settings access",
    description: "Show activity center entry inside the settings area.",
  },
  {
    key: "activity-center.auditLogs",
    label: "Audit log feed",
    description: "Show audit trail items and admin activity records.",
  },
  {
    key: "activity-center.notifications",
    label: "Notification activity",
    description: "Show CRM notifications and follow-up reminder feed items.",
  },
  {
    key: "activity-center.transfers",
    label: "Transfer activity",
    description: "Show candidate and client transfer activity records.",
  },
];

function buildModuleMap(overrides: Partial<Record<CrmModuleAccessKey, boolean>> = {}) {
  return crmModuleAccessDefinitions.reduce(
    (result, definition) => {
      result[definition.key] = overrides[definition.key] ?? true;
      return result;
    },
    {} as Record<CrmModuleAccessKey, boolean>
  );
}

function buildFieldMap(overrides: Partial<Record<CrmFieldAccessKey, boolean>> = {}) {
  return crmFieldAccessDefinitions.reduce(
    (result, definition) => {
      result[definition.key] = overrides[definition.key] ?? true;
      return result;
    },
    {} as Record<CrmFieldAccessKey, boolean>
  );
}

export const defaultCrmAccessControl: CrmAccessControlMatrix = {
  recruiter: {
    modules: buildModuleMap({
      settings: false,
    }),
    fields: buildFieldMap({
      "settings.kpi": false,
      "settings.notifications": false,
      "settings.accessControl": false,
      "settings.activityCenter": false,
      "hr.manageEmployees": false,
      "hr.resetPassword": false,
      "hr.markInactive": false,
    }),
  },
  delivery: {
    modules: buildModuleMap({
      settings: false,
    }),
    fields: buildFieldMap({
      "settings.kpi": false,
      "settings.notifications": false,
      "settings.accessControl": false,
      "settings.activityCenter": false,
      "hr.manageEmployees": false,
      "hr.resetPassword": false,
      "hr.markInactive": false,
    }),
  },
  leadership: {
    modules: buildModuleMap({
      settings: false,
    }),
    fields: buildFieldMap(),
  },
};

export function normalizeCrmRoleKey(role?: string, authType = "employee"): CrmAccessRoleKey {
  if (authType === "admin") {
    return "leadership";
  }

  const normalizedRole = String(role || "").trim().toLowerCase();
  if (
    normalizedRole.includes("founder") ||
    normalizedRole.includes("cto") ||
    normalizedRole.includes("lead")
  ) {
    return "leadership";
  }
  if (normalizedRole.includes("delivery")) {
    return "delivery";
  }

  return "recruiter";
}

export function mergeCrmAccessControl(
  accessControl?: Partial<Record<CrmAccessRoleKey, Partial<CrmRoleAccessConfig>>>
): CrmAccessControlMatrix {
  return {
    recruiter: {
      modules: {
        ...defaultCrmAccessControl.recruiter.modules,
        ...(accessControl?.recruiter?.modules ?? {}),
      },
      fields: {
        ...defaultCrmAccessControl.recruiter.fields,
        ...(accessControl?.recruiter?.fields ?? {}),
      },
    },
    delivery: {
      modules: {
        ...defaultCrmAccessControl.delivery.modules,
        ...(accessControl?.delivery?.modules ?? {}),
      },
      fields: {
        ...defaultCrmAccessControl.delivery.fields,
        ...(accessControl?.delivery?.fields ?? {}),
      },
    },
    leadership: {
      modules: {
        ...defaultCrmAccessControl.leadership.modules,
        ...(accessControl?.leadership?.modules ?? {}),
      },
      fields: {
        ...defaultCrmAccessControl.leadership.fields,
        ...(accessControl?.leadership?.fields ?? {}),
      },
    },
  };
}

export function getCrmRoleAccess(
  authType: string,
  authRole: string,
  accessControl?: Partial<Record<CrmAccessRoleKey, Partial<CrmRoleAccessConfig>>>
) {
  if (authType === "admin" || String(authRole).trim().toLowerCase() === "super-admin") {
    return {
      modules: buildModuleMap(),
      fields: buildFieldMap(),
    };
  }

  const matrix = mergeCrmAccessControl(accessControl);
  return matrix[normalizeCrmRoleKey(authRole, authType)];
}

export function normalizeEmployeeAccessOverrides(
  overrides?: CrmEmployeeAccessOverride[]
): CrmEmployeeAccessOverride[] {
  if (!Array.isArray(overrides)) {
    return [];
  }

  return overrides
    .map((override) => ({
      employeeId: String(override.employeeId ?? "").trim() || undefined,
      employeeCode: String(override.employeeCode ?? "").trim() || undefined,
      email: String(override.email ?? "").trim().toLowerCase() || undefined,
      employeeName: String(override.employeeName ?? "").trim() || undefined,
      role: String(override.role ?? "").trim() || undefined,
      modules: override.modules ?? {},
      fields: override.fields ?? {},
    }))
    .filter((override) => override.employeeId || override.employeeCode || override.email);
}

export function findEmployeeAccessOverride(
  overrides: CrmEmployeeAccessOverride[] | undefined,
  authEmployeeCode?: string,
  authEmail?: string
) {
  const normalizedCode = String(authEmployeeCode ?? "").trim().toLowerCase();
  const normalizedEmail = String(authEmail ?? "").trim().toLowerCase();

  return normalizeEmployeeAccessOverrides(overrides).find((override) => {
    if (override.employeeCode && normalizedCode) {
      return override.employeeCode.toLowerCase() === normalizedCode;
    }
    if (override.email && normalizedEmail) {
      return override.email.toLowerCase() === normalizedEmail;
    }

    return false;
  });
}

export function getCrmEffectiveAccess(
  authType: string,
  authRole: string,
  authEmployeeCode?: string,
  authEmail?: string,
  accessControl?: Partial<Record<CrmAccessRoleKey, Partial<CrmRoleAccessConfig>>>,
  employeeAccessOverrides?: CrmEmployeeAccessOverride[]
) {
  const roleAccess = getCrmRoleAccess(authType, authRole, accessControl);
  const override = findEmployeeAccessOverride(employeeAccessOverrides, authEmployeeCode, authEmail);

  if (!override || authType === "admin" || String(authRole).trim().toLowerCase() === "super-admin") {
    return roleAccess;
  }

  return {
    modules: {
      ...roleAccess.modules,
      ...(override.modules ?? {}),
    },
    fields: {
      ...roleAccess.fields,
      ...(override.fields ?? {}),
    },
  };
}

export function canAccessCrmModule(
  authType: string,
  authRole: string,
  moduleKey: CrmModuleAccessKey,
  accessControl?: Partial<Record<CrmAccessRoleKey, Partial<CrmRoleAccessConfig>>>
) {
  return getCrmRoleAccess(authType, authRole, accessControl).modules[moduleKey];
}

export function canAccessCrmField(
  authType: string,
  authRole: string,
  fieldKey: CrmFieldAccessKey,
  accessControl?: Partial<Record<CrmAccessRoleKey, Partial<CrmRoleAccessConfig>>>
) {
  return getCrmRoleAccess(authType, authRole, accessControl).fields[fieldKey];
}

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
  | "reports.download";

export type CrmRoleAccessConfig = {
  modules: Record<CrmModuleAccessKey, boolean>;
  fields: Record<CrmFieldAccessKey, boolean>;
};

export type CrmAccessControlMatrix = Record<CrmAccessRoleKey, CrmRoleAccessConfig>;

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

const ROLE_PERMISSIONS = {
  "super-admin": ["*"],
  leadership: [
    "dashboard.view",
    "reports.view",
    "jobs.view",
    "jobs.manage",
    "candidates.view",
    "candidates.manage",
    "clients.view",
    "clients.manage",
    "clients.followup",
    "audit.view",
  ],
  recruiter: [
    "dashboard.view",
    "reports.view",
    "jobs.view",
    "jobs.manage",
    "candidates.view",
    "candidates.manage",
    "clients.view",
    "clients.followup",
    "audit.view",
  ],
  delivery: [
    "dashboard.view",
    "reports.view",
    "jobs.view",
    "candidates.view",
    "clients.view",
    "clients.followup",
    "audit.view",
  ],
};

export function normalizeRoleKey(role, userType = "employee") {
  if (userType === "admin") {
    return "super-admin";
  }

  const normalizedRole = String(role || "").trim().toLowerCase();

  if (!normalizedRole) {
    return "recruiter";
  }
  if (
    normalizedRole.includes("super admin") ||
    normalizedRole.includes("super-admin") ||
    normalizedRole.includes("admin")
  ) {
    return "super-admin";
  }
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

export function buildEmployeeScope(user) {
  const roleKey = normalizeRoleKey(user?.role, user?.type);
  const isAdmin = roleKey === "super-admin";

  return {
    roleKey,
    isAdmin,
    userType: user?.type || "employee",
    employeeId: user?.type === "employee" ? user.id || null : null,
    employeeCode: user?.employeeCode || null,
    email: user?.email || null,
    name: user?.name || null,
    rawRole: user?.role || null,
  };
}

export function hasPermission(user, permission) {
  const { roleKey, isAdmin } = buildEmployeeScope(user);

  if (isAdmin) {
    return true;
  }

  const allowedPermissions = ROLE_PERMISSIONS[roleKey] || [];
  return allowedPermissions.includes("*") || allowedPermissions.includes(permission);
}

export function canAccessEntity(user, entity) {
  const scope = buildEmployeeScope(user);

  if (scope.isAdmin) {
    return true;
  }

  if (!scope.employeeId || !entity?.type) {
    return false;
  }

  const ownerIds = [
    entity.assignedEmployeeId,
    entity.followUpEmployeeId,
    entity.clientAssignedEmployeeId,
    entity.clientFollowUpEmployeeId,
    entity.recruiterId,
    entity.uploadedByEmployeeId,
  ].filter(Boolean);

  const emailMatches =
    Boolean(scope.email) &&
    [entity.recruiterEmail, entity.ownerEmail, entity.employeeEmail]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === String(scope.email).toLowerCase());

  return ownerIds.includes(scope.employeeId) || emailMatches;
}

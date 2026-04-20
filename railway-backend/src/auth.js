import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { buildEmployeeScope, hasPermission } from "./permissions.js";

function getAdminEmail() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) {
    throw new Error("ADMIN_EMAIL is required.");
  }
  return email;
}

function getPasswordHash() {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    throw new Error("ADMIN_PASSWORD_HASH is required.");
  }
  return hash;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required.");
  }
  return secret;
}

export async function validateAdmin(email, password) {
  const isEmailValid = email === getAdminEmail();
  const isPasswordValid = await bcrypt.compare(password, getPasswordHash());
  return isEmailValid && isPasswordValid;
}

function createAuthToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "12h",
  });
}

export function createAdminToken(email, sessionId) {
  return createAuthToken({
    type: "admin",
    role: "super-admin",
    email,
    name: "Werkly Super Admin",
    sessionId,
    mustChangePassword: false,
  });
}

export function createEmployeeToken(employee, sessionId = employee.sessionId) {
  return createAuthToken({
    type: "employee",
    id: employee.id,
    role: employee.role,
    name: employee.fullName,
    email: employee.email,
    employeeCode: employee.employeeCode,
    sessionId,
    mustChangePassword: Boolean(employee.mustChangePassword),
  });
}

function authenticateInternalUser(request, response, next, options = {}) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return response.status(401).json({ message: "Login token is required." });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, getJwtSecret());
    if (
      decoded.type === "employee" &&
      decoded.mustChangePassword &&
      !options.allowPasswordChangeRequired
    ) {
      return response.status(403).json({
        message: "Password change is required before accessing this page.",
        requiresPasswordChange: true,
      });
    }

    request.user = decoded;
    next();
  } catch {
    return response.status(401).json({ message: "Invalid or expired token." });
  }
}

export function requireInternalUser(request, response, next) {
  return authenticateInternalUser(request, response, next);
}

export function requirePasswordChangeEligibleUser(request, response, next) {
  return authenticateInternalUser(request, response, next, {
    allowPasswordChangeRequired: true,
  });
}

export function requireAdmin(request, response, next) {
  return authenticateInternalUser(request, response, () => {
    if (!buildEmployeeScope(request.user).isAdmin) {
      return response.status(403).json({ message: "Admin access is required." });
    }

    next();
  });
}

export function requirePermission(permission) {
  return (request, response, next) =>
    authenticateInternalUser(request, response, () => {
      if (!hasPermission(request.user, permission)) {
        return response.status(403).json({
          message: `Permission denied for ${permission}.`,
        });
      }

      next();
    });
}

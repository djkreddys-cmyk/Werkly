import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

export function createAdminToken(email) {
  return jwt.sign({ email, role: "admin" }, getJwtSecret(), {
    expiresIn: "12h",
  });
}

export function requireAdmin(request, response, next) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return response.status(401).json({ message: "Admin token is required." });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, getJwtSecret());
    request.admin = decoded;
    next();
  } catch {
    return response.status(401).json({ message: "Invalid or expired token." });
  }
}

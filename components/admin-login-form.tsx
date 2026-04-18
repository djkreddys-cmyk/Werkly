"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldClassName =
  "w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]";

type LoginUser = {
  type: "admin" | "employee";
  name: string;
  email?: string;
  employeeCode?: string;
  role: string;
};

type LoginResponse = {
  token?: string;
  message?: string;
  requiresPasswordChange?: boolean;
  user?: LoginUser;
};

export function AdminLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingPasswordChangeToken, setPendingPasswordChangeToken] = useState("");
  const [pendingUserLabel, setPendingUserLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function persistSession(token: string, user: LoginUser) {
    window.localStorage.setItem("werklyAdminToken", token);
    window.localStorage.setItem(
      "werklyAdminEmail",
      user.employeeCode ?? user.email ?? identifier
    );
    window.localStorage.setItem("werklyAuthType", user.type);
    window.localStorage.setItem("werklyAuthName", user.name);
    window.localStorage.setItem("werklyAuthRole", user.role);

    if (user.employeeCode) {
      window.localStorage.setItem("werklyEmployeeCode", user.employeeCode);
    } else {
      window.localStorage.removeItem("werklyEmployeeCode");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const result = (await response.json()) as LoginResponse;

      if (!response.ok || !result.token || !result.user) {
        throw new Error(result.message || "Login failed.");
      }

      if (result.requiresPasswordChange) {
        setPendingPasswordChangeToken(result.token);
        setPendingUserLabel(result.user.employeeCode ?? result.user.name);
        setNewPassword("");
        setConfirmPassword("");
        return;
      }

      persistSession(result.token, result.user);
      router.push("/admin/jobs");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Login failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pendingPasswordChangeToken) {
      setError("Please sign in again to continue.");
      return;
    }

    if (newPassword.trim().length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password must match.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pendingPasswordChangeToken}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      const result = (await response.json()) as LoginResponse;

      if (!response.ok || !result.token || !result.user) {
        throw new Error(result.message || "Unable to change password.");
      }

      persistSession(result.token, result.user);
      setPendingPasswordChangeToken("");
      router.push("/admin/jobs");
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to change password."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (pendingPasswordChangeToken) {
    return (
      <form className="accent-card mx-auto max-w-xl p-8 sm:p-9" onSubmit={handlePasswordChange}>
        <p className="eyebrow">Password Reset Required</p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">
          Change your password to continue.
        </h1>
        <p className="muted-copy mt-4 text-base leading-7">
          First-time login detected for {pendingUserLabel || "this employee account"}.
          Set a new password once, then continue into Werkly CRM.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--color-ink)]">
              New password
            </span>
            <input
              className={fieldClassName}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Create a new password"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--color-ink)]">
              Confirm password
            </span>
            <input
              className={fieldClassName}
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter the new password"
              required
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Updating..." : "Save New Password"}
        </button>
      </form>
    );
  }

  return (
    <form className="accent-card mx-auto max-w-xl p-8 sm:p-9" onSubmit={handleSubmit}>
      <p className="eyebrow">Employee Login</p>
      <h1 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">
        Sign in to access Werkly CRM.
      </h1>
      <p className="muted-copy mt-4 text-base leading-7">
        Use your employee code and password to sign in. Admins can still log in with
        their email and password.
      </p>

      <div className="mt-8 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--color-ink)]">
            Employee code or admin email
          </span>
          <input
            className={fieldClassName}
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="2604001 or admin@werkly.in"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--color-ink)]">Password</span>
          <input
            className={fieldClassName}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

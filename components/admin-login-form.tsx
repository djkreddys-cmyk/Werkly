"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldClassName =
  "w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]";

const passwordFieldClassName = `${fieldClassName} pr-12`;

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <path
          d="M2.5 10C3.88 7.14 6.67 5.25 10 5.25C13.33 5.25 16.12 7.14 17.5 10C16.12 12.86 13.33 14.75 10 14.75C6.67 14.75 3.88 12.86 2.5 10Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M3 3L17 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8.67 5.52C9.1 5.34 9.54 5.25 10 5.25C13.33 5.25 16.12 7.14 17.5 10C16.96 11.13 16.2 12.11 15.27 12.91M12.12 12.12C11.54 12.54 10.8 12.75 10 12.75C8.07 12.75 6.5 11.18 6.5 9.25C6.5 8.45 6.71 7.71 7.13 7.13M4.73 7.09C3.8 7.89 3.04 8.87 2.5 10C3.88 12.86 6.67 14.75 10 14.75C10.46 14.75 10.9 14.66 11.33 14.48"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--color-ink)]">{label}</span>
      <div className="relative">
        <input
          className={passwordFieldClassName}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          className="absolute inset-y-0 right-3 inline-flex items-center text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
          aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
        >
          <EyeIcon visible={isVisible} />
        </button>
      </div>
    </label>
  );
}

type LoginUser = {
  type: "admin" | "employee";
  name: string;
  email?: string;
  employeeCode?: string;
  role: string;
};

type LoginResponse = {
  token?: string;
  sessionId?: string;
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

  function getClientContext() {
    const clientTime = new Date();
    return {
      clientTime: clientTime.toISOString(),
      clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      clientUtcOffsetMinutes: -clientTime.getTimezoneOffset(),
    };
  }

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
        body: JSON.stringify({ identifier, password, ...getClientContext() }),
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
      router.push("/admin");
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
      router.push("/admin");
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
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Create a new password"
          />

          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Re-enter the new password"
          />
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

        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
        />
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

"use client";

import { useEffect, useState } from "react";
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

type ForgotPasswordStep = "request" | "verify" | "reset";

export function AdminLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingPasswordChangeToken, setPendingPasswordChangeToken] = useState("");
  const [pendingUserLabel, setPendingUserLabel] = useState("");
  const [forgotPasswordStep, setForgotPasswordStep] = useState<ForgotPasswordStep | null>(null);
  const [forgotPasswordIdentifier, setForgotPasswordIdentifier] = useState("");
  const [forgotPasswordDob, setForgotPasswordDob] = useState("");
  const [forgotPasswordRequestId, setForgotPasswordRequestId] = useState("");
  const [forgotPasswordMaskedEmail, setForgotPasswordMaskedEmail] = useState("");
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState("");
  const [forgotPasswordResetToken, setForgotPasswordResetToken] = useState("");
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

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

  function resetForgotPasswordFlow() {
    setForgotPasswordStep(null);
    setForgotPasswordIdentifier("");
    setForgotPasswordDob("");
    setForgotPasswordRequestId("");
    setForgotPasswordMaskedEmail("");
    setForgotPasswordOtp("");
    setForgotPasswordResetToken("");
    setForgotPasswordMessage("");
    setResendCooldown(0);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  }

  async function submitForgotPasswordRequest() {
    setIsSubmitting(true);
    setError("");
    setForgotPasswordMessage("");

    try {
      const response = await fetch("/api/admin/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: forgotPasswordIdentifier,
          dateOfBirth: forgotPasswordDob,
        }),
      });

      const result = (await response.json()) as {
        requestId?: string;
        maskedEmail?: string;
        resendCooldownSeconds?: number;
        message?: string;
        retryAfterSeconds?: number;
      };

      if (!response.ok || !result.requestId) {
        if (result.retryAfterSeconds) {
          setResendCooldown(result.retryAfterSeconds);
        }
        throw new Error(result.message || "Unable to send OTP.");
      }

      setForgotPasswordRequestId(result.requestId);
      setForgotPasswordMaskedEmail(result.maskedEmail || "");
      setResendCooldown(result.resendCooldownSeconds || 60);
      setForgotPasswordMessage(result.message || "OTP sent to your registered email.");
      setForgotPasswordStep("verify");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to send OTP.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPasswordRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitForgotPasswordRequest();
  }

  async function handleForgotPasswordVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setForgotPasswordMessage("");

    try {
      const response = await fetch("/api/admin/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: forgotPasswordRequestId,
          identifier: forgotPasswordIdentifier,
          dateOfBirth: forgotPasswordDob,
          otp: forgotPasswordOtp,
        }),
      });

      const result = (await response.json()) as {
        resetToken?: string;
        message?: string;
      };

      if (!response.ok || !result.resetToken) {
        throw new Error(result.message || "Unable to verify OTP.");
      }

      setForgotPasswordResetToken(result.resetToken);
      setForgotPasswordMessage(
        result.message || "OTP verified successfully. Set a new password."
      );
      setForgotPasswordStep("reset");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to verify OTP.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
    setForgotPasswordMessage("");

    try {
      const response = await fetch("/api/admin/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken: forgotPasswordResetToken,
          newPassword,
        }),
      });

      const result = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to reset password.");
      }

      resetForgotPasswordFlow();
      setIdentifier(forgotPasswordIdentifier);
      setForgotPasswordMessage("");
      setError("");
      setPassword("");
      setConfirmPassword("");
      setNewPassword("");
      window.alert(result.message || "Password changed successfully. Please sign in.");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to reset password."
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

  if (forgotPasswordStep === "request") {
    return (
      <form className="accent-card mx-auto max-w-xl p-8 sm:p-9" onSubmit={handleForgotPasswordRequest}>
        <p className="eyebrow">Forgot Password</p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">
          Verify employee ID and DOB first.
        </h1>
        <p className="muted-copy mt-4 text-base leading-7">
          Enter your employee code and date of birth. If they match, we will send an OTP to your
          registered email address.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--color-ink)]">Employee code</span>
            <input
              className={fieldClassName}
              type="text"
              value={forgotPasswordIdentifier}
              onChange={(event) => setForgotPasswordIdentifier(event.target.value)}
              placeholder="2604003"
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--color-ink)]">Date of Birth (DOB)</span>
            <input
              className={fieldClassName}
              type="date"
              value={forgotPasswordDob}
              onChange={(event) => setForgotPasswordDob(event.target.value)}
              required
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
        {forgotPasswordMessage ? (
          <p className="mt-4 text-sm font-medium text-[var(--color-dark)]">
            {forgotPasswordMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Sending OTP..." : "Send OTP"}
          </button>
          <button
            type="button"
            onClick={resetForgotPasswordFlow}
            className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
          >
            Back to Sign In
          </button>
        </div>
      </form>
    );
  }

  if (forgotPasswordStep === "verify") {
    return (
      <form className="accent-card mx-auto max-w-xl p-8 sm:p-9" onSubmit={handleForgotPasswordVerify}>
        <p className="eyebrow">OTP Verification</p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">
          Verify the OTP sent to your email.
        </h1>
        <p className="muted-copy mt-4 text-base leading-7">
          We sent a 6-digit OTP to {forgotPasswordMaskedEmail || "your registered email"}.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--color-ink)]">OTP</span>
            <input
              className={fieldClassName}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={forgotPasswordOtp}
              onChange={(event) => setForgotPasswordOtp(event.target.value)}
              placeholder="Enter 6-digit OTP"
              required
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
        {forgotPasswordMessage ? (
          <p className="mt-4 text-sm font-medium text-[var(--color-dark)]">
            {forgotPasswordMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Verifying..." : "Verify OTP"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForgotPasswordStep("request");
              setForgotPasswordOtp("");
              setError("");
            }}
            className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
          >
            Change Details
          </button>
          <button
            type="button"
            onClick={() => void submitForgotPasswordRequest()}
            disabled={isSubmitting || resendCooldown > 0}
            className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
          </button>
        </div>
      </form>
    );
  }

  if (forgotPasswordStep === "reset") {
    return (
      <form className="accent-card mx-auto max-w-xl p-8 sm:p-9" onSubmit={handleForgotPasswordReset}>
        <p className="eyebrow">Set New Password</p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">
          Create your new login password.
        </h1>
        <p className="muted-copy mt-4 text-base leading-7">
          OTP verification is complete. Set a new password for your employee login now.
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
        {forgotPasswordMessage ? (
          <p className="mt-4 text-sm font-medium text-[var(--color-dark)]">
            {forgotPasswordMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>
          <button
            type="button"
            onClick={resetForgotPasswordFlow}
            className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
          >
            Back to Sign In
          </button>
        </div>
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

      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>

        <button
          type="button"
          onClick={() => {
            setForgotPasswordStep("request");
            setForgotPasswordIdentifier(identifier);
            setError("");
            setForgotPasswordMessage("");
          }}
          className="text-sm font-semibold text-[var(--color-dark)] transition hover:text-[var(--color-accent-strong)]"
        >
          Forgot Password?
        </button>
      </div>
    </form>
  );
}

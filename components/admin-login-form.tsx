"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldClassName =
  "w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json()) as { token?: string; message?: string };

      if (!response.ok || !result.token) {
        throw new Error(result.message || "Login failed.");
      }

      window.localStorage.setItem("werklyAdminToken", result.token);
      window.localStorage.setItem("werklyAdminEmail", email);
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

  return (
    <form className="accent-card mx-auto max-w-xl p-8 sm:p-9" onSubmit={handleSubmit}>
      <p className="eyebrow">Admin Access</p>
      <h1 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">
        Sign in to publish and manage jobs.
      </h1>
      <p className="muted-copy mt-4 text-base leading-7">
        Use your Railway-backed admin credentials to access the job posting dashboard.
      </p>

      <div className="mt-8 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--color-ink)]">Email</span>
          <input
            className={fieldClassName}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@werkly.in"
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

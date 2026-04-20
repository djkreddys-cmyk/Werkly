"use client";

import { useEffect, useState } from "react";
import type { CrmKpiSettings } from "@/lib/crm";

const defaultSettings: CrmKpiSettings = {
  recruiterDailyFollowUps: 20,
  recruiterDailyApplications: 12,
  deliveryDailyFollowUps: 18,
  deliveryDailyApplications: 8,
  leadershipDailyFollowUps: 6,
  leadershipDailyApplications: 3,
  enableBrowserNotifications: true,
  enableEmailNotifications: false,
  enableWhatsappNotifications: false,
};

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
      />
    </label>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[1.4rem] border border-[var(--color-line)] bg-white p-4">
      <span>
        <span className="block text-sm font-semibold text-[var(--color-ink)]">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-[var(--color-muted)]">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 accent-[var(--color-dark)]"
      />
    </label>
  );
}

export function AdminSettingsPanel() {
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [authType] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthType") ?? "admin"
      : "admin"
  );
  const [authRole] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthRole") ?? "super-admin"
      : "super-admin"
  );
  const [settings, setSettings] = useState<CrmKpiSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdminView = authType === "admin" || authRole === "super-admin";

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch("/api/admin/settings", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as Partial<CrmKpiSettings> & { message?: string };

        if (!response.ok) {
          throw new Error(result.message || "Unable to load CRM settings.");
        }

        setSettings({ ...defaultSettings, ...result });
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load CRM settings.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleSave() {
    if (!token) {
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      const result = (await response.json()) as Partial<CrmKpiSettings> & { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to save CRM settings.");
      }

      setSettings({ ...defaultSettings, ...result });
      setSuccess("CRM settings updated successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save CRM settings.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!token) {
    return (
      <section className="accent-card p-8">
        <p className="eyebrow">Session Required</p>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
          Sign in to manage CRM settings.
        </h2>
      </section>
    );
  }

  if (!isAdminView) {
    return (
      <section className="accent-card p-8">
        <p className="eyebrow">Restricted</p>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
          Only super admin access can change KPI targets and reminder channels.
        </h2>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="accent-card p-7">
          <p className="eyebrow">KPI Targets</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
            Control recruiter and delivery score targets from settings.
          </h2>
          <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
            These targets now drive the dashboard productivity table instead of fixed values in
            code, so you can tune the CRM as your team grows.
          </p>

          {isLoading ? (
            <p className="muted-copy mt-6 text-sm">Loading settings...</p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Recruiter Daily Follow-Ups"
                value={settings.recruiterDailyFollowUps}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, recruiterDailyFollowUps: value }))
                }
              />
              <NumberField
                label="Recruiter Daily Applications"
                value={settings.recruiterDailyApplications}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, recruiterDailyApplications: value }))
                }
              />
              <NumberField
                label="Delivery Daily Follow-Ups"
                value={settings.deliveryDailyFollowUps}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, deliveryDailyFollowUps: value }))
                }
              />
              <NumberField
                label="Delivery Daily Applications"
                value={settings.deliveryDailyApplications}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, deliveryDailyApplications: value }))
                }
              />
              <NumberField
                label="Leadership Daily Follow-Ups"
                value={settings.leadershipDailyFollowUps}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, leadershipDailyFollowUps: value }))
                }
              />
              <NumberField
                label="Leadership Daily Applications"
                value={settings.leadershipDailyApplications}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, leadershipDailyApplications: value }))
                }
              />
            </div>
          )}
        </article>

        <article className="accent-card p-7">
          <p className="eyebrow">Reminder Channels</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
            Decide how reminders should be saved and delivered.
          </h2>
          <p className="muted-copy mt-3 text-base leading-7">
            Browser alerts are live inside the CRM. Email and WhatsApp are configurable now, so the
            next delivery integration can use these saved preferences directly.
          </p>

          <div className="mt-6 space-y-4">
            <ToggleField
              label="Browser Notifications"
              description="Show in-browser reminder alerts for due and overdue follow-ups."
              checked={settings.enableBrowserNotifications}
              onChange={(value) =>
                setSettings((current) => ({ ...current, enableBrowserNotifications: value }))
              }
            />
            <ToggleField
              label="Email Reminder Channel"
              description="Save reminders with email delivery enabled for future notification automation."
              checked={settings.enableEmailNotifications}
              onChange={(value) =>
                setSettings((current) => ({ ...current, enableEmailNotifications: value }))
              }
            />
            <ToggleField
              label="WhatsApp Reminder Channel"
              description="Save reminders with WhatsApp delivery enabled for future notification automation."
              checked={settings.enableWhatsappNotifications}
              onChange={(value) =>
                setSettings((current) => ({ ...current, enableWhatsappNotifications: value }))
              }
            />
          </div>
        </article>
      </section>

      {error ? (
        <div className="rounded-[1.25rem] border border-[rgba(190,72,26,0.18)] bg-[rgba(190,72,26,0.08)] px-4 py-3 text-sm text-[var(--color-accent-strong)]">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-[1.25rem] border border-[rgba(8,96,108,0.16)] bg-[rgba(8,96,108,0.08)] px-4 py-3 text-sm text-[var(--color-dark)]">
          {success}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || isLoading}
          className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

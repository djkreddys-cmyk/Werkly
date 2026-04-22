"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  crmFieldAccessDefinitions,
  crmModuleAccessDefinitions,
  defaultCrmAccessControl,
  mergeCrmAccessControl,
  normalizeEmployeeAccessOverrides,
  type CrmAccessRoleKey,
  type CrmEmployeeAccessOverride,
} from "@/lib/access-control";
import type { CrmKpiSettings, EmployeeRecord } from "@/lib/crm";

type SettingsSection = "index" | "kpi" | "notifications" | "access" | "activity";

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
  accessControl: defaultCrmAccessControl,
  employeeAccessOverrides: [],
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

function SettingsNav({ activeSection }: { activeSection: SettingsSection }) {
  const cards = [
    {
      key: "kpi",
      href: "/admin/settings/kpi",
      eyebrow: "KPI Settings",
      title: "Productivity targets",
      description: "Recruiter, delivery, and leadership score targets.",
    },
    {
      key: "notifications",
      href: "/admin/settings/notifications",
      eyebrow: "Notification Settings",
      title: "Reminder channels",
      description: "Browser, email, and WhatsApp reminder preferences.",
    },
    {
      key: "access",
      href: "/admin/settings/access",
      eyebrow: "Access Settings",
      title: "Employee-wise access control",
      description: "Role defaults plus person-specific module and field access.",
    },
    {
      key: "activity",
      href: "/admin/settings/activity",
      eyebrow: "Activity Center",
      title: "Operational activity feed",
      description: "Audit logs, candidate history, transfers, and notifications with filters.",
    },
  ] as const;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          className={`rounded-[1.6rem] border p-5 transition ${
            activeSection === card.key
              ? "border-[rgba(8,96,108,0.18)] bg-[rgba(8,96,108,0.08)]"
              : "border-[var(--color-line)] bg-white hover:border-[rgba(8,96,108,0.18)]"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-strong)]">
            {card.eyebrow}
          </p>
          <h3 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">{card.title}</h3>
          <p className="muted-copy mt-2 text-sm leading-6">{card.description}</p>
        </Link>
      ))}
    </div>
  );
}

export function AdminSettingsPanel({ section = "index" }: { section?: SettingsSection }) {
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
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState("");
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<
    "all" | (typeof crmModuleAccessDefinitions)[number]["key"]
  >("all");
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

    const requests = [
      fetch("/api/admin/settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }),
    ];

    if (section === "access" || section === "index") {
      requests.push(
        fetch("/api/admin/employees", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        })
      );
    }

    Promise.all(requests)
      .then(async ([settingsResponse, employeesResponse]) => {
        const settingsResult = (await settingsResponse.json()) as Partial<CrmKpiSettings> & {
          message?: string;
        };

        if (!settingsResponse.ok) {
          throw new Error(settingsResult.message || "Unable to load CRM settings.");
        }

        setSettings({
          ...defaultSettings,
          ...settingsResult,
          accessControl: mergeCrmAccessControl(settingsResult.accessControl),
          employeeAccessOverrides: normalizeEmployeeAccessOverrides(
            settingsResult.employeeAccessOverrides
          ),
        });

        if (employeesResponse) {
          const employeesResult = (await employeesResponse.json()) as {
            employees?: EmployeeRecord[];
            message?: string;
          };
          if (!employeesResponse.ok) {
            throw new Error(employeesResult.message || "Unable to load employees.");
          }
          setEmployees(employeesResult.employees ?? []);
        }
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load CRM settings.");
      })
      .finally(() => setIsLoading(false));
  }, [section, token]);

  const visibleEmployees = useMemo(() => {
    return employees
      .filter((employee) => employee.status === "active")
      .sort((first, second) => first.fullName.localeCompare(second.fullName));
  }, [employees]);

  const selectedEmployee = visibleEmployees.find(
    (employee) => employee.employeeCode === selectedEmployeeCode
  );

  const selectedEmployeeRoleKey: CrmAccessRoleKey = useMemo(() => {
    const normalizedRole = String(selectedEmployee?.role || "").toLowerCase();
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
  }, [selectedEmployee?.role]);

  const currentEmployeeOverride = useMemo(() => {
    if (!selectedEmployee) {
      return null;
    }

    return (
      settings.employeeAccessOverrides.find(
        (override) =>
          override.employeeCode === selectedEmployee.employeeCode ||
          override.email === selectedEmployee.email.toLowerCase()
      ) ?? null
    );
  }, [selectedEmployee, settings.employeeAccessOverrides]);

  const visibleModuleDefinitions = useMemo(() => {
    if (selectedModuleFilter === "all") {
      return crmModuleAccessDefinitions;
    }

    return crmModuleAccessDefinitions.filter((definition) => definition.key === selectedModuleFilter);
  }, [selectedModuleFilter]);

  const visibleFieldDefinitions = useMemo(() => {
    if (selectedModuleFilter === "all") {
      return crmFieldAccessDefinitions;
    }

    return crmFieldAccessDefinitions.filter((definition) =>
      definition.key.startsWith(`${selectedModuleFilter}.`)
    );
  }, [selectedModuleFilter]);

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

      setSettings({
        ...defaultSettings,
        ...result,
        accessControl: mergeCrmAccessControl(result.accessControl),
        employeeAccessOverrides: normalizeEmployeeAccessOverrides(result.employeeAccessOverrides),
      });
      setSuccess("CRM settings updated successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save CRM settings.");
    } finally {
      setIsSaving(false);
    }
  }

  function updateEmployeeOverride(
    field: "modules" | "fields",
    key: string,
    value: boolean
  ) {
    if (!selectedEmployee) {
      return;
    }

    setSettings((current) => {
      const existingIndex = current.employeeAccessOverrides.findIndex(
        (override) =>
          override.employeeCode === selectedEmployee.employeeCode ||
          override.email === selectedEmployee.email.toLowerCase()
      );

      const nextOverride: CrmEmployeeAccessOverride = {
        employeeId: selectedEmployee.id,
        employeeCode: selectedEmployee.employeeCode,
        email: selectedEmployee.email.toLowerCase(),
        employeeName: selectedEmployee.fullName,
        role: selectedEmployee.role,
        modules:
          field === "modules"
            ? {
                ...(current.employeeAccessOverrides[existingIndex]?.modules ?? {}),
                [key]: value,
              }
            : { ...(current.employeeAccessOverrides[existingIndex]?.modules ?? {}) },
        fields:
          field === "fields"
            ? {
                ...(current.employeeAccessOverrides[existingIndex]?.fields ?? {}),
                [key]: value,
              }
            : { ...(current.employeeAccessOverrides[existingIndex]?.fields ?? {}) },
      };

      const nextOverrides = [...current.employeeAccessOverrides];
      if (existingIndex >= 0) {
        nextOverrides[existingIndex] = nextOverride;
      } else {
        nextOverrides.push(nextOverride);
      }

      return {
        ...current,
        employeeAccessOverrides: normalizeEmployeeAccessOverrides(nextOverrides),
      };
    });
  }

  function clearSelectedEmployeeOverride() {
    if (!selectedEmployee) {
      return;
    }

    setSettings((current) => ({
      ...current,
      employeeAccessOverrides: current.employeeAccessOverrides.filter(
        (override) =>
          override.employeeCode !== selectedEmployee.employeeCode &&
          override.email !== selectedEmployee.email.toLowerCase()
      ),
    }));
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
          Only super admin access can change CRM settings.
        </h2>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsNav activeSection={section} />

      {section === "index" ? (
        <section className="accent-card p-7">
          <p className="eyebrow">Settings Overview</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
            Manage CRM settings from three separate pages.
          </h2>
          <p className="muted-copy mt-3 max-w-4xl text-base leading-7">
            Use KPI Settings for targets, Notification Settings for reminder channels, and Access
            Settings for role-wise plus employee-wise frontend permissions. Activity Center is now
            also grouped under Settings with employee-wise and date-wise filtering.
          </p>
        </section>
      ) : null}

      {section === "kpi" ? (
        <section className="accent-card p-7">
          <p className="eyebrow">KPI Targets</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
            Control recruiter, delivery, and leadership targets.
          </h2>
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
        </section>
      ) : null}

      {section === "notifications" ? (
        <section className="accent-card p-7">
          <p className="eyebrow">Reminder Channels</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
            Decide how reminders should be saved and delivered.
          </h2>
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
        </section>
      ) : null}

      {section === "access" ? (
        <div className="space-y-6">
          <section className="accent-card p-7">
            <p className="eyebrow">Employee-Wise Overrides</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
              Set access with dropdown filters and employee-wise override.
            </h2>
            <p className="muted-copy mt-3 max-w-4xl text-base leading-7">
              First select employee, then choose module. The related module fields and actions will
              appear automatically in the box below so you can give one person special access
              without changing all users in the same role.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <select
                value={selectedEmployeeCode}
                onChange={(event) => setSelectedEmployeeCode(event.target.value)}
                className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              >
                <option value="">Select employee</option>
                {visibleEmployees.map((employee) => (
                  <option key={employee.id} value={employee.employeeCode}>
                    {employee.fullName} - {employee.employeeCode} - {employee.role}
                  </option>
                ))}
              </select>
              <select
                value={selectedModuleFilter}
                onChange={(event) =>
                  setSelectedModuleFilter(
                    event.target.value as "all" | (typeof crmModuleAccessDefinitions)[number]["key"]
                  )
                }
                className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                >
                  <option value="all">All modules</option>
                  {crmModuleAccessDefinitions.map((definition) => (
                    <option key={definition.key} value={definition.key}>
                      {definition.label}
                    </option>
                  ))}
                </select>
            </div>

            {selectedEmployee ? (
              <div className="mt-6 space-y-6">
                <div className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-strong)]">
                    Selected Employee
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
                    {selectedEmployee.fullName}
                  </h3>
                  <p className="muted-copy mt-2 text-sm">
                    {selectedEmployee.employeeCode} • {selectedEmployee.email} • {selectedEmployee.role}
                  </p>
                  <p className="muted-copy mt-2 text-sm">
                    Base role access: {selectedEmployeeRoleKey}
                    {currentEmployeeOverride ? " • custom override active" : " • using role defaults"}
                  </p>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <article className="rounded-[1.6rem] border border-[var(--color-line)] bg-white p-5">
                    <h3 className="text-xl font-semibold text-[var(--color-ink)]">
                      Module override
                    </h3>
                    <div className="mt-4 space-y-3">
                      {visibleModuleDefinitions.map((definition) => (
                        <label
                          key={definition.key}
                          className="flex items-start justify-between gap-3 rounded-[1.1rem] border border-[var(--color-line)] px-4 py-3"
                        >
                          <span>
                            <span className="block text-sm font-semibold text-[var(--color-ink)]">
                              {definition.label}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">
                              {definition.description}
                            </span>
                          </span>
                          <input
                            type="checkbox"
                            checked={
                              currentEmployeeOverride?.modules?.[definition.key] ??
                              settings.accessControl[selectedEmployeeRoleKey].modules[definition.key]
                            }
                            onChange={(event) =>
                              updateEmployeeOverride("modules", definition.key, event.target.checked)
                            }
                            className="mt-1 h-5 w-5 accent-[var(--color-dark)]"
                          />
                        </label>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-[1.6rem] border border-[var(--color-line)] bg-white p-5">
                    <h3 className="text-xl font-semibold text-[var(--color-ink)]">
                      Field and action override
                    </h3>
                    <div className="mt-4 space-y-3">
                      {visibleFieldDefinitions.length ? (
                        visibleFieldDefinitions.map((definition) => (
                          <label
                            key={definition.key}
                            className="flex items-start justify-between gap-3 rounded-[1.1rem] border border-[var(--color-line)] px-4 py-3"
                          >
                            <span>
                              <span className="block text-sm font-semibold text-[var(--color-ink)]">
                                {definition.label}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">
                                {definition.description}
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              checked={
                                currentEmployeeOverride?.fields?.[definition.key] ??
                                settings.accessControl[selectedEmployeeRoleKey].fields[
                                  definition.key
                                ]
                              }
                              onChange={(event) =>
                                updateEmployeeOverride("fields", definition.key, event.target.checked)
                              }
                              className="mt-1 h-5 w-5 accent-[var(--color-dark)]"
                            />
                          </label>
                        ))
                      ) : (
                        <div className="rounded-[1.1rem] border border-dashed border-[var(--color-line)] px-4 py-5 text-sm text-[var(--color-muted)]">
                          No field-level access items are configured for the selected module yet.
                        </div>
                      )}
                    </div>
                  </article>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={clearSelectedEmployeeOverride}
                    className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
                  >
                    Clear Employee Override
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[1.4rem] border border-[var(--color-line)] bg-white px-5 py-4 text-sm text-[var(--color-muted)]">
                Select one employee to configure person-specific access.
              </div>
            )}
          </section>
        </div>
      ) : null}

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

      {section !== "index" ? (
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
      ) : null}
    </div>
  );
}

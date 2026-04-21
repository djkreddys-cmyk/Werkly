"use client";

import { useEffect, useMemo, useState } from "react";
import {
  defaultCrmAccessControl,
  getCrmEffectiveAccess,
  mergeCrmAccessControl,
  normalizeEmployeeAccessOverrides,
  type CrmAccessControlMatrix,
  type CrmRoleAccessConfig,
} from "@/lib/access-control";
import type { CrmKpiSettings } from "@/lib/crm";

const ACCESS_CONTROL_CACHE_KEY = "werklyCrmAccessControl";

export function useCrmAccessControl(
  token: string,
  authType: string,
  authRole: string,
  authEmployeeCode = "",
  authEmail = ""
): {
  accessControl: CrmAccessControlMatrix;
  roleAccess: CrmRoleAccessConfig;
  isLoading: boolean;
} {
  const [accessControl, setAccessControl] = useState<CrmAccessControlMatrix>(() => {
    if (typeof window === "undefined") {
      return defaultCrmAccessControl;
    }

    try {
      const cached = window.localStorage.getItem(ACCESS_CONTROL_CACHE_KEY);
      if (!cached) {
        return defaultCrmAccessControl;
      }

      return mergeCrmAccessControl(JSON.parse(cached) as CrmKpiSettings["accessControl"]);
    } catch {
      return defaultCrmAccessControl;
    }
  });
  const [employeeAccessOverrides, setEmployeeAccessOverrides] = useState<
    CrmKpiSettings["employeeAccessOverrides"]
  >([]);

  useEffect(() => {
    if (!token) {
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

        const nextAccessControl = mergeCrmAccessControl(result.accessControl);
        setAccessControl(nextAccessControl);
        setEmployeeAccessOverrides(normalizeEmployeeAccessOverrides(result.employeeAccessOverrides));
        if (typeof window !== "undefined") {
          window.localStorage.setItem(ACCESS_CONTROL_CACHE_KEY, JSON.stringify(nextAccessControl));
        }
      })
      .catch(() => {
        setAccessControl((current) => mergeCrmAccessControl(current));
        setEmployeeAccessOverrides((current) => normalizeEmployeeAccessOverrides(current));
      });
  }, [token]);

  const roleAccess = useMemo(
    () =>
      getCrmEffectiveAccess(
        authType,
        authRole,
        authEmployeeCode,
        authEmail,
        accessControl,
        employeeAccessOverrides
      ),
    [accessControl, authEmail, authEmployeeCode, authRole, authType, employeeAccessOverrides]
  );

  return { accessControl, roleAccess, isLoading: false };
}

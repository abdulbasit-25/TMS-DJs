import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

export const DEFAULT_PORTAL_SETTINGS = {
  companyName: "TMS Freight Portal",
  supportEmail: "ops@djfreight.example",
};

export function usePortalSettings() {
  const [settings, setSettings] = useState(DEFAULT_PORTAL_SETTINGS);

  useEffect(() => {
    let active = true;
    void apiFetch<typeof DEFAULT_PORTAL_SETTINGS>("/api/admin/settings")
      .then((response) => {
        if (active) setSettings(response.data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return settings;
}

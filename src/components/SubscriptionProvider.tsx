"use client";

import { useEffect } from "react";
import { setAccessState, type AccessState } from "@/lib/accessMode";
import { setMaintenanceModeState } from "@/lib/maintenanceMode";
import { useAuthStore } from "@/store/authStore";
import subscriptionApi from "@/lib/subscriptionApi";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Re-check periodically so a renewal made in another tab, the plan simply
// running out while the app is open, or an admin-side change on SolvSutra's
// end (suspend/reactivate/edit) takes effect without a manual reload.
const POLL_MS = 60 * 1000;

export default function SubscriptionProvider() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    let cancelled = false;

    const publish = (state: AccessState) => {
      if (!cancelled) setAccessState(state);
    };

    // `force` bypasses the backend's own verdict cache (default 5 min).
    // Without it, a change made in the SolvSutra admin panel — editing the
    // grace period, suspending, renewing — could take minutes to show here,
    // while the subscription page (which queries SolvSutra straight from the
    // browser) already showed the new value. Same screen, two answers.
    const check = async ({ force = false } = {}) => {
      // --- 1. ask our own backend ---
      try {
        const res = await fetch(`${API_BASE_URL}/subscription-status${force ? "?refresh=true" : ""}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });

        if (res.ok) {
          const json = await res.json();
          const d = json?.data;
          if (d && d.accessStatus !== "not_configured") {
            publish({
              allowed: d.allowed !== false,
              accessStatus: d.accessStatus,
              reason: d.reason,
              planName: d.planName,
              status: d.status,
              expiryDate: d.expiryDate,
              gracePeriodEndDate: d.gracePeriodEndDate,
              daysRemaining: d.daysRemaining,
              projectName: d.projectName,
            });
            return;
          }
        }
      } catch {
        // fall through to the browser-side check
      }

      // --- 2. fall back to the API key saved in this browser ---
      if (!subscriptionApi.hasConfig()) {
        publish({ allowed: true, accessStatus: "not_configured" });
        return;
      }

      try {
        const res = await subscriptionApi.getMySubscription();
        const s = res.subscription;
        if (!s) {
          publish({ allowed: true, accessStatus: "unknown" });
          return;
        }
        publish({
          allowed: s.allowed !== false,
          accessStatus: (s.accessStatus as AccessState["accessStatus"]) || "unknown",
          reason: s.reason,
          planName: s.plan?.name ?? null,
          status: s.status,
          expiryDate: s.expiryDate,
          gracePeriodEndDate: s.gracePeriodEndDate,
          daysRemaining: s.daysRemaining,
        });
      } catch {
        // Never lock the app because a check failed.
        publish({ allowed: true, accessStatus: "check_failed" });
      }
    };

    // Maintenance has no write-lock or local-backend proxy to go through —
    // it's purely informational (header/sidebar countdown, the banner) — so
    // this talks to SolvSutra directly, same as MaintenanceBanner does.
    const checkMaintenance = async () => {
      if (!subscriptionApi.hasConfig()) {
        if (!cancelled) setMaintenanceModeState({ loading: false, hasPlan: false });
        return;
      }
      try {
        // Both in one place: a banner fetching the `show` verdict itself
        // would mean two independent pollers that could disagree.
        const [detail, prompt] = await Promise.all([
          subscriptionApi.getMyMaintenance(),
          subscriptionApi.getMaintenanceStatus().catch(() => null),
        ]);
        const m = detail.maintenanceSubscription;
        if (cancelled) return;
        setMaintenanceModeState({
          loading: false,
          hasPlan: Boolean(m),
          planName: m?.plan.name ?? null,
          isFree: m?.plan.isFree ?? false,
          daysRemaining: m?.daysRemaining ?? null,
          isExpired: m?.isExpired ?? false,
          showPrompt: Boolean(prompt?.show),
        });
      } catch {
        if (!cancelled) setMaintenanceModeState({ loading: false, hasPlan: false });
      }
    };

    check();
    checkMaintenance();
    const timer = setInterval(() => {
      check();
      checkMaintenance();
    }, POLL_MS);

    // A renewal completed in the subscription page dispatches this.
    const onRenewed = () => {
      check({ force: true });
      checkMaintenance();
    };
    window.addEventListener("subscription:refresh", onRenewed);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("subscription:refresh", onRenewed);
    };
  }, [token]);

  return null;
}

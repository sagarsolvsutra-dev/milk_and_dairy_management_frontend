"use client";

import { useRouter } from "next/navigation";
import { FiClock, FiTool } from "react-icons/fi";
import { useAccessMode } from "@/hooks/useAccessMode";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";

type Urgency = "expired" | "critical" | "warning" | "ok";

function urgencyOf(daysRemaining: number | null | undefined, isExpired?: boolean): Urgency {
  if (isExpired || (daysRemaining ?? 0) < 0) return "expired";
  if ((daysRemaining ?? 99) <= 7) return "critical";
  if ((daysRemaining ?? 99) <= 30) return "warning";
  return "ok";
}

const PILL_STYLES: Record<Urgency, string> = {
  expired: "bg-red-50 text-red-700 border-red-200",
  critical: "bg-orange-50 text-orange-700 border-orange-200",
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const DOT_STYLES: Record<Urgency, string> = {
  expired: "bg-red-500",
  critical: "bg-orange-500",
  warning: "bg-yellow-500",
  ok: "bg-emerald-500",
};

function planLabel(days: number | null | undefined, isExpired?: boolean) {
  if (isExpired || (days ?? 0) < 0) return `Expired ${Math.abs(days ?? 0)}d ago`;
  return `${days}d left`;
}

/**
 * At-a-glance countdown for both the hosting plan and the maintenance plan —
 * shown in the header (compact pills) and the sidebar (stacked card). Both
 * read from the same SubscriptionProvider-published state everything else
 * already uses, so this doesn't add its own polling.
 *
 * Ported from Shyam Enterprise's frontend. Simplified for this app's sidebar,
 * which (unlike Shyam's) has no icon-only collapsed state — so there's no
 * "dots" fallback variant here, only the expanded card.
 */
export default function PlanStatusIndicator({ variant }: { variant: "header" | "sidebar" }) {
  const router = useRouter();
  const access = useAccessMode();
  const maintenance = useMaintenanceMode();

  const hasPlan = access.accessStatus !== "loading" && access.accessStatus !== "not_configured" && access.daysRemaining != null;
  const planUrgency = hasPlan ? urgencyOf(access.daysRemaining, access.accessStatus === "expired") : null;

  const hasMaintenance = !maintenance.loading && maintenance.hasPlan && maintenance.daysRemaining != null;
  const maintUrgency = hasMaintenance ? urgencyOf(maintenance.daysRemaining, maintenance.isExpired) : null;

  if (!hasPlan && !hasMaintenance) return null;

  const goToSubscription = () => router.push("/subscription");

  if (variant === "header") {
    return (
      <div className="flex items-center gap-2">
        {hasPlan && planUrgency && (
          <button
            onClick={goToSubscription}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 ${PILL_STYLES[planUrgency]}`}
            title={access.planName || "Plan"}
          >
            <FiClock className="h-3.5 w-3.5" />
            {planLabel(access.daysRemaining, access.accessStatus === "expired")}
          </button>
        )}
        {hasMaintenance && maintUrgency && (
          <button
            onClick={goToSubscription}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 ${PILL_STYLES[maintUrgency]}`}
            title={maintenance.planName || "Maintenance"}
          >
            <FiTool className="h-3.5 w-3.5" />
            {maintenance.isFree && maintUrgency === "ok" ? "Maint. Free" : planLabel(maintenance.daysRemaining, maintenance.isExpired)}
          </button>
        )}
      </div>
    );
  }

  // Sidebar variant
  return (
    <button
      onClick={goToSubscription}
      className="w-full space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
    >
      {hasPlan && planUrgency && (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <FiClock className="h-3.5 w-3.5 text-slate-400" />
            Plan
          </span>
          <span className={`text-xs font-bold ${PILL_STYLES[planUrgency].split(" ")[1]}`}>
            {planLabel(access.daysRemaining, access.accessStatus === "expired")}
          </span>
        </div>
      )}
      {hasMaintenance && maintUrgency && (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <FiTool className="h-3.5 w-3.5 text-slate-400" />
            Maintenance
          </span>
          <span className={`text-xs font-bold ${PILL_STYLES[maintUrgency].split(" ")[1]}`}>
            {maintenance.isFree && maintUrgency === "ok" ? "Free" : planLabel(maintenance.daysRemaining, maintenance.isExpired)}
          </span>
        </div>
      )}
    </button>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FiTool, FiX, FiArrowRight } from "react-icons/fi";
import { getMaintenanceModeState, subscribeMaintenanceMode } from "@/lib/maintenanceMode";

/**
 * Purely informational — unlike ReadOnlyBanner/SubscriptionBanner, this never
 * blocks writes. SolvSutra staff decide when to turn the prompt on for this
 * project (after its free maintenance window); this just surfaces that
 * decision. Reads the shared store rather than polling itself, so this
 * banner and the header/sidebar countdown always show the same answer from
 * the same fetch. Dismissing is per-session only, so it reappears on the
 * next visit rather than being silenced forever.
 *
 * Ported from Shyam Enterprise's frontend.
 */
export default function MaintenanceBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(() => Boolean(getMaintenanceModeState().showPrompt));
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setShow(Boolean(getMaintenanceModeState().showPrompt));
    return subscribeMaintenanceMode((s) => setShow(Boolean(s.showPrompt)));
  }, []);

  if (!show || dismissed) return null;
  if (pathname === "/subscription") return null;

  return (
    <div className="mb-4 rounded-r-lg border-l-4 border-blue-500 bg-blue-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <FiTool className="h-5 w-5 shrink-0 text-blue-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-900">Maintenance Plan Required</p>
            <p className="mt-0.5 text-xs text-blue-700">
              Your free maintenance period has ended. To keep receiving bug fixes and small changes from SolvSutra, please purchase a maintenance plan.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => router.push("/subscription")}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            View Plans <FiArrowRight className="h-3 w-3" />
          </button>
          <button onClick={() => setDismissed(true)} className="rounded p-1 hover:bg-blue-100" aria-label="Dismiss">
            <FiX className="h-4 w-4 text-blue-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

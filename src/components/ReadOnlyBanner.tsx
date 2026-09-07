"use client";

import Link from "next/link";
import { FiLock, FiAlertTriangle, FiArrowRight } from "react-icons/fi";
import { useAccessMode } from "@/hooks/useAccessMode";

/**
 * Persistent strip explaining why the app is locked, or warning that it is
 * about to be. Unlike `SubscriptionBanner` this one cannot be dismissed —
 * while the app is read-only the user needs to keep seeing why.
 */
export default function ReadOnlyBanner() {
  const access = useAccessMode();

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

  if (access.readOnly) {
    const label =
      access.accessStatus === "suspended"
        ? "સબ્સ્ક્રિપ્શન સસ્પેન્ડ થયું છે"
        : access.accessStatus === "cancelled"
        ? "સબ્સ્ક્રિપ્શન રદ થયું છે"
        : "સબ્સ્ક્રિપ્શન પૂરું થઈ ગયું છે";

    return (
      <div className="mb-4 rounded-xl bg-red-600 px-4 py-3 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <FiLock className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold">{label} — ફક્ત જોઈ શકાશે (Read-only)</p>
              <p className="mt-0.5 text-xs text-red-100">
                નવો ડેટા ઉમેરવો, બદલવો કે કાઢવો બંધ છે. પ્લાન રિન્યુ કરો એટલે તરત ચાલુ થઈ જશે.
                {access.expiryDate ? ` (સમાપ્તિ: ${fmt(access.expiryDate)})` : ""}
              </p>
            </div>
          </div>
          <Link
            href="/subscription"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
          >
            રિન્યુ કરો <FiArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  if (access.accessStatus === "grace_period") {
    const graceLeft = access.gracePeriodEndDate ? Math.ceil((new Date(access.gracePeriodEndDate).getTime() - Date.now()) / 86400000) : null;

    return (
      <div className="mb-4 rounded-r-lg border-l-4 border-amber-500 bg-amber-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <FiAlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">પ્લાન પૂરો થયો છે — ગ્રેસ પીરિયડ ચાલુ છે</p>
              <p className="mt-0.5 text-xs text-amber-700">
                {graceLeft !== null && graceLeft >= 0
                  ? `હજુ ${graceLeft} દિવસ કામ ચાલુ રહેશે, પછી ફક્ત જોઈ શકાશે.`
                  : "ટૂંક સમયમાં એપ ફક્ત વ્યૂ-ઓન્લી થઈ જશે."}
              </p>
            </div>
          </div>
          <Link
            href="/subscription"
            className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            રિન્યુ કરો <FiArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  // --- the licence could not be verified at all ---
  // This used to render nothing, which is how an invalid API key managed to
  // look exactly like a healthy subscription: the lock quietly stopped working
  // and nobody could tell. Writes still go through (fail-open is deliberate),
  // but it must be visible that the plan is no longer being checked.
  if (access.accessStatus === "invalid_credentials" || access.accessStatus === "check_failed") {
    const isBadCreds = access.accessStatus === "invalid_credentials";
    return (
      <div className="mb-4 rounded-r-lg border-l-4 border-slate-400 bg-slate-100 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <FiAlertTriangle className="h-5 w-5 shrink-0 text-slate-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {isBadCreds
                  ? "સબ્સ્ક્રિપ્શન ચકાસી શકાયું નથી — credentials ખોટા છે"
                  : "સબ્સ્ક્રિપ્શન ચકાસી શકાયું નથી"}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {isBadCreds
                  ? "API Key regenerate થઈ હોઈ શકે, અથવા આ પ્રોજેક્ટ SolvSutra પર નથી. એપ ચાલુ છે, પણ પ્લાન તપાસાતો નથી."
                  : "SolvSutra સાથે સંપર્ક થઈ શક્યો નથી. એપ ચાલુ છે, પણ પ્લાન તપાસાતો નથી."}
              </p>
            </div>
          </div>
          {isBadCreds && (
            <Link
              href="/subscription"
              className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              ઠીક કરો <FiArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  return null;
}

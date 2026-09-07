"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FiAlertTriangle, FiXCircle, FiClock, FiX, FiArrowRight } from "react-icons/fi";
import subscriptionApi, { type SubscriptionData } from "@/lib/subscriptionApi";

/** Dismissible expiry warning, separate from the persistent `ReadOnlyBanner`
 * — this one only nags about an upcoming or recent expiry and can be waved
 * away for the session; it never claims to explain a write-lock. */
export default function SubscriptionBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!subscriptionApi.hasConfig()) {
      setLoading(false);
      return;
    }
    subscriptionApi
      .getMySubscription()
      .then((res) => setSubscription(res.subscription))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !subscription || dismissed) return null;
  if (pathname === "/subscription") return null;

  const days = subscription.daysRemaining;

  if (subscription.isExpired || days < 0) {
    return (
      <div className="mb-4 rounded-r-lg border-l-4 border-red-500 bg-red-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <FiXCircle className="h-5 w-5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-900">⚠️ Subscription Expired</p>
              <p className="mt-0.5 text-xs text-red-700">
                Your {subscription.plan.name} plan expired {Math.abs(days)} days ago. Renew now to continue using the service.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => router.push("/subscription")}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Renew Now <FiArrowRight className="h-3 w-3" />
            </button>
            <button onClick={() => setDismissed(true)} className="rounded p-1 hover:bg-red-100" aria-label="Dismiss">
              <FiX className="h-4 w-4 text-red-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (days <= 7) {
    return (
      <div className="mb-4 rounded-r-lg border-l-4 border-orange-500 bg-orange-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <FiAlertTriangle className="h-5 w-5 shrink-0 text-orange-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-orange-900">
                🚨 Only {days} {days === 1 ? "day" : "days"} left!
              </p>
              <p className="mt-0.5 text-xs text-orange-700">
                Your {subscription.plan.name} plan expires on{" "}
                {new Date(subscription.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => router.push("/subscription")}
              className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
            >
              Renew Now <FiArrowRight className="h-3 w-3" />
            </button>
            <button onClick={() => setDismissed(true)} className="rounded p-1 hover:bg-orange-100" aria-label="Dismiss">
              <FiX className="h-4 w-4 text-orange-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (subscription.isExpiringSoon) {
    return (
      <div className="mb-4 rounded-r-lg border-l-4 border-yellow-500 bg-yellow-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <FiClock className="h-5 w-5 shrink-0 text-yellow-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-yellow-900">⏰ Subscription Expiring Soon</p>
              <p className="mt-0.5 text-xs text-yellow-700">
                Your {subscription.plan.name} plan expires in {days} days (
                {new Date(subscription.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}).
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => router.push("/subscription")}
              className="flex items-center gap-1 rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-700"
            >
              View <FiArrowRight className="h-3 w-3" />
            </button>
            <button onClick={() => setDismissed(true)} className="rounded p-1 hover:bg-yellow-100" aria-label="Dismiss">
              <FiX className="h-4 w-4 text-yellow-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

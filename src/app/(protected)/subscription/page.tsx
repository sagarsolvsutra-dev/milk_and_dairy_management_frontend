"use client";

import { useEffect, useState } from "react";
import {
  FiCreditCard,
  FiCalendar,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiClock,
  FiRefreshCw,
  FiFileText,
  FiSettings,
  FiTool,
  FiServer,
  FiGlobe,
} from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import subscriptionApi, { type SubscriptionData, type Plan, type MaintenanceSubscriptionData } from "@/lib/subscriptionApi";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type Payment = {
  _id: string;
  amount: number;
  status: string;
  createdAt: string;
  planId?: { name?: string };
  maintenancePlanId?: { name?: string };
};

// Razorpay's checkout.js is very heavy — once it initializes it prefetches
// hundreds of chunk files (every payment method's UI bundle, wallet SDKs,
// analytics). Loading it eagerly on every visit to this page (most of which
// are just "check my plan status", not an actual payment) was flooding the
// network tab on every load. Load it lazily, on demand, right before it's
// actually needed — and only once, via a memoized promise so concurrent/
// repeated renew clicks don't each inject their own script tag.
let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve) => {
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    // Fail open either way — callers already fall back to the testMode/
    // verify-immediately path when `window.Razorpay` never shows up.
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

export default function SubscriptionPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [renewing, setRenewing] = useState(false);
  const [maintenance, setMaintenance] = useState<MaintenanceSubscriptionData | null>(null);
  const [maintenancePlans, setMaintenancePlans] = useState<Plan[]>([]);
  const [renewingMaintenance, setRenewingMaintenance] = useState(false);
  const [showMaintenancePlans, setShowMaintenancePlans] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [setupApiKey, setSetupApiKey] = useState("");
  const [setupProjectId, setSetupProjectId] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Credentials live on the backend, so a browser that has never been set up
    // still works — pull them down before deciding to show the setup form.
    (async () => {
      const ready = await subscriptionApi.hydrateFromBackend();
      if (!ready) {
        setShowSetup(true);
        setLoading(false);
        return;
      }
      loadData();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subRes, plansRes, paymentsRes, maintRes, maintPlansRes] = await Promise.all([
        subscriptionApi.getMySubscription(),
        subscriptionApi.getPlans(),
        subscriptionApi.getPayments(),
        subscriptionApi.getMyMaintenance().catch(() => ({ maintenanceSubscription: null })),
        subscriptionApi.getMaintenancePlans().catch(() => ({ plans: [] })),
      ]);
      setSubscription(subRes.subscription);
      setPlans(plansRes.plans || []);
      setPayments((paymentsRes.payments as unknown as Payment[]) || []);
      setMaintenance(maintRes.maintenanceSubscription);
      setMaintenancePlans(maintPlansRes.plans || []);
    } catch (err) {
      const msg = getErrorMessage(err);
      // A rejected key means the credentials no longer match SolvSutra —
      // regenerated, or the project was removed. Dropping the user on the
      // setup form with no explanation left them guessing, so say why.
      if (/api key|invalid|unauthor/i.test(msg)) {
        toast.error(
          "The API key may have been regenerated, or the project removed in SolvSutra. Enter the current details again.",
          "SolvSutra rejected these credentials"
        );
        setShowSetup(true);
      } else if (/failed to fetch|networkerror|load failed/i.test(msg)) {
        toast.error("Check your connection, or try again shortly.", "Could not reach SolvSutra");
      } else {
        toast.error(msg, "Failed to load subscription");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupApiKey || !setupProjectId) {
      toast.error("Please enter both API key and Project ID");
      return;
    }
    setConnecting(true);
    try {
      // The backend verifies against SolvSutra before storing, so a wrong key
      // is reported here instead of silently leaving the lock switched off.
      // apiUrl is not asked for — subscriptionApi sends this app's own
      // NEXT_PUBLIC_SUPER_ADMIN_API, which is the URL the browser already
      // reaches SolvSutra on.
      const res = await subscriptionApi.saveConfig(setupApiKey.trim(), setupProjectId.trim());
      toast.success(res?.message || "Connected");
      // The write-lock verdict may have changed — tell the app to re-check.
      window.dispatchEvent(new Event("subscription:refresh"));
      setShowSetup(false);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err), "Could not connect");
    } finally {
      setConnecting(false);
    }
  };

  const handleRenew = async (planId?: string) => {
    setRenewing(true);
    try {
      const order = await subscriptionApi.createRenewalOrder(planId, subscription?._id);
      await loadRazorpayScript();

      // Test mode (no Razorpay configured on SolvSutra, or the script failed to load) — verify immediately.
      if (order.testMode || !window.Razorpay) {
        const verify = await subscriptionApi.verifyRenewalPayment({
          paymentId: order.paymentId,
          razorpay_order_id: order.orderId,
          razorpay_payment_id: `test_pay_${Date.now()}`,
          razorpay_signature: "test_signature",
        });
        if (verify.success) {
          toast.success("Subscription renewed successfully!");
          window.dispatchEvent(new Event("subscription:refresh"));
          await loadData();
        }
        setRenewing(false);
        return;
      }

      // Real Razorpay checkout.
      const options = {
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: "SolvSutra",
        description: `Renew ${order.plan?.name} Plan`,
        order_id: order.orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // Razorpay only fires `modal.ondismiss` when the user closes the
          // checkout without paying — a successful payment never triggers it,
          // so this handler is the only place that can clear the loading
          // state for the success path. Missing this left the button stuck
          // spinning forever after a real payment (the renewal itself still
          // went through — only the UI state was wrong), which tempted
          // reloading and re-clicking Renew, risking a duplicate charge.
          try {
            const verify = await subscriptionApi.verifyRenewalPayment({
              paymentId: order.paymentId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verify.success) {
              toast.success("Subscription renewed successfully!");
              window.dispatchEvent(new Event("subscription:refresh"));
              await loadData();
            }
          } catch (err) {
            toast.error("Payment verification failed: " + getErrorMessage(err));
          } finally {
            setRenewing(false);
          }
        },
        theme: { color: "#4f46e5" },
        modal: { ondismiss: () => setRenewing(false) },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      toast.error(getErrorMessage(err), "Failed to create order");
      setRenewing(false);
    }
  };

  const handleRenewMaintenance = async (maintenancePlanId?: string) => {
    setRenewingMaintenance(true);
    try {
      const order = await subscriptionApi.createMaintenanceRenewalOrder(maintenancePlanId, maintenance?._id);
      await loadRazorpayScript();

      if (order.testMode || !window.Razorpay) {
        const verify = await subscriptionApi.verifyMaintenanceRenewalPayment({
          paymentId: order.paymentId,
          razorpay_order_id: order.orderId,
          razorpay_payment_id: `test_pay_${Date.now()}`,
          razorpay_signature: "test_signature",
        });
        if (verify.success) {
          toast.success("Maintenance plan renewed successfully!");
          window.dispatchEvent(new Event("subscription:refresh"));
          await loadData();
        }
        setRenewingMaintenance(false);
        return;
      }

      const options = {
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: "SolvSutra",
        description: `Maintenance Plan - ${order.plan?.name}`,
        order_id: order.orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // Same reasoning as handleRenew above: `modal.ondismiss` never
          // fires for a successful payment, so this is the only place that
          // clears the loading state once verification finishes.
          try {
            const verify = await subscriptionApi.verifyMaintenanceRenewalPayment({
              paymentId: order.paymentId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verify.success) {
              toast.success("Maintenance plan renewed successfully!");
              window.dispatchEvent(new Event("subscription:refresh"));
              await loadData();
            }
          } catch (err) {
            toast.error("Payment verification failed: " + getErrorMessage(err));
          } finally {
            setRenewingMaintenance(false);
          }
        },
        theme: { color: "#0d9488" },
        modal: { ondismiss: () => setRenewingMaintenance(false) },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      toast.error(getErrorMessage(err), "Failed to create order");
      setRenewingMaintenance(false);
    }
  };

  const statusInfo = (() => {
    if (!subscription) return null;
    const days = subscription.daysRemaining;
    if (subscription.status === "expired" || days < 0) {
      return { icon: FiXCircle, tone: "border-red-200 bg-red-50", text: "text-red-700", badge: "bg-red-100 text-red-700", label: "Expired", message: `Expired ${Math.abs(days)} days ago` };
    }
    if (days <= 7) {
      return { icon: FiAlertTriangle, tone: "border-amber-200 bg-amber-50", text: "text-amber-700", badge: "bg-amber-100 text-amber-700", label: "Critical", message: `Only ${days} days left` };
    }
    if (days <= 30) {
      return { icon: FiClock, tone: "border-yellow-200 bg-yellow-50", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700", label: "Expiring Soon", message: `${days} days left` };
    }
    return { icon: FiCheckCircle, tone: "border-emerald-200 bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700", label: "Active", message: `${days} days remaining` };
  })();

  const maintenanceStatusInfo = (() => {
    if (!maintenance) return null;
    const days = maintenance.daysRemaining;
    if (maintenance.status === "expired" || maintenance.isExpired) {
      return { icon: FiXCircle, tone: "border-red-200 bg-red-50", text: "text-red-700", badge: "bg-red-100 text-red-700", label: "Expired", message: `Expired ${Math.abs(days)} days ago` };
    }
    if (days <= 7) {
      return { icon: FiAlertTriangle, tone: "border-amber-200 bg-amber-50", text: "text-amber-700", badge: "bg-amber-100 text-amber-700", label: "Critical", message: `Only ${days} days left` };
    }
    if (days <= 30 || maintenance.isExpiringSoon) {
      return { icon: FiClock, tone: "border-yellow-200 bg-yellow-50", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700", label: "Expiring Soon", message: `${days} days left` };
    }
    return { icon: FiCheckCircle, tone: "border-teal-200 bg-teal-50", text: "text-teal-700", badge: "bg-teal-100 text-teal-700", label: "Active", message: maintenance.plan.isFree ? "Free maintenance plan" : `${days} days remaining` };
  })();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600">
              <FiSettings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Connect to SolvSutra Super Admin</h1>
              <p className="text-sm text-slate-500">Configure your subscription credentials</p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
            <strong>How to get these credentials:</strong>
            <br />
            1. Login to SolvSutra Super Admin Panel
            <br />
            2. Go to <strong>Projects</strong> → open your project&apos;s details
            <br />
            3. Copy the <strong>API Key</strong> and <strong>Project ID (PRJ_...)</strong>
          </div>

          <form onSubmit={handleSetup} className="space-y-4">
            <Input label="Project ID" required value={setupProjectId} onChange={(e) => setSetupProjectId(e.target.value)} placeholder="PRJ_48F4D43C58B3" />
            <Input label="API Key" required value={setupApiKey} onChange={(e) => setSetupApiKey(e.target.value)} placeholder="ss_xxxxxxxxxxxxxxxxxxxxxxxx" />
            <Button type="submit" className="w-full" disabled={connecting} loading={connecting}>
              {connecting ? "Checking credentials…" : "Connect & View Subscription"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const StatusIcon = statusInfo?.icon || FiCheckCircle;

  return (
    <div className="space-y-6">
      <PageHeader
        title="સબ્સ્ક્રિપ્શન (Subscription)"
        description="Manage your plan, expiry & renewals"
        actions={
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              loadData();
              // Also force the backend to re-check, otherwise the page shows
              // fresh figures (fetched straight from SolvSutra) while the
              // read-only banner keeps rendering the cached verdict.
              window.dispatchEvent(new Event("subscription:refresh"));
            }}
            title="Refresh"
            allowWhenReadOnly
          >
            <FiRefreshCw className="h-4 w-4" />
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 items-start">
      {!subscription ? (
        <Card className="py-10 text-center">
          <FiAlertTriangle className="mx-auto mb-3 h-12 w-12 text-amber-500" />
          <h3 className="mb-2 font-semibold text-slate-900">No Active Subscription</h3>
          <p className="mb-4 text-sm text-slate-500">Choose a plan below to get started</p>
          <Button onClick={() => setShowPlans(true)} allowWhenReadOnly>View Plans</Button>
        </Card>
      ) : (
          <Card className={`border-2 ${statusInfo?.tone}`}>
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600">
                  <FiCreditCard className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{subscription.plan.name}</h2>
                  <p className="text-sm text-slate-600">Server &amp; Database Hosting</p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusInfo?.badge}`}>{statusInfo?.label}</span>
            </div>

            <div className={`mb-6 flex items-center gap-2 ${statusInfo?.text}`}>
              <StatusIcon className="h-5 w-5" />
              <span className="font-semibold">{statusInfo?.message}</span>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="mb-1 text-xs text-slate-500">Start Date</p>
                <p className="flex items-center gap-2 font-bold text-slate-900">
                  <FiCalendar className="h-4 w-4 text-slate-400" />
                  {new Date(subscription.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="mb-1 text-xs text-slate-500">Expiry Date</p>
                <p className="flex items-center gap-2 font-bold text-slate-900">
                  <FiCalendar className="h-4 w-4 text-slate-400" />
                  {new Date(subscription.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="mb-1 text-xs text-slate-500">Plan Price</p>
                <p className="flex items-center gap-2 font-bold text-slate-900">
                  <FiCreditCard className="h-4 w-4 text-slate-400" />{formatCurrency(subscription.plan.price)} / {subscription.plan.durationUnit}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Renewals</p>
                <p className="font-semibold text-slate-900">{subscription.renewalCount} times</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Grace Period</p>
                <p className="font-semibold text-slate-900">{subscription.gracePeriodDays} days</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Subscription ID</p>
                <p className="font-mono text-xs text-slate-900">{subscription.subscriptionId}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Auto Renew</p>
                <p className="font-semibold text-slate-900">{subscription.autoRenew ? "✅ Yes" : "❌ No"}</p>
              </div>
            </div>

            {(subscription.project.server || subscription.project.domains?.length > 0) && (
              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                {subscription.project.server && (
                  <div className="flex items-start gap-2">
                    <FiServer className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">Server</p>
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {subscription.project.server.name}
                        {subscription.project.server.provider ? ` (${subscription.project.server.provider})` : ""}
                      </p>
                      {subscription.project.server.ipAddress && (
                        <p className="font-mono text-xs text-slate-500">{subscription.project.server.ipAddress}</p>
                      )}
                    </div>
                  </div>
                )}
                {subscription.project.domains?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <FiGlobe className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{subscription.project.domains.length > 1 ? "Domains" : "Domain"}</p>
                      {subscription.project.domains.map((d) => (
                        <p key={d._id} className="truncate text-sm font-semibold text-slate-900">
                          {d.domain}
                          {d.sslEnabled && <span className="ml-1 text-xs font-normal text-emerald-600">🔒 SSL</span>}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3 border-t border-slate-100 pt-6">
              <Button className="flex-1" loading={renewing} icon={<FiRefreshCw className="h-4 w-4" />} onClick={() => handleRenew()} allowWhenReadOnly>
                Renew Now - {formatCurrency(subscription.plan.price)}
              </Button>
              <Button variant="outline" onClick={() => setShowPlans(true)} allowWhenReadOnly>
                Change Plan
              </Button>
            </div>
          </Card>
      )}

      {!maintenance ? (
        <Card className="py-10 text-center">
          <FiTool className="mx-auto mb-3 h-12 w-12 text-teal-500" />
          <h3 className="mb-2 font-semibold text-slate-900">No Maintenance Plan</h3>
          <p className="mb-4 text-sm text-slate-500">Get ongoing bug fixes and small changes from SolvSutra</p>
          <Button onClick={() => setShowMaintenancePlans(true)} className="bg-teal-600 hover:bg-teal-700" allowWhenReadOnly>
            View Maintenance Plans
          </Button>
        </Card>
      ) : (
        <Card className={`border-2 ${maintenanceStatusInfo?.tone}`}>
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600">
                <FiTool className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{maintenance.plan.name}</h2>
                <p className="text-sm text-slate-600">Maintenance Plan</p>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${maintenanceStatusInfo?.badge}`}>{maintenanceStatusInfo?.label}</span>
          </div>

          <div className={`mb-6 flex items-center gap-2 ${maintenanceStatusInfo?.text}`}>
            {maintenanceStatusInfo && <maintenanceStatusInfo.icon className="h-5 w-5" />}
            <span className="font-semibold">{maintenanceStatusInfo?.message}</span>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-white p-4">
              <p className="mb-1 text-xs text-slate-500">Start Date</p>
              <p className="flex items-center gap-2 font-bold text-slate-900">
                <FiCalendar className="h-4 w-4 text-slate-400" />
                {new Date(maintenance.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4">
              <p className="mb-1 text-xs text-slate-500">Expiry Date</p>
              <p className="flex items-center gap-2 font-bold text-slate-900">
                <FiCalendar className="h-4 w-4 text-slate-400" />
                {new Date(maintenance.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs text-slate-500">Renewals</p>
              <p className="font-semibold text-slate-900">{maintenance.renewalCount} times</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Subscription ID</p>
              <p className="font-mono text-xs text-slate-900">{maintenance.maintenanceSubscriptionId}</p>
            </div>
          </div>

          {!maintenance.plan.isFree && (
            <div className="mt-6 flex gap-3 border-t border-slate-100 pt-6">
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                loading={renewingMaintenance}
                icon={<FiRefreshCw className="h-4 w-4" />}
                onClick={() => handleRenewMaintenance()}
                allowWhenReadOnly
              >
                Renew Now - {formatCurrency(maintenance.plan.price)}
              </Button>
              <Button variant="outline" onClick={() => setShowMaintenancePlans(true)} allowWhenReadOnly>
                Change Plan
              </Button>
            </div>
          )}
        </Card>
      )}
      </div>

          <Card>
            <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <FiFileText className="h-5 w-5 text-indigo-600" /> Payment History
            </h3>
            {payments.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No payments yet</p>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment._id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      {payment.status === "success" ? (
                        <FiCheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : payment.status === "failed" ? (
                        <FiXCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <FiClock className="h-5 w-5 text-amber-600" />
                      )}
                      <div>
                        <p className="text-sm font-semibold">
                          {formatCurrency(payment.amount)} - {payment.planId?.name || payment.maintenancePlanId?.name || "Plan"}
                        </p>
                        <p className="text-xs text-slate-500">{new Date(payment.createdAt).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        payment.status === "success" ? "bg-emerald-100 text-emerald-700" : payment.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

      <Dialog open={showPlans} onClose={() => setShowPlans(false)} title="Available Plans" description="Choose a plan that fits your business" size="lg">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`rounded-xl border-2 p-5 ${subscription?.plan.name === plan.name ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                {subscription?.plan.name === plan.name && <span className="rounded-full bg-indigo-600 px-2 py-1 text-xs font-bold text-white">Current</span>}
              </div>
              <p className="mb-3 text-sm text-slate-500">{plan.description}</p>
              <div className="mb-3">
                <span className="text-3xl font-bold text-slate-900">{formatCurrency(plan.price)}</span>
                <span className="text-sm text-slate-500"> / {plan.durationUnit}</span>
              </div>
              {plan.features && plan.features.length > 0 && (
                <ul className="mb-4 space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <FiCheckCircle className="h-4 w-4 shrink-0 text-emerald-600" /> {f}
                    </li>
                  ))}
                </ul>
              )}
              {!plan.isFree && subscription?.plan.name !== plan.name && (
                <Button
                  className="w-full"
                  loading={renewing}
                  onClick={() => {
                    setShowPlans(false);
                    handleRenew(plan._id);
                  }}
                  allowWhenReadOnly
                >
                  Switch to {plan.name}
                </Button>
              )}
              {plan.isFree && <div className="rounded-lg bg-slate-100 py-2 text-center text-sm text-slate-500">Free Plan</div>}
            </div>
          ))}
        </div>
      </Dialog>

      <Dialog
        open={showMaintenancePlans}
        onClose={() => setShowMaintenancePlans(false)}
        title="Maintenance Plans"
        description="Ongoing bug fixes and small changes from SolvSutra"
        size="lg"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {maintenancePlans.map((plan) => (
            <div
              key={plan._id}
              className={`rounded-xl border-2 p-5 ${maintenance?.plan.name === plan.name ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-teal-300"}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                {maintenance?.plan.name === plan.name && <span className="rounded-full bg-teal-600 px-2 py-1 text-xs font-bold text-white">Current</span>}
              </div>
              <p className="mb-3 text-sm text-slate-500">{plan.description}</p>
              <div className="mb-3">
                <span className="text-3xl font-bold text-slate-900">{formatCurrency(plan.price)}</span>
                <span className="text-sm text-slate-500"> / {plan.durationUnit}</span>
              </div>
              {plan.features && plan.features.length > 0 && (
                <ul className="mb-4 space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <FiCheckCircle className="h-4 w-4 shrink-0 text-emerald-600" /> {f}
                    </li>
                  ))}
                </ul>
              )}
              {!plan.isFree && maintenance?.plan.name !== plan.name && (
                <Button
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  loading={renewingMaintenance}
                  onClick={() => {
                    setShowMaintenancePlans(false);
                    handleRenewMaintenance(plan._id);
                  }}
                  allowWhenReadOnly
                >
                  Switch to {plan.name}
                </Button>
              )}
              {plan.isFree && <div className="rounded-lg bg-slate-100 py-2 text-center text-sm text-slate-500">Free Plan</div>}
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  );
}

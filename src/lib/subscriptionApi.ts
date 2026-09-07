// ============================================================
//  Subscription API Client — Murli Milk Dairy
//
//  Two different destinations live in this file, and they must not be mixed up:
//
//   - `callSuperAdmin(...)` hits the SolvSutra Super Admin, a DIFFERENT
//     backend, authenticated with X-Api-Key/X-Project-Id. These must NOT go
//     through `api` — different host, different auth scheme.
//   - The `*Config` helpers hit THIS app's own backend, so they do use `api`,
//     which already attaches the JWT and handles refresh-on-401.
// ============================================================

import { api } from "./api";
import { API_ENDPOINTS } from "@/services/endpoints";

const SUPER_ADMIN_API = process.env.NEXT_PUBLIC_SUPER_ADMIN_API || "http://localhost:5001/api";

interface SubscriptionData {
  _id: string;
  subscriptionId: string;
  plan: {
    name: string;
    price: number;
    duration: number;
    durationUnit: string;
    features?: string[];
  };
  project: {
    projectName: string;
    projectId: string;
    apiKey: string;
    server: {
      name: string;
      provider?: string;
      ipAddress?: string;
      hostname?: string;
      os?: string;
      ram?: string;
      storage?: string;
      status: string;
    } | null;
    domains: Array<{
      _id: string;
      domain: string;
      type: string;
      sslEnabled: boolean;
      sslExpiry?: string;
      status: string;
      provider?: string;
    }>;
  };
  startDate: string;
  expiryDate: string;
  gracePeriodEndDate: string;
  gracePeriodDays: number;
  status: string;
  renewalCount: number;
  daysRemaining: number;
  gracePeriodDaysRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  autoRenew?: boolean;
  allowed?: boolean;
  accessStatus?: "active" | "grace_period" | "expired" | "suspended" | "cancelled" | "unknown";
  reason?: string;
}

// A purchasable plan template — distinct from SubscriptionData (an active
// subscription record). getPlans() used to (wrongly) declare its return as
// SubscriptionData[], forcing every caller into an `as unknown as Plan[]`
// cast that defeated type-checking on this call site entirely.
interface Plan {
  _id: string;
  name: string;
  description?: string;
  price: number;
  durationUnit: string;
  isFree?: boolean;
  features?: string[];
}

interface MaintenanceSubscriptionData {
  _id: string;
  maintenanceSubscriptionId: string;
  plan: {
    _id: string;
    name: string;
    price: number;
    currency: string;
    duration: number;
    durationUnit: string;
    features?: string[];
    isFree: boolean;
  };
  startDate: string;
  expiryDate: string;
  autoRenew: boolean;
  status: string;
  renewalCount: number;
  lastRenewedAt?: string;
  daysRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

function getConfig() {
  if (typeof window === "undefined") return null;
  return {
    apiKey: localStorage.getItem("solvsutra_api_key") || "",
    projectId: localStorage.getItem("solvsutra_project_id") || "",
  };
}

async function callSuperAdmin(endpoint: string, options: RequestInit = {}) {
  const config = getConfig();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (config?.apiKey) headers["X-Api-Key"] = config.apiKey;
  if (config?.projectId) headers["X-Project-Id"] = config.projectId;

  const res = await fetch(`${SUPER_ADMIN_API}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return data;
}

export const subscriptionApi = {
  async getMySubscription(): Promise<{ subscription: SubscriptionData | null }> {
    return callSuperAdmin("/subscription/public/my", { method: "GET" });
  },

  async getPlans(): Promise<{ plans: Plan[]; razorpayKeyId?: string }> {
    return callSuperAdmin("/subscription/public/plans", { method: "GET" });
  },

  async createRenewalOrder(planId?: string, subscriptionId?: string) {
    return callSuperAdmin("/subscription/public/renew/create-order", {
      method: "POST",
      body: JSON.stringify({ planId, subscriptionId }),
    });
  },

  async verifyRenewalPayment(payload: {
    paymentId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    return callSuperAdmin("/subscription/public/renew/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getPayments(): Promise<{ payments: unknown[] }> {
    return callSuperAdmin("/subscription/public/payments", { method: "GET" });
  },

  /**
   * Non-blocking maintenance-plan status. Unlike everything else here, this
   * never gates writes — it's purely "should we show a banner asking this
   * project to buy a maintenance plan", decided entirely on SolvSutra's side.
   */
  async getMaintenanceStatus(): Promise<{
    show: boolean;
    hasActivePlan: boolean;
    activePlanName: string | null;
    activePlanIsFree: boolean;
    activePlanExpiry: string | null;
  }> {
    return callSuperAdmin("/subscription/public/maintenance", { method: "GET" });
  },

  /**
   * Full maintenance-subscription detail — same idea as getMySubscription
   * above, for the maintenance plan instead of hosting.
   */
  async getMyMaintenance(): Promise<{ maintenanceSubscription: MaintenanceSubscriptionData | null }> {
    return callSuperAdmin("/subscription/public/maintenance/my", { method: "GET" });
  },

  /** Available maintenance plans to buy/switch to. */
  async getMaintenancePlans(): Promise<{ plans: Plan[]; razorpayKeyId?: string }> {
    return callSuperAdmin("/subscription/public/maintenance/plans", { method: "GET" });
  },

  /** Create Razorpay order for a maintenance plan purchase/renewal. */
  async createMaintenanceRenewalOrder(maintenancePlanId?: string, maintenanceSubscriptionId?: string) {
    return callSuperAdmin("/subscription/public/maintenance/renew/create-order", {
      method: "POST",
      body: JSON.stringify({ maintenancePlanId, maintenanceSubscriptionId }),
    });
  },

  /** Verify a maintenance plan payment & apply the renewal/switch. */
  async verifyMaintenanceRenewalPayment(payload: {
    paymentId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    return callSuperAdmin("/subscription/public/maintenance/renew/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Save the credentials to OUR backend, which verifies them against SolvSutra
   * and stores them so the write-lock can use the same values. They are also
   * mirrored into localStorage because the calls above talk to SolvSutra
   * straight from the browser.
   *
   * One place to enter them; both halves get configured.
   */
  async saveConfig(apiKey: string, projectId: string, apiUrl?: string) {
    // Send the SolvSutra URL the browser itself is using. Our backend has no
    // way to guess it, and its own default (localhost:5001) is wrong on any
    // real deployment — which shows up as "fetch failed" when saving.
    const { data } = await api.put(API_ENDPOINTS.SUBSCRIPTION_CONFIG, {
      apiKey,
      projectId,
      apiUrl: apiUrl || SUPER_ADMIN_API,
    });

    localStorage.setItem("solvsutra_api_key", apiKey);
    localStorage.setItem("solvsutra_project_id", projectId);
    return data;
  },

  /**
   * Pull the credentials the backend already holds into this browser, so a
   * second device/browser doesn't have to be configured again.
   * Returns true when this browser is now configured.
   */
  async hydrateFromBackend(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    try {
      const res = await api.get(API_ENDPOINTS.SUBSCRIPTION_CONFIG);
      const data = res.data?.data;
      if (data?.configured && data.apiKey) {
        localStorage.setItem("solvsutra_api_key", data.apiKey);
        if (data.projectId) localStorage.setItem("solvsutra_project_id", data.projectId);
        return true;
      }
    } catch {
      // Backend unreachable — fall back to whatever this browser already has.
    }
    return this.hasConfig();
  },

  /** Remove the stored credentials from the backend and this browser. */
  async disconnect() {
    try {
      await api.delete(API_ENDPOINTS.SUBSCRIPTION_CONFIG);
    } catch {
      // Even if the backend call fails, clear this browser.
    }
    this.clearConfig();
  },

  hasConfig(): boolean {
    const config = getConfig();
    return !!(config?.apiKey && config?.projectId);
  },

  clearConfig() {
    localStorage.removeItem("solvsutra_api_key");
    localStorage.removeItem("solvsutra_project_id");
  },
};

export default subscriptionApi;
export type { SubscriptionData, Plan, MaintenanceSubscriptionData };

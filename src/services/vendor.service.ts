import { api } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";
import type { ListParams } from "./types";

export const vendorService = {
  list: (params?: ListParams) => api.get(API_ENDPOINTS.VENDORS, { params }),
  getById: (id: string) => api.get(API_ENDPOINTS.VENDOR_BY_ID(id)),
  create: (payload: Record<string, unknown>) => api.post(API_ENDPOINTS.VENDORS, payload),
  update: (id: string, payload: Record<string, unknown>) => api.put(API_ENDPOINTS.VENDOR_BY_ID(id), payload),
  remove: (id: string) => api.delete(API_ENDPOINTS.VENDOR_BY_ID(id)),
  toggleStatus: (id: string) => api.patch(API_ENDPOINTS.VENDOR_TOGGLE_STATUS(id)),
  getLedger: (id: string, params?: ListParams) => api.get(API_ENDPOINTS.VENDOR_LEDGER(id), { params }),

  /** Active vendors for dropdowns — no pagination UI, just a bounded select list. */
  listActive: (limit = 500) => api.get(API_ENDPOINTS.VENDORS, { params: { limit, isActive: "true" } }),
};

export const vendorPaymentService = {
  create: (payload: Record<string, unknown>) => api.post(API_ENDPOINTS.VENDOR_PAYMENTS, payload),
  outstandingReport: () => api.get(API_ENDPOINTS.VENDOR_PAYMENTS_OUTSTANDING_REPORT),
};

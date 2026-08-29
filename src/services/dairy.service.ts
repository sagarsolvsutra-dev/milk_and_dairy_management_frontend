import { api } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";
import type { ListParams } from "./types";

export const dairyService = {
  list: (params?: ListParams) => api.get(API_ENDPOINTS.DAIRIES, { params }),
  getById: (id: string) => api.get(API_ENDPOINTS.DAIRY_BY_ID(id)),
  create: (payload: Record<string, unknown>) => api.post(API_ENDPOINTS.DAIRIES, payload),
  update: (id: string, payload: Record<string, unknown>) => api.put(API_ENDPOINTS.DAIRY_BY_ID(id), payload),
  remove: (id: string) => api.delete(API_ENDPOINTS.DAIRY_BY_ID(id)),
  toggleStatus: (id: string) => api.patch(API_ENDPOINTS.DAIRY_TOGGLE_STATUS(id)),
  resetPassword: (id: string, password: string) => api.patch(API_ENDPOINTS.DAIRY_RESET_PASSWORD(id), { password }),
  getSummary: (id: string, params?: ListParams) => api.get(API_ENDPOINTS.DAIRY_SUMMARY(id), { params }),

  /** Active dairies for dropdowns (dispatch destination select) — an inactive branch shouldn't be dispatchable to. */
  listActive: (limit = 500) => api.get(API_ENDPOINTS.DAIRIES, { params: { limit, status: "active" } }),
};

import { api } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";
import type { ListParams } from "./types";

export const itemService = {
  list: (params?: ListParams) => api.get(API_ENDPOINTS.ITEMS, { params }),
  getById: (id: string) => api.get(API_ENDPOINTS.ITEM_BY_ID(id)),
  create: (payload: Record<string, unknown>) => api.post(API_ENDPOINTS.ITEMS, payload),
  update: (id: string, payload: Record<string, unknown>) => api.put(API_ENDPOINTS.ITEM_BY_ID(id), payload),
  remove: (id: string) => api.delete(API_ENDPOINTS.ITEM_BY_ID(id)),
  toggleStatus: (id: string) => api.patch(API_ENDPOINTS.ITEM_TOGGLE_STATUS(id)),

  /** Active items for dropdowns (production/dispatch/billing item rows). */
  listActive: (limit = 500) => api.get(API_ENDPOINTS.ITEMS, { params: { limit, isActive: "true" } }),
};

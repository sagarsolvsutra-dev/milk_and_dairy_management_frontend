import { api } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";
import type { ListParams } from "./types";

export const purchaseService = {
  list: (params?: ListParams) => api.get(API_ENDPOINTS.PURCHASES, { params }),
  getById: (id: string) => api.get(API_ENDPOINTS.PURCHASE_BY_ID(id)),
  create: (payload: Record<string, unknown>) => api.post(API_ENDPOINTS.PURCHASES, payload),
  update: (id: string, payload: Record<string, unknown>) => api.put(API_ENDPOINTS.PURCHASE_BY_ID(id), payload),
  cancel: (id: string) => api.patch(API_ENDPOINTS.PURCHASE_CANCEL(id)),
};

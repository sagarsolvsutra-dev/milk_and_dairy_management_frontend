import { api } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";
import type { ListParams } from "./types";

export const productionService = {
  list: (params?: ListParams) => api.get(API_ENDPOINTS.PRODUCTION, { params }),
  getById: (id: string) => api.get(API_ENDPOINTS.PRODUCTION_BY_ID(id)),
  create: (payload: Record<string, unknown>) => api.post(API_ENDPOINTS.PRODUCTION, payload),
  update: (id: string, payload: Record<string, unknown>) => api.put(API_ENDPOINTS.PRODUCTION_BY_ID(id), payload),
  cancel: (id: string) => api.patch(API_ENDPOINTS.PRODUCTION_CANCEL(id)),
};

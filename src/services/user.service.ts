import { api } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";
import type { ListParams } from "./types";

export const userService = {
  list: (params?: ListParams) => api.get(API_ENDPOINTS.USERS, { params }),
  create: (payload: Record<string, unknown>) => api.post(API_ENDPOINTS.USERS, payload),
  update: (id: string, payload: Record<string, unknown>) => api.put(API_ENDPOINTS.USER_BY_ID(id), payload),
  toggleStatus: (id: string) => api.patch(API_ENDPOINTS.USER_TOGGLE_STATUS(id)),
  resetPassword: (id: string, password: string) => api.patch(API_ENDPOINTS.USER_RESET_PASSWORD(id), { password }),
};

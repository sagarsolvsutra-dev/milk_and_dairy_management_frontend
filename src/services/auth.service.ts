import { api } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";
import type { AuthUser } from "@/types";

export const authService = {
  login: (loginId: string, password: string) =>
    api.post<{ success: boolean; data: { accessToken: string; user: AuthUser } }>(API_ENDPOINTS.LOGIN, { loginId, password }),

  logout: () => api.post(API_ENDPOINTS.LOGOUT),
};

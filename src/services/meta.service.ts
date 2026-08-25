import { api } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";

export const metaService = {
  getPermissionModules: () => api.get(API_ENDPOINTS.PERMISSION_MODULES),
};

export const notificationService = {
  list: () => api.get(API_ENDPOINTS.NOTIFICATIONS),
};

export const dashboardService = {
  getSuperAdmin: () => api.get(API_ENDPOINTS.DASHBOARD_SUPER_ADMIN),
  getDairy: () => api.get(API_ENDPOINTS.DASHBOARD_DAIRY),
};

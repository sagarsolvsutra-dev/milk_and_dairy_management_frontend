import { api } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";

export const metaService = {
  getPermissionModules: () => api.get(API_ENDPOINTS.PERMISSION_MODULES),
};

export const notificationService = {
  list: () => api.get(API_ENDPOINTS.NOTIFICATIONS),
  markAsRead: (id: string) => api.patch(API_ENDPOINTS.NOTIFICATION_MARK_READ(id)),
  markAllAsRead: () => api.patch(API_ENDPOINTS.NOTIFICATION_MARK_ALL_READ),
};

export const dashboardService = {
  getSuperAdmin: () => api.get(API_ENDPOINTS.DASHBOARD_SUPER_ADMIN),
  getDairy: () => api.get(API_ENDPOINTS.DASHBOARD_DAIRY),
  getAnalytics: () => api.get(API_ENDPOINTS.DASHBOARD_ANALYTICS),
};

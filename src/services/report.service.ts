import { api } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";

export type ReportKey = "milk-purchase" | "production" | "dispatch" | "dairy-sales" | "item-wise-sales" | "stock" | "profit";

export const reportService = {
  get: (key: ReportKey, params: Record<string, string | number | undefined>) => api.get(API_ENDPOINTS.REPORT(key), { params }),
};

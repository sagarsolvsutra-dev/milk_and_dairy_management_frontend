import { api } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";
import type { ListParams } from "./types";

export const inventoryService = {
  getMilkStock: () => api.get(API_ENDPOINTS.INVENTORY_MILK_STOCK),
  getCentralItemStock: () => api.get(API_ENDPOINTS.INVENTORY_CENTRAL_ITEM_STOCK),
  getDairyComparison: () => api.get(API_ENDPOINTS.INVENTORY_DAIRY_COMPARISON),
  getReconciliation: () => api.get(API_ENDPOINTS.INVENTORY_RECONCILIATION),
  getDairyStock: (params?: ListParams) => api.get(API_ENDPOINTS.INVENTORY_DAIRY_STOCK, { params }),
};

import { api } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";
import type { ListParams } from "./types";

export const inventoryService = {
  getMilkStock: () => api.get(API_ENDPOINTS.INVENTORY_MILK_STOCK),
  getCentralItemStock: (params?: ListParams) => api.get(API_ENDPOINTS.INVENTORY_CENTRAL_ITEM_STOCK, { params }),
  getDairyComparison: () => api.get(API_ENDPOINTS.INVENTORY_DAIRY_COMPARISON),
  getReconciliation: (params?: ListParams) => api.get(API_ENDPOINTS.INVENTORY_RECONCILIATION, { params }),
  getDairyStock: (params?: ListParams) => api.get(API_ENDPOINTS.INVENTORY_DAIRY_STOCK, { params }),
  getConsolidatedStock: () => api.get(API_ENDPOINTS.INVENTORY_CONSOLIDATED_STOCK),
  getStockTrace: (itemId: string, params?: ListParams) => api.get(API_ENDPOINTS.INVENTORY_STOCK_TRACE(itemId), { params }),
  getAdjustments: (params?: ListParams) => api.get(API_ENDPOINTS.INVENTORY_ADJUSTMENTS, { params }),
  createAdjustment: (payload: {
    stockType: "central_item" | "dairy_item";
    dairy?: string;
    item: string;
    quantity: number;
    reason: string;
  }) => api.post(API_ENDPOINTS.INVENTORY_ADJUSTMENTS, payload),
};

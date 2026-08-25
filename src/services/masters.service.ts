import { api } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";
import type { ListParams } from "./types";

/**
 * Generic CRUD service for the simple master lists (Units, GST Slabs, Cities,
 * Bank Details, Terms) — they all share the same factory-backed REST shape on
 * the backend, so `SimpleMasterManager` drives all of them through one client.
 */
export const createMasterService = (endpoint: string) => ({
  list: (params?: ListParams) => api.get(endpoint, { params }),
  create: (payload: Record<string, unknown>) => api.post(endpoint, payload),
  update: (id: string, payload: Record<string, unknown>) => api.put(`${endpoint}/${id}`, payload),
  remove: (id: string) => api.delete(`${endpoint}/${id}`),
  toggleStatus: (id: string) => api.patch(`${endpoint}/${id}/toggle-status`),
});

export const unitService = createMasterService(API_ENDPOINTS.MASTER_UNITS);
export const gstSlabService = createMasterService(API_ENDPOINTS.MASTER_GST_SLABS);
export const cityService = createMasterService(API_ENDPOINTS.MASTER_CITIES);
export const termsService = createMasterService(API_ENDPOINTS.MASTER_TERMS);

// Bank details have no active/inactive concept on the backend (no isActive
// field, route mounted with hasToggle: false) — built without toggleStatus
// so calling it can't 404 by mistake.
const bankDetailBase = createMasterService(API_ENDPOINTS.MASTER_BANK_DETAILS);
export const bankDetailService = {
  list: bankDetailBase.list,
  create: bankDetailBase.create,
  update: bankDetailBase.update,
  remove: bankDetailBase.remove,
};

/**
 * Bounded dropdown fetches (units/GST slabs used when building an Item, cities
 * used when building a Vendor) — filtered to active-only, since an inactive
 * master shouldn't be selectable on a brand-new record.
 */
export const mastersDropdownService = {
  listUnits: (limit = 200) => api.get(API_ENDPOINTS.MASTER_UNITS, { params: { limit, isActive: "true" } }),
  listGstSlabs: (limit = 200) => api.get(API_ENDPOINTS.MASTER_GST_SLABS, { params: { limit, isActive: "true" } }),
  listCities: (limit = 200) => api.get(API_ENDPOINTS.MASTER_CITIES, { params: { limit, isActive: "true" } }),
};

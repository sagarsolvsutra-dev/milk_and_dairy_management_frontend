/**
 * Single source of truth for every backend API path used by the frontend.
 * All `*.service.ts` files build their requests from here — no other file
 * should hardcode a `"/..."` path string when calling `api`.
 *
 * Paths are relative (the `api` axios instance in `lib/api.ts` already
 * carries the base URL), and any endpoint that needs a dynamic id/segment
 * is a small function instead of a plain string.
 */
export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/auth/login",
  LOGOUT: "/auth/logout",

  // Vendors
  VENDORS: "/vendors",
  VENDOR_BY_ID: (id: string) => `/vendors/${id}`,
  VENDOR_TOGGLE_STATUS: (id: string) => `/vendors/${id}/toggle-status`,
  VENDOR_LEDGER: (id: string) => `/vendors/${id}/ledger`,

  // Vendor Payments
  VENDOR_PAYMENTS: "/vendor-payments",
  VENDOR_PAYMENTS_OUTSTANDING_REPORT: "/vendor-payments/outstanding-report",

  // Items
  ITEMS: "/items",
  ITEM_BY_ID: (id: string) => `/items/${id}`,
  ITEM_TOGGLE_STATUS: (id: string) => `/items/${id}/toggle-status`,

  // Dairies
  DAIRIES: "/dairies",
  DAIRY_BY_ID: (id: string) => `/dairies/${id}`,
  DAIRY_TOGGLE_STATUS: (id: string) => `/dairies/${id}/toggle-status`,
  DAIRY_RESET_PASSWORD: (id: string) => `/dairies/${id}/reset-password`,
  DAIRY_SUMMARY: (id: string) => `/dairies/${id}/summary`,

  // Purchases
  PURCHASES: "/purchases",
  PURCHASE_BY_ID: (id: string) => `/purchases/${id}`,
  PURCHASE_CANCEL: (id: string) => `/purchases/${id}/cancel`,

  // Production
  PRODUCTION: "/production",
  PRODUCTION_BY_ID: (id: string) => `/production/${id}`,
  PRODUCTION_CANCEL: (id: string) => `/production/${id}/cancel`,

  // Dispatch
  DISPATCH: "/dispatch",
  DISPATCH_BY_ID: (id: string) => `/dispatch/${id}`,
  DISPATCH_CANCEL: (id: string) => `/dispatch/${id}/cancel`,

  // Bills
  BILLS: "/bills",
  BILL_BY_ID: (id: string) => `/bills/${id}`,
  BILL_CANCEL: (id: string) => `/bills/${id}/cancel`,
  BILL_PDF: (id: string) => `/bills/${id}/pdf`,

  // Users / Team
  USERS: "/users",
  USER_BY_ID: (id: string) => `/users/${id}`,
  USER_TOGGLE_STATUS: (id: string) => `/users/${id}/toggle-status`,
  USER_RESET_PASSWORD: (id: string) => `/users/${id}/reset-password`,

  // Masters (Units, GST Slabs, Cities, Bank Details, Terms — same REST shape)
  MASTER_UNITS: "/masters/units",
  MASTER_GST_SLABS: "/masters/gst-slabs",
  MASTER_CITIES: "/masters/cities",
  MASTER_BANK_DETAILS: "/masters/bank-details",
  MASTER_TERMS: "/masters/terms",

  // Inventory
  INVENTORY_MILK_STOCK: "/inventory/milk-stock",
  INVENTORY_CENTRAL_ITEM_STOCK: "/inventory/central-item-stock",
  INVENTORY_DAIRY_COMPARISON: "/inventory/dairy-comparison",
  INVENTORY_RECONCILIATION: "/inventory/reconciliation",
  INVENTORY_DAIRY_STOCK: "/inventory/dairy-stock",

  // Reports
  REPORT: (key: string) => `/reports/${key}`,

  // Meta / Misc
  PERMISSION_MODULES: "/meta/permission-modules",
  NOTIFICATIONS: "/notifications",
  DASHBOARD_SUPER_ADMIN: "/dashboard/super-admin",
  DASHBOARD_DAIRY: "/dashboard/dairy",
} as const;

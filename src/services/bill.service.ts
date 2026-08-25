import { api, downloadFile } from "@/lib/api";
import { API_ENDPOINTS } from "./endpoints";
import type { ListParams } from "./types";

export const billService = {
  list: (params?: ListParams) => api.get(API_ENDPOINTS.BILLS, { params }),
  getById: (id: string) => api.get(API_ENDPOINTS.BILL_BY_ID(id)),
  create: (payload: Record<string, unknown>) => api.post(API_ENDPOINTS.BILLS, payload),
  cancel: (id: string) => api.patch(API_ENDPOINTS.BILL_CANCEL(id)),
  downloadPdf: (id: string, billNo: string) => downloadFile(API_ENDPOINTS.BILL_PDF(id), `Bill-${billNo}.pdf`),
};

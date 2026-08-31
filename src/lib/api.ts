import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { API_ENDPOINTS } from "@/services/endpoints";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  // Needed so the browser actually sends/receives the httpOnly refreshToken
  // cookie on cross-origin requests — normal auth still rides the
  // Authorization header set below, this only matters for /auth/refresh.
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const logoutAndRedirect = () => {
  useAuthStore.getState().clearAuth();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
};

// A single in-flight refresh is shared across every request that hits a 401
// at the same time (e.g. a page firing several requests in parallel right as
// the access token expires) — without this, each would independently try to
// refresh, and only the first response's rotated refresh token would still
// be valid for the rest.
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = api
      .post(API_ENDPOINTS.AUTH_REFRESH)
      .then((res) => {
        const { accessToken, user } = res.data.data;
        useAuthStore.getState().setAuth(accessToken, user);
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginEndpoint = originalRequest?.url === API_ENDPOINTS.LOGIN;
    const isRefreshEndpoint = originalRequest?.url === API_ENDPOINTS.AUTH_REFRESH;
    // A 401 from change-password means "current password is incorrect" — a
    // business-logic rejection unrelated to session validity, not a signal
    // that the access token expired. Treating it like any other 401 would
    // trigger a (successful) silent refresh, retry with the same wrong
    // password, get 401 again, and force-logout the user over a typo.
    const isChangePasswordEndpoint = originalRequest?.url === API_ENDPOINTS.AUTH_CHANGE_PASSWORD;
    const isAuthEndpoint = isLoginEndpoint || isRefreshEndpoint || isChangePasswordEndpoint;

    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest?._retriedAfterRefresh) {
      originalRequest._retriedAfterRefresh = true;
      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        logoutAndRedirect();
        return Promise.reject(error);
      }
    }

    // A wrong-password 401 on the login form itself says nothing about the
    // validity of any EXISTING session — it isn't tied to one at all — so it
    // must not clear the persisted auth store. Left unguarded, this would
    // wipe another tab's active session too, since login/session state share
    // the same localStorage key across tabs.
    if (error.response?.status === 401 && !isLoginEndpoint && !isChangePasswordEndpoint) {
      logoutAndRedirect();
    }
    return Promise.reject(error);
  }
);

export async function downloadFile(url: string, filename: string): Promise<void> {
  const response = await api.get(url, { responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

// Opens a PDF in a new tab using the browser's own PDF viewer (which has its
// own print button/shortcut) instead of window.print()-ing the current page —
// there's no print stylesheet in this app, so printing the page itself would
// print the sidebar/topbar/dashboard chrome around the content, not a clean
// document. The tab is opened synchronously (before the fetch) so it carries
// the click's user-gesture and isn't blocked as a popup once the blob resolves.
export async function openFileForPrint(url: string): Promise<void> {
  const printWindow = window.open("", "_blank");
  try {
    const response = await api.get(url, { responseType: "blob" });
    const blobUrl = window.URL.createObjectURL(response.data);
    if (printWindow) {
      printWindow.location.href = blobUrl;
    } else {
      window.open(blobUrl, "_blank");
    }
  } catch (err) {
    printWindow?.close();
    throw err;
  }
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || "Something went wrong";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

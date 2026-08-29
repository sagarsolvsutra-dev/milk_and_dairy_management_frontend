"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiInfo,
  FiX,
} from "react-icons/fi";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
};

type ToastContextValue = {
  showToast: (type: ToastType, message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, React.ElementType> = {
  success: FiCheckCircle,
  error: FiXCircle,
  warning: FiAlertTriangle,
  info: FiInfo,
};

const STYLES: Record<ToastType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

const ICON_STYLES: Record<ToastType, string> = {
  success: "text-emerald-500",
  error: "text-red-500",
  warning: "text-amber-500",
  info: "text-sky-500",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, type, message, title }]);
      window.setTimeout(() => remove(id), 4500);
    },
    [remove]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message, title) => showToast("success", message, title),
      error: (message, title) => showToast("error", message, title),
      warning: (message, title) => showToast("warning", message, title),
      info: (message, title) => showToast("info", message, title),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div
              key={toast.id}
              role="alert"
              className={cn(
                "animate-toast-in flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm",
                STYLES[toast.type]
              )}
            >
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", ICON_STYLES[toast.type])} />
              <div className="flex-1 text-sm">
                {toast.title && <p className="font-semibold">{toast.title}</p>}
                <p>{toast.message}</p>
              </div>
              <button
                onClick={() => remove(toast.id)}
                className="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
                aria-label="Dismiss"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

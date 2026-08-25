"use client";

import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiInfo } from "react-icons/fi";
import { cn } from "@/lib/utils";

type AlertType = "success" | "error" | "warning" | "info";

type AlertProps = {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const ICONS: Record<AlertType, React.ElementType> = {
  success: FiCheckCircle,
  error: FiXCircle,
  warning: FiAlertTriangle,
  info: FiInfo,
};

const STYLES: Record<AlertType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 [&_svg]:text-emerald-500",
  error: "border-red-200 bg-red-50 text-red-800 [&_svg]:text-red-500",
  warning: "border-amber-200 bg-amber-50 text-amber-800 [&_svg]:text-amber-500",
  info: "border-sky-200 bg-sky-50 text-sky-800 [&_svg]:text-sky-500",
};

export function Alert({ type = "info", title, children, className }: AlertProps) {
  const Icon = ICONS[type];
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", STYLES[type], className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

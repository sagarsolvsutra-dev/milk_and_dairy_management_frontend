import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number | undefined | null): string {
  const num = value ?? 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(value: number | undefined | null): string {
  return new Intl.NumberFormat("en-IN").format(value ?? 0);
}

// Mirrors milk_backend/src/utils/milkUnitConversion.js — an Item's
// recipe.milkUnit can be ml/g (a Bottle/Packet's own packaging measurement)
// as well as the original KG/L, but Milk Stock is always tracked in Litres.
// Used only for the live "Milk Used" preview in the Production Entry form;
// the backend re-derives the authoritative value itself on submit.
const MILK_UNIT_FACTOR: Record<string, number> = { KG: 1, kg: 1, L: 1, Litre: 1, litre: 1, ml: 0.001, g: 0.001 };

export function milkUnitFactor(unit: string | undefined | null): number {
  return unit ? (MILK_UNIT_FACTOR[unit] ?? 1) : 1;
}

export function formatDate(value: string | Date | undefined | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(value: string | Date | undefined | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDateInputValue(value: string | Date | undefined | null): string {
  const d = value ? new Date(value) : new Date();
  if (isNaN(d.getTime())) return "";
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

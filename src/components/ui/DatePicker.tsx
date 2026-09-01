"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
  placeholder?: string;
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// This app stores every date as a plain "YYYY-MM-DD" string (the same shape
// a native <input type="date"> produces) — parse/format against local
// calendar fields, never through Date's own UTC-based ISO parsing, so a
// selected day never shifts by a timezone offset.
function parseValue(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(value: string): string {
  const date = parseValue(value);
  if (!date) return "";
  return `${String(date.getDate()).padStart(2, "0")} ${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DatePicker({
  label,
  value,
  onChange,
  required,
  error,
  hint,
  wrapperClassName,
  placeholder = "Select date",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseValue(value) || new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // Re-center the calendar on whatever's currently selected every time it
  // opens, rather than wherever it was last left scrolled to.
  useEffect(() => {
    if (open) setViewDate(parseValue(value) || new Date());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selected = parseValue(value);
  const today = new Date();

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first grid
    const gridStart = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }, [viewDate]);

  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={id}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex h-9.5 w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-left text-sm transition-colors",
            "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100",
            error && "border-red-400 focus:border-red-500 focus:ring-red-100",
            !value && "text-slate-400"
          )}
        >
          <FiCalendar className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="flex-1 truncate text-slate-900">{value ? formatDisplay(value) : <span className="text-slate-400">{placeholder}</span>}</span>
        </button>

        {open && (
          <div className="absolute z-20 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Previous month"
              >
                <FiChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-slate-800">
                {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Next month"
              >
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {days.map((d) => {
                const inMonth = d.getMonth() === viewDate.getMonth();
                const isSelected = selected ? isSameDay(d, selected) : false;
                const isToday = isSameDay(d, today);
                return (
                  <div key={d.toISOString()} className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        onChange(formatValue(d));
                        setOpen(false);
                      }}
                      className={cn(
                        "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-sm transition-colors",
                        !inMonth && "text-slate-300 hover:bg-slate-50",
                        inMonth && !isSelected && "text-slate-700 hover:bg-indigo-50",
                        isSelected && "bg-indigo-600 font-semibold text-white hover:bg-indigo-600",
                        isToday && !isSelected && "font-semibold text-indigo-600"
                      )}
                    >
                      {d.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-medium">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="cursor-pointer text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(formatValue(today));
                  setOpen(false);
                }}
                className="cursor-pointer text-indigo-600 hover:text-indigo-700"
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

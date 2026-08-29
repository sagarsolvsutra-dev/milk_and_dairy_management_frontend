"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Page size — used only to compute the "X-Y of Z" summary text. */
  limit?: number;
};

export function Pagination({ page, pages, total, onPageChange, limit = 10 }: PaginationProps) {
  const [jumpValue, setJumpValue] = useState(String(page));

  useEffect(() => {
    setJumpValue(String(page));
  }, [page]);

  if (pages <= 1) return null;

  const rangeStart = (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  const goToPage = (target: number) => {
    const clamped = Math.min(pages, Math.max(1, target));
    onPageChange(clamped);
  };

  const handleJump = () => {
    const parsed = parseInt(jumpValue, 10);
    if (!Number.isNaN(parsed)) goToPage(parsed);
    else setJumpValue(String(page));
  };

  const pageNumbers: (number | "ellipsis")[] = [];
  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(pages, page + 2);

  if (windowStart > 1) {
    pageNumbers.push(1);
    if (windowStart > 2) pageNumbers.push("ellipsis");
  }
  for (let i = windowStart; i <= windowEnd; i++) pageNumbers.push(i);
  if (windowEnd < pages) {
    if (windowEnd < pages - 1) pageNumbers.push("ellipsis");
    pageNumbers.push(pages);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 px-1 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹ પાછળ
        </button>

        {pageNumbers.map((p, i) =>
          p === "ellipsis" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={cn(
                "h-8 min-w-8 cursor-pointer rounded-lg border px-2.5 text-sm font-medium transition-colors",
                p === page ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => goToPage(page + 1)}
          disabled={page >= pages}
          className="flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          આગળ ›
        </button>

        <div className="ml-1 flex items-center gap-1.5 text-sm text-slate-500">
          <span>પાનું</span>
          <input
            type="number"
            min={1}
            max={pages}
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleJump();
            }}
            className="h-8 w-16 rounded-lg border border-slate-300 px-2 text-center text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button onClick={handleJump} className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-700">
            જાઓ
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        {rangeStart.toLocaleString("en-IN")}-{rangeEnd.toLocaleString("en-IN")} / કુલ (of) {total.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

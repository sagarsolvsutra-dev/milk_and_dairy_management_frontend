"use client";

import { FiInbox, FiMoreVertical, FiImage, FiChevronsLeft, FiChevronLeft, FiChevronRight, FiChevronsRight } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";

export type Column<T> = {
  /** Optional stable key for the header cell — falls back to header text / index. */
  key?: string;
  header: string;
  align?: "left" | "center" | "right";
  /** Preferred cell renderer. */
  render?: (row: T, index: number) => React.ReactNode;
  /** Legacy alias — a render function (kept for existing pages) or a plain key lookup. */
  accessor?: ((row: T, index: number) => React.ReactNode) | keyof T;
  className?: string;
  headerClassName?: string;
};

type PaginationConfig = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
  /** Optional — defaults to row.id / row._id / row index when omitted. */
  keyField?: (row: T) => string;
  loading?: boolean;
  isLoading?: boolean;
  skeletonRowsCount?: number;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  /** Optional built-in pagination bar — leave unset to keep using a separate <Pagination>. */
  pagination?: PaginationConfig;
};

const alignClass = (align?: "left" | "center" | "right") =>
  align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

function resolveKey<T>(row: T, keyField: ((row: T) => string) | undefined, index: number): string {
  if (keyField) return keyField(row);
  const anyRow = row as Record<string, unknown>;
  return String(anyRow.id ?? anyRow._id ?? index);
}

function resolveCell<T>(column: Column<T>, row: T, index: number): React.ReactNode {
  if (typeof column.render === "function") return column.render(row, index);
  if (typeof column.accessor === "function") return column.accessor(row, index);
  if (typeof column.accessor === "string") {
    const v = (row as Record<string, unknown>)[column.accessor as string];
    return v === undefined || v === null || v === "" ? <span className="text-slate-400">—</span> : (v as React.ReactNode);
  }
  return null;
}

export function Table<T>({
  columns,
  data,
  keyField,
  loading,
  isLoading,
  skeletonRowsCount = 6,
  emptyMessage = "No records found",
  onRowClick,
  pagination,
}: TableProps<T>) {
  const busy = loading ?? isLoading ?? false;

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="h-11 bg-indigo-600 text-xs font-semibold uppercase tracking-wide text-white">
            {columns.map((column, idx) => (
              <th
                key={column.key || `col-${idx}-${column.header}`}
                className={cn(
                  "whitespace-nowrap border-r border-indigo-500/60 px-4 py-3 font-semibold last:border-r-0",
                  alignClass(column.align),
                  column.headerClassName
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {busy ? (
            Array.from({ length: skeletonRowsCount }).map((_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`} className="h-14">
                {columns.map((column, colIndex) => (
                  <td key={`skeleton-cell-${colIndex}`} className="border-r border-slate-100 px-4 py-3 last:border-r-0">
                    <div
                      className={cn(
                        "h-3.5 animate-pulse rounded-md bg-slate-200",
                        column.align === "center" ? "mx-auto w-16" : column.align === "right" ? "ml-auto w-16" : "w-3/4"
                      )}
                      style={{ animationDelay: `${(rowIndex * columns.length + colIndex) * 30}ms` }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr
                key={resolveKey(row, keyField, rowIndex)}
                onClick={() => onRowClick?.(row)}
                className={cn("h-14 transition-colors hover:bg-slate-50", onRowClick && "cursor-pointer")}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={`${resolveKey(row, keyField, rowIndex)}-${column.key || colIndex}`}
                    className={cn(
                      "whitespace-nowrap border-r border-slate-100 px-4 py-3 text-slate-700 last:border-r-0",
                      alignClass(column.align),
                      column.className
                    )}
                  >
                    {resolveCell(column, row, rowIndex)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <FiInbox className="h-9 w-9 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {pagination && pagination.totalPages > 1 && <TablePagination {...pagination} />}
    </div>
  );
}

function TablePagination({ currentPage, totalPages, onPageChange }: PaginationConfig) {
  const pages: React.ReactNode[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  if (start > 1) {
    pages.push(
      <PageButton key={1} onClick={() => onPageChange(1)}>
        1
      </PageButton>
    );
    if (start > 2) pages.push(<Ellipsis key="dots-start" />);
  }
  for (let i = start; i <= end; i++) {
    pages.push(
      <PageButton key={i} active={i === currentPage} onClick={() => onPageChange(i)}>
        {i}
      </PageButton>
    );
  }
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push(<Ellipsis key="dots-end" />);
    pages.push(
      <PageButton key={totalPages} onClick={() => onPageChange(totalPages)}>
        {totalPages}
      </PageButton>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 p-3">
      <IconPageButton onClick={() => onPageChange(1)} disabled={currentPage === 1} label="First page">
        <FiChevronsLeft className="h-4 w-4" />
      </IconPageButton>
      <IconPageButton onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} label="Previous page">
        <FiChevronLeft className="h-4 w-4" />
      </IconPageButton>
      {pages}
      <IconPageButton onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} label="Next page">
        <FiChevronRight className="h-4 w-4" />
      </IconPageButton>
      <IconPageButton onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} label="Last page">
        <FiChevronsRight className="h-4 w-4" />
      </IconPageButton>
    </div>
  );
}

function PageButton({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 min-w-8 cursor-pointer rounded-lg border px-2.5 text-sm font-medium transition-colors",
        active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}

function IconPageButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Ellipsis() {
  return <span className="px-1 text-slate-400">…</span>;
}

// ---- Optional convenience cell components (theme-matched, opt-in for any page) ----

export function StatusBadge({ status }: { status: "Active" | "Inactive" | string }) {
  const isActive = status?.toLowerCase() === "active";
  return <Badge tone={isActive ? "success" : "danger"}>{status}</Badge>;
}

export function QtyBadge({ qty, alertQty }: { qty: number; alertQty: number }) {
  const isLow = qty <= alertQty;
  return isLow ? (
    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-red-100 bg-red-50 px-2 text-xs font-semibold text-red-600">
      {qty}
    </span>
  ) : (
    <span className="font-medium text-slate-800">{qty}</span>
  );
}

export function ProductNameCell({ name, hsn }: { name: string; hsn?: string }) {
  return (
    <div className="flex flex-col py-1">
      <span className="text-sm font-semibold leading-snug text-slate-800">{name}</span>
      {hsn && <span className="text-[10px] font-medium tracking-wide text-slate-400">HSN: {hsn}</span>}
    </div>
  );
}

export function ProductImageCell({ src }: { src?: string }) {
  return (
    <div className="flex items-center justify-center">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="product" className="h-10 w-10 rounded-lg border border-slate-100 object-cover shadow-sm" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300">
          <FiImage className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

export function ActionsCell({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
    >
      <FiMoreVertical className="h-4.5 w-4.5" />
    </button>
  );
}

"use client";

import { FiX } from "react-icons/fi";
import { DatePicker } from "./DatePicker";

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <DatePicker label="From" value={from} onChange={onFromChange} wrapperClassName="w-44" />
      <DatePicker label="To" value={to} onChange={onToChange} wrapperClassName="w-44" />
      {(from || to) && (
        <button
          type="button"
          onClick={onClear}
          className="flex h-9.5 shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
        >
          <FiX className="h-4 w-4" /> Clear
        </button>
      )}
    </div>
  );
}

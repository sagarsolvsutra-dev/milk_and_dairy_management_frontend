"use client";

import { FiX } from "react-icons/fi";
import { Input } from "./Input";

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
      <Input label="થી (From)" type="date" value={from} onChange={(e) => onFromChange(e.target.value)} wrapperClassName="w-40" />
      <Input label="સુધી (To)" type="date" value={to} onChange={(e) => onToChange(e.target.value)} wrapperClassName="w-40" />
      {(from || to) && (
        <button
          type="button"
          onClick={onClear}
          className="flex h-9.5 shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
        >
          <FiX className="h-4 w-4" /> સાફ કરો (Clear)
        </button>
      )}
    </div>
  );
}

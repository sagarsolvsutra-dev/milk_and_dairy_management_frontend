"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown, FiSearch } from "react-icons/fi";
import { cn } from "@/lib/utils";

export type SelectOption = { label: string; value: string };

interface SelectProps {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  wrapperClassName?: string;
  className?: string;
}

const SEARCH_THRESHOLD = 6;

export function Select({
  label,
  error,
  hint,
  options,
  placeholder = "પસંદ કરો... (Select...)",
  value = "",
  onChange,
  required,
  disabled,
  name,
  id,
  wrapperClassName,
  className,
}: SelectProps) {
  const autoId = useId();
  const selectId = id || autoId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const showSearch = options.length > SEARCH_THRESHOLD;

  const filtered = useMemo(() => {
    if (!showSearch || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, showSearch]);

  const computePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedListHeight = Math.min(filtered.length, 8) * 36 + (showSearch ? 44 : 0) + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedListHeight && rect.top > estimatedListHeight;
    setPos({
      top: openUp ? rect.top : rect.bottom,
      left: rect.left,
      width: rect.width,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => computePosition();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      const idx = options.findIndex((o) => o.value === value);
      setHighlighted(idx >= 0 ? idx : 0);
      // Always move focus into the portaled list, not just when the search box
      // shows it. The list lives outside the trigger button's DOM subtree, so
      // if focus stays on the button, arrow/Enter keydowns never reach the
      // list's handler — and Enter on a native <button> re-triggers its own
      // click, which closes the dropdown instead of selecting anything.
      if (showSearch) {
        setTimeout(() => searchRef.current?.focus(), 0);
      } else {
        setTimeout(() => listRef.current?.focus(), 0);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      listRef.current?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)?.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted, open]);

  const selectValue = (v: string) => {
    onChange?.({ target: { value: v } });
    setOpen(false);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) selectValue(filtered[highlighted].value);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={selectId}
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          onKeyDown={handleTriggerKeyDown}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-9.5 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-left text-sm transition-colors",
            "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100",
            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
            error && "border-red-400 focus:border-red-500 focus:ring-red-100",
            className
          )}
        >
          <span className={cn("truncate", selected ? "text-slate-900" : "text-slate-400")}>
            {selected ? selected.label : placeholder}
          </span>
          <FiChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
        </button>
        {name && <input type="hidden" name={name} value={value} />}
      </div>
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-400">{hint}</p>
      ) : null}

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleListKeyDown}
            style={{
              position: "fixed",
              left: pos.left,
              width: pos.width,
              zIndex: 1000,
              ...(pos.openUp ? { bottom: window.innerHeight - pos.top + 4 } : { top: pos.top + 4 }),
            }}
            className="max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg focus:outline-none"
          >
            {showSearch && (
              <li className="sticky top-0 border-b border-slate-100 bg-white px-2 py-1.5">
                <div className="relative">
                  <FiSearch className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleListKeyDown}
                    placeholder="શોધો... (Search...)"
                    className="h-8 w-full rounded-md border border-slate-200 pl-7 pr-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  />
                </div>
              </li>
            )}
            {filtered.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">કોઈ વિકલ્પ નથી (No options found)</li>}
            {filtered.map((opt, i) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => selectValue(opt.value)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between px-3 py-2 text-sm",
                    i === highlighted ? "bg-indigo-50 text-indigo-700" : "text-slate-700",
                    isSelected && "font-medium"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <FiCheck className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { Input } from "./Input";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}) {
  // Typing stays instant (draft updates every keystroke); onChange — which
  // triggers the backend search request — fires only after typing pauses,
  // instead of once per keystroke.
  const [draft, setDraft] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const handleChange = (next: string) => {
    setDraft(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), debounceMs);
  };

  return (
    <Input
      icon={<FiSearch className="h-4 w-4" />}
      placeholder={placeholder}
      value={draft}
      onChange={(e) => handleChange(e.target.value)}
      wrapperClassName="w-full sm:w-64"
    />
  );
}

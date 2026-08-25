"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

type UseListOptions = {
  search?: string;
  page?: number;
  limit?: number;
  extraParams?: Record<string, string | undefined>;
};

export function usePaginatedList<T, S = Record<string, number>>(endpoint: string, options: UseListOptions = {}) {
  const { search = "", page = 1, limit = 10, extraParams = {} } = options;
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [summary, setSummary] = useState<S | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();

  const paramsKey = JSON.stringify(extraParams);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v !== undefined && v !== "") params[k] = v;
      });
      const res = await api.get(endpoint, { params });
      const data = res.data.data;
      setItems(data.items ?? data ?? []);
      setTotal(data.total ?? (Array.isArray(data) ? data.length : 0));
      setPages(data.pages ?? 1);
      setSummary(data.summary ?? null);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg, "Failed to load data");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, search, page, limit, paramsKey]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { items, total, pages, summary, loading, error, refetch: fetchList };
}

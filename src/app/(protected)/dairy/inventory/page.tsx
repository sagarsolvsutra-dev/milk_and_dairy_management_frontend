"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { useState } from "react";
import { formatNumber } from "@/lib/utils";
import type { StockItem } from "@/types";

export default function DairyInventoryPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { items, total, pages, loading } = usePaginatedList<StockItem>("/inventory/dairy-stock", { search, page });

  const columns: Column<StockItem>[] = [
    { header: "Item", accessor: (s) => <span className="font-medium text-slate-900">{s.item?.name}</span> },
    { header: "Code", accessor: (s) => <span className="font-mono text-xs text-slate-500">{s.item?.code}</span> },
    { header: "Current Stock", accessor: (s) => formatNumber(s.currentQty) },
    { header: "Min. Alert", accessor: (s) => s.item?.minStockAlert ?? 0 },
    {
      header: "Status",
      accessor: (s) =>
        s.currentQty <= (s.item?.minStockAlert ?? 0) ? (
          <Badge tone="danger">Low Stock</Badge>
        ) : (
          <Badge tone="success">Healthy</Badge>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="My Inventory" description="Live item-wise stock for your dairy" />
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by item name or code..."
        />
      </div>
      <Card className="mb-2 p-0">
        <Table columns={columns} data={items} keyField={(s) => s._id} loading={loading} emptyMessage="No stock received yet" />
      </Card>
      <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
    </div>
  );
}

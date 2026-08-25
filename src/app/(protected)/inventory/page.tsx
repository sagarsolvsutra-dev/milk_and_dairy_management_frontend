"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiDroplet, FiPackage, FiCheckCircle, FiAlertTriangle, FiChevronRight } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Card, StatCard } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { inventoryService } from "@/services/inventory.service";
import { formatNumber } from "@/lib/utils";
import type { StockItem } from "@/types";

type ReconciliationRow = {
  item: { _id: string; name: string; code: string };
  totalProduced: number;
  totalDispatched: number;
  centralStock: number;
  dairyStock: number;
  totalSold: number;
  accountedFor: number;
  balanced: boolean;
};

export default function InventoryPage() {
  const toast = useToast();
  const [milkStock, setMilkStock] = useState(0);
  const [centralStock, setCentralStock] = useState<StockItem[]>([]);
  const [comparison, setComparison] = useState<{ dairy: { _id: string; name: string; code: string }; totalStock: number; itemCount: number }[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      inventoryService.getMilkStock(),
      inventoryService.getCentralItemStock(),
      inventoryService.getDairyComparison(),
      inventoryService.getReconciliation(),
    ])
      .then(([milk, central, comp, recon]) => {
        setMilkStock(milk.data.data.currentQty);
        setCentralStock(central.data.data);
        setComparison(comp.data.data);
        setReconciliation(recon.data.data);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowStockCount = centralStock.filter((s) => s.currentQty <= (s.item?.minStockAlert ?? 0)).length;

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

  const reconciliationColumns: Column<ReconciliationRow>[] = [
    { header: "Item", accessor: (r) => <span className="font-medium text-slate-900">{r.item.name}</span> },
    { header: "Total Produced", accessor: (r) => formatNumber(r.totalProduced) },
    { header: "Total Dispatched", accessor: (r) => formatNumber(r.totalDispatched) },
    { header: "Central Stock", accessor: (r) => formatNumber(r.centralStock) },
    { header: "Dairies' Stock", accessor: (r) => formatNumber(r.dairyStock) },
    { header: "Total Sold", accessor: (r) => formatNumber(r.totalSold) },
    {
      header: "Accounted For",
      accessor: (r) => (
        <span className="font-medium">
          {formatNumber(r.centralStock)} + {formatNumber(r.dairyStock)} + {formatNumber(r.totalSold)} ={" "}
          {formatNumber(r.accountedFor)}
        </span>
      ),
    },
    {
      header: "Balance Check",
      accessor: (r) =>
        r.balanced ? (
          <Badge tone="success">
            <span className="flex items-center gap-1">
              <FiCheckCircle className="h-3 w-3" /> Matched
            </span>
          </Badge>
        ) : (
          <Badge tone="danger">
            <span className="flex items-center gap-1">
              <FiAlertTriangle className="h-3 w-3" /> Mismatch
            </span>
          </Badge>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Central Inventory Control" description="Admin-side stock across milk, items, and dairy allocations" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Current Milk Stock" value={`${formatNumber(milkStock)} KG`} icon={<FiDroplet className="h-5 w-5" />} tone="sky" />
        <StatCard label="Item SKUs in Stock" value={centralStock.length} icon={<FiPackage className="h-5 w-5" />} tone="indigo" />
        <StatCard label="Low Stock Items" value={lowStockCount} tone="red" />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-700">Central Item Stock</h2>
      <Card className="mb-8 p-0">
        <Table columns={columns} data={centralStock} keyField={(s) => s._id} loading={loading} emptyMessage="No item stock yet" />
      </Card>

      <h2 className="mb-1 text-sm font-semibold text-slate-700">Dairy-wise Comparison</h2>
      <p className="mb-3 text-xs text-slate-400">Click a dairy to see its full history — stock, dispatches received, and bills sold.</p>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {comparison.map((c) => (
          <Link key={c.dairy._id} href={`/inventory/dairy/${c.dairy._id}`}>
            <Card className="cursor-pointer transition-colors hover:border-indigo-300 hover:bg-indigo-50/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{c.dairy.name}</p>
                  <p className="text-xs text-slate-400">{c.dairy.code}</p>
                </div>
                <FiChevronRight className="h-4 w-4 text-slate-300" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">Total Stock</span>
                <span className="font-semibold text-slate-800">{formatNumber(c.totalStock)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-500">Item Types</span>
                <span className="font-semibold text-slate-800">{c.itemCount}</span>
              </div>
            </Card>
          </Link>
        ))}
        {!loading && !comparison.length && (
          <p className="col-span-full text-sm text-slate-400">No active dairies with stock yet</p>
        )}
      </div>

      <h2 className="mb-1 text-sm font-semibold text-slate-700">Stock Reconciliation</h2>
      <p className="mb-3 text-xs text-slate-400">
        Every unit ever produced must end up somewhere — Central stock, a dairy&apos;s stock, or already sold. This
        table proves nothing has gone missing.
      </p>
      <Card className="p-0">
        <Table
          columns={reconciliationColumns}
          data={reconciliation}
          keyField={(r) => r.item._id}
          loading={loading}
          emptyMessage="No production history yet"
        />
      </Card>
    </div>
  );
}

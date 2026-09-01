"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiBox, FiTruck } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { PageHeaderSkeleton, StatCardsSkeleton, CardsGridSkeleton, ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { itemService } from "@/services/item.service";
import { inventoryService } from "@/services/inventory.service";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Item, ConsolidatedStockItem, StockLedgerEntry } from "@/types";

const TRANSACTION_LABELS: Record<StockLedgerEntry["transactionType"], string> = {
  purchase: "Purchased",
  production_in: "Produced",
  production_out: "Milk consumed",
  dispatch_out: "Dispatched out",
  dispatch_in: "Received at dairy",
  sale_out: "Sold",
  sale_cancel_in: "Sale cancelled",
  adjustment: "Adjustment",
};

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [item, setItem] = useState<Item | null>(null);
  const [stockDetail, setStockDetail] = useState<ConsolidatedStockItem | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [itemRes, consolidatedRes] = await Promise.all([
        itemService.getById(params.id),
        inventoryService.getConsolidatedStock(),
      ]);
      setItem(itemRes.data.data);
      const allStock: ConsolidatedStockItem[] = consolidatedRes.data.data;
      setStockDetail(allStock.find((s) => s.item._id === params.id) || null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPages, setLedgerPages] = useState(1);
  const [ledgerLoading, setLedgerLoading] = useState(true);

  // Next.js reuses this same component instance across two visits to this
  // dynamic route — reset everything tied to the OLD item when the id
  // changes, so the loading gate below correctly shows the skeleton again
  // instead of briefly rendering the previous item's stock under the new
  // item's URL, and so the new item doesn't inherit the old one's ledger page.
  useEffect(() => {
    setItem(null);
    setStockDetail(null);
    setLedgerPage(1);
  }, [params.id]);

  useEffect(() => {
    setLedgerLoading(true);
    inventoryService
      .getStockTrace(params.id, { page: ledgerPage, limit: 10 })
      .then((res) => {
        setLedger(res.data.data.items);
        setLedgerTotal(res.data.data.total);
        setLedgerPages(res.data.data.pages);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLedgerLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, ledgerPage]);

  if (loading && !item) {
    return (
      <div>
        <PageHeaderSkeleton />
        <StatCardsSkeleton count={3} cols={3} />
        <CardsGridSkeleton count={2} />
      </div>
    );
  }

  if (!item) {
    return <p className="text-sm text-slate-500">Item not found.</p>;
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <FiArrowLeft className="h-4 w-4" /> Back to Items
      </button>

      <PageHeader
        title={`${item.name} (${item.code})`}
        description={`${item.category || "Item"} · ${formatCurrency(item.defaultSellingPrice)} per ${
          typeof item.unit === "object" && item.unit ? item.unit.shortCode : ""
        }`}
        actions={
          <Badge tone={item.isActive ? "success" : "neutral"}>{item.isActive ? "Active" : "Inactive"}</Badge>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Central Stock" value={stockDetail?.centralStock ?? 0} icon={<FiBox className="h-5 w-5" />} tone="indigo" />
        <StatCard
          label="Across All Dairies"
          value={stockDetail?.dairyStock.reduce((sum, d) => sum + d.qty, 0) ?? 0}
          icon={<FiTruck className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard label="Total Stock" value={stockDetail?.totalStock ?? 0} icon={<FiBox className="h-5 w-5" />} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <p className="mb-3 text-sm font-semibold text-slate-700">Stock by Dairy</p>
          {stockDetail?.dairyStock.some((d) => d.qty > 0) ? (
            <div className="overflow-hidden rounded-lg border border-slate-100">
              {stockDetail.dairyStock
                .filter((d) => d.qty > 0)
                .map((d) => (
                  <div key={d.dairy._id} className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 text-sm last:border-b-0">
                    <span className="text-slate-600">
                      {d.dairy.name} <span className="text-xs text-slate-400">({d.dairy.code})</span>
                    </span>
                    <span className="font-semibold text-slate-800">{d.qty}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No stock at any dairy right now.</p>
          )}
        </Card>

        <Card className="p-0 lg:col-span-2">
          <p className="px-5 pt-5 text-sm font-semibold text-slate-700">Full Movement History</p>
          <div className="mt-3 min-h-[16rem]">
            {ledgerLoading ? (
              <ListSkeleton rows={5} />
            ) : ledger.length ? (
              ledger.map((entry) => (
                <div key={entry._id} className="flex items-start justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">
                      {TRANSACTION_LABELS[entry.transactionType] || entry.transactionType}
                      {entry.stockType === "dairy_item" && entry.dairy ? (
                        <span className="ml-1.5 text-xs font-normal text-slate-400">— {entry.dairy.name}</span>
                      ) : entry.stockType === "central_item" ? (
                        <span className="ml-1.5 text-xs font-normal text-slate-400">— Central</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(entry.date)}
                      {entry.remark ? ` · ${entry.remark}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={entry.quantity >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
                      {entry.quantity >= 0 ? "+" : ""}
                      {entry.quantity}
                    </p>
                    <p className="text-xs text-slate-400">Balance: {entry.balanceAfter}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-10 text-center text-sm text-slate-400">
                No stock movements recorded for this item yet.
              </p>
            )}
          </div>
          <div className="border-t border-slate-100 px-2">
            <Pagination page={ledgerPage} pages={ledgerPages} total={ledgerTotal} onPageChange={setLedgerPage} />
          </div>
        </Card>
      </div>
    </div>
  );
}

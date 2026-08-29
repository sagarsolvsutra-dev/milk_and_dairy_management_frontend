"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiBox, FiTruck } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { DetailPageSkeleton, ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { itemService } from "@/services/item.service";
import { inventoryService } from "@/services/inventory.service";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Item, ConsolidatedStockItem, StockLedgerEntry } from "@/types";

const TRANSACTION_LABELS: Record<StockLedgerEntry["transactionType"], string> = {
  purchase: "ખરીદી થઈ (Purchased)",
  production_in: "ઉત્પાદન થયું (Produced)",
  production_out: "દૂધ વપરાયું (Milk consumed)",
  dispatch_out: "મોકલાયું (Dispatched out)",
  dispatch_in: "ડેરી પર મળ્યું (Received at dairy)",
  sale_out: "વેચાયું (Sold)",
  sale_cancel_in: "વેચાણ રદ થયું (Sale cancelled)",
  adjustment: "ગોઠવણ (Adjustment)",
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
    return <DetailPageSkeleton statCount={3} statCols={3} tableRows={5} tableCols={3} />;
  }

  if (!item) {
    return <p className="text-sm text-slate-500">આઇટમ મળી નથી (Item not found).</p>;
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <FiArrowLeft className="h-4 w-4" /> આઇટમ પર પાછા જાઓ (Back to Items)
      </button>

      <PageHeader
        title={`${item.name} (${item.code})`}
        description={`${item.category || "આઇટમ (Item)"} · ${formatCurrency(item.defaultSellingPrice)} per ${
          typeof item.unit === "object" && item.unit ? item.unit.shortCode : ""
        }`}
        actions={
          <Badge tone={item.isActive ? "success" : "neutral"}>{item.isActive ? "ચાલુ (Active)" : "બંધ (Inactive)"}</Badge>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="મુખ્ય સ્ટોક (Central Stock)" value={stockDetail?.centralStock ?? 0} icon={<FiBox className="h-5 w-5" />} tone="indigo" />
        <StatCard
          label="બધી ડેરીમાં (Across All Dairies)"
          value={stockDetail?.dairyStock.reduce((sum, d) => sum + d.qty, 0) ?? 0}
          icon={<FiTruck className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard label="કુલ સ્ટોક (Total Stock)" value={stockDetail?.totalStock ?? 0} icon={<FiBox className="h-5 w-5" />} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <p className="mb-3 text-sm font-semibold text-slate-700">ડેરી પ્રમાણે સ્ટોક (Stock by Dairy)</p>
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
            <p className="text-sm text-slate-400">હાલ કોઈપણ ડેરીમાં સ્ટોક નથી (No stock at any dairy right now).</p>
          )}
        </Card>

        <Card className="p-0 lg:col-span-2">
          <p className="px-5 pt-5 text-sm font-semibold text-slate-700">સંપૂર્ણ હિલચાલ ઇતિહાસ (Full Movement History)</p>
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
                        <span className="ml-1.5 text-xs font-normal text-slate-400">— મુખ્ય (Central)</span>
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
                    <p className="text-xs text-slate-400">બાકી (Balance): {entry.balanceAfter}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-10 text-center text-sm text-slate-400">
                હજુ આ આઇટમની કોઈ સ્ટોક હિલચાલ નોંધાઈ નથી (No stock movements recorded for this item yet).
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiBox, FiShoppingBag, FiAlertTriangle, FiDollarSign, FiArrowRight } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard, Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { PageHeaderSkeleton, StatCardsSkeleton, CardsGridSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { dashboardService } from "@/services/meta.service";
import { formatCurrency, formatDate } from "@/lib/utils";

type DairyDashboard = {
  itemWiseStock: { _id: string; currentQty: number; item: { name: string; minStockAlert: number } }[];
  todayBillCount: number;
  todaySalesAmount: number;
  recentBills: { _id: string; billNo: string; date: string; grandTotal: number; customerName?: string }[];
  lowStockItemsCount: number;
  lowStockItems: { _id: string; currentQty: number; item: { name: string; code?: string; minStockAlert: number } }[];
};

export default function DairyHomePage() {
  const toast = useToast();
  const [data, setData] = useState<DairyDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService
      .getDairy()
      .then((res) => setData(res.data.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeaderSkeleton />
        <StatCardsSkeleton count={3} cols={3} />
        <CardsGridSkeleton count={2} />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div>
      <PageHeader title="ડેરી ડેશબોર્ડ (Dairy Dashboard)" description="તમારી શાખાનો સ્ટોક અને વેચાણની ઝલક (Your branch stock and sales overview)" />

      {data.lowStockItemsCount > 0 && (
        <Alert type="warning" className="mb-6">
          <span className="font-medium">
            {data.lowStockItemsCount} આઇટમનો સ્ટોક ઓછો છે — તાત્કાલિક ધ્યાન આપો (items are running low on stock — needs attention)
          </span>
        </Alert>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="આજના બિલ (Today's Bills)" value={data.todayBillCount} icon={<FiShoppingBag className="h-5 w-5" />} tone="indigo" />
        <StatCard label="આજનું વેચાણ (Today's Sales)" value={formatCurrency(data.todaySalesAmount)} icon={<FiDollarSign className="h-5 w-5" />} tone="emerald" />
        <StatCard label="સ્ટોકમાં આઇટમ (Items in Stock)" value={data.itemWiseStock.length} icon={<FiBox className="h-5 w-5" />} tone="sky" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">તાજેતરના બિલ (Recent Bills)</h2>
          {data.recentBills.length ? (
            <ul className="space-y-2">
              {data.recentBills.map((b) => (
                <li key={b._id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    #{b.billNo} — {b.customerName || "વૉક-ઇન (Walk-in)"} — {formatDate(b.date)}
                  </span>
                  <span className="font-medium text-slate-800">{formatCurrency(b.grandTotal)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">હજુ કોઈ બિલ નથી. (No bills yet.)</p>
          )}
          <Link href="/dairy/bills" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline">
            બધા બિલ જુઓ (View all bills) →
          </Link>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">ઓછો સ્ટોક ચેતવણી (Low Stock Alerts)</h2>
            <Badge tone={data.lowStockItemsCount > 0 ? "danger" : "success"}>{data.lowStockItemsCount}</Badge>
          </div>
          {data.lowStockItems.length ? (
            <ul className="space-y-2">
              {data.lowStockItems.map((s) => (
                <li key={s._id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <FiAlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" /> {s.item.name}
                  </span>
                  <span className="shrink-0 font-medium text-red-600">
                    {s.currentQty} બાકી (left) — ન્યૂનતમ (min) {s.item.minStockAlert}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">સ્ટોક પૂરતો છે. (Stock levels are healthy.)</p>
          )}
          {data.lowStockItemsCount > data.lowStockItems.length && (
            <p className="mt-2 text-xs text-slate-400">
              + {data.lowStockItemsCount - data.lowStockItems.length} વધુ (more)
            </p>
          )}
          <Link href="/dairy/inventory" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
            સંપૂર્ણ સ્ટોક જુઓ (View Full Inventory) <FiArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>
    </div>
  );
}

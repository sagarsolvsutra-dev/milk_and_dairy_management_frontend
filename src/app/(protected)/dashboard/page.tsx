"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiDroplet, FiDollarSign, FiAlertTriangle, FiHome, FiArrowRight } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard, Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { PageHeaderSkeleton, StatCardsSkeleton, CardsGridSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { dashboardService } from "@/services/meta.service";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { AnalyticsSection } from "./AnalyticsSection";

type DashboardData = {
  todayMilkPurchaseQty: number;
  todayMilkPurchaseAmount: number;
  currentMilkStock: number;
  vendorsWithDue: number;
  activeDairies: number;
  totalDairies: number;
  lowStockItemsCount: number;
  lowStockItems: { _id: string; currentQty: number; item: { name: string; code?: string; minStockAlert: number } }[];
  dairyLowStockCount: number;
  dairyLowStockSummary: { dairy: { _id: string; name: string; code: string }; count: number }[];
};

export default function DashboardPage() {
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService
      .getSuperAdmin()
      .then((res) => setData(res.data.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeaderSkeleton />
        <StatCardsSkeleton count={4} />
        <CardsGridSkeleton count={3} />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Business overview across milk purchase, production, and dairies"
      />

      {(data.lowStockItemsCount > 0 || data.dairyLowStockCount > 0) && (
        <Alert type="warning" className="mb-6">
          <span className="font-medium">
            {data.lowStockItemsCount + data.dairyLowStockCount} items are running low on stock
          </span>
          {" — "}
          {data.lowStockItemsCount > 0 && (
            <>
              Central: {data.lowStockItemsCount}
            </>
          )}
          {data.lowStockItemsCount > 0 && data.dairyLowStockCount > 0 && ", "}
          {data.dairyLowStockCount > 0 && (
            <>
              Dairies: {data.dairyLowStockCount}
            </>
          )}
        </Alert>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Milk Purchase"
          value={`${formatNumber(data.todayMilkPurchaseQty)} KG`}
          icon={<FiDroplet className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard
          label="Today's Purchase Amount"
          value={formatCurrency(data.todayMilkPurchaseAmount)}
          icon={<FiDollarSign className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard label="Current Milk Stock" value={`${formatNumber(data.currentMilkStock)} KG`} icon={<FiDroplet className="h-5 w-5" />} tone="indigo" />
        <StatCard
          label="Active Dairies"
          value={`${data.activeDairies} / ${data.totalDairies}`}
          icon={<FiHome className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Vendors with Outstanding Dues</h2>
            <Badge tone={data.vendorsWithDue > 0 ? "warning" : "success"}>{data.vendorsWithDue}</Badge>
          </div>
          <p className="text-sm text-slate-500">
            {data.vendorsWithDue > 0
              ? `${data.vendorsWithDue} vendor(s) have pending payments. Check the Purchase Ledger for details.`
              : "All vendor payments are settled."}
          </p>
          <Link href="/purchase-ledger" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
            View Purchase Ledger <FiArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Central Low Stock</h2>
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
                    {s.currentQty} left — min {s.item.minStockAlert}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">All item stock levels are healthy.</p>
          )}
          {data.lowStockItemsCount > data.lowStockItems.length && (
            <p className="mt-2 text-xs text-slate-400">
              + {data.lowStockItemsCount - data.lowStockItems.length} more
            </p>
          )}
          <Link href="/inventory" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
            View Full Inventory <FiArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Low Stock by Dairy</h2>
            <Badge tone={data.dairyLowStockCount > 0 ? "danger" : "success"}>{data.dairyLowStockCount}</Badge>
          </div>
          {data.dairyLowStockSummary.length ? (
            <ul className="space-y-2">
              {data.dairyLowStockSummary.map((d) => (
                <li key={d.dairy._id} className="flex items-center justify-between text-sm">
                  <Link href={`/inventory/dairy/${d.dairy._id}`} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 hover:underline">
                    <FiAlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" /> {d.dairy.name}
                  </Link>
                  <span className="shrink-0 font-medium text-red-600">{d.count} items</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">All dairies' stock levels are healthy.</p>
          )}
        </Card>
      </div>

      <AnalyticsSection />
    </div>
  );
}

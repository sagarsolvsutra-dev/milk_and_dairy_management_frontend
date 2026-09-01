"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { ChartsGridSkeleton } from "@/components/ui/Skeleton";
import { dashboardService } from "@/services/meta.service";
import { formatNumber, formatCurrency } from "@/lib/utils";

type AnalyticsData = {
  purchaseTrend: { _id: string; totalQty: number }[];
  productionByItem: { _id: string; totalQty: number; itemName: string }[];
  dairySales: { _id: string; totalSales: number; dairyName: string }[];
  topItems: { _id: string; totalQty: number; itemName: string }[];
};

const AXIS_STYLE = { fontSize: 11, fill: "#94a3b8" };

export function AnalyticsSection() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    dashboardService
      .getAnalytics()
      .then((res) => setData(res.data.data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  if (failed) return null; // Analytics is a bonus section — don't let its failure disrupt the rest of the dashboard.

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Analytics — Last 30 Days</h2>

      {loading ? (
        <ChartsGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Milk Purchase Trend" empty={!data?.purchaseTrend?.length}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.purchaseTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="_id" tick={AXIS_STYLE} tickFormatter={(v) => String(v).slice(5)} />
                <YAxis tick={AXIS_STYLE} width={40} />
                <Tooltip formatter={(v) => [`${formatNumber(Number(v))} KG`, "Qty"]} labelFormatter={(l) => `Date: ${l}`} />
                <Line type="monotone" dataKey="totalQty" stroke="#0284c7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Production by Item" empty={!data?.productionByItem?.length}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.productionByItem || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="itemName" tick={AXIS_STYLE} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={AXIS_STYLE} width={40} />
                <Tooltip formatter={(v) => [formatNumber(Number(v)), "Qty"]} />
                <Bar dataKey="totalQty" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Sales by Dairy" empty={!data?.dairySales?.length}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.dairySales || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dairyName" tick={AXIS_STYLE} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={AXIS_STYLE} width={50} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Sales"]} />
                <Bar dataKey="totalSales" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Selling Items" empty={!data?.topItems?.length}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.topItems || []} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={AXIS_STYLE} />
                <YAxis type="category" dataKey="itemName" tick={AXIS_STYLE} width={90} />
                <Tooltip formatter={(v) => [formatNumber(Number(v)), "Qty Sold"]} />
                <Bar dataKey="totalQty" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      {empty ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
          No data
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

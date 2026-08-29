"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiBox, FiTruck, FiShoppingBag, FiDollarSign } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Card, StatCard } from "@/components/ui/Card";
import { DetailPageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { dairyService } from "@/services/dairy.service";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Dairy, DispatchEntry, Bill, StockItem } from "@/types";

type Summary = {
  dairy: Dairy;
  currentStock: StockItem[];
  currentStockPage: number;
  currentStockPages: number;
  currentStockCount: number;
  currentStockTotal: number;
  totalDispatched: number;
  totalSold: number;
  totalSalesAmount: number;
};

export default function DairyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockPage, setStockPage] = useState(1);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dairyService.getSummary(params.id, { page: stockPage, limit: 10 });
      setSummary(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, stockPage]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const [dispatchSearch, setDispatchSearch] = useState("");
  const [dispatchPage, setDispatchPage] = useState(1);
  const {
    items: dispatchHistory,
    total: dispatchTotal,
    pages: dispatchPages,
    loading: dispatchLoading,
  } = usePaginatedList<DispatchEntry>("/dispatch", {
    search: dispatchSearch,
    page: dispatchPage,
    extraParams: { dairy: params.id },
  });

  const [billSearch, setBillSearch] = useState("");
  const [billPage, setBillPage] = useState(1);
  const {
    items: billHistory,
    total: billTotal,
    pages: billPages,
    loading: billLoading,
  } = usePaginatedList<Bill>("/bills", {
    search: billSearch,
    page: billPage,
    extraParams: { dairy: params.id },
  });

  if (loading && !summary) return <DetailPageSkeleton statCount={4} statCols={4} tableRows={6} tableCols={4} />;
  if (!summary) return null;

  const { dairy, currentStock, currentStockPages, currentStockCount, currentStockTotal, totalDispatched, totalSold, totalSalesAmount } = summary;

  const stockColumns: Column<StockItem>[] = [
    { header: "આઇટમ (Item)", accessor: (s) => <span className="font-medium text-slate-900">{s.item?.name}</span> },
    { header: "કોડ (Code)", accessor: (s) => <span className="font-mono text-xs text-slate-500">{s.item?.code}</span> },
    { header: "હાલનો સ્ટોક (Current Stock)", accessor: (s) => formatNumber(s.currentQty) },
    {
      header: "સ્થિતિ (Status)",
      accessor: (s) =>
        s.currentQty <= (s.item?.minStockAlert ?? 0) ? (
          <Badge tone="danger">ઓછો સ્ટોક (Low Stock)</Badge>
        ) : (
          <Badge tone="success">પૂરતો (Healthy)</Badge>
        ),
    },
  ];

  const dispatchColumns: Column<DispatchEntry>[] = [
    { header: "તારીખ (Date)", accessor: (d) => formatDate(d.date) },
    { header: "ડિસ્પેચ નંબર (Dispatch No.)", accessor: (d) => <span className="font-mono text-xs">{d.dispatchNo}</span> },
    {
      header: "આઇટમ (Items)",
      accessor: (d) => d.items.map((i) => `${typeof i.item === "object" && i.item ? i.item.name : "-"} (${i.quantity})`).join(", "),
    },
    {
      header: "સ્થિતિ (Status)",
      accessor: (d) => (
        <Badge tone={d.status === "active" ? "success" : "danger"}>
          {d.status === "active" ? "ચાલુ (Active)" : "રદ (Cancelled)"}
        </Badge>
      ),
    },
  ];

  const billColumns: Column<Bill>[] = [
    { header: "તારીખ (Date)", accessor: (b) => formatDate(b.date) },
    { header: "બિલ નંબર (Bill No.)", accessor: (b) => <span className="font-mono text-xs">{b.billNo}</span> },
    { header: "ગ્રાહક (Customer)", accessor: (b) => b.customerName || "વૉક-ઇન (Walk-in)" },
    { header: "આઇટમ (Items)", accessor: (b) => b.items.length },
    { header: "કુલ રકમ (Grand Total)", accessor: (b) => formatCurrency(b.grandTotal) },
    {
      header: "સ્થિતિ (Status)",
      accessor: (b) => (
        <Badge tone={b.status === "active" ? "success" : "danger"}>
          {b.status === "active" ? "ચાલુ (Active)" : "રદ (Cancelled)"}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <FiArrowLeft className="h-4 w-4" /> પાછળ (Back)
      </button>

      <PageHeader
        title={dairy.name}
        description={`${dairy.code} — ${dairy.mobile} — લોગિન આઈડી (Login ID): ${dairy.loginId}`}
        actions={
          <Badge tone={dairy.status === "active" ? "success" : "neutral"}>
            {dairy.status === "active" ? "ચાલુ (Active)" : "બંધ (Inactive)"}
          </Badge>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="હાલનો સ્ટોક - તમામ આઇટમ (Current Stock (all items))" value={formatNumber(currentStockTotal)} icon={<FiBox className="h-5 w-5" />} tone="indigo" />
        <StatCard label="કુલ મોકલેલ (Total Ever Dispatched)" value={formatNumber(totalDispatched)} icon={<FiTruck className="h-5 w-5" />} tone="sky" />
        <StatCard label="કુલ વેચેલ (Total Ever Sold)" value={formatNumber(totalSold)} icon={<FiShoppingBag className="h-5 w-5" />} tone="amber" />
        <StatCard label="કુલ વેચાણ રકમ (Total Sales Amount)" value={formatCurrency(totalSalesAmount)} icon={<FiDollarSign className="h-5 w-5" />} tone="emerald" />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-700">હાલનો સ્ટોક (Current Stock)</h2>
      <Card className="mb-2 p-0">
        <Table columns={stockColumns} data={currentStock} keyField={(s) => s._id} loading={loading} emptyMessage="હજુ સ્ટોક આવ્યો નથી (No stock received yet)" />
      </Card>
      <div className="mb-8">
        <Pagination page={stockPage} pages={currentStockPages} total={currentStockCount} onPageChange={setStockPage} />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-700">ડિસ્પેચ ઇતિહાસ (મુખ્યથી મળેલ) (Dispatch History (received from Central))</h2>
      <div className="mb-4">
        <SearchInput
          value={dispatchSearch}
          onChange={(v) => { setDispatchSearch(v); setDispatchPage(1); }}
          placeholder="ડિસ્પેચ નંબરથી શોધો... (Search by dispatch no...)"
        />
      </div>
      <Card className="mb-2 p-0">
        <Table
          columns={dispatchColumns}
          data={dispatchHistory}
          keyField={(d) => d._id}
          loading={dispatchLoading}
          emptyMessage="આ ડેરીમાં હજુ કોઈ ડિસ્પેચ નથી (No dispatches to this dairy yet)"
        />
      </Card>
      <div className="mb-8">
        <Pagination page={dispatchPage} pages={dispatchPages} total={dispatchTotal} onPageChange={setDispatchPage} />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-700">બિલ ઇતિહાસ (ગ્રાહકોને વેચાણ) (Bill History (sold to customers))</h2>
      <div className="mb-4">
        <SearchInput
          value={billSearch}
          onChange={(v) => { setBillSearch(v); setBillPage(1); }}
          placeholder="બિલ નંબર કે ગ્રાહકથી શોધો... (Search by bill no. or customer...)"
        />
      </div>
      <Card className="mb-2 p-0">
        <Table columns={billColumns} data={billHistory} keyField={(b) => b._id} loading={billLoading} emptyMessage="હજુ કોઈ બિલ નથી (No bills yet)" />
      </Card>
      <Pagination page={billPage} pages={billPages} total={billTotal} onPageChange={setBillPage} />
    </div>
  );
}

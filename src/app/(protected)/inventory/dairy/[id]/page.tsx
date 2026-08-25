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
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { dairyService } from "@/services/dairy.service";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Dairy, DispatchEntry, Bill, StockItem } from "@/types";

type Summary = {
  dairy: Dairy;
  currentStock: StockItem[];
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

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dairyService.getSummary(params.id);
      setSummary(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

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

  if (loading && !summary) return <Spinner fullPage />;
  if (!summary) return null;

  const { dairy, currentStock, currentStockTotal, totalDispatched, totalSold, totalSalesAmount } = summary;

  const stockColumns: Column<StockItem>[] = [
    { header: "Item", accessor: (s) => <span className="font-medium text-slate-900">{s.item?.name}</span> },
    { header: "Code", accessor: (s) => <span className="font-mono text-xs text-slate-500">{s.item?.code}</span> },
    { header: "Current Stock", accessor: (s) => formatNumber(s.currentQty) },
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

  const dispatchColumns: Column<DispatchEntry>[] = [
    { header: "Date", accessor: (d) => formatDate(d.date) },
    { header: "Dispatch No.", accessor: (d) => <span className="font-mono text-xs">{d.dispatchNo}</span> },
    {
      header: "Items",
      accessor: (d) => d.items.map((i) => `${typeof i.item === "object" ? i.item.name : "-"} (${i.quantity})`).join(", "),
    },
    { header: "Status", accessor: (d) => <Badge tone={d.status === "active" ? "success" : "danger"}>{d.status}</Badge> },
  ];

  const billColumns: Column<Bill>[] = [
    { header: "Date", accessor: (b) => formatDate(b.date) },
    { header: "Bill No.", accessor: (b) => <span className="font-mono text-xs">{b.billNo}</span> },
    { header: "Customer", accessor: (b) => b.customerName || "Walk-in" },
    { header: "Items", accessor: (b) => b.items.length },
    { header: "Grand Total", accessor: (b) => formatCurrency(b.grandTotal) },
    { header: "Status", accessor: (b) => <Badge tone={b.status === "active" ? "success" : "danger"}>{b.status}</Badge> },
  ];

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <FiArrowLeft className="h-4 w-4" /> Back
      </button>

      <PageHeader
        title={dairy.name}
        description={`${dairy.code} — ${dairy.mobile} — Login ID: ${dairy.loginId}`}
        actions={<Badge tone={dairy.status === "active" ? "success" : "neutral"}>{dairy.status}</Badge>}
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Current Stock (all items)" value={formatNumber(currentStockTotal)} icon={<FiBox className="h-5 w-5" />} tone="indigo" />
        <StatCard label="Total Ever Dispatched" value={formatNumber(totalDispatched)} icon={<FiTruck className="h-5 w-5" />} tone="sky" />
        <StatCard label="Total Ever Sold" value={formatNumber(totalSold)} icon={<FiShoppingBag className="h-5 w-5" />} tone="amber" />
        <StatCard label="Total Sales Amount" value={formatCurrency(totalSalesAmount)} icon={<FiDollarSign className="h-5 w-5" />} tone="emerald" />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-700">Current Stock</h2>
      <Card className="mb-8 p-0">
        <Table columns={stockColumns} data={currentStock} keyField={(s) => s._id} loading={loading} emptyMessage="No stock received yet" />
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-slate-700">Dispatch History (received from Central)</h2>
      <div className="mb-4">
        <SearchInput
          value={dispatchSearch}
          onChange={(v) => { setDispatchSearch(v); setDispatchPage(1); }}
          placeholder="Search by dispatch no..."
        />
      </div>
      <Card className="mb-2 p-0">
        <Table
          columns={dispatchColumns}
          data={dispatchHistory}
          keyField={(d) => d._id}
          loading={dispatchLoading}
          emptyMessage="No dispatches to this dairy yet"
        />
      </Card>
      <div className="mb-8">
        <Pagination page={dispatchPage} pages={dispatchPages} total={dispatchTotal} onPageChange={setDispatchPage} />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-700">Bill History (sold to customers)</h2>
      <div className="mb-4">
        <SearchInput
          value={billSearch}
          onChange={(v) => { setBillSearch(v); setBillPage(1); }}
          placeholder="Search by bill no. or customer..."
        />
      </div>
      <Card className="mb-2 p-0">
        <Table columns={billColumns} data={billHistory} keyField={(b) => b._id} loading={billLoading} emptyMessage="No bills yet" />
      </Card>
      <Pagination page={billPage} pages={billPages} total={billTotal} onPageChange={setBillPage} />
    </div>
  );
}

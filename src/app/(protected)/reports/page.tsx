"use client";

import { useEffect, useRef, useState } from "react";
import { FiDownload } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn, formatCurrency, formatDate, toDateInputValue } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { reportService, type ReportKey } from "@/services/report.service";
import { useToast } from "@/components/ui/Toast";

const REPORT_TABS: { key: ReportKey; label: string }[] = [
  { key: "milk-purchase", label: "Milk Purchase" },
  { key: "production", label: "Production" },
  { key: "dispatch", label: "Dispatch" },
  { key: "dairy-sales", label: "Dairy Sales" },
  { key: "item-wise-sales", label: "Item-wise Sales" },
  { key: "stock", label: "Stock" },
  { key: "profit", label: "Profit" },
  { key: "monthly-yearly", label: "Monthly/Yearly" },
];

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","));
  });
  return lines.join("\n");
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PAGINATED_TABS: ReportKey[] = ["milk-purchase", "production", "dispatch", "dairy-sales", "item-wise-sales", "stock"];

export default function ReportsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<ReportKey>("milk-purchase");
  const [from, setFrom] = useState(toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(toDateInputValue(new Date()));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [groupBy, setGroupBy] = useState<"month" | "year">("month");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<unknown>(null);
  // Guards against an older, slower request resolving after a newer one and
  // overwriting good data with a mismatched shape — clearing rawData on tab
  // switch only closes the same-tick rendering gap, not this ordering race.
  const requestIdRef = useRef(0);

  const fetchReport = async (targetPage = page) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params: Record<string, string | number> =
        tab === "monthly-yearly" ? { year, groupBy } : { from, to };
      if (PAGINATED_TABS.includes(tab)) params.page = targetPage;
      const res = await reportService.get(tab, params);
      if (requestId !== requestIdRef.current) return;
      setRawData(res.data.data);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      toast.error(getErrorMessage(err));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    // Clear immediately — otherwise the new tab renders for one frame against
    // the previous tab's data shape (e.g. dispatch reading `.items` off a
    // purchase-entry row) before the fetch for the new tab resolves.
    setRawData(null);
    setPage(1);
    fetchReport(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const changePage = (p: number) => {
    setPage(p);
    fetchReport(p);
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Purchase, production, dispatch, sales, stock and profit reports"
      />

      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-slate-200">
        {REPORT_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-t-lg px-3.5 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "monthly-yearly" ? (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Input
            label="Year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            wrapperClassName="w-32"
          />
          <Select
            label="Group By"
            options={[
              { label: "Month", value: "month" },
              { label: "Year", value: "year" },
            ]}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "month" | "year")}
          />
          <Button onClick={() => changePage(1)} loading={loading}>
            Apply
          </Button>
        </div>
      ) : (
        tab !== "stock" && (
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <DatePicker label="From" value={from} onChange={setFrom} />
            <DatePicker label="To" value={to} onChange={setTo} />
            <Button onClick={() => changePage(1)} loading={loading}>
              Apply
            </Button>
          </div>
        )
      )}

      <Card className="p-0">
        <ReportBody tab={tab} data={rawData} loading={loading} />
      </Card>
      {PAGINATED_TABS.includes(tab) && rawData != null && (
        <Pagination
          page={page}
          pages={(rawData as { pages?: number }).pages || 1}
          total={(rawData as { total?: number }).total || 0}
          onPageChange={changePage}
        />
      )}
    </div>
  );
}

function ReportBody({ tab, data, loading }: { tab: ReportKey; data: unknown; loading: boolean }) {
  if (tab === "milk-purchase") {
    const d = data as { entries: any[]; totals: { quantity: number; amount: number } } | null;
    const columns: Column<any>[] = [
      { header: "Date", accessor: (r) => formatDate(r.date) },
      { header: "Bill No.", accessor: (r) => r.billNo },
      { header: "Vendor", accessor: (r) => r.vendor?.name },
      { header: "Qty", accessor: (r) => `${r.quantity} ${r.unit}` },
      { header: "Rate", accessor: (r) => formatCurrency(r.rate) },
      { header: "Net Payable", accessor: (r) => formatCurrency(r.netPayable) },
    ];
    return (
      <>
        <ExportCsvButton
          filename="milk-purchase-report.csv"
          rows={(d?.entries || []).map((r) => ({
            date: formatDate(r.date),
            billNo: r.billNo,
            vendor: r.vendor?.name,
            quantity: `${r.quantity} ${r.unit}`,
            rate: r.rate,
            netPayable: r.netPayable,
          }))}
        />
        <Table columns={columns} data={d?.entries || []} keyField={(r) => r._id} loading={loading} />
        {d && (
          <div className="flex justify-end gap-6 border-t border-slate-100 px-4 py-3 text-sm">
            <span>
              Total Qty: <strong>{d.totals.quantity}</strong>
            </span>
            <span>
              Total Amount: <strong>{formatCurrency(d.totals.amount)}</strong>
            </span>
          </div>
        )}
      </>
    );
  }

  if (tab === "production") {
    const d = data as { entries: any[]; totalMilkConsumed: number } | null;
    const columns: Column<any>[] = [
      { header: "Date", accessor: (r) => formatDate(r.date) },
      { header: "Batch No.", accessor: (r) => r.batchNo },
      { header: "Items", accessor: (r) => r.items?.length ?? 0 },
      { header: "Milk Consumed", accessor: (r) => `${(r.totalMilkConsumed ?? 0).toFixed(2)} KG` },
    ];
    return (
      <>
        <ExportCsvButton
          filename="production-report.csv"
          rows={(d?.entries || []).map((r) => ({
            date: formatDate(r.date),
            batchNo: r.batchNo,
            items: r.items?.length ?? 0,
            totalMilkConsumed: (r.totalMilkConsumed ?? 0).toFixed(2),
          }))}
        />
        <Table columns={columns} data={d?.entries || []} keyField={(r) => r._id} loading={loading} />
        {d && (
          <div className="border-t border-slate-100 px-4 py-3 text-right text-sm">
            Total Milk Consumed: <strong>{(d.totalMilkConsumed ?? 0).toFixed(2)} KG</strong>
          </div>
        )}
      </>
    );
  }

  if (tab === "dispatch") {
    const d = data as { entries: any[] } | null;
    const columns: Column<any>[] = [
      { header: "Date", accessor: (r) => formatDate(r.date) },
      { header: "Dispatch No.", accessor: (r) => r.dispatchNo },
      { header: "Dairy", accessor: (r) => r.dairy?.name },
      { header: "Items", accessor: (r) => r.items?.length ?? 0 },
    ];
    return (
      <>
        <ExportCsvButton
          filename="dispatch-report.csv"
          rows={(d?.entries || []).map((r) => ({
            date: formatDate(r.date),
            dispatchNo: r.dispatchNo,
            dairy: r.dairy?.name,
            items: r.items?.length ?? 0,
          }))}
        />
        <Table columns={columns} data={d?.entries || []} keyField={(r) => r._id} loading={loading} />
      </>
    );
  }

  if (tab === "dairy-sales") {
    const d = data as { bills: any[]; totalSales: number } | null;
    const columns: Column<any>[] = [
      { header: "Date", accessor: (r) => formatDate(r.date) },
      { header: "Bill No.", accessor: (r) => r.billNo },
      { header: "Dairy", accessor: (r) => r.dairy?.name },
      { header: "Grand Total", accessor: (r) => formatCurrency(r.grandTotal) },
    ];
    return (
      <>
        <ExportCsvButton
          filename="dairy-sales-report.csv"
          rows={(d?.bills || []).map((r) => ({
            date: formatDate(r.date),
            billNo: r.billNo,
            dairy: r.dairy?.name,
            grandTotal: r.grandTotal,
          }))}
        />
        <Table columns={columns} data={d?.bills || []} keyField={(r) => r._id} loading={loading} />
        {d && (
          <div className="border-t border-slate-100 px-4 py-3 text-right text-sm">
            Total Sales: <strong>{formatCurrency(d.totalSales)}</strong>
          </div>
        )}
      </>
    );
  }

  if (tab === "item-wise-sales") {
    const d = data as { items: any[] } | null;
    const rows = d?.items || [];
    const columns: Column<any>[] = [
      { header: "Item", accessor: (r) => r.itemName },
      { header: "Code", accessor: (r) => r.itemCode },
      { header: "Qty Sold", accessor: (r) => r.totalQty },
      { header: "Amount", accessor: (r) => formatCurrency(r.totalAmount) },
    ];
    return (
      <>
        <ExportCsvButton
          filename="item-wise-sales-report.csv"
          rows={rows.map((r) => ({ item: r.itemName, code: r.itemCode, qtySold: r.totalQty, amount: r.totalAmount }))}
        />
        <Table columns={columns} data={rows} keyField={(r) => r.itemCode} loading={loading} />
      </>
    );
  }

  if (tab === "stock") {
    const d = data as { items: any[] } | null;
    const rows = d?.items || [];
    const columns: Column<any>[] = [
      { header: "Item", accessor: (r) => r.item?.name },
      { header: "Code", accessor: (r) => r.item?.code },
      { header: "Current Stock", accessor: (r) => r.currentQty },
    ];
    return (
      <>
        <ExportCsvButton
          filename="stock-report.csv"
          rows={rows.map((r) => ({ item: r.item?.name, code: r.item?.code, currentQty: r.currentQty }))}
        />
        <Table columns={columns} data={rows} keyField={(r) => r._id} loading={loading} />
      </>
    );
  }

  if (tab === "profit") {
    const d = data as { purchaseCost: number; salesRevenue: number; grossProfit: number } | null;
    if (!d) return <div className="p-6 text-sm text-slate-400">No data</div>;
    return (
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
        <StatBlock label="Purchase Cost" value={formatCurrency(d.purchaseCost)} />
        <StatBlock label="Sales Revenue" value={formatCurrency(d.salesRevenue)} />
        <StatBlock label="Gross Profit" value={formatCurrency(d.grossProfit)} highlight={d.grossProfit >= 0} />
      </div>
    );
  }

  if (tab === "monthly-yearly") {
    const d = data as {
      purchase: { _id: string; qty: number; amount: number }[];
      production: { _id: string; milkConsumed: number }[];
      sales: { _id: string; sales: number }[];
    } | null;

    // Each metric comes back as its own array keyed by period ("2026-08" or
    // "2026") — merge into one row per period so the table reads left-to-right
    // instead of three separate lists.
    const byPeriod = new Map<string, { period: string; qty: number; amount: number; milkConsumed: number; sales: number }>();
    const getRow = (period: string) => {
      if (!byPeriod.has(period)) byPeriod.set(period, { period, qty: 0, amount: 0, milkConsumed: 0, sales: 0 });
      return byPeriod.get(period)!;
    };
    (d?.purchase || []).forEach((r) => Object.assign(getRow(r._id), { qty: r.qty, amount: r.amount }));
    (d?.production || []).forEach((r) => Object.assign(getRow(r._id), { milkConsumed: r.milkConsumed }));
    (d?.sales || []).forEach((r) => Object.assign(getRow(r._id), { sales: r.sales }));
    const rows = [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period));

    const columns: Column<(typeof rows)[number]>[] = [
      { header: "Period", accessor: (r) => r.period },
      { header: "Milk Purchased Qty", accessor: (r) => r.qty },
      { header: "Purchase Amount", accessor: (r) => formatCurrency(r.amount) },
      { header: "Milk Consumed", accessor: (r) => `${r.milkConsumed.toFixed(2)} KG` },
      { header: "Sales", accessor: (r) => formatCurrency(r.sales) },
    ];

    return (
      <>
        <ExportCsvButton filename="monthly-yearly-report.csv" rows={rows} />
        <Table columns={columns} data={rows} keyField={(r) => r.period} loading={loading} />
      </>
    );
  }

  return null;
}

function ExportCsvButton({ filename, rows }: { filename: string; rows: Record<string, unknown>[] }) {
  return (
    <div className="flex justify-end px-4 pt-3">
      <Button
        variant="outline"
        size="sm"
        icon={<FiDownload className="h-3.5 w-3.5" />}
        onClick={() => downloadCsv(filename, rows)}
        title="Exports the current page — change pages to export more"
      >
        Export CSV (this page)
      </Button>
    </div>
  );
}

function StatBlock({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold", highlight === undefined ? "text-slate-800" : highlight ? "text-emerald-600" : "text-red-600")}>
        {value}
      </p>
    </div>
  );
}

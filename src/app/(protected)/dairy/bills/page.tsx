"use client";

import { useRef, useState } from "react";
import { FiShoppingBag, FiDollarSign, FiCheckCircle, FiClock, FiPrinter, FiDownload } from "react-icons/fi";
import { RowActions, ViewAction, CancelAction } from "@/components/ui/RowActions";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api";
import { billService } from "@/services/bill.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Bill } from "@/types";

export default function BillHistoryPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  type BillSummary = { count: number; totalSales: number; totalPaid: number; totalBalance: number };
  const { items, total, pages, summary, loading, refetch } = usePaginatedList<Bill, BillSummary>("/bills", {
    search,
    page,
    extraParams: { from, to },
  });

  const [viewing, setViewing] = useState<Bill | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Bill | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const cancellingRef = useRef(false);

  const handleDownloadPdf = async () => {
    if (!viewing) return;
    setDownloading(true);
    try {
      await billService.downloadPdf(viewing._id, viewing.billNo);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!viewing) return;
    setPrinting(true);
    try {
      await billService.printPdf(viewing._id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPrinting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget || cancellingRef.current) return;
    cancellingRef.current = true;
    setCancelling(true);
    try {
      await billService.cancel(cancelTarget._id);
      toast.success("બિલ રદ થયું અને સ્ટોક પાછો આવ્યો (Bill cancelled and stock reversed)");
      setCancelTarget(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      cancellingRef.current = false;
      setCancelling(false);
    }
  };

  const columns: Column<Bill>[] = [
    { header: "તારીખ (Date)", accessor: (b) => formatDate(b.date) },
    { header: "બિલ નંબર (Bill No.)", primary: true, accessor: (b) => <span className="font-mono text-xs">{b.billNo}</span> },
    { header: "ગ્રાહક (Customer)", accessor: (b) => b.customerName || "વૉક-ઇન (Walk-in)" },
    { header: "આઇટમ (Items)", accessor: (b) => b.items.length },
    { header: "કુલ રકમ (Grand Total)", accessor: (b) => formatCurrency(b.grandTotal) },
    {
      header: "સ્થિતિ (Status)",
      accessor: (b) => (
        <Badge tone={b.status === "active" ? "success" : "danger"}>{b.status === "active" ? "ચાલુ (Active)" : "રદ (Cancelled)"}</Badge>
      ),
    },
    {
      header: "ક્રિયા (Actions)",
      accessor: (b) => (
        <RowActions>
          <ViewAction onClick={() => setViewing(b)} />
          {b.status === "active" && <CancelAction onClick={() => setCancelTarget(b)} />}
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="બિલ ઇતિહાસ (Bill History)" description="તમારી ડેરીના બધા બિલ (All counter bills for your dairy)" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="કુલ બિલ (Total Bills)" value={summary?.count ?? 0} icon={<FiShoppingBag className="h-5 w-5" />} tone="indigo" />
        <StatCard label="કુલ વેચાણ (Total Sales)" value={formatCurrency(summary?.totalSales)} icon={<FiDollarSign className="h-5 w-5" />} tone="sky" />
        <StatCard label="ચૂકવેલ રકમ (Paid Amount)" value={formatCurrency(summary?.totalPaid)} icon={<FiCheckCircle className="h-5 w-5" />} tone="emerald" />
        <StatCard label="બાકી રકમ (Pending Amount)" value={formatCurrency(summary?.totalBalance)} icon={<FiClock className="h-5 w-5" />} tone="red" />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="બિલ નંબર, ગ્રાહક, મોબાઇલ, આઇટમ વગેરેથી શોધો... (Search by bill no, customer, mobile, item...)"
        />
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={(v) => { setFrom(v); setPage(1); }}
          onToChange={(v) => { setTo(v); setPage(1); }}
          onClear={() => { setFrom(""); setTo(""); setPage(1); }}
        />
      </div>

      <Table columns={columns} data={items} keyField={(b) => b._id} loading={loading} emptyMessage="હજુ કોઈ બિલ નથી (No bills yet)" />
      <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} title={`બિલ (Bill) ${viewing?.billNo || ""}`} size="md">
        {viewing && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-500">
              {viewing.customerName || "વૉક-ઇન (Walk-in)"} — {formatDate(viewing.date)}
            </p>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {viewing.items.map((row, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <span>{typeof row.item === "object" && row.item ? row.item.name : "કાઢી નાખેલ આઇટમ (Deleted item)"}</span>
                  <span className="text-slate-500">
                    {row.quantity} × {formatCurrency(row.rate)} = {formatCurrency(row.amount)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-right font-semibold">કુલ રકમ (Grand Total): {formatCurrency(viewing.grandTotal)}</p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" icon={<FiPrinter className="h-4 w-4" />} onClick={handlePrint} loading={printing}>
                પ્રિન્ટ કરો (Print)
              </Button>
              <Button icon={<FiDownload className="h-4 w-4" />} onClick={handleDownloadPdf} loading={downloading}>
                PDF ડાઉનલોડ કરો
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={cancelling}
        title="બિલ રદ કરો (Cancel Bill)"
        description={`આ બિલ "${cancelTarget?.billNo}" માટે કાપેલો સ્ટોક પાછો ઉમેરાશે. ચાલુ રાખવું છે? (This will reverse the stock deducted for this bill. Continue?)`}
        confirmLabel="બિલ રદ કરો (Cancel Bill)"
      />
    </div>
  );
}

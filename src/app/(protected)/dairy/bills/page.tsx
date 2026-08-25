"use client";

import { useRef, useState } from "react";
import { FiShoppingBag, FiDollarSign, FiCheckCircle, FiClock } from "react-icons/fi";
import { RowActions, ViewAction, CancelAction } from "@/components/ui/RowActions";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
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
  type BillSummary = { count: number; totalSales: number; totalPaid: number; totalBalance: number };
  const { items, total, pages, summary, loading, refetch } = usePaginatedList<Bill, BillSummary>("/bills", { search, page });

  const [viewing, setViewing] = useState<Bill | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Bill | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const cancellingRef = useRef(false);

  const handleCancel = async () => {
    if (!cancelTarget || cancellingRef.current) return;
    cancellingRef.current = true;
    setCancelling(true);
    try {
      await billService.cancel(cancelTarget._id);
      toast.success("Bill cancelled and stock reversed");
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
    { header: "Date", accessor: (b) => formatDate(b.date) },
    { header: "Bill No.", accessor: (b) => <span className="font-mono text-xs">{b.billNo}</span> },
    { header: "Customer", accessor: (b) => b.customerName || "Walk-in" },
    { header: "Items", accessor: (b) => b.items.length },
    { header: "Grand Total", accessor: (b) => formatCurrency(b.grandTotal) },
    {
      header: "Status",
      accessor: (b) => <Badge tone={b.status === "active" ? "success" : "danger"}>{b.status}</Badge>,
    },
    {
      header: "Actions",
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
      <PageHeader title="Bill History" description="All counter bills for your dairy" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Bills" value={summary?.count ?? 0} icon={<FiShoppingBag className="h-5 w-5" />} tone="indigo" />
        <StatCard label="Total Sales" value={formatCurrency(summary?.totalSales)} icon={<FiDollarSign className="h-5 w-5" />} tone="sky" />
        <StatCard label="Paid Amount" value={formatCurrency(summary?.totalPaid)} icon={<FiCheckCircle className="h-5 w-5" />} tone="emerald" />
        <StatCard label="Pending Amount" value={formatCurrency(summary?.totalBalance)} icon={<FiClock className="h-5 w-5" />} tone="red" />
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by bill no, customer, mobile, item, mode, status..." />
      </div>

      <Table columns={columns} data={items} keyField={(b) => b._id} loading={loading} emptyMessage="No bills yet" />
      <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} title={`Bill ${viewing?.billNo || ""}`} size="md">
        {viewing && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-500">
              {viewing.customerName || "Walk-in"} — {formatDate(viewing.date)}
            </p>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {viewing.items.map((row, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <span>{typeof row.item === "object" ? row.item.name : row.item}</span>
                  <span className="text-slate-500">
                    {row.quantity} × {formatCurrency(row.rate)} = {formatCurrency(row.amount)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-right font-semibold">Grand Total: {formatCurrency(viewing.grandTotal)}</p>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={cancelling}
        title="Cancel Bill"
        description={`This will reverse the stock deducted for bill "${cancelTarget?.billNo}". Continue?`}
        confirmLabel="Cancel Bill"
      />
    </div>
  );
}

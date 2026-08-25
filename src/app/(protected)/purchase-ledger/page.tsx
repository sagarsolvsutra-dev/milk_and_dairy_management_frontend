"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiBookOpen } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { vendorPaymentService } from "@/services/vendor.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Vendor } from "@/types";

type OutstandingRow = {
  vendor: Vendor;
  outstanding: number;
  ageBucket: "0-15" | "16-30" | "30+";
  oldestUnpaidDate: string | null;
};

export default function PurchaseLedgerPage() {
  const toast = useToast();
  const [rows, setRows] = useState<OutstandingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorPaymentService
      .outstandingReport()
      .then((res) => setRows(res.data.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalOutstanding = rows.reduce((sum, r) => sum + r.outstanding, 0);
  const overdueCount = rows.filter((r) => r.ageBucket === "30+").length;

  const columns: Column<OutstandingRow>[] = [
    { header: "Vendor", accessor: (r) => <span className="font-medium text-slate-900">{r.vendor.name}</span> },
    { header: "Mobile", accessor: (r) => r.vendor.mobile },
    {
      header: "Outstanding",
      accessor: (r) => (
        <span className={r.outstanding > 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
          {formatCurrency(r.outstanding)}
        </span>
      ),
    },
    {
      header: "Ageing",
      accessor: (r) => (
        <Badge tone={r.ageBucket === "30+" ? "danger" : r.ageBucket === "16-30" ? "warning" : "success"}>
          {r.ageBucket} days
        </Badge>
      ),
    },
    { header: "Oldest Unpaid", accessor: (r) => formatDate(r.oldestUnpaidDate) },
    {
      header: "Actions",
      accessor: (r) => (
        <Link href={`/masters/vendors/${r.vendor._id}/ledger`}>
          <Button variant="outline" size="sm" icon={<FiBookOpen className="h-3.5 w-3.5" />}>
            View Ledger
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Purchase Ledger" description="Vendor-wise outstanding balances and ageing analysis" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Outstanding" value={formatCurrency(totalOutstanding)} tone="red" />
        <StatCard label="Vendors with Dues" value={rows.length} tone="amber" />
        <StatCard label="Overdue (30+ days)" value={overdueCount} tone="red" />
      </div>

      <Card className="p-0">
        <Table columns={columns} data={rows} keyField={(r) => r.vendor._id} loading={loading} emptyMessage="No outstanding balances — all vendors settled" />
      </Card>
    </div>
  );
}

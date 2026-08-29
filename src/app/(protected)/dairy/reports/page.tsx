"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Card, StatCard } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { reportService } from "@/services/report.service";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/utils";

type Row = { _id: string; billNo: string; date: string; grandTotal: number; customerName?: string };

export default function DairyReportsPage() {
  const toast = useToast();
  const [from, setFrom] = useState(toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(toDateInputValue(new Date()));
  const [bills, setBills] = useState<Row[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalBills, setTotalBills] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchReport = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await reportService.get("dairy-sales", { from, to, page: targetPage });
      setBills(res.data.data.bills);
      setTotalSales(res.data.data.totalSales);
      setTotalBills(res.data.data.total);
      setPages(res.data.data.pages);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changePage = (p: number) => {
    setPage(p);
    fetchReport(p);
  };

  const columns: Column<Row>[] = [
    { header: "તારીખ (Date)", accessor: (r) => formatDate(r.date) },
    { header: "બિલ નંબર (Bill No.)", accessor: (r) => r.billNo },
    { header: "ગ્રાહક (Customer)", accessor: (r) => r.customerName || "વૉક-ઇન (Walk-in)" },
    { header: "રકમ (Amount)", accessor: (r) => formatCurrency(r.grandTotal) },
  ];

  return (
    <div>
      <PageHeader title="મારા રિપોર્ટ (My Reports)" description="તમારી ડેરીનું વેચાણ રિપોર્ટ (Sales report for your dairy)" />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input label="થી (From)" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="સુધી (To)" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button onClick={() => changePage(1)} loading={loading}>
          લાગુ કરો (Apply)
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="કુલ વેચાણ (Total Sales)" value={formatCurrency(totalSales)} tone="emerald" />
        <StatCard label="કુલ બિલ (Total Bills)" value={totalBills} tone="indigo" />
      </div>

      <Card className="p-0">
        <Table columns={columns} data={bills} keyField={(r) => r._id} loading={loading} emptyMessage="આ સમયગાળામાં કોઈ વેચાણ નથી (No sales in this period)" />
      </Card>
      <Pagination page={page} pages={pages} total={totalBills} onPageChange={changePage} />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiPlus } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DetailPageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { vendorService, vendorPaymentService } from "@/services/vendor.service";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/utils";
import { validatePositiveNumber } from "@/lib/validators";
import { useAuth } from "@/hooks/useAuth";
import type { Vendor, VendorLedgerEntry } from "@/types";

const emptyPayment = { date: toDateInputValue(new Date()), amount: "", mode: "Cash", referenceNo: "", remark: "" };

export default function VendorLedgerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canAddPayment = hasPermission("purchase_ledger", "add");

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [entries, setEntries] = useState<VendorLedgerEntry[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyPayment);
  const [amountError, setAmountError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  useEffect(() => {
    setVendor(null);
    setEntries([]);
    setPage(1);
    setSearch("");
    setFrom("");
    setTo("");
  }, [params.id]);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorService.getLedger(params.id, { search, page, limit: 10, from, to });
      setVendor(res.data.data.vendor);
      setEntries(res.data.data.entries);
      setTotalEntries(res.data.data.total);
      setPages(res.data.data.pages);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, search, page, from, to]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    const err = validatePositiveNumber(form.amount, "Amount");
    setAmountError(err || "");
    if (err) {
      toast.error(err);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await vendorPaymentService.create({
        vendor: params.id,
        date: form.date,
        amount: Number(form.amount),
        mode: form.mode,
        referenceNo: form.referenceNo,
        remark: form.remark,
      });
      toast.success("ચુકવણી એન્ટ્રી સેવ થઈ (Payment entry saved)");
      setDialogOpen(false);
      setForm(emptyPayment);
      fetchLedger();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const columns: Column<VendorLedgerEntry>[] = [
    { header: "તારીખ (Date)", accessor: (e) => formatDate(e.date) },
    { header: "વિગત (Particulars)", primary: true, accessor: (e) => e.particulars },
    { header: "ઉધાર (Debit)", accessor: (e) => (e.debit ? formatCurrency(e.debit) : "-") },
    { header: "જમા (Credit)", accessor: (e) => (e.credit ? formatCurrency(e.credit) : "-") },
    {
      header: "બાકી (Balance)",
      accessor: (e) => (
        <span className={e.balanceAfter > 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
          {formatCurrency(e.balanceAfter)}
        </span>
      ),
    },
  ];

  const outstanding = vendor?.currentBalance ?? 0;
  const outstandingHint =
    outstanding > 0
      ? "તમારે વેન્ડરને આટલા રૂપિયા ચૂકવવાના બાકી છે"
      : outstanding < 0
        ? "તમે વધારે ચૂકવ્યા છે (એડવાન્સ જમા છે)"
        : "કોઈ બાકી નથી, હિસાબ ક્લિયર છે";

  if (loading && !vendor) {
    return <DetailPageSkeleton statCount={3} statCols={3} tableRows={6} tableCols={5} />;
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <FiArrowLeft className="h-4 w-4" /> વેન્ડર પર પાછા જાઓ (Back to Vendors)
      </button>

      <PageHeader
        title={vendor?.name || "વેન્ડર ખાતાવહી (Vendor Ledger)"}
        description={vendor?.mobile}
        actions={
          canAddPayment ? (
            <Button icon={<FiPlus className="h-4 w-4" />} onClick={() => { setForm(emptyPayment); setAmountError(""); setDialogOpen(true); }}>
              ચુકવણી ઉમેરો (Add Payment)
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="શરૂઆતની બાકી (Opening Balance)" value={formatCurrency(vendor?.openingBalance)} tone="sky" />
        <StatCard
          label="હાલની બાકી (Current Outstanding)"
          value={formatCurrency(vendor?.currentBalance)}
          tone={outstanding > 0 ? "red" : outstanding < 0 ? "emerald" : "indigo"}
          hint={outstandingHint}
          hintTone={outstanding > 0 ? "red" : outstanding < 0 ? "emerald" : "neutral"}
        />
        <StatCard label="કુલ એન્ટ્રી (Total Entries)" value={totalEntries} tone="indigo" />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="વિગતથી શોધો... (Search by particulars...)" />
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={(v) => { setFrom(v); setPage(1); }}
          onToChange={(v) => { setTo(v); setPage(1); }}
          onClear={() => { setFrom(""); setTo(""); setPage(1); }}
        />
      </div>

      <Card className="p-0">
        <Table columns={columns} data={entries} keyField={(e) => e._id} loading={loading} emptyMessage="હજુ કોઈ ખાતાવહી એન્ટ્રી નથી (No ledger entries yet)" />
      </Card>
      <Pagination page={page} pages={pages} total={totalEntries} onPageChange={setPage} />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="વેન્ડર ચુકવણી ઉમેરો (Add Vendor Payment)"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              રદ કરો (Cancel)
            </Button>
            <Button onClick={handleAddPayment} loading={saving}>
              ચુકવણી સેવ કરો (Save Payment)
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddPayment} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="તારીખ (Date)" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input
            label="રકમ (Amount)"
            type="number"
            step="0.01"
            min="0.01"
            required
            error={amountError}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <Select
            label="ચુકવણીની રીત (Payment Mode)"
            options={[
              { label: "રોકડ (Cash)", value: "Cash" },
              { label: "UPI", value: "UPI" },
              { label: "બેંક (Bank)", value: "Bank" },
              { label: "ચેક (Cheque)", value: "Cheque" },
            ]}
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
          />
          <Input
            label="સંદર્ભ નંબર (Reference No.)"
            value={form.referenceNo}
            onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
          />
          <Input
            label="નોંધ (Remark)"
            wrapperClassName="sm:col-span-2"
            value={form.remark}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
          />
        </form>
      </Dialog>
    </div>
  );
}

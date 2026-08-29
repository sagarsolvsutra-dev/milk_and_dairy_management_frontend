"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiPlus, FiTrash2, FiPrinter, FiDownload, FiUser, FiPhone, FiShoppingCart, FiCheckCircle } from "react-icons/fi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/api";
import { billService } from "@/services/bill.service";
import { itemService } from "@/services/item.service";
import { inventoryService } from "@/services/inventory.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { validateMobile } from "@/lib/validators";
import type { Item, Bill } from "@/types";

type Row = { item: string; quantity: string; rate: string; discount: string };

const emptyRow: Row = { item: "", quantity: "1", rate: "", discount: "0" };

export default function BillingPage() {
  const toast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [dairyStock, setDairyStock] = useState<Record<string, number>>({});
  const refreshDairyStock = () => {
    // Backend scopes this to the logged-in dairy_user's own dairy automatically.
    // This builds a lookup map for every item, not a paginated view — pass a
    // high limit to get everything in one call rather than one page's worth.
    inventoryService
      .getDairyStock({ limit: 1000 })
      .then((res) => {
        const map: Record<string, number> = {};
        for (const s of res.data.data.items) map[s.item?._id || s.item] = s.currentQty;
        setDairyStock(map);
      })
      .catch(() => {});
  };
  useEffect(() => {
    itemService.listActive().then((res) => setItems(res.data.data.items)).catch(() => {});
    refreshDairyStock();
  }, []);

  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i._id, i])), [items]);

  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [roundOff, setRoundOff] = useState("0");
  const [rows, setRows] = useState<Row[]>([{ ...emptyRow }]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [mobileError, setMobileError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedBill, setSavedBill] = useState<Bill | null>(null);
  const [downloading, setDownloading] = useState(false);
  const savingRef = useRef(false);

  // Same item can appear on more than one row — combine what's actually
  // being requested per item so the stock indicator (and the over-limit
  // state) reflects the real total, not just one row in isolation.
  const requestedByItem = useMemo(() => {
    const totals: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.item && Number(r.quantity) > 0) totals[r.item] = (totals[r.item] || 0) + Number(r.quantity);
    });
    return totals;
  }, [rows]);

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const onSelectItem = (index: number, itemId: string) => {
    const item = itemMap[itemId];
    updateRow(index, { item: itemId, rate: item ? String(item.defaultSellingPrice) : "" });
  };

  const addRow = () => setRows((prev) => [...prev, { ...emptyRow }]);
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  const computedRows = rows.map((r) => {
    const qty = Number(r.quantity) || 0;
    const rate = Number(r.rate) || 0;
    const discount = Number(r.discount) || 0;
    return { ...r, amount: qty * rate - discount };
  });

  const itemCount = computedRows.filter((r) => r.item).length;
  const subtotal = computedRows.reduce((sum, r) => sum + r.amount, 0);
  const gstAmount = gstEnabled ? subtotal * 0.05 : 0;
  const grandTotal = subtotal + gstAmount + (Number(roundOff) || 0);

  const resetForm = () => {
    setCustomerName("");
    setCustomerMobile("");
    setPaymentMode("Cash");
    setGstEnabled(false);
    setRoundOff("0");
    setRows([{ ...emptyRow }]);
    setRowErrors({});
    setMobileError("");
  };

  const validateRows = () => {
    const nextErrors: Record<number, string> = {};
    const filledRows = rows.filter((r) => r.item || Number(r.quantity) || Number(r.rate));
    if (!filledRows.length) return { errors: nextErrors, isValid: false, blank: true };
    rows.forEach((r, i) => {
      if (!r.item && !r.quantity && !r.rate) return;
      if (!r.item) nextErrors[i] = "આઇટમ પસંદ કરો (Select an item)";
      else if (!r.quantity || Number(r.quantity) <= 0) nextErrors[i] = "જથ્થો 0 થી વધારે હોવો જોઈએ (Quantity must be greater than 0)";
      else if (r.rate === "" || Number(r.rate) < 0) nextErrors[i] = "ભાવ નેગેટિવ ન હોઈ શકે (Rate cannot be negative)";
      else if (Number(r.discount) < 0) nextErrors[i] = "ડિસ્કાઉન્ટ નેગેટિવ ન હોઈ શકે (Discount cannot be negative)";
      else if (Number(r.discount) > Number(r.quantity) * Number(r.rate)) nextErrors[i] = "ડિસ્કાઉન્ટ જથ્થો × ભાવ કરતાં વધારે ન હોઈ શકે (Discount cannot exceed qty × rate)";
      else if (requestedByItem[r.item] > (dairyStock[r.item] ?? 0)) {
        nextErrors[i] = `ફક્ત ${dairyStock[r.item] ?? 0} સ્ટોકમાં છે (Only ${dairyStock[r.item] ?? 0} in stock)`;
      }
    });
    return { errors: nextErrors, isValid: Object.keys(nextErrors).length === 0, blank: false };
  };

  const handleSave = async () => {
    if (savingRef.current) return;

    const mobileErr = customerMobile ? validateMobile(customerMobile, { required: false }) : "";
    setMobileError(mobileErr || "");

    const { errors: fieldErrors, isValid, blank } = validateRows();
    setRowErrors(fieldErrors);

    if (mobileErr) {
      toast.error(mobileErr);
      return;
    }
    if (blank) {
      toast.warning("બિલમાં ઓછામાં ઓછી એક આઇટમ ઉમેરો (Add at least one item to the bill)");
      return;
    }
    if (!isValid) {
      toast.error("લાલ બતાવેલ લાઇન સુધારો (Please fix the highlighted rows)");
      return;
    }
    const validRows = rows.filter((r) => r.item && Number(r.quantity) > 0);
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await billService.create({
        customerName,
        customerMobile,
        items: validRows.map((r) => ({
          item: r.item,
          quantity: Number(r.quantity),
          rate: Number(r.rate),
          discount: Number(r.discount) || 0,
        })),
        gstEnabled,
        gstAmount,
        roundOff: Number(roundOff) || 0,
        paymentMode,
        paidAmount: grandTotal,
      });
      toast.success("બિલ સફળતાપૂર્વક સેવ થયું (Bill saved successfully)");
      setSavedBill(res.data.data);
      resetForm();
      refreshDairyStock();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!savedBill) return;
    setDownloading(true);
    try {
      await billService.downloadPdf(savedBill._id, savedBill.billNo);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <PageHeader title="કાઉન્ટર બિલિંગ (Counter Billing)" description="ગ્રાહક માટે વેચાણ બિલ બનાવો (Create a sales bill for a walk-in customer)" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FiUser className="h-4 w-4 text-indigo-500" />
              ગ્રાહકની વિગત (Customer Details)
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="ગ્રાહકનું નામ (Customer Name)" placeholder="વૉક-ઇન ગ્રાહક (Walk-in Customer)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              <Input
                label="મોબાઇલ નંબર - વૈકલ્પિક (Mobile Number, optional)"
                icon={<FiPhone className="h-4 w-4" />}
                inputMode="numeric"
                maxLength={10}
                error={mobileError}
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FiShoppingCart className="h-4 w-4 text-indigo-500" />
                બિલ આઇટમ (Bill Items)
              </div>
              {itemCount > 0 && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                  {itemCount} આઇટમ (item{itemCount > 1 ? "s" : ""})
                </span>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="hidden bg-indigo-600 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-white sm:flex sm:items-center sm:gap-2">
                <p className="flex-[2]">આઇટમ (Item)</p>
                <p className="w-20 text-center">સ્ટોક (Stock)</p>
                <p className="w-20 text-right">જથ્થો (Qty)</p>
                <p className="w-24 text-right">ભાવ (Rate)</p>
                <p className="w-24 text-right">ડિસ્કાઉન્ટ</p>
                <p className="w-28 shrink-0 text-right">રકમ (Amount)</p>
                <span className="w-9 shrink-0" aria-hidden="true" />
              </div>

              <div className="divide-y divide-slate-100">
                {computedRows.map((row, i) => {
                  const available = row.item ? dairyStock[row.item] ?? 0 : null;
                  const requested = row.item ? requestedByItem[row.item] ?? 0 : 0;
                  const overLimit = available !== null && requested > available;
                  return (
                  <div key={i} className="flex flex-wrap items-start gap-2 px-3 py-3 sm:flex-nowrap sm:items-center">
                    <Select
                      wrapperClassName="w-full flex-[2] sm:w-auto"
                      options={items
                        // Only items this dairy actually has stock of — no
                        // point offering something that was never dispatched
                        // here, or has since sold out. The row's own current
                        // selection stays visible even at 0 so it doesn't
                        // vanish from the dropdown out from under the user.
                        .filter((it) => (dairyStock[it._id] ?? 0) > 0 || it._id === row.item)
                        .map((it) => ({ label: it.name, value: it._id }))}
                      value={row.item}
                      onChange={(e) => onSelectItem(i, e.target.value)}
                      placeholder="આઇટમ પસંદ કરો (Select item)"
                      error={rowErrors[i]}
                    />
                    <div
                      className={`flex h-9.5 w-20 shrink-0 flex-col items-center justify-center rounded-lg border px-1 text-center leading-tight ${
                        available === null
                          ? "border-slate-100 text-slate-300"
                          : overLimit || available <= 0
                            ? "border-red-200 bg-red-50 text-red-600"
                            : "border-emerald-100 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {available === null ? (
                        <span className="text-xs">—</span>
                      ) : (
                        <>
                          <span className="text-base font-bold">{available}</span>
                          <span className="text-[9px] font-medium uppercase tracking-wide">
                            {available <= 0 ? "સ્ટોક નથી" : overLimit ? "પૂરતું નથી" : "સ્ટોકમાં છે"}
                          </span>
                        </>
                      )}
                    </div>
                    <Input
                      wrapperClassName="w-20"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="જથ્થો"
                      value={row.quantity}
                      onChange={(e) => updateRow(i, { quantity: e.target.value })}
                    />
                    <Input
                      wrapperClassName="w-24"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="ભાવ"
                      value={row.rate}
                      onChange={(e) => updateRow(i, { rate: e.target.value })}
                    />
                    <Input
                      wrapperClassName="w-24"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="ડિસ્કાઉન્ટ"
                      value={row.discount}
                      onChange={(e) => updateRow(i, { discount: e.target.value })}
                    />
                    <div className="w-28 shrink-0 text-right text-sm font-semibold text-slate-800">{formatCurrency(row.amount)}</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1}
                      title="આઇટમ કાઢી નાખો (Remove item)"
                    >
                      <FiTrash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  );
                })}
              </div>
            </div>

            <Button type="button" variant="outline" size="sm" className="mt-3" icon={<FiPlus className="h-3.5 w-3.5" />} onClick={addRow}>
              આઇટમ ઉમેરો (Add Item)
            </Button>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">બિલનો સરવાળો (Bill Summary)</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">સબટોટલ (Subtotal)</span>
              <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
            </div>
            <label className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-500">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                />
                GST લગાવો (Apply GST 5%)
              </span>
              <span className="font-medium text-slate-800">{formatCurrency(gstAmount)}</span>
            </label>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">રાઉન્ડ ઓફ (Round Off)</span>
              <Input type="number" step="0.01" value={roundOff} onChange={(e) => setRoundOff(e.target.value)} wrapperClassName="w-24" />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-indigo-600 px-3.5 py-3 text-white">
              <span className="text-sm font-medium">કુલ રકમ (Grand Total)</span>
              <span className="text-lg font-bold">{formatCurrency(grandTotal)}</span>
            </div>

            <Select
              label="ચુકવણીની રીત (Payment Mode)"
              options={[
                { label: "રોકડ (Cash)", value: "Cash" },
                { label: "UPI", value: "UPI" },
                { label: "કાર્ડ (Card)", value: "Card" },
                { label: "ઉધાર (Credit)", value: "Credit" },
              ]}
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            />
          </div>
          <Button className="mt-4 w-full" onClick={handleSave} loading={saving}>
            સેવ કરો અને પ્રિન્ટ કરો (Save & Print)
          </Button>
        </Card>
      </div>

      <Dialog open={Boolean(savedBill)} onClose={() => setSavedBill(null)} title="બિલ સેવ થયું (Bill Saved)" size="sm">
        {savedBill && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3">
              <FiCheckCircle className="h-8 w-8 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm text-emerald-700">
                  બિલ નંબર <strong>{savedBill.billNo}</strong> સફળતાપૂર્વક સેવ થયું. (Saved successfully.)
                </p>
                <p className="text-xs text-emerald-600">{formatDate(savedBill.date)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm">
              {savedBill.customerName && (
                <div className="mb-1 flex justify-between text-slate-500">
                  <span>ગ્રાહક (Customer)</span>
                  <span className="font-medium text-slate-800">{savedBill.customerName}</span>
                </div>
              )}
              <div className="mb-1 flex justify-between text-slate-500">
                <span>ચુકવણીની રીત (Payment Mode)</span>
                <span className="font-medium text-slate-800">{savedBill.paymentMode}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                <span>કુલ રકમ (Grand Total)</span>
                <span>{formatCurrency(savedBill.grandTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" icon={<FiPrinter className="h-4 w-4" />} onClick={() => window.print()}>
                પ્રિન્ટ કરો (Print)
              </Button>
              <Button icon={<FiDownload className="h-4 w-4" />} onClick={handleDownloadPdf} loading={downloading}>
                PDF ડાઉનલોડ કરો
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

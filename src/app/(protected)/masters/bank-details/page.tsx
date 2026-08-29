"use client";

import { SimpleMasterManager } from "@/components/masters/SimpleMasterManager";
import { API_ENDPOINTS } from "@/services/endpoints";
import { validateIfsc, validateMinLength } from "@/lib/validators";

export default function BankDetailsPage() {
  return (
    <SimpleMasterManager
      endpoint={API_ENDPOINTS.MASTER_BANK_DETAILS}
      module="bank_detail"
      title="બેંક વિગત (Bank Details)"
      singularLabel="બેંક વિગત (Bank Detail)"
      description="બિલની નીચે દર્શાવાતી કંપનીની બેંક ખાતાની વિગત (Company bank account details shown on bill footers)"
      addLabel="બેંક વિગત ઉમેરો (Add Bank Detail)"
      hasToggle={false}
      searchPlaceholder="બેંક વિગત શોધો... (Search bank details...)"
      fields={[
        { name: "accountName", label: "ખાતાધારકનું નામ (Account Name)", required: true, span: 2 },
        {
          name: "accountNo",
          label: "ખાતા નંબર (Account Number)",
          required: true,
          transform: (v) => v.replace(/\D/g, ""),
          validate: (v) => (v.length < 9 || v.length > 18 ? "ખાતા નંબર 9 થી 18 અંકનો હોવો જોઈએ (Account number must be 9 to 18 digits)" : undefined),
        },
        {
          name: "ifsc",
          label: "IFSC કોડ (IFSC Code)",
          required: true,
          hint: "દા.ત. SBIN0001234 (e.g. SBIN0001234)",
          transform: (v) => v.toUpperCase(),
          validate: (v) => validateIfsc(v),
        },
        { name: "bankName", label: "બેંકનું નામ (Bank Name)", required: true, validate: (v) => validateMinLength(v.trim(), 2, "Bank name") },
        { name: "branch", label: "શાખા (Branch)" },
        { name: "upiId", label: "UPI ID" },
      ]}
      displayColumns={[
        { header: "ખાતાધારકનું નામ (Account Name)", render: (row) => <span className="font-medium text-slate-900">{String(row.accountName)}</span> },
        { header: "ખાતા નંબર (Account No.)", render: (row) => String(row.accountNo) },
        { header: "બેંક (Bank)", render: (row) => String(row.bankName) },
        { header: "IFSC", render: (row) => String(row.ifsc) },
      ]}
    />
  );
}

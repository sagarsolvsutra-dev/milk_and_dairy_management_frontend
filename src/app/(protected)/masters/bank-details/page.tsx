"use client";

import { SimpleMasterManager } from "@/components/masters/SimpleMasterManager";
import { API_ENDPOINTS } from "@/services/endpoints";
import { validateIfsc, validateMinLength } from "@/lib/validators";

export default function BankDetailsPage() {
  return (
    <SimpleMasterManager
      endpoint={API_ENDPOINTS.MASTER_BANK_DETAILS}
      module="bank_detail"
      title="Bank Details"
      description="Company bank account details shown on bill footers"
      addLabel="Add Bank Detail"
      hasToggle={false}
      searchPlaceholder="Search bank details..."
      fields={[
        { name: "accountName", label: "Account Name", required: true, span: 2 },
        {
          name: "accountNo",
          label: "Account Number",
          required: true,
          transform: (v) => v.replace(/\D/g, ""),
          validate: (v) => (v.length < 9 || v.length > 18 ? "Account number must be 9 to 18 digits" : undefined),
        },
        {
          name: "ifsc",
          label: "IFSC Code",
          required: true,
          hint: "e.g. SBIN0001234",
          transform: (v) => v.toUpperCase(),
          validate: (v) => validateIfsc(v),
        },
        { name: "bankName", label: "Bank Name", required: true, validate: (v) => validateMinLength(v.trim(), 2, "Bank name") },
        { name: "branch", label: "Branch" },
        { name: "upiId", label: "UPI ID" },
      ]}
      displayColumns={[
        { header: "Account Name", render: (row) => <span className="font-medium text-slate-900">{String(row.accountName)}</span> },
        { header: "Account No.", render: (row) => String(row.accountNo) },
        { header: "Bank", render: (row) => String(row.bankName) },
        { header: "IFSC", render: (row) => String(row.ifsc) },
      ]}
    />
  );
}

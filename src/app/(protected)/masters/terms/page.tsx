"use client";

import { SimpleMasterManager } from "@/components/masters/SimpleMasterManager";
import { API_ENDPOINTS } from "@/services/endpoints";
import { validateMinLength } from "@/lib/validators";

export default function TermsPage() {
  return (
    <SimpleMasterManager
      endpoint={API_ENDPOINTS.MASTER_TERMS}
      module="terms"
      title="નિયમો અને શરતો (Terms & Conditions)"
      singularLabel="શરત (Term)"
      description="બિલ પર છપાતી મૂળભૂત નિયમો અને શરતો (Default terms and conditions printed on bills)"
      addLabel="નિયમો ઉમેરો (Add Terms)"
      searchPlaceholder="નિયમો શોધો... (Search terms...)"
      fields={[
        { name: "title", label: "શીર્ષક (Title)", required: true, span: 2, validate: (v) => validateMinLength(v.trim(), 2, "Title") },
        {
          name: "content",
          label: "વિગત (Content)",
          type: "textarea",
          required: true,
          span: 2,
          validate: (v) => validateMinLength(v.trim(), 10, "Content"),
        },
      ]}
      displayColumns={[
        { header: "શીર્ષક (Title)", render: (row) => <span className="font-medium text-slate-900">{String(row.title)}</span> },
        {
          header: "વિગત (Content)",
          render: (row) => <span className="line-clamp-1 max-w-xs text-slate-500">{String(row.content)}</span>,
        },
      ]}
    />
  );
}

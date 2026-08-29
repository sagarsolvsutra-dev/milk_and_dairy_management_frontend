"use client";

import { SimpleMasterManager } from "@/components/masters/SimpleMasterManager";
import { API_ENDPOINTS } from "@/services/endpoints";
import { validateMinLength } from "@/lib/validators";

export default function CitiesPage() {
  return (
    <SimpleMasterManager
      endpoint={API_ENDPOINTS.MASTER_CITIES}
      module="city"
      title="શહેર (Cities)"
      singularLabel="શહેર (City)"
      description="વેન્ડરના સરનામાં માટે વપરાતા શહેર અને ગામ સંભાળો (Manage cities and villages used for vendor addresses)"
      addLabel="શહેર ઉમેરો (Add City)"
      searchPlaceholder="શહેર શોધો... (Search cities...)"
      fields={[
        {
          name: "name",
          label: "શહેર / ગામનું નામ (City / Village Name)",
          required: true,
          validate: (v) => validateMinLength(v.trim(), 2, "City name"),
        },
        { name: "state", label: "રાજ્ય (State)" },
      ]}
      displayColumns={[
        { header: "નામ (Name)", render: (row) => <span className="font-medium text-slate-900">{String(row.name)}</span> },
        { header: "રાજ્ય (State)", render: (row) => String(row.state || "-") },
      ]}
    />
  );
}

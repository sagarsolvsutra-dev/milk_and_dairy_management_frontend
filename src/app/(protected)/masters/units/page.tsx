"use client";

import { SimpleMasterManager } from "@/components/masters/SimpleMasterManager";
import { API_ENDPOINTS } from "@/services/endpoints";
import { validateMinLength } from "@/lib/validators";

export default function UnitsPage() {
  return (
    <SimpleMasterManager
      endpoint={API_ENDPOINTS.MASTER_UNITS}
      module="unit"
      title="એકમ (Units)"
      singularLabel="એકમ (Unit)"
      description="માપનનાં એકમો સંભાળો (KG, લિટર, નંગ, પેકેટ) (Manage measurement units (KG, Litre, Nos, Packet))"
      addLabel="એકમ ઉમેરો (Add Unit)"
      searchPlaceholder="એકમ શોધો... (Search units...)"
      fields={[
        {
          name: "name",
          label: "એકમનું નામ (Unit Name)",
          required: true,
          placeholder: "દા.ત. કિલોગ્રામ (e.g. Kilogram)",
          validate: (v) => validateMinLength(v.trim(), 2, "Unit name"),
        },
        { name: "shortCode", label: "ટૂંકો કોડ (Short Code)", required: true, placeholder: "દા.ત. KG (e.g. KG)" },
      ]}
      displayColumns={[
        { header: "નામ (Name)", render: (row) => <span className="font-medium text-slate-900">{String(row.name)}</span> },
        { header: "ટૂંકો કોડ (Short Code)", render: (row) => String(row.shortCode) },
      ]}
    />
  );
}

"use client";

import { SimpleMasterManager } from "@/components/masters/SimpleMasterManager";
import { API_ENDPOINTS } from "@/services/endpoints";
import { validateMinLength } from "@/lib/validators";

const PROVIDER_OPTIONS = [
  { label: "WATI", value: "WATI" },
  { label: "AiSensy", value: "AiSensy" },
  { label: "MSG91", value: "MSG91" },
  { label: "Whapi", value: "Whapi" },
];

export default function WhatsappTokensPage() {
  return (
    <SimpleMasterManager
      endpoint={API_ENDPOINTS.MASTER_WHATSAPP_TOKENS}
      module="whatsapp_token"
      title="WhatsApp ટોકન (WhatsApp Tokens)"
      singularLabel="WhatsApp ટોકન (WhatsApp Token)"
      description="બિલ અને સૂચનાઓ મોકલવા માટે WhatsApp API ટોકન સંભાળો (Manage WhatsApp API tokens used to send bills and notifications)"
      addLabel="ટોકન ઉમેરો (Add Token)"
      searchPlaceholder="પ્રોવાઇડર અથવા નંબરથી શોધો... (Search by provider or number...)"
      fields={[
        {
          name: "provider",
          label: "પ્રોવાઇડર (Provider)",
          type: "select",
          options: PROVIDER_OPTIONS,
          required: true,
        },
        {
          name: "senderNumber",
          label: "મોકલનાર નંબર (Sender Number)",
          required: true,
          placeholder: "દા.ત. 919876543210 (e.g. 919876543210)",
          transform: (v) => v.replace(/\D/g, ""),
          validate: (v) => (v.length < 10 ? "મોકલનાર નંબર માન્ય નથી (Sender number is invalid)" : undefined),
        },
        {
          name: "apiToken",
          label: "API ટોકન (API Token)",
          required: true,
          span: 2,
          validate: (v) => validateMinLength(v.trim(), 8, "API Token"),
        },
      ]}
      displayColumns={[
        { header: "પ્રોવાઇડર (Provider)", render: (row) => <span className="font-medium text-slate-900">{String(row.provider)}</span> },
        { header: "મોકલનાર નંબર (Sender Number)", render: (row) => String(row.senderNumber) },
        {
          header: "API ટોકન (API Token)",
          render: (row) => <span className="font-mono text-xs text-slate-500">{"•".repeat(8)}{String(row.apiToken).slice(-4)}</span>,
        },
      ]}
    />
  );
}

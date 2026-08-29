import {
  FiGrid,
  FiUsers,
  FiPackage,
  FiHome,
  FiShoppingCart,
  FiBookOpen,
  FiActivity,
  FiTruck,
  FiBox,
  FiUserCheck,
  FiBarChart2,
  FiSettings,
  FiShoppingBag,
  FiList,
  FiMessageCircle,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import type { Role } from "@/types";

export type NavItem = {
  label: string;
  labelEn: string;
  href: string;
  icon: IconType;
  roles: Role[];
  module?: string;
};

export type NavGroup = {
  id: string;
  title: string;
  titleEn: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    title: "ઝલક",
    titleEn: "Overview",
    items: [
      { label: "ડેશબોર્ડ", labelEn: "Dashboard", href: "/dashboard", icon: FiGrid, roles: ["super_admin", "staff"] },
      { label: "ડેરી હોમ", labelEn: "Dairy Home", href: "/dairy", icon: FiHome, roles: ["dairy_user"] },
    ],
  },
  {
    id: "purchase",
    title: "ખરીદી",
    titleEn: "Purchase",
    items: [
      { label: "દૂધ ખરીદી એન્ટ્રી", labelEn: "Milk Purchase Entry", href: "/purchases", icon: FiShoppingCart, roles: ["super_admin", "staff"], module: "purchase" },
      { label: "ખરીદી ખાતાવહી", labelEn: "Purchase Ledger", href: "/purchase-ledger", icon: FiBookOpen, roles: ["super_admin", "staff"], module: "purchase_ledger" },
    ],
  },
  {
    id: "production-dispatch",
    title: "ઉત્પાદન અને ડિસ્પેચ",
    titleEn: "Production & Dispatch",
    items: [
      { label: "ઉત્પાદન એન્ટ્રી", labelEn: "Production Entry", href: "/production", icon: FiActivity, roles: ["super_admin", "staff"], module: "production" },
      { label: "ડેરી ડિસ્પેચ", labelEn: "Dairy Dispatch", href: "/dispatch", icon: FiTruck, roles: ["super_admin", "staff"], module: "dispatch" },
    ],
  },
  {
    id: "inventory",
    title: "સ્ટોક",
    titleEn: "Inventory",
    items: [
      { label: "મુખ્ય સ્ટોક", labelEn: "Central Inventory", href: "/inventory", icon: FiBox, roles: ["super_admin", "staff"], module: "inventory" },
      { label: "મારો સ્ટોક", labelEn: "My Inventory", href: "/dairy/inventory", icon: FiBox, roles: ["dairy_user"] },
    ],
  },
  {
    id: "billing",
    title: "બિલિંગ",
    titleEn: "Billing",
    items: [
      { label: "કાઉન્ટર બિલિંગ", labelEn: "Counter Billing", href: "/dairy/billing", icon: FiShoppingBag, roles: ["dairy_user"] },
      { label: "બિલ ઇતિહાસ", labelEn: "Bill History", href: "/dairy/bills", icon: FiList, roles: ["dairy_user"] },
    ],
  },
  {
    id: "team-reports",
    title: "ટીમ અને રિપોર્ટ",
    titleEn: "Team & Reports",
    items: [
      { label: "ટીમ અને હોદ્દા", labelEn: "Team & Roles", href: "/team", icon: FiUserCheck, roles: ["super_admin"] },
      { label: "રિપોર્ટ", labelEn: "Reports", href: "/reports", icon: FiBarChart2, roles: ["super_admin", "staff"], module: "reports" },
      { label: "મારા રિપોર્ટ", labelEn: "My Reports", href: "/dairy/reports", icon: FiBarChart2, roles: ["dairy_user"] },
    ],
  },
  {
    id: "master-settings",
    title: "માસ્ટર સેટિંગ્સ",
    titleEn: "Master Settings",
    items: [
      { label: "વેન્ડર", labelEn: "Vendors", href: "/masters/vendors", icon: FiUsers, roles: ["super_admin", "staff"], module: "vendor" },
      { label: "આઇટમ અને રેસિપી", labelEn: "Items & Recipe", href: "/masters/items", icon: FiPackage, roles: ["super_admin", "staff"], module: "item" },
      { label: "ડેરી (શાખા)", labelEn: "Dairies / Branch", href: "/masters/dairies", icon: FiHome, roles: ["super_admin"] },
      { label: "એકમ", labelEn: "Units", href: "/masters/units", icon: FiSettings, roles: ["super_admin", "staff"], module: "unit" },
      { label: "GST સ્લેબ", labelEn: "GST Slabs", href: "/masters/gst-slabs", icon: FiSettings, roles: ["super_admin", "staff"], module: "gst_slab" },
      { label: "શહેર", labelEn: "Cities", href: "/masters/cities", icon: FiSettings, roles: ["super_admin", "staff"], module: "city" },
      { label: "બેંક વિગત", labelEn: "Bank Details", href: "/masters/bank-details", icon: FiSettings, roles: ["super_admin", "staff"], module: "bank_detail" },
      { label: "WhatsApp ટોકન", labelEn: "WhatsApp Tokens", href: "/masters/whatsapp-tokens", icon: FiMessageCircle, roles: ["super_admin", "staff"], module: "whatsapp_token" },
      { label: "નિયમો અને શરતો", labelEn: "Terms & Conditions", href: "/masters/terms", icon: FiSettings, roles: ["super_admin", "staff"], module: "terms" },
    ],
  },
];

export function findNavItem(pathname: string): NavItem | undefined {
  for (const group of NAV_GROUPS) {
    const match = group.items.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
    if (match) return match;
  }
  return undefined;
}

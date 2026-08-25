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
} from "react-icons/fi";
import type { IconType } from "react-icons";
import type { Role } from "@/types";

export type NavItem = {
  label: string;
  href: string;
  icon: IconType;
  roles: Role[];
  module?: string;
};

export type NavGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: FiGrid, roles: ["super_admin", "staff"] },
      { label: "Dairy Home", href: "/dairy", icon: FiHome, roles: ["dairy_user"] },
    ],
  },
  {
    id: "purchase",
    title: "Purchase",
    items: [
      { label: "Milk Purchase Entry", href: "/purchases", icon: FiShoppingCart, roles: ["super_admin", "staff"], module: "purchase" },
      { label: "Purchase Ledger", href: "/purchase-ledger", icon: FiBookOpen, roles: ["super_admin", "staff"], module: "purchase_ledger" },
    ],
  },
  {
    id: "production-dispatch",
    title: "Production & Dispatch",
    items: [
      { label: "Production Entry", href: "/production", icon: FiActivity, roles: ["super_admin", "staff"], module: "production" },
      { label: "Dairy Dispatch", href: "/dispatch", icon: FiTruck, roles: ["super_admin", "staff"], module: "dispatch" },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    items: [
      { label: "Central Inventory", href: "/inventory", icon: FiBox, roles: ["super_admin", "staff"], module: "inventory" },
      { label: "My Inventory", href: "/dairy/inventory", icon: FiBox, roles: ["dairy_user"] },
    ],
  },
  {
    id: "billing",
    title: "Billing",
    items: [
      { label: "Counter Billing", href: "/dairy/billing", icon: FiShoppingBag, roles: ["dairy_user"] },
      { label: "Bill History", href: "/dairy/bills", icon: FiList, roles: ["dairy_user"] },
    ],
  },
  {
    id: "team-reports",
    title: "Team & Reports",
    items: [
      { label: "Team & Roles", href: "/team", icon: FiUserCheck, roles: ["super_admin"] },
      { label: "Reports", href: "/reports", icon: FiBarChart2, roles: ["super_admin", "staff"], module: "reports" },
      { label: "My Reports", href: "/dairy/reports", icon: FiBarChart2, roles: ["dairy_user"] },
    ],
  },
  {
    id: "master-settings",
    title: "Master Settings",
    items: [
      { label: "Vendors", href: "/masters/vendors", icon: FiUsers, roles: ["super_admin", "staff"], module: "vendor" },
      { label: "Items & Recipe", href: "/masters/items", icon: FiPackage, roles: ["super_admin", "staff"], module: "item" },
      { label: "Dairies (Branch)", href: "/masters/dairies", icon: FiHome, roles: ["super_admin"] },
      { label: "Units", href: "/masters/units", icon: FiSettings, roles: ["super_admin", "staff"], module: "unit" },
      { label: "GST Slabs", href: "/masters/gst-slabs", icon: FiSettings, roles: ["super_admin", "staff"], module: "gst_slab" },
      { label: "Cities", href: "/masters/cities", icon: FiSettings, roles: ["super_admin", "staff"], module: "city" },
      { label: "Bank Details", href: "/masters/bank-details", icon: FiSettings, roles: ["super_admin", "staff"], module: "bank_detail" },
      { label: "Terms & Conditions", href: "/masters/terms", icon: FiSettings, roles: ["super_admin", "staff"], module: "terms" },
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

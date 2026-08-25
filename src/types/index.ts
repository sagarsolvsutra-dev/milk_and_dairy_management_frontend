export type Role = "super_admin" | "dairy_user" | "staff";

export type Permission = {
  module: string;
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  loginId: string | null;
  role: Role;
  dairy: string | null;
  roleTitle: string | null;
  permissions: Permission[];
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pages: number;
};

export type City = { _id: string; name: string; state?: string; isActive: boolean };

export type Unit = { _id: string; name: string; shortCode: string; isActive: boolean };

export type GstSlab = { _id: string; percent: number; label?: string; isActive: boolean };

export type BankDetail = {
  _id: string;
  accountName: string;
  accountNo: string;
  ifsc: string;
  bankName: string;
  branch?: string;
  upiId?: string;
  isDefault: boolean;
};

export type TermsCondition = {
  _id: string;
  title: string;
  content: string;
  isDefault: boolean;
  isActive: boolean;
};

export type WhatsappToken = {
  _id: string;
  provider: "WATI" | "AiSensy" | "MSG91" | "Whapi";
  apiToken: string;
  senderNumber: string;
  isActive: boolean;
};

export type Vendor = {
  _id: string;
  name: string;
  mobile: string;
  address?: string;
  city?: City | string | null;
  openingBalance: number;
  currentBalance: number;
  bankDetail?: { accountNo?: string; ifsc?: string; bankName?: string };
  isActive: boolean;
  createdAt: string;
};

export type Item = {
  _id: string;
  name: string;
  code: string;
  category?: string;
  unit: Unit | string;
  recipe: { milkQtyPerUnit: number; milkUnit: string };
  defaultSellingPrice: number;
  gstSlab?: GstSlab | string | null;
  minStockAlert: number;
  photoUrl?: string;
  isActive: boolean;
};

export type Dairy = {
  _id: string;
  name: string;
  code: string;
  mobile: string;
  address?: string;
  loginId: string;
  status: "active" | "inactive";
  createdAt: string;
};

export type PurchaseEntry = {
  _id: string;
  date: string;
  billNo: string;
  vendor: Vendor | string;
  quantity: number;
  unit: "KG" | "Litre";
  rate: number;
  fatDegree?: number | null;
  totalAmount: number;
  otherCharges: number;
  netPayable: number;
  paidAmount: number;
  balance: number;
  paymentMode: "Cash" | "UPI" | "Bank" | "Cheque";
  dueDate?: string | null;
  remark?: string;
  status: "active" | "cancelled";
};

export type VendorLedgerEntry = {
  _id: string;
  date: string;
  particulars: string;
  debit: number;
  credit: number;
  balanceAfter: number;
};

export type ProductionEntry = {
  _id: string;
  date: string;
  batchNo: string;
  items: { item: Item | string; quantity: number; milkConsumed: number }[];
  totalMilkConsumed: number;
  remark?: string;
  status: "active" | "cancelled";
};

export type DispatchEntry = {
  _id: string;
  date: string;
  dispatchNo: string;
  dairy: Dairy | string;
  items: { item: Item | string; quantity: number }[];
  vehicleNo?: string;
  driverName?: string;
  remark?: string;
  status: "active" | "cancelled";
};

export type Bill = {
  _id: string;
  date: string;
  billNo: string;
  dairy: Dairy | string;
  customerName?: string;
  customerMobile?: string;
  items: { item: Item | string; quantity: number; rate: number; discount: number; amount: number }[];
  gstEnabled: boolean;
  gstAmount: number;
  roundOff: number;
  grandTotal: number;
  paymentMode: "Cash" | "UPI" | "Card" | "Credit";
  paidAmount: number;
  balance: number;
  status: "active" | "cancelled";
};

export type TeamUser = {
  _id: string;
  name: string;
  mobile: string;
  email: string;
  loginId: string;
  role: Role;
  roleTitle?: string;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: string | null;
};

export type StockItem = {
  _id: string;
  item: Item;
  currentQty: number;
};

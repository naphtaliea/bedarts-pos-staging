export type Role = "admin" | "manager" | "cashier" | "accountant" | "terminal" | "butcher";
export type PaymentMethod = "cash" | "momo" | "pos_machine";
export type SaleStatus = "completed" | "voided";
export type AdjustmentReason = "write_off" | "correction" | "return" | "waste" | "theft" | "damaged" | "found";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  pin: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface ProductPackage {
  id: string;
  product_id: string;
  label: string;
  quantity: number;
  price: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  category?: Category;
  unit: string;
  units_per_box: number;
  selling_price: number;
  wholesale_price: number | null;
  cost_price: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  stock_quantity?: number;
  image_url?: string;
  has_valid_stock?: boolean;
}

export interface StockBatch {
  id: string;
  product_id: string;
  product?: Product;
  supplier_id: string | null;
  supplier?: Supplier;
  quantity_received: number;
  quantity_remaining: number;
  cost_price: number;
  expiry_date: string | null;
  received_date: string;
  notes: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  sale_number?: number | null;
  cashier_id: string;
  cashier?: Profile;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  status: SaleStatus;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
  sale_items?: SaleItem[];
  payments?: Payment[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  total_price: number;
  cost_at_sale: number | null;
  package_label: string | null;
}

export interface Payment {
  id: string;
  sale_id: string;
  method: PaymentMethod;
  amount: number;           // net amount kept by the drawer (used by reconciliation)
  tendered?: number | null; // over-tender amount for cash; display-only, never used in totals
  reference: string | null;
  created_at: string;
}

export type PurchasePaymentStatus = "unpaid" | "paid";
export type PurchasePaymentMethod = "cash" | "momo" | "bank_transfer" | "cheque";

export interface Purchase {
  id: string;
  supplier_id: string;
  supplier?: Supplier;
  received_by: string;
  receiver?: Profile;
  total_amount: number;
  notes: string | null;
  created_at: string;
  purchase_items?: PurchaseItem[];
  payment_status: PurchasePaymentStatus;
  paid_at: string | null;
  payment_method: PurchasePaymentMethod | null;
  payment_reference: string | null;
  paid_by: string | null;
  payer?: Pick<Profile, "id" | "full_name">;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  cost_price: number;
  expiry_date: string | null;
}

export interface StockAdjustment {
  id: string;
  product_id: string;
  product?: Product;
  adjusted_by: string;
  adjuster?: Profile;
  quantity_change: number;
  reason: AdjustmentReason;
  notes: string | null;
  created_at: string;
}

export interface CartItem {
  lineId: string;
  product: Product;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  packageLabel: string | null;
}

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  reference: string;
  // For over-tendered cash payments: how much the customer handed over.
  // amount stays as what the drawer kept (net of change) so reconciliation
  // math is unchanged. Undefined/equal-to-amount means no change was given.
  tendered?: number;
}

export interface StoreSettings {
  id: number;
  store_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  receipt_footer: string | null;
  receipt_paper_size: "58mm" | "80mm";
  tax_rate: number;
  tax_enabled: boolean;
  vat_number: string | null;
  opening_hours: string | null;
  sunday_hours: string | null;
  updated_at: string;
}

export interface CashierReconciliation {
  id: string;
  cashier_id: string;
  cashier?: Profile;
  shift_date: string;
  opening_float: number;
  cash_counted: number | null;
  cash_expected: number | null;
  cash_variance: number | null;
  momo_total: number;
  pos_total: number;
  account_total: number;
  gross_sales: number;
  notes: string | null;
  created_at: string;
}

// ── Expenses ─────────────────────────────────────────────────────────────────

export type ExpensePaymentMethod = "cash" | "momo" | "bank_transfer" | "other";
export type ExpenseAuditAction = "created" | "updated" | "deleted";

export interface ExpenseCategory {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  amount: number;
  category_id: string;
  category?: ExpenseCategory;
  description: string;
  expense_date: string;
  paid_via: ExpensePaymentMethod;
  reference: string | null;
  is_deleted: boolean;
  created_by: string;
  created_by_profile?: Pick<Profile, "id" | "full_name">;
  created_at: string;
  updated_at: string;
}

export interface ExpenseAuditLog {
  id: string;
  expense_id: string;
  action: ExpenseAuditAction;
  changed_by: string;
  changed_by_profile?: Pick<Profile, "id" | "full_name">;
  changed_at: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}

// ── Integrity checks ──────────────────────────────────────────────────────────

export type IntegritySeverity = "ok" | "warning" | "error";

export interface IntegrityCheckResult {
  id: number;
  run_id: string;
  check_name: string;
  severity: IntegritySeverity;
  anomaly_count: number;
  sample_ids: string[] | null;
  description: string;
  checked_at: string;
}


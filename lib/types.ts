export type Role = "admin" | "manager" | "cashier";
export type TemperatureZone = "frozen" | "chilled" | "ambient";
export type PaymentMethod = "cash" | "momo" | "pos_machine";
export type SaleStatus = "completed" | "voided";
export type AdjustmentReason = "write_off" | "correction" | "return";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  pin: string | null;
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
  selling_price: number;
  cost_price: number;
  temperature_zone: TemperatureZone;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  stock_quantity?: number;
  image_url?: string;
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

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  credit_limit: number;
  credit_balance: number;
  created_at: string;
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
  cashier_id: string;
  cashier?: Profile;
  customer_id: string | null;
  customer?: Customer;
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
}

export interface Payment {
  id: string;
  sale_id: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  created_at: string;
}

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
  product: Product;
  quantity: number;
  unit_price: number;
  discount_amount: number;
}

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  reference: string;
}

export interface StoreSettings {
  id: number;
  store_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  receipt_footer: string | null;
  tax_rate: number;
  tax_enabled: boolean;
  updated_at: string;
}

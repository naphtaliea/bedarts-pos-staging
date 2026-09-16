"use server";

import { requireManagerOrAdmin } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

type CustomerData = {
  name: string;
  phone: string | null;
  email: string | null;
  price_group: "retail" | "wholesale" | "distributor";
  credit_limit: number;
};

// ─── Customers ────────────────────────────────────────────────────────────────

export async function createCustomer(
  data: CustomerData
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();

  const { error } = await supabase.from("customers").insert(data);
  if (error) return { error: error.message };

  revalidatePath("/customers");
  return {};
}

export async function updateCustomer(
  id: string,
  data: CustomerData
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();

  const { error } = await supabase.from("customers").update(data).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/customers");
  return {};
}

export async function deleteCustomer(
  id: string
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();

  // Guard: block deletion if customer has an outstanding balance
  const { data: customer, error: fetchErr } = await supabase
    .from("customers")
    .select("credit_balance")
    .eq("id", id)
    .single();

  if (fetchErr) return { error: fetchErr.message };

  if (customer && customer.credit_balance > 0) {
    return {
      error:
        "Cannot delete a customer with an outstanding balance. Record the payment first.",
    };
  }

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/customers");
  return {};
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function recordPayment(
  customerId: string,
  amount: number,
  notes: string
): Promise<{ error?: string }> {
  const supabase = await requireManagerOrAdmin();

  const { error } = await supabase.rpc("record_customer_payment", {
    p_customer_id: customerId,
    p_amount: amount,
    p_notes: notes || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/customers");
  return {};
}

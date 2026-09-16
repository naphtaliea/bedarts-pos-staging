import { redirect } from "next/navigation";
import { getSaleForReceipt } from "@/app/(dashboard)/pos/actions";
import { ReceiptClient } from "./receipt-client";
import type { StoreSettings } from "@/lib/types";

interface ReceiptPageProps {
  searchParams: Promise<{ sale?: string }>;
}

const DEFAULT_SETTINGS: StoreSettings = {
  id: 1,
  store_name: "Bedarts Cold Supplies",
  address: null,
  phone: null,
  email: null,
  vat_number: null,
  receipt_footer: "Thank you for shopping with us!",
  updated_at: "",
  tax_rate: 0,
  tax_enabled: false,
};

export default async function ReceiptPage({ searchParams }: ReceiptPageProps) {
  const { sale: saleId } = await searchParams;

  if (!saleId) redirect("/cashier");

  const { sale, settings } = await getSaleForReceipt(saleId);

  if (!sale) redirect("/cashier");

  return (
    <ReceiptClient
      sale={sale}
      settings={settings ?? DEFAULT_SETTINGS}
    />
  );
}

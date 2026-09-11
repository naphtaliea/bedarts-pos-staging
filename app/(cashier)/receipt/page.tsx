import { redirect } from "next/navigation";
import { getSaleForReceipt } from "@/app/(dashboard)/pos/actions";
import { ReceiptClient } from "./receipt-client";

interface ReceiptPageProps {
  searchParams: Promise<{ sale?: string }>;
}

export default async function ReceiptPage({ searchParams }: ReceiptPageProps) {
  const { sale: saleId } = await searchParams;

  if (!saleId) redirect("/cashier");

  const { sale, settings } = await getSaleForReceipt(saleId);

  if (!sale) redirect("/cashier");

  return (
    <ReceiptClient
      saleId={saleId}
      sale={sale}
      storeName={settings?.store_name ?? "Bedarts Cold Supplies"}
      storeAddress={settings?.address ?? null}
      storePhone={settings?.phone ?? null}
      receiptFooter={settings?.receipt_footer ?? null}
    />
  );
}

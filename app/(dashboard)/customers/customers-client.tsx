"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCustomer, updateCustomer, deleteCustomer, recordPayment } from "./actions";
import type { Customer, PriceGroup } from "@/lib/types";
import { formatCurrency, formatDateOnly, cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRICE_GROUPS: { value: PriceGroup; label: string }[] = [
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
  { value: "distributor", label: "Distributor" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priceGroupBadge(group: PriceGroup) {
  switch (group) {
    case "wholesale":
      return (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Wholesale
        </span>
      );
    case "distributor":
      return (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Distributor
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Retail
        </span>
      );
  }
}

function emptyToNull(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState {
  type: "success" | "error";
  message: string;
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  phone: string;
  email: string;
  price_group: PriceGroup;
  credit_limit: string;
}

function getDefaultForm(customer: Customer | null): FormState {
  if (customer) {
    return {
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      price_group: customer.price_group,
      credit_limit: customer.credit_limit.toString(),
    };
  }
  return {
    name: "",
    phone: "",
    email: "",
    price_group: "retail",
    credit_limit: "0",
  };
}

// ─── Customer Form Dialog ─────────────────────────────────────────────────────

interface CustomerFormDialogProps {
  customer: Customer | null; // null = create
  onClose: () => void;
  onSave: (data: {
    name: string;
    phone: string | null;
    email: string | null;
    price_group: PriceGroup;
    credit_limit: number;
  }) => Promise<void>;
}

function CustomerFormDialog({ customer, onClose, onSave }: CustomerFormDialogProps) {
  const isEdit = customer !== null;
  const [form, setForm] = useState<FormState>(() => getDefaultForm(customer));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(getDefaultForm(customer));
    setError(null);
  }, [customer]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const limitVal = parseFloat(form.credit_limit);
      await onSave({
        name: form.name.trim(),
        phone: emptyToNull(form.phone),
        email: emptyToNull(form.email),
        price_group: form.price_group,
        credit_limit: isNaN(limitVal) ? 0 : limitVal,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="mx-4 w-full max-w-md rounded-2xl bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-5">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? "Edit Customer" : "Add Customer"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form
          id="customer-form"
          onSubmit={handleSubmit}
          className="space-y-4 px-6 py-5"
        >
          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Kwame Asante"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Phone
            </label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="e.g. 0244 123 456"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Email
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="e.g. kwame@example.com"
            />
          </div>

          {/* Price Group */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Price Group <span className="text-destructive">*</span>
            </label>
            <select
              value={form.price_group}
              onChange={(e) => set("price_group", e.target.value as PriceGroup)}
              className="flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {PRICE_GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Credit Limit */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Credit Limit (GHS)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.credit_limit}
              onChange={(e) => set("credit_limit", e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Dialog ────────────────────────────────────────────────────────────

interface PaymentDialogProps {
  customer: Customer;
  onClose: () => void;
  onRecord: (amount: number, notes: string) => Promise<void>;
}

function PaymentDialog({ customer, onClose, onRecord }: PaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }
    if (parsed > customer.credit_balance) {
      setError(
        `Amount exceeds the outstanding balance of ${formatCurrency(customer.credit_balance)}.`
      );
      return;
    }
    setSubmitting(true);
    try {
      await onRecord(parsed, notes.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Record Payment</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{customer.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Balance summary */}
        <div className="mx-6 mt-5 rounded-xl bg-destructive/8 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Outstanding Balance</p>
          <p className="mt-0.5 text-xl font-bold text-destructive">
            {formatCurrency(customer.credit_balance)}
          </p>
        </div>

        {/* Form */}
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Amount Paid (GHS) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Notes (optional)
            </label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. MoMo ref: GH12345"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="payment-form" variant="success" disabled={submitting}>
            {submitting ? "Recording…" : "Record Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CustomersClientProps {
  customers: Customer[];
}

// ─── Main client component ────────────────────────────────────────────────────

export function CustomersClient({ customers }: CustomersClientProps) {
  const router = useRouter();

  // — Dialog state
  const [showForm, setShowForm] = useState<null | "create" | Customer>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);

  // — Search
  const [search, setSearch] = useState("");

  // — Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(type: ToastState["type"], message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // ─── Filtered list ─────────────────────────────────────────────────────────

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      c.price_group.toLowerCase().includes(q)
    );
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleSaveCustomer(data: {
    name: string;
    phone: string | null;
    email: string | null;
    price_group: PriceGroup;
    credit_limit: number;
  }) {
    let result: { error?: string };
    if (showForm === "create") {
      result = await createCustomer(data);
    } else if (showForm && typeof showForm === "object") {
      result = await updateCustomer(showForm.id, data);
    } else {
      return;
    }
    if (result.error) throw new Error(result.error);
    showToast(
      "success",
      showForm === "create" ? "Customer added." : "Customer updated."
    );
    router.refresh();
  }

  async function handleDelete(customer: Customer) {
    if (customer.credit_balance > 0) {
      showToast(
        "error",
        `Cannot delete ${customer.name} — they have an outstanding balance of ${formatCurrency(customer.credit_balance)}. Record the payment first.`
      );
      return;
    }
    const confirmed = window.confirm(
      `Delete customer "${customer.name}"? This cannot be undone.`
    );
    if (!confirmed) return;
    const result = await deleteCustomer(customer.id);
    if (result.error) {
      showToast("error", result.error);
    } else {
      showToast("success", "Customer deleted.");
      router.refresh();
    }
  }

  async function handleRecordPayment(amount: number, notes: string) {
    if (!paymentCustomer) return;
    const result = await recordPayment(paymentCustomer.id, amount, notes);
    if (result.error) throw new Error(result.error);
    showToast("success", `Payment of ${formatCurrency(amount)} recorded.`);
    router.refresh();
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0 gap-4 flex-wrap">
        <h1 className="text-lg font-bold text-foreground">Customers</h1>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers…"
              className="h-9 w-56 rounded-lg border border-border bg-secondary pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Add button */}
          <button
            onClick={() => setShowForm("create")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              {search.trim()
                ? "No customers match your search."
                : "No customers yet. Add one to get started."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    {[
                      "Name",
                      "Phone",
                      "Price Group",
                      "Credit Limit",
                      "Balance Owed",
                      "Joined",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="sticky top-0 bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-5 last:pr-5"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((customer) => {
                    const hasBalance = customer.credit_balance > 0;
                    return (
                      <tr
                        key={customer.id}
                        className="transition-colors hover:bg-secondary"
                      >
                        {/* Name */}
                        <td className="whitespace-nowrap px-4 py-3 pl-5">
                          <span className="text-sm font-medium text-foreground">
                            {customer.name}
                          </span>
                          {customer.email && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {customer.email}
                            </p>
                          )}
                        </td>

                        {/* Phone */}
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {customer.phone ?? "—"}
                        </td>

                        {/* Price Group */}
                        <td className="whitespace-nowrap px-4 py-3">
                          {priceGroupBadge(customer.price_group)}
                        </td>

                        {/* Credit Limit */}
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {customer.credit_limit > 0
                            ? formatCurrency(customer.credit_limit)
                            : "—"}
                        </td>

                        {/* Balance Owed */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              hasBalance
                                ? "text-destructive"
                                : "text-muted-foreground"
                            )}
                          >
                            {hasBalance
                              ? formatCurrency(customer.credit_balance)
                              : "—"}
                          </span>
                        </td>

                        {/* Joined */}
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {formatDateOnly(customer.created_at)}
                        </td>

                        {/* Actions */}
                        <td className="whitespace-nowrap px-4 py-3 pr-5">
                          <div className="flex items-center gap-1">
                            {/* Record payment — only if balance > 0 */}
                            {hasBalance && (
                              <button
                                onClick={() => setPaymentCustomer(customer)}
                                aria-label={`Record payment for ${customer.name}`}
                                title="Record payment"
                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-success/10 hover:text-success"
                              >
                                <CreditCard className="h-4 w-4" />
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={() => setShowForm(customer)}
                              aria-label={`Edit ${customer.name}`}
                              title="Edit"
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(customer)}
                              aria-label={`Delete ${customer.name}`}
                              title="Delete"
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Row count */}
        {customers.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {filtered.length === customers.length
              ? `${customers.length} customer${customers.length !== 1 ? "s" : ""}`
              : `${filtered.length} of ${customers.length} customers`}
          </p>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all max-w-sm",
            toast.type === "success"
              ? "bg-success text-white"
              : "bg-destructive text-destructive-foreground"
          )}
        >
          {toast.message}
        </div>
      )}

      {/* Customer form dialog */}
      {showForm !== null && (
        <CustomerFormDialog
          customer={showForm === "create" ? null : (showForm as Customer)}
          onClose={() => setShowForm(null)}
          onSave={handleSaveCustomer}
        />
      )}

      {/* Payment dialog */}
      {paymentCustomer && (
        <PaymentDialog
          customer={paymentCustomer}
          onClose={() => setPaymentCustomer(null)}
          onRecord={handleRecordPayment}
        />
      )}
    </div>
  );
}

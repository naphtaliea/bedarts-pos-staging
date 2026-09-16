"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Supplier } from "@/lib/types";

interface SupplierFormDialogProps {
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  }) => Promise<void>;
}

interface FormState {
  name: string;
  phone: string;
  email: string;
  address: string;
}

function getDefaultForm(supplier: Supplier | null): FormState {
  if (supplier) {
    return {
      name: supplier.name,
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
    };
  }
  return { name: "", phone: "", email: "", address: "" };
}

function emptyToNull(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

export function SupplierFormDialog({
  supplier,
  onClose,
  onSave,
}: SupplierFormDialogProps) {
  const isEdit = supplier !== null;

  const [form, setForm] = useState<FormState>(() => getDefaultForm(supplier));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(getDefaultForm(supplier));
    setError(null);
  }, [supplier]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSave({
        name: form.name.trim(),
        phone: emptyToNull(form.phone),
        email: emptyToNull(form.email),
        address: emptyToNull(form.address),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
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
            {isEdit ? "Edit Supplier" : "Add Supplier"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body */}
        <form
          id="supplier-form"
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
              placeholder="e.g. Accra Frozen Foods Ltd"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Phone
            </label>
            <Input
              type="text"
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
              placeholder="e.g. orders@supplier.com"
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Address
            </label>
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="e.g. 14 Industrial Area, Tema"
              className="flex w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
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
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="supplier-form" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Plus, Trash2, UserPlus, KeyRound, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Profile, Category, Supplier, StoreSettings } from "@/lib/types";
import {
  updateStoreSettings,
  updateUserRole,
  setUserPin,
  clearUserPin,
  toggleUserActive,
  inviteUser,
} from "./actions";
import { createCategory, deleteCategory } from "@/app/(dashboard)/inventory/actions";
import { createSupplier, updateSupplier, deleteSupplier } from "@/app/(dashboard)/suppliers/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SettingsClientProps {
  settings: StoreSettings;
  users: Profile[];
  categories: Category[];
  suppliers: Supplier[];
}

type Tab = "store" | "receipt" | "tax" | "users" | "categories" | "suppliers" | "danger";

const TABS: { id: Tab; label: string }[] = [
  { id: "store", label: "Store Info" },
  { id: "receipt", label: "Receipt" },
  { id: "tax", label: "Tax" },
  { id: "users", label: "Users & Roles" },
  { id: "categories", label: "Categories" },
  { id: "suppliers", label: "Suppliers" },
  { id: "danger", label: "Danger Zone" },
];

// ── Toast ─────────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const show = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };
  return { toast, show };
}

function Toast({ toast }: { toast: { type: "success" | "error"; msg: string } | null }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg",
        toast.type === "success"
          ? "bg-success text-white"
          : "bg-destructive text-white"
      )}
    >
      {toast.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      {toast.msg}
    </div>
  );
}

// ── Shared section wrapper ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ── Label + field wrapper ─────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsClient({ settings, users, categories, suppliers }: SettingsClientProps) {
  const [tab, setTab] = useState<Tab>("store");
  const { toast, show } = useToast();

  return (
    <div className="flex h-full">
      {/* Sidebar nav */}
      <nav className="w-48 shrink-0 border-r border-border bg-card flex flex-col py-4 gap-0.5 px-2">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Settings
        </p>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-secondary"
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl space-y-6">
          {tab === "store" && <StoreTab settings={settings} show={show} />}
          {tab === "receipt" && <ReceiptTab settings={settings} show={show} />}
          {tab === "tax" && <TaxTab settings={settings} show={show} />}
          {tab === "users" && <UsersTab users={users} show={show} />}
          {tab === "categories" && <CategoriesTab categories={categories} show={show} />}
          {tab === "suppliers" && <SuppliersTab suppliers={suppliers} show={show} />}
          {tab === "danger" && <DangerTab show={show} />}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

// ── Store Tab ─────────────────────────────────────────────────────────────────

function StoreTab({
  settings,
  show,
}: {
  settings: StoreSettings;
  show: (t: "success" | "error", m: string) => void;
}) {
  const [form, setForm] = useState({
    store_name: settings.store_name ?? "",
    address: settings.address ?? "",
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    receipt_footer: settings.receipt_footer ?? "",
    tax_rate: settings.tax_rate ?? 0,
    tax_enabled: settings.tax_enabled ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await updateStoreSettings({
      store_name: form.store_name,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      receipt_footer: form.receipt_footer || null,
      tax_rate: form.tax_rate,
      tax_enabled: form.tax_enabled,
    });
    setSaving(false);
    res.error ? show("error", res.error) : show("success", "Store info saved");
  }

  return (
    <Section title="Store Information">
      <div className="space-y-4">
        <Field label="Store Name">
          <Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </Section>
  );
}

// ── Receipt Tab ───────────────────────────────────────────────────────────────

function ReceiptTab({
  settings,
  show,
}: {
  settings: StoreSettings;
  show: (t: "success" | "error", m: string) => void;
}) {
  const [footer, setFooter] = useState(settings.receipt_footer ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await updateStoreSettings({
      store_name: settings.store_name,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      receipt_footer: footer || null,
      tax_rate: settings.tax_rate,
      tax_enabled: settings.tax_enabled,
    });
    setSaving(false);
    res.error ? show("error", res.error) : show("success", "Receipt settings saved");
  }

  return (
    <Section title="Receipt Settings">
      <div className="space-y-4">
        <Field label="Receipt Footer Message">
          <textarea
            rows={3}
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            placeholder="e.g. Thank you for shopping with us!"
            className="flex w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </Field>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </Section>
  );
}

// ── Tax Tab ───────────────────────────────────────────────────────────────────

function TaxTab({
  settings,
  show,
}: {
  settings: StoreSettings;
  show: (t: "success" | "error", m: string) => void;
}) {
  const [enabled, setEnabled] = useState(settings.tax_enabled ?? false);
  const [rate, setRate] = useState(String(settings.tax_rate ?? 0));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await updateStoreSettings({
      store_name: settings.store_name,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      receipt_footer: settings.receipt_footer,
      tax_rate: parseFloat(rate) || 0,
      tax_enabled: enabled,
    });
    setSaving(false);
    res.error ? show("error", res.error) : show("success", "Tax settings saved");
  }

  return (
    <Section title="Tax Settings">
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm text-foreground">Apply tax to sales</span>
        </label>
        {enabled && (
          <Field label="Tax Rate (%)">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="max-w-[160px]"
            />
          </Field>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </Section>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = ["admin", "manager", "cashier"] as const;

function UsersTab({
  users,
  show,
}: {
  users: Profile[];
  show: (t: "success" | "error", m: string) => void;
}) {
  const router = useRouter();
  const [pinModal, setPinModal] = useState<{ userId: string; name: string } | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [pinSaving, setPinSaving] = useState(false);

  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", role: "cashier" as const });
  const [inviting, setInviting] = useState(false);

  async function handleRoleChange(userId: string, role: "admin" | "manager" | "cashier") {
    const res = await updateUserRole(userId, role);
    res.error ? show("error", res.error) : show("success", "Role updated");
    router.refresh();
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    const res = await toggleUserActive(userId, isActive);
    res.error ? show("error", res.error) : show("success", isActive ? "User activated" : "User deactivated");
    router.refresh();
  }

  async function handleSetPin() {
    if (!pinModal) return;
    if (!/^\d{4}$/.test(pinValue)) { show("error", "PIN must be exactly 4 digits"); return; }
    setPinSaving(true);
    const res = await setUserPin(pinModal.userId, pinValue);
    setPinSaving(false);
    if (res.error) { show("error", res.error); return; }
    show("success", `PIN set for ${pinModal.name}`);
    setPinModal(null);
    setPinValue("");
    router.refresh();
  }

  async function handleClearPin(userId: string, name: string) {
    const res = await clearUserPin(userId);
    res.error ? show("error", res.error) : show("success", `PIN cleared for ${name}`);
    router.refresh();
  }

  async function handleInvite() {
    if (!inviteForm.email || !inviteForm.full_name) { show("error", "Email and name are required"); return; }
    setInviting(true);
    const res = await inviteUser(inviteForm.email, inviteForm.full_name, inviteForm.role);
    setInviting(false);
    if (res.error) { show("error", res.error); return; }
    show("success", `Invitation sent to ${inviteForm.email}`);
    setInviteModal(false);
    setInviteForm({ email: "", full_name: "", role: "cashier" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Users & Roles</h3>
        <Button onClick={() => setInviteModal(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Invite User
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {users.map((u) => (
          <div key={u.id} className={cn("px-5 py-4 flex items-center gap-4", !u.is_active && "opacity-50")}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{u.full_name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                {u.pin ? (
                  <span className="flex items-center gap-1 text-success">
                    <KeyRound className="w-3 h-3" /> PIN set
                  </span>
                ) : (
                  <span className="text-muted-foreground">No PIN</span>
                )}
              </p>
            </div>

            <select
              value={u.role}
              onChange={(e) => handleRoleChange(u.id, e.target.value as "admin" | "manager" | "cashier")}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              {u.role === "cashier" && (
                <button
                  onClick={() => { setPinModal({ userId: u.id, name: u.full_name }); setPinValue(""); }}
                  className="text-xs text-accent hover:underline"
                >
                  {u.pin ? "Change PIN" : "Set PIN"}
                </button>
              )}
              {u.role === "cashier" && u.pin && (
                <button
                  onClick={() => handleClearPin(u.id, u.full_name)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => handleToggleActive(u.id, !u.is_active)}
                className={cn("text-xs", u.is_active ? "text-destructive hover:underline" : "text-success hover:underline")}
              >
                {u.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PIN Modal */}
      {pinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setPinModal(null)}>
          <div className="bg-card rounded-2xl p-6 w-80 shadow-2xl">
            <h4 className="text-sm font-semibold text-foreground mb-1">Set PIN for {pinModal.name}</h4>
            <p className="text-xs text-muted-foreground mb-4">Enter a 4-digit PIN for this cashier to log in at the POS.</p>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Enter 4-digit PIN"
              className="mb-4 text-center text-xl tracking-widest"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPinModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleSetPin} disabled={pinSaving || pinValue.length !== 4} className="flex-1">
                {pinSaving ? "Saving…" : "Set PIN"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setInviteModal(false)}>
          <div className="bg-card rounded-2xl p-6 w-96 shadow-2xl space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Invite New User</h4>
            <Field label="Full Name">
              <Input value={inviteForm.full_name} onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })} placeholder="Kwame Mensah" />
            </Field>
            <Field label="Email">
              <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="kwame@bedarts.com" />
            </Field>
            <Field label="Role">
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                className="flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </Field>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setInviteModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleInvite} disabled={inviting} className="flex-1 gap-2">
                <Mail className="w-4 h-4" />
                {inviting ? "Sending…" : "Send Invite"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Categories Tab ────────────────────────────────────────────────────────────

function CategoriesTab({
  categories,
  show,
}: {
  categories: Category[];
  show: (t: "success" | "error", m: string) => void;
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    const res = await createCategory(newName.trim());
    setAdding(false);
    if ("error" in res) { show("error", res.error); return; }
    show("success", `Category "${newName}" created`);
    setNewName("");
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Products in this category will become uncategorised.`)) return;
    const res = await deleteCategory(id);
    res.error ? show("error", res.error) : show("success", `Category "${name}" deleted`);
    router.refresh();
  }

  return (
    <Section title="Categories">
      <div className="space-y-3 mb-4">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary">
            <span className="text-sm text-foreground">{c.name}</span>
            <button onClick={() => handleDelete(c.id, c.name)} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories yet</p>}
      </div>
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="New category name"
        />
        <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
    </Section>
  );
}

// ── Suppliers Tab ─────────────────────────────────────────────────────────────

function SuppliersTab({
  suppliers,
  show,
}: {
  suppliers: Supplier[];
  show: (t: "success" | "error", m: string) => void;
}) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  function openAdd() { setEditId(null); setForm({ name: "", phone: "", email: "", address: "" }); setShowForm(true); }
  function openEdit(s: Supplier) { setEditId(s.id); setForm({ name: s.name, phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "" }); setShowForm(true); }

  async function handleSave() {
    const data = { name: form.name, phone: form.phone || null, email: form.email || null, address: form.address || null };
    setAdding(true);
    const res = editId ? await updateSupplier(editId, data) : await createSupplier(data);
    setAdding(false);
    if (res.error) { show("error", res.error); return; }
    show("success", editId ? "Supplier updated" : "Supplier added");
    setShowForm(false);
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    const res = await deleteSupplier(id);
    res.error ? show("error", res.error) : show("success", `"${name}" deleted`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Suppliers</h3>
        <Button onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" /> Add Supplier</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {suppliers.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-5 py-3 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground">{[s.phone, s.email].filter(Boolean).join(" · ") || "No contact info"}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => openEdit(s)} className="text-xs text-accent hover:underline">Edit</button>
              <button onClick={() => handleDelete(s.id, s.name)} className="text-xs text-destructive hover:underline">Delete</button>
            </div>
          </div>
        ))}
        {suppliers.length === 0 && <div className="px-5 py-6 text-sm text-muted-foreground">No suppliers yet</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-card rounded-2xl p-6 w-96 shadow-2xl space-y-4">
            <h4 className="text-sm font-semibold text-foreground">{editId ? "Edit Supplier" : "Add Supplier"}</h4>
            <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={adding || !form.name.trim()} className="flex-1">{adding ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Danger Zone Tab ───────────────────────────────────────────────────────────

function DangerTab({ show }: { show: (t: "success" | "error", m: string) => void }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
      <h3 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Destructive actions. These cannot be undone. Contact your system administrator to perform any of these actions.
      </p>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Export All Data</p>
            <p className="text-xs text-muted-foreground">Download a full backup of sales, stock, and settings</p>
          </div>
          <Button variant="outline" onClick={() => show("error", "Export not yet implemented")}>Export</Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  Check, X, Plus, Trash2, UserPlus, KeyRound, Mail, RefreshCw,
  Smartphone, ShieldCheck, AlertTriangle, AlertCircle,
  ChevronDown, ChevronRight, Clock, Monitor,
  Store, FileText, Percent, Users, Tag, Building2, Flame, Hash, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type {
  Profile, Category, Supplier, StoreSettings,
  IntegrityCheckResult, IntegritySeverity,
} from "@/lib/types";
import {
  updateStoreSettings, updateUserRole, setUserPin, clearUserPin,
  toggleUserActive, inviteUser, addCashier, createTerminal,
  uploadCashierAvatar, approveUser, rejectUser, runIntegrityChecks,
} from "./actions";
import { createCategory, deleteCategory } from "@/app/(dashboard)/inventory/actions";
import { createSupplier, updateSupplier, deleteSupplier } from "@/app/(dashboard)/suppliers/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PendingUser {
  id: string;
  full_name: string;
  role: string;
  email: string;
  created_at: string;
}

interface SettingsClientProps {
  settings: StoreSettings;
  users: Profile[];
  categories: Category[];
  suppliers: Supplier[];
  pendingUsers: PendingUser[];
  integrityResults: IntegrityCheckResult[];
}

type Tab = "store" | "receipt" | "tax" | "users" | "categories" | "suppliers" | "app" | "integrity" | "danger";

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
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg w-max max-w-[90vw]",
        "lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0",
        toast.type === "success" ? "bg-success text-white" : "bg-destructive text-white"
      )}
    >
      {toast.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
      {toast.msg}
    </div>
  );
}

// ── Shared section wrapper ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-secondary/40">
        <h3
          className="text-sm font-semibold text-foreground"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Label + field wrapper ─────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon, title, sub,
}: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

// ── Initials helper ───────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
}

// ── Backdrop for modals ───────────────────────────────────────────────────────

function Backdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsClient({
  settings, users, categories, suppliers, pendingUsers, integrityResults,
}: SettingsClientProps) {
  const [tab, setTab] = useState<Tab>("store");
  const { toast, show } = useToast();

  const integrityErrors = integrityResults.filter((r) => r.severity === "error").length;
  const integrityWarnings = integrityResults.filter((r) => r.severity === "warning").length;
  const integrityBadge = integrityErrors > 0 ? integrityErrors : integrityWarnings > 0 ? integrityWarnings : undefined;

  interface TabDef {
    id: Tab; label: string; icon: React.ElementType;
    badge?: number; badgeColor?: string;
  }

  const TABS: TabDef[] = [
    { id: "store",      label: "Store Info",  icon: Store       },
    { id: "receipt",    label: "Receipt",     icon: FileText    },
    { id: "tax",        label: "Tax",         icon: Percent     },
    {
      id: "users", label: "Users", icon: Users,
      badge: pendingUsers.length || undefined,
    },
    { id: "categories", label: "Categories",  icon: Tag         },
    { id: "suppliers",  label: "Suppliers",   icon: Building2   },
    { id: "app",        label: "App",         icon: Smartphone  },
    {
      id: "integrity", label: "Integrity", icon: ShieldCheck,
      badge: integrityBadge,
      badgeColor: integrityErrors > 0 ? "bg-destructive" : "bg-warning",
    },
    { id: "danger",     label: "Danger",      icon: Flame       },
  ];

  const TAB_GROUPS: Array<{ label: string; ids: Tab[] }> = [
    { label: "General",  ids: ["store", "receipt", "tax"]      },
    { label: "People",   ids: ["users"]                        },
    { label: "Catalog",  ids: ["categories", "suppliers"]      },
    { label: "System",   ids: ["app", "integrity", "danger"]   },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Branded banner */}
      <div className="bg-white shrink-0">
        <div className="border-b border-border px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-1">Administration</p>
            <h1 className="text-foreground leading-none">Settings</h1>
          </div>
          <img src="/icon-192.png" className="h-10 w-auto opacity-[0.08]" aria-hidden="true" draggable={false} />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* Mobile: horizontal pill tab strip */}
        <div className="lg:hidden shrink-0 bg-card border-b border-border overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 px-3 py-2 min-w-max">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap rounded-full transition-colors min-h-[40px]",
                  tab === t.id
                    ? "bg-sidebar text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {t.label}
                {t.badge != null && (
                  <span className={cn(
                    "min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-bold px-1",
                    tab === t.id ? "bg-white/30 text-white" : cn("text-white", t.badgeColor ?? "bg-primary")
                  )}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: sidebar nav with section groups */}
        <nav
          className="hidden lg:flex w-52 shrink-0 border-r border-border bg-card flex-col py-3 overflow-y-auto"
          aria-label="Settings navigation"
        >
          {TAB_GROUPS.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
              {group.ids.map((id) => {
                const t = TABS.find((item) => item.id === id)!;
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2.5",
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    <t.icon
                      className={cn("w-4 h-4 shrink-0", isActive ? "text-accent" : "text-muted-foreground")}
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-left">{t.label}</span>
                    {t.badge != null && (
                      <span className={cn(
                        "min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1",
                        t.badgeColor ?? "bg-primary"
                      )}>
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-2xl space-y-6">
            {tab === "store"      && <StoreTab      settings={settings}             show={show} />}
            {tab === "receipt"    && <ReceiptTab    settings={settings}             show={show} />}
            {tab === "tax"        && <TaxTab        settings={settings}             show={show} />}
            {tab === "users"      && <UsersTab      users={users} pendingUsers={pendingUsers} show={show} />}
            {tab === "categories" && <CategoriesTab categories={categories}         show={show} />}
            {tab === "suppliers"  && <SuppliersTab  suppliers={suppliers}           show={show} />}
            {tab === "app"        && <AppTab />}
            {tab === "integrity"  && <IntegrityTab  results={integrityResults}      show={show} />}
            {tab === "danger"     && <DangerTab />}
          </div>
        </div>

        <Toast toast={toast} />
      </div>
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
    vat_number: settings.vat_number ?? "",
    opening_hours: settings.opening_hours ?? "",
    sunday_hours: settings.sunday_hours ?? "",
    receipt_footer: settings.receipt_footer ?? "",
    tax_rate: settings.tax_rate ?? 0,
    tax_enabled: settings.tax_enabled ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.store_name.trim()) { show("error", "Store name is required"); return; }
    setSaving(true);
    const res = await updateStoreSettings({
      store_name: form.store_name.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      vat_number: form.vat_number.trim() || null,
      opening_hours: form.opening_hours.trim() || null,
      sunday_hours: form.sunday_hours.trim() || null,
      receipt_footer: form.receipt_footer || null,
      tax_rate: form.tax_rate,
      tax_enabled: form.tax_enabled,
    });
    setSaving(false);
    res.error ? show("error", res.error) : show("success", "Store info saved");
  }

  return (
    <Section title="Store Information">
      <div className="space-y-5">
        <Field label="Store Name">
          <Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
        </Field>

        <Field label="Address">
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, City, Region" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone">
            <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+233 …" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="shop@example.com" />
          </Field>
        </div>

        <Field label="VAT / GRA Number">
          <Input
            value={form.vat_number}
            onChange={(e) => setForm({ ...form, vat_number: e.target.value })}
            placeholder="e.g. GRA-0001234567"
          />
        </Field>

        <div className="pt-1 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4 mt-4">Opening Hours</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Mon – Sat">
              <Input
                value={form.opening_hours}
                onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
                placeholder="e.g. 7am – 9pm"
              />
            </Field>
            <Field label="Sunday">
              <Input
                value={form.sunday_hours}
                onChange={(e) => setForm({ ...form, sunday_hours: e.target.value })}
                placeholder="e.g. 10am – 6pm or Closed"
              />
            </Field>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
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
  const [paperSize, setPaperSize] = useState<"58mm" | "80mm">(settings.receipt_paper_size ?? "80mm");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await updateStoreSettings({
      store_name: settings.store_name,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      opening_hours: settings.opening_hours,
      sunday_hours: settings.sunday_hours,
      receipt_footer: footer || null,
      receipt_paper_size: paperSize,
      tax_rate: settings.tax_rate,
      tax_enabled: settings.tax_enabled,
    });
    setSaving(false);
    res.error ? show("error", res.error) : show("success", "Receipt settings saved");
  }

  return (
    <Section title="Receipt Settings">
      <div className="space-y-5">
        <Field label="Paper Width">
          <div className="flex gap-3">
            {(["58mm", "80mm"] as const).map((size) => {
              const isActive = paperSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPaperSize(size)}
                  className={cn(
                    "flex flex-col items-center gap-2.5 px-6 py-3.5 rounded-xl border-2 text-sm font-semibold transition-colors",
                    isActive
                      ? "border-sidebar bg-sidebar/5 text-sidebar"
                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:bg-secondary"
                  )}
                >
                  {/* Visual receipt strip */}
                  <div className={cn(
                    "rounded-sm border-2 h-9 transition-colors",
                    size === "58mm" ? "w-6" : "w-10",
                    isActive ? "border-sidebar" : "border-border"
                  )} />
                  {size}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Footer Message">
          <textarea
            rows={3}
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            placeholder="e.g. Thank you for shopping with us!"
            className="flex w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </Field>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </Section>
  );
}

// ── Tax Tab ───────────────────────────────────────────────────────────────────

function TaxTab({
  settings: _settings,
  show: _show,
}: {
  settings: StoreSettings;
  show: (t: "success" | "error", m: string) => void;
}) {
  return (
    <Section title="Tax Settings">
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">VAT / tax collection is not yet enabled</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Sales are currently recorded without tax. Enabling it requires a schema migration and
            careful backfill — financial reports would otherwise disagree with receipts.
            Contact us to enable VAT collection.
          </p>
        </div>
      </div>
    </Section>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = ["admin", "manager", "accountant", "cashier", "butcher"] as const;
const INVITE_ROLE_OPTIONS = ["admin", "manager", "accountant", "butcher"] as const;

function UsersTab({
  users,
  pendingUsers,
  show,
}: {
  users: Profile[];
  pendingUsers: PendingUser[];
  show: (t: "success" | "error", m: string) => void;
}) {
  const router = useRouter();
  const [pinModal, setPinModal] = useState<{ userId: string; name: string } | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [pinSaving, setPinSaving] = useState(false);

  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", role: "manager" as "admin" | "manager" | "accountant" | "butcher" });
  const [inviting, setInviting] = useState(false);

  const [cashierModal, setCashierModal] = useState(false);
  const [cashierName, setCashierName] = useState("");
  const [addingCashier, setAddingCashier] = useState(false);

  const [terminalModal, setTerminalModal] = useState(false);
  const [terminalForm, setTerminalForm] = useState({ full_name: "", email: "", password: "" });
  const [addingTerminal, setAddingTerminal] = useState(false);

  async function handleRoleChange(userId: string, role: "admin" | "manager" | "cashier" | "accountant" | "butcher") {
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

  async function handleApprove(userId: string, name: string) {
    const res = await approveUser(userId);
    res.error ? show("error", res.error) : show("success", `${name}'s account activated`);
    router.refresh();
  }

  async function handleReject(userId: string, name: string) {
    if (!confirm(`Reject and delete ${name}'s account request? This cannot be undone.`)) return;
    const res = await rejectUser(userId);
    res.error ? show("error", res.error) : show("success", `${name}'s request rejected`);
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
    setInviteForm({ email: "", full_name: "", role: "manager" });
    router.refresh();
  }

  async function handleAddTerminal() {
    if (!terminalForm.full_name.trim() || !terminalForm.email.trim() || !terminalForm.password) {
      show("error", "All fields are required");
      return;
    }
    setAddingTerminal(true);
    const res = await createTerminal(terminalForm.email.trim(), terminalForm.full_name.trim(), terminalForm.password);
    setAddingTerminal(false);
    if (res.error) { show("error", res.error); return; }
    show("success", `Terminal "${terminalForm.full_name.trim()}" created`);
    setTerminalModal(false);
    setTerminalForm({ full_name: "", email: "", password: "" });
    router.refresh();
  }

  async function handleAddCashier() {
    if (!cashierName.trim()) { show("error", "Name is required"); return; }
    setAddingCashier(true);
    const res = await addCashier(cashierName.trim());
    setAddingCashier(false);
    if (res.error) { show("error", res.error); return; }
    show("success", `${cashierName.trim()} added as cashier`);
    setCashierModal(false);
    setCashierName("");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Pending requests */}
      {pendingUsers.length > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-warning/20 flex items-center gap-2.5">
            <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold px-1.5">
              {pendingUsers.length}
            </span>
            <h3 className="text-sm font-semibold text-foreground">Pending Approval</h3>
          </div>
          <div className="divide-y divide-warning/10">
            {pendingUsers.map((u) => (
              <div key={u.id} className="px-4 py-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-warning/20 shrink-0 flex items-center justify-center text-[11px] font-bold text-warning">
                  {getInitials(u.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.email}</p>
                </div>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full capitalize shrink-0 hidden sm:inline-flex">
                  {u.role}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" onClick={() => handleApprove(u.id, u.full_name)} className="h-8 px-3 text-xs">
                    Approve
                  </Button>
                  <button
                    onClick={() => handleReject(u.id, u.full_name)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground">Users & Roles</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setTerminalModal(true)} className="gap-1.5 h-9 text-xs">
            <Monitor className="w-3.5 h-3.5" aria-hidden="true" /> Terminal
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCashierModal(true)} className="gap-1.5 h-9 text-xs">
            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" /> Cashier
          </Button>
          <Button size="sm" onClick={() => setInviteModal(true)} className="gap-1.5 h-9 text-xs">
            <Mail className="w-3.5 h-3.5" aria-hidden="true" /> Invite Staff
          </Button>
        </div>
      </div>

      {/* POS Terminals */}
      {users.filter(u => u.role === "terminal").length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 bg-secondary/50 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">POS Terminals</p>
          </div>
          <div className="divide-y divide-border">
            {users.filter(u => u.role === "terminal").map((u) => (
              <div key={u.id} className={cn("px-4 py-3 flex items-center gap-3", !u.is_active && "opacity-50")}>
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Monitor className="w-4 h-4 text-accent" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">Terminal · logs in with email + password</p>
                </div>
                <button
                  onClick={() => handleToggleActive(u.id, !u.is_active)}
                  className={cn("text-xs shrink-0", u.is_active ? "text-destructive hover:underline" : "text-success hover:underline")}
                >
                  {u.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff & cashiers */}
      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {users.filter(u => u.role !== "terminal").map((u) => (
          <div key={u.id} className={cn("px-4 py-3 flex items-start gap-3", !u.is_active && "opacity-50")}>

            {/* Avatar */}
            {u.role === "cashier" ? (
              <label className="relative shrink-0 cursor-pointer group mt-0.5">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await uploadCashierAvatar(u.id, fd);
                    if (res.error) show("error", res.error);
                    else { show("success", "Photo updated"); router.refresh(); }
                    e.target.value = "";
                  }}
                />
                <div className="w-9 h-9 rounded-full overflow-hidden bg-accent/20 flex items-center justify-center text-sm font-bold text-accent ring-2 ring-transparent group-hover:ring-accent transition-all">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(u.full_name)
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-card border border-border flex items-center justify-center group-hover:bg-accent group-hover:border-accent transition-all">
                  <svg className="w-2.5 h-2.5 text-muted-foreground group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
              </label>
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0 mt-0.5">
                {getInitials(u.full_name)}
              </div>
            )}

            {/* Info + actions */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground truncate">{u.full_name}</p>
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value as "admin" | "manager" | "cashier" | "accountant" | "butcher")}
                  className="text-xs border border-border rounded-md px-1.5 py-0.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>

              {u.role === "cashier" && (
                <p className="text-xs mt-0.5">
                  {u.pin ? (
                    <span className="flex items-center gap-1 text-success">
                      <KeyRound className="w-3 h-3" aria-hidden="true" /> PIN set
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No PIN</span>
                  )}
                </p>
              )}

              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
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
                    Clear PIN
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
          </div>
        ))}
      </div>

      {/* PIN Modal */}
      {pinModal && (
        <Backdrop onClose={() => setPinModal(null)}>
          <div className="bg-card rounded-2xl p-6 w-80 shadow-2xl w-full max-w-sm">
            <h4 className="text-sm font-semibold text-foreground mb-1">Set PIN for {pinModal.name}</h4>
            <p className="text-xs text-muted-foreground mb-4">Enter a 4-digit PIN for this cashier to log in at the POS.</p>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="· · · ·"
              className="mb-4 text-center text-xl tracking-widest"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPinModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleSetPin} disabled={pinSaving || pinValue.length !== 4} className="flex-1">
                {pinSaving ? "Saving…" : "Set PIN"}
              </Button>
            </div>
          </div>
        </Backdrop>
      )}

      {/* Add Cashier Modal */}
      {cashierModal && (
        <Backdrop onClose={() => setCashierModal(false)}>
          <div className="bg-card rounded-2xl p-6 shadow-2xl w-full max-w-sm space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Add Cashier</h4>
              <p className="text-xs text-muted-foreground mt-1">They'll set their own PIN at the terminal on first use.</p>
            </div>
            <Field label="Full Name">
              <Input
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                placeholder="Ama Asante"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAddCashier()}
              />
            </Field>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setCashierModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddCashier} disabled={addingCashier || !cashierName.trim()} className="flex-1">
                {addingCashier ? "Adding…" : "Add Cashier"}
              </Button>
            </div>
          </div>
        </Backdrop>
      )}

      {/* Add Terminal Modal */}
      {terminalModal && (
        <Backdrop onClose={() => setTerminalModal(false)}>
          <div className="bg-card rounded-2xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Add POS Terminal</h4>
              <p className="text-xs text-muted-foreground mt-1">Creates a shared terminal login. Cashiers identify themselves by PIN.</p>
            </div>
            <Field label="Terminal Name">
              <Input
                value={terminalForm.full_name}
                onChange={(e) => setTerminalForm({ ...terminalForm, full_name: e.target.value })}
                placeholder="Main Counter"
                autoFocus
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={terminalForm.email}
                onChange={(e) => setTerminalForm({ ...terminalForm, email: e.target.value })}
                placeholder="terminal@bedarts.com"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={terminalForm.password}
                onChange={(e) => setTerminalForm({ ...terminalForm, password: e.target.value })}
                placeholder="Minimum 8 characters"
                minLength={8}
              />
            </Field>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setTerminalModal(false)} className="flex-1">Cancel</Button>
              <Button
                onClick={handleAddTerminal}
                disabled={addingTerminal || !terminalForm.full_name.trim() || !terminalForm.email.trim() || terminalForm.password.length < 8}
                className="flex-1 gap-2"
              >
                <Monitor className="w-4 h-4" aria-hidden="true" />
                {addingTerminal ? "Creating…" : "Create Terminal"}
              </Button>
            </div>
          </div>
        </Backdrop>
      )}

      {/* Invite Staff Modal */}
      {inviteModal && (
        <Backdrop onClose={() => setInviteModal(false)}>
          <div className="bg-card rounded-2xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Invite Staff Member</h4>
              <p className="text-xs text-muted-foreground mt-1">They'll receive an email to set their password and log in.</p>
            </div>
            <Field label="Full Name">
              <Input value={inviteForm.full_name} onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })} placeholder="Kwame Mensah" />
            </Field>
            <Field label="Email">
              <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="kwame@bedarts.com" />
            </Field>
            <Field label="Role">
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as "admin" | "manager" | "accountant" | "butcher" })}
                className="flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {INVITE_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </Field>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setInviteModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleInvite} disabled={inviting} className="flex-1 gap-2">
                <Mail className="w-4 h-4" aria-hidden="true" />
                {inviting ? "Sending…" : "Send Invite"}
              </Button>
            </div>
          </div>
        </Backdrop>
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
    show("success", `"${newName}" created`);
    setNewName("");
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Products in this category will become uncategorised.`)) return;
    const res = await deleteCategory(id);
    res.error ? show("error", res.error) : show("success", `"${name}" deleted`);
    router.refresh();
  }

  return (
    <Section title="Categories">
      {categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No categories yet"
          sub="Add a category to organise your products"
        />
      ) : (
        <div className="space-y-2 mb-5">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary">
              <Hash className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <span className="flex-1 text-sm text-foreground">{c.name}</span>
              <button
                onClick={() => handleDelete(c.id, c.name)}
                aria-label={`Delete ${c.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="New category name"
        />
        <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" aria-hidden="true" /> Add
        </Button>
      </div>
    </Section>
  );
}

// ── Suppliers Tab (in Settings) ───────────────────────────────────────────────

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
  function openEdit(s: Supplier) {
    setEditId(s.id);
    setForm({ name: s.name, phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "" });
    setShowForm(true);
  }

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
        <Button onClick={openAdd} size="sm" className="gap-1.5 h-9 text-xs">
          <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add Supplier
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {suppliers.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No suppliers yet"
            sub="Add your first supplier to get started"
          />
        ) : (
          <div className="divide-y divide-border">
            {suppliers.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-sidebar shrink-0 flex items-center justify-center text-[11px] font-bold text-white">
                  {getInitials(s.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {[s.phone, s.email].filter(Boolean).join(" · ") || "No contact info"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(s)}
                    aria-label={`Edit ${s.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    aria-label={`Delete ${s.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <Backdrop onClose={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <h4 className="text-sm font-semibold text-foreground">{editId ? "Edit Supplier" : "Add Supplier"}</h4>
            <Field label="Name *">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Phone">
              <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+233 …" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Address">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={adding || !form.name.trim()} className="flex-1">
                {adding ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </Backdrop>
      )}
    </div>
  );
}

// ── Integrity Tab ─────────────────────────────────────────────────────────────

const CHECK_META: Record<string, { label: string; category: string }> = {
  sale_total_mismatch:      { label: "Sale Totals",        category: "Sales"           },
  sale_item_total_mismatch: { label: "Line Item Totals",   category: "Sales"           },
  sale_payment_mismatch:    { label: "Payment Coverage",   category: "Sales"           },
  negative_cost_at_sale:    { label: "Cost at Sale",       category: "Inventory"       },
  negative_stock_quantity:  { label: "Stock Quantity",     category: "Inventory"       },
  invalid_expense_amount:   { label: "Expense Amounts",    category: "Expenses"        },
  duplicate_reconciliation: { label: "Till Count Dupes",   category: "Reconciliation"  },
};

function SeverityBadge({ severity }: { severity: IntegritySeverity }) {
  if (severity === "ok") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
      <ShieldCheck className="w-3 h-3" aria-hidden="true" /> OK
    </span>
  );
  if (severity === "warning") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
      <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Warning
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
      <AlertCircle className="w-3 h-3" aria-hidden="true" /> Error
    </span>
  );
}

function IntegrityTab({
  results,
  show,
}: {
  results: IntegrityCheckResult[];
  show: (t: "success" | "error", m: string) => void;
}) {
  const [running, startRun] = useTransition();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const lastRunId = results[0]?.run_id ?? null;
  const errorCount = results.filter((r) => r.severity === "error").length;
  const warnCount = results.filter((r) => r.severity === "warning").length;
  const okCount = results.filter((r) => r.severity === "ok").length;

  function handleRun() {
    startRun(async () => {
      const res = await runIntegrityChecks();
      if (res.error) {
        show("error", res.error);
      } else {
        const s = res.summary!;
        show(
          s.errors > 0 ? "error" : "success",
          s.errors > 0
            ? `${s.errors} error${s.errors > 1 ? "s" : ""} found — review results`
            : s.warnings > 0
              ? `All checks passed with ${s.warnings} warning${s.warnings > 1 ? "s" : ""}`
              : `All ${s.total_checks} checks passed`
        );
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
              Data Integrity
            </h3>
            {lastRunId ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Last checked {new Date(lastRunId).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No checks have been run yet.</p>
            )}
          </div>
          <Button onClick={handleRun} disabled={running} className="shrink-0">
            <RefreshCw className={cn("w-4 h-4 mr-2", running && "animate-spin")} aria-hidden="true" />
            {running ? "Running…" : "Run now"}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mt-4 flex items-center gap-5 pt-4 border-t border-border">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-destructive" aria-hidden="true" />
              <span className="font-semibold text-destructive tabular-nums">{errorCount}</span>
              <span className="text-muted-foreground">error{errorCount !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-warning" aria-hidden="true" />
              <span className="font-semibold text-warning tabular-nums">{warnCount}</span>
              <span className="text-muted-foreground">warning{warnCount !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-success" aria-hidden="true" />
              <span className="font-semibold text-success tabular-nums">{okCount}</span>
              <span className="text-muted-foreground">ok</span>
            </div>
          </div>
        )}
      </div>

      {/* Check results */}
      {results.length > 0 && (
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          {results.map((r) => {
            const meta = CHECK_META[r.check_name];
            const isExpanded = expandedId === r.id;
            const hasDetails = (r.sample_ids?.length ?? 0) > 0 && r.severity !== "ok";
            return (
              <div key={r.id} className="border-b border-border last:border-b-0">
                <button
                  className={cn(
                    "w-full text-left px-5 py-4 flex items-start gap-4 transition-colors",
                    hasDetails ? "hover:bg-secondary/40 cursor-pointer" : "cursor-default",
                    r.severity === "error" && "bg-destructive/5",
                    r.severity === "warning" && "bg-warning/5",
                  )}
                  onClick={() => hasDetails && setExpandedId(isExpanded ? null : r.id)}
                  disabled={!hasDetails}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <SeverityBadge severity={r.severity} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {meta?.category ?? "General"}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground text-sm">{meta?.label ?? r.check_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {r.anomaly_count > 0 ? (
                      <span className={cn(
                        "text-lg font-bold tabular-nums",
                        r.severity === "error" ? "text-destructive" : "text-warning"
                      )}>
                        {r.anomaly_count}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-success">0</span>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {r.anomaly_count === 1 ? "anomaly" : "anomalies"}
                    </p>
                    {hasDetails && (
                      <span className="text-muted-foreground mt-1 block">
                        {isExpanded
                          ? <ChevronDown className="w-3.5 h-3.5 ml-auto" aria-hidden="true" />
                          : <ChevronRight className="w-3.5 h-3.5 ml-auto" aria-hidden="true" />}
                      </span>
                    )}
                  </div>
                </button>

                {isExpanded && hasDetails && (
                  <div className="px-5 pb-4 bg-destructive/5 border-t border-border/50">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-3 mb-2">
                      Sample affected IDs (up to 5)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {r.sample_ids!.map((id) => (
                        <code key={id} className="text-xs bg-card border border-border rounded px-2 py-0.5 font-mono text-foreground">
                          {id}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {results.length === 0 && (
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <EmptyState
            icon={ShieldCheck}
            title="No results yet"
            sub="Run the integrity check to audit all financial calculations"
          />
        </div>
      )}

      {/* Scheduling info */}
      <div className="rounded-xl border border-border bg-secondary/40 px-5 py-4">
        <p className="text-xs font-semibold text-foreground mb-1">Automatic scheduling</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          To run daily automatically, enable the <strong>pg_cron</strong> extension in Supabase
          (Database → Extensions → pg_cron) then run:{" "}
          <code className="bg-card border border-border rounded px-1.5 py-0.5 font-mono text-foreground">
            SELECT cron.schedule(&apos;bedarts-integrity&apos;, &apos;0 6 * * *&apos;, $$SELECT run_integrity_checks()$$);
          </code>
        </p>
      </div>
    </div>
  );
}

// ── App Tab ───────────────────────────────────────────────────────────────────

const REINSTALL_STEPS = [
  {
    platform: "Chrome on Android",
    steps: [
      "Open Chrome → tap the three-dot menu → \"App info\" → Uninstall.",
      "Reopen the site in Chrome and tap \"Add to Home screen.\"",
    ],
  },
  {
    platform: "Safari on iPhone / iPad",
    steps: [
      "Long-press the app icon on your home screen → \"Remove App\" → \"Delete App.\"",
      "Open Safari, visit the site, then tap Share → \"Add to Home Screen.\"",
    ],
  },
  {
    platform: "Chrome on desktop (Linux / Windows / Mac)",
    steps: [
      "Open the installed app → click the three-dot menu (⋮) in the top-right → \"Uninstall Bedarts…\" → confirm.",
      "Navigate to the site in Chrome and click the install icon in the address bar.",
    ],
  },
];

function AppTab() {
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReset() {
    setResetting(true);
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      setDone(true);
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* PWA reset */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/40 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">App Installation</h3>
        </div>

        <div className="p-5 space-y-4">
          {/* Reset cache */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-secondary/30">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Reset app cache</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Clears cached files and unregisters the service worker. The page reloads with the latest version.
                Use this if the app looks outdated after an update.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={resetting}
              className="shrink-0"
            >
              {done ? (
                <><Check className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />Reloading…</>
              ) : resetting ? (
                <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden="true" />Clearing…</>
              ) : (
                <><RefreshCw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />Reset</>
              )}
            </Button>
          </div>

          {/* Reinstall instructions */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Reinstall the app</p>
            <div className="space-y-2">
              {REINSTALL_STEPS.map(({ platform, steps }) => (
                <details key={platform} className="group rounded-xl border border-border bg-secondary/30 overflow-hidden">
                  <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none">
                    <span className="text-sm font-medium text-foreground">{platform}</span>
                    <ChevronDown
                      className="w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <ol className="px-4 pb-4 pt-3 space-y-2 list-decimal list-inside border-t border-border">
                    {steps.map((step, i) => (
                      <li key={i} className="text-xs text-muted-foreground leading-relaxed">{step}</li>
                    ))}
                  </ol>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Danger Zone Tab ───────────────────────────────────────────────────────────

function DangerTab() {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-destructive/20 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
          <Flame className="w-4 h-4 text-destructive" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-xs text-muted-foreground">
          Destructive actions that cannot be undone. Contact your system administrator before performing any of these.
        </p>
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Export All Data</p>
            <p className="text-xs text-muted-foreground mt-0.5">Download a full backup of sales, stock, and settings (JSON)</p>
          </div>
          <a
            href="/api/export"
            download
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium border border-border bg-card px-4 py-2 text-foreground hover:bg-secondary transition-colors shrink-0"
          >
            Export
          </a>
        </div>
      </div>
    </div>
  );
}

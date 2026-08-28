import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Pencil,
  Phone,
  Plus,
  ShieldAlert,
  Trash2,
  Truck,
  TrendingDown,
  TrendingUp,
  User,
  DollarSign,
  FileText,
  StickyNote,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportRowsToFile, formatExportFilename } from "@/lib/export";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { can } from "@/lib/roles";
import { usd, fmtDate, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/loads")({ component: LoadsPage });

type LoadStatus =
  | "draft"
  | "quoted"
  | "booked"
  | "dispatched"
  | "in_transit"
  | "delivered"
  | "invoiced"
  | "paid"
  | "cancelled";
type LoadType = "ftl" | "ltl" | "partial";
type InvoiceStatus = "pending" | "sent" | "paid" | "overdue";
type PaymentStatus = "pending" | "partial" | "paid";

type DocumentItem = { kind: string; uploaded: boolean; uploadedAt?: string };
type StatusHistoryItem = { status: string; changedBy: string; at: string };

type LoadItem = {
  id: string;
  ref: string;
  loadNumber: string;
  customerReference?: string;
  status: LoadStatus;
  statusHistory: StatusHistoryItem[];
  customerId: string;
  customerName: string;
  customer?: any;
  carrierId: string;
  carrierName: string;
  carrier?: any;
  agentId: string;
  agentName: string;
  pickupCompany?: string;
  pickupContact?: string;
  pickupPhone?: string;
  pickupAddress?: string;
  pickupCity?: string;
  pickupState?: string;
  pickupZip?: string;
  pickupDate?: string;
  pickupTime?: string;
  deliveryCompany?: string;
  deliveryContact?: string;
  deliveryPhone?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZip?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  commodity?: string;
  weight?: number;
  pieces?: number;
  pallets?: number;
  equipmentType?: string;
  trailerLength?: number;
  loadType?: LoadType;
  temperature?: number;
  hazmat?: boolean;
  stackable?: boolean;
  customerRate: number;
  carrierCost: number;
  accessorialCharges?: number;
  revenue: number;
  grossMargin: number;
  marginPercent: number;
  invoiceStatus: InvoiceStatus;
  paymentStatus: PaymentStatus;
  loadedMiles?: number;
  deadheadMiles?: number;
  documents?: DocumentItem[];
  internalNotes?: string;
  driverInstructions?: string;
  customerNotes?: string;
  createdAt: string;
  updatedAt: string;
  pendingApproval?: boolean;
  approvalRequestId?: string;
  approvalStatus?: string;
  comments?: Array<{ by: string; at: string; body: string }>;
  auditHistory?: Array<{ action: string; performedByName: string; at: string; notes?: string }>;
};

type CustomerOption = { id: string; company: string; contact: string };
type CarrierOption = { id: string; legalName: string };

type LoadApiResponse = {
  loads: LoadItem[];
  customers: CustomerOption[];
  carriers: CarrierOption[];
};

/** Fields shared by both the create and edit forms — used to drive the shared field-group components below. */
type LoadFormBase = {
  customerId: string;
  carrierId: string;
  loadNumber: string;
  customerReference: string;
  status: LoadStatus;
  pickupCompany: string;
  pickupContact: string;
  pickupPhone: string;
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  pickupZip: string;
  pickupDate: string;
  pickupTime: string;
  deliveryCompany: string;
  deliveryContact: string;
  deliveryPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryZip: string;
  deliveryDate: string;
  deliveryTime: string;
  commodity: string;
  weight: string;
  pieces: string;
  pallets: string;
  equipmentType: string;
  trailerLength: string;
  loadType: LoadType | "";
  temperature: string;
  hazmat: boolean;
  stackable: boolean;
  customerRate: string;
  carrierCost: string;
  accessorialCharges: string;
  loadedMiles: string;
  deadheadMiles: string;
  internalNotes: string;
  driverInstructions: string;
  customerNotes: string;
};

type FieldChange = <K extends keyof LoadFormBase>(field: K, value: LoadFormBase[K]) => void;

const DOCUMENT_LABELS: Record<string, string> = {
  rate_confirmation: "Rate Confirmation",
  bol: "BOL",
  pod: "POD",
  carrier_invoice: "Carrier Invoice",
  customer_invoice: "Customer Invoice",
};

const ALL_STATUSES: LoadStatus[] = [
  "draft",
  "quoted",
  "booked",
  "dispatched",
  "in_transit",
  "delivered",
  "invoiced",
  "paid",
  "cancelled",
];
const LOAD_TYPES: LoadType[] = ["ftl", "ltl", "partial"];

const EMPTY_FORM: LoadFormBase = {
  customerId: "",
  carrierId: "",
  loadNumber: "",
  customerReference: "",
  status: "draft",
  pickupCompany: "",
  pickupContact: "",
  pickupPhone: "",
  pickupAddress: "",
  pickupCity: "",
  pickupState: "",
  pickupZip: "",
  pickupDate: "",
  pickupTime: "",
  deliveryCompany: "",
  deliveryContact: "",
  deliveryPhone: "",
  deliveryAddress: "",
  deliveryCity: "",
  deliveryState: "",
  deliveryZip: "",
  deliveryDate: "",
  deliveryTime: "",
  commodity: "",
  weight: "",
  pieces: "",
  pallets: "",
  equipmentType: "",
  trailerLength: "",
  loadType: "",
  temperature: "",
  hazmat: false,
  stackable: false,
  customerRate: "",
  carrierCost: "",
  accessorialCharges: "",
  loadedMiles: "",
  deadheadMiles: "",
  internalNotes: "",
  driverInstructions: "",
  customerNotes: "",
};

function dedupeLoads(loads: LoadItem[]) {
  const byId = new Map<string, LoadItem>();

  for (const load of loads) {
    const existing = byId.get(load.id);
    if (!existing) {
      byId.set(load.id, load);
      continue;
    }

    // Prefer the version with pendingApproval data
    if (load.pendingApproval && !existing.pendingApproval) {
      byId.set(load.id, load);
    }
  }

  return Array.from(byId.values());
}

/** Replace a load in the list by ID, or prepend if not found. Always dedupes. */
function replaceOrPrependLoad(prev: LoadItem[], updated: LoadItem): LoadItem[] {
  const idx = prev.findIndex((i) => i.id === updated.id);
  let next: LoadItem[];
  if (idx !== -1) {
    next = [...prev];
    next[idx] = updated;
  } else {
    next = [updated, ...prev];
  }
  return dedupeLoads(next);
}

function ApprovalStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        Rejected
      </span>
    );
  }
  if (status === "changes_requested") {
    return (
      <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
        Changes Requested
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
      Pending Approval
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/* Margin / profit-loss labeling — used in the table, board, header strip,  */
/* and both the read-only and form calculated-values displays.              */
/* ------------------------------------------------------------------------ */

function marginTone(margin: number) {
  if (margin > 0) {
    return {
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      label: "Profit",
      Icon: TrendingUp,
    };
  }
  if (margin < 0) {
    return {
      color: "text-red-500",
      bg: "bg-red-500/10",
      label: "Loss",
      Icon: TrendingDown,
    };
  }
  return {
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Break-even",
    Icon: TrendingUp,
  };
}

function MarginChip({ margin }: { margin: number }) {
  const tone = marginTone(margin);
  const Icon = tone.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.bg} ${tone.color}`}
    >
      <Icon className="size-3" /> {tone.label}
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/* Read-only detail primitives — mirrors the carriers page so both detail   */
/* sheets feel the same: bordered cards with icon headers, key/value grids, */
/* and pills for list-like values.                                         */
/* ------------------------------------------------------------------------ */

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function DetailRow({
  label,
  value,
  mono,
  span2,
  icon,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  span2?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className={span2 ? "sm:col-span-2" : undefined}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 flex items-start gap-1.5 ${mono ? "font-mono text-xs" : "text-sm"}`}>
        {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
        <span>{value ?? "—"}</span>
      </div>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/* Shared field-group components — used by both the create sheet and the    */
/* edit form inside the detail sheet, so the ~40 fields only exist once.    */
/* ------------------------------------------------------------------------ */

function SectionCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</span>
      </div>
      {children}
    </div>
  );
}

function BasicInfoFields({
  idPrefix,
  values,
  onChange,
  customers,
  carriers,
  extra,
}: {
  idPrefix: string;
  values: LoadFormBase;
  onChange: FieldChange;
  customers: CustomerOption[];
  carriers: CarrierOption[];
  extra?: ReactNode;
}) {
  return (
    <SectionCard title="Basic information" eyebrow="Core details">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-customerId`}>Customer *</Label>
          <Select
            value={values.customerId}
            onValueChange={(v) => onChange("customerId", v)}
            required
          >
            <SelectTrigger id={`${idPrefix}-customerId`}>
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-carrierId`}>Carrier *</Label>
          <Select value={values.carrierId} onValueChange={(v) => onChange("carrierId", v)} required>
            <SelectTrigger id={`${idPrefix}-carrierId`}>
              <SelectValue placeholder="Select a carrier" />
            </SelectTrigger>
            <SelectContent>
              {carriers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.legalName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-loadNumber`}>Load Number</Label>
          <Input
            id={`${idPrefix}-loadNumber`}
            value={values.loadNumber}
            onChange={(e) => onChange("loadNumber", e.target.value)}
            placeholder="Auto-generated"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-customerReference`}>Customer Reference</Label>
          <Input
            id={`${idPrefix}-customerReference`}
            value={values.customerReference}
            onChange={(e) => onChange("customerReference", e.target.value)}
            placeholder="PO number or reference"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-status`}>Status</Label>
          <Select value={values.status} onValueChange={(v) => onChange("status", v as LoadStatus)}>
            <SelectTrigger id={`${idPrefix}-status`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {extra}
      </div>
    </SectionCard>
  );
}

function AddressFields({
  idPrefix,
  kind,
  values,
  onChange,
}: {
  idPrefix: string;
  kind: "pickup" | "delivery";
  values: LoadFormBase;
  onChange: FieldChange;
}) {
  const f = (name: string) => `${kind}${name}` as keyof LoadFormBase;
  return (
    <SectionCard
      title={kind === "pickup" ? "Pickup details" : "Delivery details"}
      eyebrow={kind === "pickup" ? "Pickup" : "Delivery"}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor={`${idPrefix}-${kind}Company`}>Company</Label>
          <Input
            id={`${idPrefix}-${kind}Company`}
            value={values[f("Company")] as string}
            onChange={(e) => onChange(f("Company"), e.target.value as any)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${kind}Contact`}>Contact</Label>
          <Input
            id={`${idPrefix}-${kind}Contact`}
            value={values[f("Contact")] as string}
            onChange={(e) => onChange(f("Contact"), e.target.value as any)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${kind}Phone`}>Phone</Label>
          <Input
            id={`${idPrefix}-${kind}Phone`}
            value={values[f("Phone")] as string}
            onChange={(e) => onChange(f("Phone"), e.target.value as any)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor={`${idPrefix}-${kind}Address`}>Address</Label>
          <Input
            id={`${idPrefix}-${kind}Address`}
            value={values[f("Address")] as string}
            onChange={(e) => onChange(f("Address"), e.target.value as any)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${kind}City`}>City</Label>
          <Input
            id={`${idPrefix}-${kind}City`}
            value={values[f("City")] as string}
            onChange={(e) => onChange(f("City"), e.target.value as any)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${kind}State`}>State</Label>
          <Input
            id={`${idPrefix}-${kind}State`}
            value={values[f("State")] as string}
            onChange={(e) => onChange(f("State"), e.target.value as any)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${kind}Zip`}>ZIP</Label>
          <Input
            id={`${idPrefix}-${kind}Zip`}
            value={values[f("Zip")] as string}
            onChange={(e) => onChange(f("Zip"), e.target.value as any)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${kind}Date`}>Date</Label>
          <Input
            id={`${idPrefix}-${kind}Date`}
            type="date"
            value={values[f("Date")] as string}
            onChange={(e) => onChange(f("Date"), e.target.value as any)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${kind}Time`}>Time</Label>
          <Input
            id={`${idPrefix}-${kind}Time`}
            type="time"
            value={values[f("Time")] as string}
            onChange={(e) => onChange(f("Time"), e.target.value as any)}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function FreightFields({
  idPrefix,
  values,
  onChange,
}: {
  idPrefix: string;
  values: LoadFormBase;
  onChange: FieldChange;
}) {
  return (
    <SectionCard title="Freight details" eyebrow="Freight">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor={`${idPrefix}-commodity`}>Commodity</Label>
          <Input
            id={`${idPrefix}-commodity`}
            value={values.commodity}
            onChange={(e) => onChange("commodity", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-weight`}>Weight</Label>
          <Input
            id={`${idPrefix}-weight`}
            type="number"
            min="0"
            value={values.weight}
            onChange={(e) => onChange("weight", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-pieces`}>Pieces</Label>
          <Input
            id={`${idPrefix}-pieces`}
            type="number"
            min="0"
            value={values.pieces}
            onChange={(e) => onChange("pieces", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-pallets`}>Pallets</Label>
          <Input
            id={`${idPrefix}-pallets`}
            type="number"
            min="0"
            value={values.pallets}
            onChange={(e) => onChange("pallets", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-equipmentType`}>Equipment Type</Label>
          <Input
            id={`${idPrefix}-equipmentType`}
            value={values.equipmentType}
            onChange={(e) => onChange("equipmentType", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-trailerLength`}>Trailer Length</Label>
          <Input
            id={`${idPrefix}-trailerLength`}
            type="number"
            min="0"
            value={values.trailerLength}
            onChange={(e) => onChange("trailerLength", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-loadType`}>Load Type</Label>
          <Select
            value={values.loadType}
            onValueChange={(v) => onChange("loadType", v as LoadType)}
          >
            <SelectTrigger id={`${idPrefix}-loadType`}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {LOAD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-temperature`}>Temperature</Label>
          <Input
            id={`${idPrefix}-temperature`}
            type="number"
            value={values.temperature}
            onChange={(e) => onChange("temperature", e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id={`${idPrefix}-hazmat`}
            checked={values.hazmat}
            onChange={(e) => onChange("hazmat", e.target.checked)}
            className="rounded border-border"
          />
          <Label htmlFor={`${idPrefix}-hazmat`} className="flex items-center gap-1.5">
            Hazmat
            {values.hazmat && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-500">
                <ShieldAlert className="size-3" /> Flagged
              </span>
            )}
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id={`${idPrefix}-stackable`}
            checked={values.stackable}
            onChange={(e) => onChange("stackable", e.target.checked)}
            className="rounded border-border"
          />
          <Label htmlFor={`${idPrefix}-stackable`}>Stackable</Label>
        </div>
      </div>
    </SectionCard>
  );
}

function PricingFields({
  idPrefix,
  values,
  onChange,
  financials,
}: {
  idPrefix: string;
  values: LoadFormBase;
  onChange: FieldChange;
  financials: { revenue: number; grossMargin: number; marginPercent: number };
}) {
  const tone = marginTone(financials.grossMargin);
  return (
    <SectionCard title="Pricing" eyebrow="Revenue">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-customerRate`}>Customer Rate *</Label>
          <Input
            id={`${idPrefix}-customerRate`}
            type="number"
            min="0"
            step="0.01"
            value={values.customerRate}
            onChange={(e) => onChange("customerRate", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-carrierCost`}>Carrier Cost *</Label>
          <Input
            id={`${idPrefix}-carrierCost`}
            type="number"
            min="0"
            step="0.01"
            value={values.carrierCost}
            onChange={(e) => onChange("carrierCost", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-accessorialCharges`}>Accessorials</Label>
          <Input
            id={`${idPrefix}-accessorialCharges`}
            type="number"
            min="0"
            step="0.01"
            value={values.accessorialCharges}
            onChange={(e) => onChange("accessorialCharges", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Calculated Values</Label>
          <div className="space-y-1.5 rounded-md border border-border bg-muted p-2 text-xs">
            <div className="flex justify-between">
              <span>Revenue</span>
              <span className="tabular-nums">{usd(financials.revenue)}</span>
            </div>
            <div className="flex justify-between">
              <span>Gross Margin</span>
              <span className={`tabular-nums font-medium ${tone.color}`}>
                {usd(financials.grossMargin)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Margin %</span>
              <span className={`tabular-nums font-medium ${tone.color}`}>
                {financials.marginPercent.toFixed(2)}%
              </span>
            </div>
            <div className="pt-0.5">
              <MarginChip margin={financials.grossMargin} />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-loadedMiles`}>Loaded Miles</Label>
          <Input
            id={`${idPrefix}-loadedMiles`}
            type="number"
            min="0"
            value={values.loadedMiles}
            onChange={(e) => onChange("loadedMiles", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-deadheadMiles`}>Deadhead Miles</Label>
          <Input
            id={`${idPrefix}-deadheadMiles`}
            type="number"
            min="0"
            value={values.deadheadMiles}
            onChange={(e) => onChange("deadheadMiles", e.target.value)}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function NotesFields({
  idPrefix,
  values,
  onChange,
}: {
  idPrefix: string;
  values: LoadFormBase;
  onChange: FieldChange;
}) {
  return (
    <SectionCard title="Notes & instructions" eyebrow="Communication">
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-internalNotes`}>Internal Notes</Label>
          <Textarea
            id={`${idPrefix}-internalNotes`}
            value={values.internalNotes}
            onChange={(e) => onChange("internalNotes", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-driverInstructions`}>Driver Instructions</Label>
          <Textarea
            id={`${idPrefix}-driverInstructions`}
            value={values.driverInstructions}
            onChange={(e) => onChange("driverInstructions", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-customerNotes`}>Customer Notes</Label>
          <Textarea
            id={`${idPrefix}-customerNotes`}
            value={values.customerNotes}
            onChange={(e) => onChange("customerNotes", e.target.value)}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function LoadsPage() {
  const { session } = useAuth();
  const role = session?.role ?? "trainee";
  const userId = session?.id ?? "";
  const canBook = can(role, "booking_actions");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LoadItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [carriers, setCarriers] = useState<CarrierOption[]>([]);

  const [status, setStatus] = useState<string>("all");
  const [view, setView] = useState<"table" | "board">("table");

  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingApprovalRequestId, setEditingApprovalRequestId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<LoadFormBase>(EMPTY_FORM);

  const [editForm, setEditForm] = useState({
    ...EMPTY_FORM,
    invoiceStatus: "pending" as InvoiceStatus,
    paymentStatus: "pending" as PaymentStatus,
    documents: [] as DocumentItem[],
  });

  const setCreateField: FieldChange = (field, value) =>
    setCreateForm((p) => ({ ...p, [field]: value }));
  const setEditField: FieldChange = (field, value) =>
    setEditForm((p) => ({ ...p, [field]: value }));

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const payload = await apiFetch<LoadApiResponse>("/api/loads");
        if (!active) return;
        setItems(dedupeLoads(payload.data.loads));
        setCustomers(payload.data.customers);
        setCarriers(payload.data.carriers);
      } catch (err) {
        console.error(err);
        toast.error("Unable to load loads");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const dedupedItems = dedupeLoads(items);
    return dedupedItems.filter((l) => status === "all" || l.status === status);
  }, [items, status]);
  const open = openId ? (items.find((i) => i.id === openId) ?? null) : null;

  // Editing rules:
  // - Non-pending loads: anyone with booking_actions may edit
  // - Pending/changes_requested/rejected loads: only the original requester (agentId) may edit
  const canEdit = canBook && (!open || !open.pendingApproval || open.agentId === userId);

  useEffect(() => {
    if (!open) return;
    setEditForm({
      customerId: open.customerId,
      carrierId: open.carrierId,
      loadNumber: open.loadNumber,
      customerReference: open.customerReference || "",
      status: open.status,
      pickupCompany: open.pickupCompany || "",
      pickupContact: open.pickupContact || "",
      pickupPhone: open.pickupPhone || "",
      pickupAddress: open.pickupAddress || "",
      pickupCity: open.pickupCity || "",
      pickupState: open.pickupState || "",
      pickupZip: open.pickupZip || "",
      pickupDate: open.pickupDate ? open.pickupDate.substring(0, 10) : "",
      pickupTime: open.pickupTime || "",
      deliveryCompany: open.deliveryCompany || "",
      deliveryContact: open.deliveryContact || "",
      deliveryPhone: open.deliveryPhone || "",
      deliveryAddress: open.deliveryAddress || "",
      deliveryCity: open.deliveryCity || "",
      deliveryState: open.deliveryState || "",
      deliveryZip: open.deliveryZip || "",
      deliveryDate: open.deliveryDate ? open.deliveryDate.substring(0, 10) : "",
      deliveryTime: open.deliveryTime || "",
      commodity: open.commodity || "",
      weight: open.weight?.toString() || "",
      pieces: open.pieces?.toString() || "",
      pallets: open.pallets?.toString() || "",
      equipmentType: open.equipmentType || "",
      trailerLength: open.trailerLength?.toString() || "",
      loadType: open.loadType || "",
      temperature: open.temperature?.toString() || "",
      hazmat: open.hazmat || false,
      stackable: open.stackable || false,
      customerRate: open.customerRate?.toString() || "",
      carrierCost: open.carrierCost?.toString() || "",
      accessorialCharges: open.accessorialCharges?.toString() || "",
      invoiceStatus: open.invoiceStatus,
      paymentStatus: open.paymentStatus,
      loadedMiles: open.loadedMiles?.toString() || "",
      deadheadMiles: open.deadheadMiles?.toString() || "",
      internalNotes: open.internalNotes || "",
      driverInstructions: open.driverInstructions || "",
      customerNotes: open.customerNotes || "",
      documents: open.documents || [],
    });
    setEditingApprovalRequestId(open.approvalRequestId || null);
    setEditing(false);
  }, [open]);

  async function createLoad(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const payload = await apiFetch<LoadApiResponse & { load: LoadItem }>("/api/loads", {
        method: "POST",
        body: JSON.stringify({
          ...createForm,
          weight: createForm.weight ? Number(createForm.weight) : undefined,
          pieces: createForm.pieces ? Number(createForm.pieces) : undefined,
          pallets: createForm.pallets ? Number(createForm.pallets) : undefined,
          trailerLength: createForm.trailerLength ? Number(createForm.trailerLength) : undefined,
          temperature: createForm.temperature ? Number(createForm.temperature) : undefined,
          customerRate: createForm.customerRate ? Number(createForm.customerRate) : 0,
          carrierCost: createForm.carrierCost ? Number(createForm.carrierCost) : 0,
          accessorialCharges: createForm.accessorialCharges
            ? Number(createForm.accessorialCharges)
            : 0,
          loadedMiles: createForm.loadedMiles ? Number(createForm.loadedMiles) : undefined,
          deadheadMiles: createForm.deadheadMiles ? Number(createForm.deadheadMiles) : undefined,
        }),
      });

      setItems((prev) => replaceOrPrependLoad(prev, payload.data.load));
      setCustomers(payload.data.customers);
      setCarriers(payload.data.carriers);
      setCreateForm(EMPTY_FORM);
      setShowCreate(false);
      toast.success("Load created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create load");
    } finally {
      setCreating(false);
    }
  }

  async function saveLoad(event: FormEvent) {
    event.preventDefault();
    if (!openId) return;
    setSaving(true);
    try {
      const payload = await apiFetch<LoadApiResponse & { load: LoadItem }>("/api/loads", {
        method: "PATCH",
        body: JSON.stringify({
          loadId: openId,
          approvalRequestId: editingApprovalRequestId,
          ...editForm,
          weight: editForm.weight ? Number(editForm.weight) : undefined,
          pieces: editForm.pieces ? Number(editForm.pieces) : undefined,
          pallets: editForm.pallets ? Number(editForm.pallets) : undefined,
          trailerLength: editForm.trailerLength ? Number(editForm.trailerLength) : undefined,
          temperature: editForm.temperature ? Number(editForm.temperature) : undefined,
          customerRate: editForm.customerRate ? Number(editForm.customerRate) : 0,
          carrierCost: editForm.carrierCost ? Number(editForm.carrierCost) : 0,
          accessorialCharges: editForm.accessorialCharges ? Number(editForm.accessorialCharges) : 0,
          loadedMiles: editForm.loadedMiles ? Number(editForm.loadedMiles) : undefined,
          deadheadMiles: editForm.deadheadMiles ? Number(editForm.deadheadMiles) : undefined,
        }),
      });
      setItems((prev) => replaceOrPrependLoad(prev, payload.data.load));
      setCustomers(payload.data.customers);
      setCarriers(payload.data.carriers);
      setEditing(false);
      setEditingApprovalRequestId(payload.data.load.approvalRequestId || null);
      toast.success("Load saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save load");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLoad() {
    if (!openId) return;
    try {
      const deleteId = open?.approvalRequestId || openId;
      await apiFetch("/api/loads", {
        method: "DELETE",
        body: JSON.stringify({ loadId: deleteId }),
      });
      setItems((prev) => prev.filter((item) => item.id !== openId));
      setOpenId(null);
      toast.success("Load deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete load");
    }
  }

  function toggleDoc(kind: string, uploaded: boolean) {
    if (!openId) return;
    const newDocs = (editForm.documents || []).map((d) =>
      d.kind === kind
        ? {
            ...d,
            uploaded: !uploaded,
            uploadedAt: !uploaded ? new Date().toISOString() : undefined,
          }
        : d,
    );
    setEditForm((prev) => ({ ...prev, documents: newDocs }));
  }

  function exportLoads(format: "csv" | "xlsx") {
    const rows = filtered.length > 0 ? filtered : items;
    const exported = exportRowsToFile(
      rows,
      [
        { label: "Load #", getValue: (load) => load.loadNumber || load.ref },
        { label: "Customer", getValue: (load) => load.customerName },
        { label: "Carrier", getValue: (load) => load.carrierName },
        { label: "Status", getValue: (load) => load.status },
        { label: "Pickup", getValue: (load) => (load.pickupDate ? fmtDate(load.pickupDate) : "") },
        {
          label: "Delivery",
          getValue: (load) => (load.deliveryDate ? fmtDate(load.deliveryDate) : ""),
        },
        { label: "Revenue", getValue: (load) => load.customerRate ?? 0 },
      ],
      formatExportFilename("loads", format),
      format,
      "Loads",
    );

    if (exported) {
      toast.success("Loads exported");
    }
  }

  const createFinancials = useMemo(() => {
    const cr = Number(createForm.customerRate || 0);
    const cc = Number(createForm.carrierCost || 0);
    const ac = Number(createForm.accessorialCharges || 0);
    const rev = cr + ac;
    const gm = rev - cc;
    const mp = rev > 0 ? (gm / rev) * 100 : 0;
    return { revenue: rev, grossMargin: gm, marginPercent: mp };
  }, [createForm.customerRate, createForm.carrierCost, createForm.accessorialCharges]);

  const editFinancials = useMemo(() => {
    const cr = Number(editForm.customerRate || 0);
    const cc = Number(editForm.carrierCost || 0);
    const ac = Number(editForm.accessorialCharges || 0);
    const rev = cr + ac;
    const gm = rev - cc;
    const mp = rev > 0 ? (gm / rev) * 100 : 0;
    return { revenue: rev, grossMargin: gm, marginPercent: mp };
  }, [editForm.customerRate, editForm.carrierCost, editForm.accessorialCharges]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Loads"
        description="Manage your full load booking pipeline from quote to commission ready"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="size-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportLoads("csv")}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportLoads("xlsx")}>XLSX</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setShowCreate(true)} disabled={!canBook}>
              <Plus className="size-4" /> New Load
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "load" : "loads"}
        </span>
        <div className="ml-auto inline-flex rounded-md border border-border bg-card p-0.5">
          <Button
            size="sm"
            variant={view === "table" ? "secondary" : "ghost"}
            onClick={() => setView("table")}
          >
            <List className="size-4" /> Table
          </Button>
          <Button
            size="sm"
            variant={view === "board" ? "secondary" : "ghost"}
            onClick={() => setView("board")}
          >
            <LayoutGrid className="size-4" /> Board
          </Button>
        </div>
      </div>

      {view === "table" ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <DataTable
            empty={<EmptyState icon={<Package className="size-6" />} title="No loads found" />}
            rows={filtered}
            onRowClick={(l) => setOpenId(l.id)}
            columns={[
              {
                head: "Load #",
                cell: (l) => <span className="font-mono text-xs">{l.loadNumber || l.ref}</span>,
              },
              {
                head: "Customer",
                cell: (l) => (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{l.customerName}</span>
                    {l.pendingApproval && <ApprovalStatusBadge status={l.approvalStatus} />}
                  </div>
                ),
              },
              { head: "Carrier", cell: (l) => <span className="text-sm">{l.carrierName}</span> },
              { head: "Status", cell: (l) => <StatusBadge value={l.status} /> },
              {
                head: "Pickup",
                cell: (l) => (
                  <span className="text-xs text-muted-foreground">
                    {l.pickupDate ? fmtDate(l.pickupDate) : "—"}
                  </span>
                ),
              },
              {
                head: "Delivery",
                cell: (l) => (
                  <span className="text-xs text-muted-foreground">
                    {l.deliveryDate ? fmtDate(l.deliveryDate) : "—"}
                  </span>
                ),
              },
              {
                head: "Revenue",
                cell: (l) => <span className="font-mono text-sm">{usd(l.revenue)}</span>,
              },
              {
                head: "Gross Margin",
                cell: (l) => (
                  <span
                    className={`font-mono text-sm font-medium ${marginTone(l.grossMargin).color}`}
                  >
                    {usd(l.grossMargin)}
                  </span>
                ),
              },
            ]}
          />
        </div>
      ) : (
        <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
          {ALL_STATUSES.map((s) => {
            const columnItems = filtered.filter((l) => l.status === s);
            return (
              <div key={s} className="w-72 shrink-0 rounded-lg border border-border bg-card/40">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {s.replace("_", " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">{columnItems.length}</span>
                </div>
                <div className="space-y-2 p-2">
                  {columnItems.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setOpenId(l.id)}
                      className="w-full rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:bg-accent/50"
                    >
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {l.loadNumber || l.ref}
                      </div>
                      <div className="text-sm font-medium">{l.customerName}</div>
                      {l.pendingApproval && (
                        <div className="mt-1">
                          <ApprovalStatusBadge status={l.approvalStatus} />
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">{l.carrierName}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        {l.hazmat && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-500">
                            <ShieldAlert className="size-2.5" /> Hazmat
                          </span>
                        )}
                        <span
                          className={`font-mono text-xs font-medium ${marginTone(l.grossMargin).color}`}
                        >
                          {usd(l.grossMargin)}
                        </span>
                      </div>
                    </button>
                  ))}
                  {columnItems.length === 0 && (
                    <div className="px-2 py-3 text-xs text-muted-foreground">—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Load Sheet — mirrors the detail sheet's tabbed layout instead of one long inline form */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-2xl">
          <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
            <SheetTitle className="flex items-center gap-2">
              <Truck className="size-5 text-muted-foreground" /> Create Load
            </SheetTitle>
          </SheetHeader>
          <form
            id="create-load-form"
            className="flex-1 overflow-y-auto px-6 py-5"
            onSubmit={createLoad}
          >
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="route">Route</TabsTrigger>
                <TabsTrigger value="freight">Freight</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 pt-4">
                <BasicInfoFields
                  idPrefix="create"
                  values={createForm}
                  onChange={setCreateField}
                  customers={customers}
                  carriers={carriers}
                />
              </TabsContent>
              <TabsContent value="route" className="space-y-4 pt-4">
                <AddressFields
                  idPrefix="create"
                  kind="pickup"
                  values={createForm}
                  onChange={setCreateField}
                />
                <AddressFields
                  idPrefix="create"
                  kind="delivery"
                  values={createForm}
                  onChange={setCreateField}
                />
              </TabsContent>
              <TabsContent value="freight" className="space-y-4 pt-4">
                <FreightFields idPrefix="create" values={createForm} onChange={setCreateField} />
                <PricingFields
                  idPrefix="create"
                  values={createForm}
                  onChange={setCreateField}
                  financials={createFinancials}
                />
              </TabsContent>
              <TabsContent value="notes" className="space-y-4 pt-4">
                <NotesFields idPrefix="create" values={createForm} onChange={setCreateField} />
              </TabsContent>
            </Tabs>
          </form>
          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-background/95 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-load-form" disabled={creating || !canBook}>
              {creating ? "Creating…" : "Create Load"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Load Detail Sheet — opens from the right, tabbed for both view and edit */}
      <Sheet open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-2xl">
          {open && (
            <>
              <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SheetTitle>Load {open.loadNumber || open.ref}</SheetTitle>
                      {open.pendingApproval && <ApprovalStatusBadge status={open.approvalStatus} />}
                      {open.hazmat && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-500">
                          <ShieldAlert className="size-3" /> Hazmat
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{open.customerName}</span>
                      <span>·</span>
                      <span>{open.carrierName}</span>
                      <span>·</span>
                      <span>Agent {open.agentName}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canEdit && !editing && (
                      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                        <Pencil className="size-4" /> Edit
                      </Button>
                    )}
                    {canBook && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Load?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this load from the system and cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={deleteLoad}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>

                {/* Quick-glance summary strip — key numbers visible without opening a tab */}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Status
                    </div>
                    <div className="mt-0.5">
                      <StatusBadge value={open.status} />
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Revenue
                    </div>
                    <div className="mt-0.5 font-mono text-sm">{usd(open.revenue)}</div>
                  </div>
                  <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Gross Margin
                    </div>
                    <div
                      className={`mt-0.5 flex items-center gap-1 font-mono text-sm font-medium ${marginTone(open.grossMargin).color}`}
                    >
                      {(() => {
                        const MarginIcon = marginTone(open.grossMargin).Icon;
                        return <MarginIcon className="size-3" />;
                      })()}
                      {usd(open.grossMargin)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-card/60 px-2.5 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Margin %
                    </div>
                    <div
                      className={`mt-0.5 font-mono text-sm font-medium ${marginTone(open.grossMargin).color}`}
                    >
                      {open.marginPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {editing ? (
                  <form id="edit-load-form" className="space-y-4" onSubmit={saveLoad}>
                    {open.pendingApproval && (
                      <div className="rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-foreground">
                        <div className="font-medium">
                          This load is currently tied to an approval request.
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Saving will update the existing request so the approver can review the
                          latest changes.
                        </div>
                      </div>
                    )}
                    <Tabs defaultValue="basic">
                      <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="route">Route</TabsTrigger>
                        <TabsTrigger value="freight">Freight</TabsTrigger>
                        <TabsTrigger value="documents">Docs</TabsTrigger>
                        <TabsTrigger value="notes">Notes</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                      </TabsList>

                      <TabsContent value="basic" className="space-y-4 pt-4">
                        <BasicInfoFields
                          idPrefix="edit"
                          values={editForm}
                          onChange={setEditField}
                          customers={customers}
                          carriers={carriers}
                          extra={
                            <>
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-invoiceStatus">Invoice Status</Label>
                                <Select
                                  value={editForm.invoiceStatus}
                                  onValueChange={(v) =>
                                    setEditForm((p) => ({
                                      ...p,
                                      invoiceStatus: v as InvoiceStatus,
                                    }))
                                  }
                                >
                                  <SelectTrigger id="edit-invoiceStatus">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="sent">Sent</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="edit-paymentStatus">Payment Status</Label>
                                <Select
                                  value={editForm.paymentStatus}
                                  onValueChange={(v) =>
                                    setEditForm((p) => ({
                                      ...p,
                                      paymentStatus: v as PaymentStatus,
                                    }))
                                  }
                                >
                                  <SelectTrigger id="edit-paymentStatus">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="partial">Partial</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          }
                        />
                      </TabsContent>

                      <TabsContent value="route" className="space-y-4 pt-4">
                        <AddressFields
                          idPrefix="edit"
                          kind="pickup"
                          values={editForm}
                          onChange={setEditField}
                        />
                        <AddressFields
                          idPrefix="edit"
                          kind="delivery"
                          values={editForm}
                          onChange={setEditField}
                        />
                      </TabsContent>

                      <TabsContent value="freight" className="space-y-4 pt-4">
                        <FreightFields idPrefix="edit" values={editForm} onChange={setEditField} />
                        <PricingFields
                          idPrefix="edit"
                          values={editForm}
                          onChange={setEditField}
                          financials={editFinancials}
                        />
                      </TabsContent>

                      <TabsContent value="documents" className="space-y-4 pt-4">
                        <SectionCard title="Documents" eyebrow="Files">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {(editForm.documents || []).map((doc) => (
                              <div
                                key={doc.kind}
                                className="flex items-center justify-between rounded-md border border-border bg-card/50 p-2"
                              >
                                <div className="text-sm">{DOCUMENT_LABELS[doc.kind]}</div>
                                <Button
                                  size="sm"
                                  type="button"
                                  variant={doc.uploaded ? "outline" : "default"}
                                  onClick={() => toggleDoc(doc.kind, doc.uploaded)}
                                >
                                  {doc.uploaded ? (
                                    <>
                                      <CheckCircle2 className="size-3.5" /> Uploaded
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="size-3.5" /> Upload
                                    </>
                                  )}
                                </Button>
                              </div>
                            ))}
                            {(editForm.documents || []).length === 0 && (
                              <p className="text-sm text-muted-foreground sm:col-span-2">
                                No documents tracked for this load.
                              </p>
                            )}
                          </div>
                        </SectionCard>
                      </TabsContent>

                      <TabsContent value="notes" className="space-y-4 pt-4">
                        <NotesFields idPrefix="edit" values={editForm} onChange={setEditField} />
                      </TabsContent>

                      <TabsContent value="history" className="space-y-4 pt-4">
                        <SectionCard title="Status history" eyebrow="Timeline">
                          <ul className="space-y-1.5">
                            {open.statusHistory?.length ? (
                              open.statusHistory.map((h, i) => (
                                <li
                                  key={i}
                                  className="flex items-center justify-between rounded-md border border-border bg-card/50 px-2.5 py-1.5"
                                >
                                  <StatusBadge value={h.status} />
                                  <div className="text-xs text-muted-foreground">
                                    {h.changedBy} · {h.at ? fmtDateTime(h.at) : ""}
                                  </div>
                                </li>
                              ))
                            ) : (
                              <li className="text-xs text-muted-foreground">No history</li>
                            )}
                          </ul>
                        </SectionCard>
                      </TabsContent>
                    </Tabs>

                    <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving…" : "Save Changes"}
                      </Button>
                      <Button variant="ghost" type="button" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Tabs defaultValue="overview">
                    <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="route">Route</TabsTrigger>
                      <TabsTrigger value="freight">Freight</TabsTrigger>
                      <TabsTrigger value="documents">Docs</TabsTrigger>
                      <TabsTrigger value="notes">Notes</TabsTrigger>
                      <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    {/* -------------------------------------------------------------- */}
                    {/* Overview — load summary, then Customer and Carrier each once,   */}
                    {/* matching the carriers page's sectioned-card layout.             */}
                    {/* -------------------------------------------------------------- */}
                    <TabsContent value="overview" className="space-y-4 pt-4">
                      <DetailSection icon={<Package className="size-4" />} title="Load summary">
                        <DetailGrid>
                          <DetailRow label="Agent" value={open.agentName} />
                          <DetailRow label="Load Number" value={open.loadNumber || open.ref} mono />
                          <DetailRow
                            label="Customer Reference"
                            value={open.customerReference || "—"}
                          />
                          <DetailRow
                            label="Invoice Status"
                            value={<StatusBadge value={open.invoiceStatus} />}
                          />
                          <DetailRow
                            label="Payment Status"
                            value={<StatusBadge value={open.paymentStatus} />}
                          />
                        </DetailGrid>
                      </DetailSection>

                      {open.customer && (
                        <DetailSection icon={<User className="size-4" />} title="Customer">
                          <DetailGrid>
                            <DetailRow label="Company" value={open.customer.company || "—"} />
                            <DetailRow label="Contact" value={open.customer.contact || "—"} />
                            <DetailRow
                              label="Phone"
                              value={open.customer.phone || "—"}
                              icon={<Phone className="size-3.5" />}
                            />
                            <DetailRow
                              label="Email"
                              value={open.customer.email || "—"}
                              icon={<Mail className="size-3.5" />}
                            />
                          </DetailGrid>
                        </DetailSection>
                      )}

                      {open.carrier && (
                        <DetailSection icon={<Truck className="size-4" />} title="Carrier">
                          <DetailGrid>
                            <DetailRow label="Legal Name" value={open.carrier.legalName || "—"} />
                            <DetailRow label="DBA" value={open.carrier.dba || "—"} />
                            <DetailRow label="MC #" value={open.carrier.mcNumber || "—"} mono />
                            <DetailRow label="DOT #" value={open.carrier.dotNumber || "—"} mono />
                            <DetailRow label="Contact" value={open.carrier.contactName || "—"} />
                            <DetailRow
                              label="Phone"
                              value={open.carrier.contactPhone || "—"}
                              icon={<Phone className="size-3.5" />}
                            />
                            <DetailRow
                              label="Email"
                              value={open.carrier.contactEmail || "—"}
                              icon={<Mail className="size-3.5" />}
                            />
                            <DetailRow
                              label="Address"
                              value={open.carrier.address || "—"}
                              icon={<MapPin className="size-3.5" />}
                              span2
                            />
                            <DetailRow
                              label="Insurance Carrier"
                              value={open.carrier.insuranceCarrier || "—"}
                            />
                            <DetailRow
                              label="Insurance Expires"
                              value={
                                open.carrier.insuranceExpiresAt
                                  ? fmtDate(open.carrier.insuranceExpiresAt)
                                  : "—"
                              }
                              mono
                            />
                            <DetailRow
                              label="Status"
                              value={<StatusBadge value={open.carrier.status} />}
                            />
                          </DetailGrid>

                          {(open.carrier.equipmentTypes?.length ||
                            open.carrier.serviceAreas?.length) && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {open.carrier.equipmentTypes?.length > 0 && (
                                <div>
                                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Equipment types
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {open.carrier.equipmentTypes.map((type: string) => (
                                      <Pill key={type}>{type}</Pill>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {open.carrier.serviceAreas?.length > 0 && (
                                <div>
                                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Service areas
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {open.carrier.serviceAreas.map((area: string, i: number) => (
                                      <Pill key={i}>{area}</Pill>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </DetailSection>
                      )}

                      {open.pendingApproval &&
                      (open.comments?.length || open.auditHistory?.length) ? (
                        <>
                          {open.comments && open.comments.length > 0 && (
                            <DetailSection
                              icon={<MessageSquare className="size-4" />}
                              title="Conversation"
                            >
                              <ul className="space-y-2">
                                {open.comments.map((c, i) => (
                                  <li
                                    key={i}
                                    className="rounded-md border border-border bg-muted/40 p-2.5"
                                  >
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                      <span className="text-xs font-semibold">{c.by}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {fmtDateTime(c.at)}
                                      </span>
                                    </div>
                                    <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                                  </li>
                                ))}
                              </ul>
                            </DetailSection>
                          )}
                          {open.auditHistory && open.auditHistory.length > 0 && (
                            <DetailSection icon={<Clock className="size-4" />} title="Audit trail">
                              <ul className="space-y-1.5">
                                {(open.auditHistory as any[]).map((h, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start justify-between gap-2 rounded-md border border-border bg-card/50 px-2.5 py-1.5"
                                  >
                                    <div>
                                      <span className="text-xs font-medium capitalize">
                                        {h.action?.replace(/_/g, " ")}
                                      </span>
                                      {h.notes && (
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                          {h.notes}
                                        </p>
                                      )}
                                    </div>
                                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                                      <div>{h.performedByName}</div>
                                      <div>{h.at ? fmtDateTime(h.at) : ""}</div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </DetailSection>
                          )}
                        </>
                      ) : null}
                    </TabsContent>

                    {/* -------------------------------------------------------------- */}
                    {/* Route                                                            */}
                    {/* -------------------------------------------------------------- */}
                    <TabsContent value="route" className="space-y-4 pt-4">
                      <DetailSection icon={<MapPin className="size-4" />} title="Pickup">
                        <DetailGrid>
                          <DetailRow label="Company" value={open.pickupCompany || "—"} />
                          <DetailRow label="Contact" value={open.pickupContact || "—"} />
                          <DetailRow
                            label="Phone"
                            value={open.pickupPhone || "—"}
                            icon={<Phone className="size-3.5" />}
                          />
                          <DetailRow
                            label="Address"
                            value={open.pickupAddress || "—"}
                            icon={<MapPin className="size-3.5" />}
                            span2
                          />
                          <DetailRow
                            label="City / State"
                            value={
                              [open.pickupCity, open.pickupState, open.pickupZip]
                                .filter(Boolean)
                                .join(", ") || "—"
                            }
                          />
                          <DetailRow
                            label="Date & Time"
                            value={
                              open.pickupDate
                                ? fmtDateTime(
                                    open.pickupDate +
                                      (open.pickupTime ? `T${open.pickupTime}` : ""),
                                  )
                                : "—"
                            }
                          />
                        </DetailGrid>
                      </DetailSection>

                      <DetailSection icon={<MapPin className="size-4" />} title="Delivery">
                        <DetailGrid>
                          <DetailRow label="Company" value={open.deliveryCompany || "—"} />
                          <DetailRow label="Contact" value={open.deliveryContact || "—"} />
                          <DetailRow
                            label="Phone"
                            value={open.deliveryPhone || "—"}
                            icon={<Phone className="size-3.5" />}
                          />
                          <DetailRow
                            label="Address"
                            value={open.deliveryAddress || "—"}
                            icon={<MapPin className="size-3.5" />}
                            span2
                          />
                          <DetailRow
                            label="City / State"
                            value={
                              [open.deliveryCity, open.deliveryState, open.deliveryZip]
                                .filter(Boolean)
                                .join(", ") || "—"
                            }
                          />
                          <DetailRow
                            label="Date & Time"
                            value={
                              open.deliveryDate
                                ? fmtDateTime(
                                    open.deliveryDate +
                                      (open.deliveryTime ? `T${open.deliveryTime}` : ""),
                                  )
                                : "—"
                            }
                          />
                        </DetailGrid>
                      </DetailSection>
                    </TabsContent>

                    {/* -------------------------------------------------------------- */}
                    {/* Freight — hazmat gets a warning banner, margin gets colored     */}
                    {/* labeling, mirroring the carriers page's insurance-expiry state. */}
                    {/* -------------------------------------------------------------- */}
                    <TabsContent value="freight" className="space-y-4 pt-4">
                      <DetailSection icon={<Truck className="size-4" />} title="Freight details">
                        <DetailGrid>
                          <DetailRow label="Commodity" value={open.commodity || "—"} />
                          <DetailRow label="Weight" value={open.weight?.toString() || "—"} />
                          <DetailRow label="Pieces" value={open.pieces?.toString() || "—"} />
                          <DetailRow label="Pallets" value={open.pallets?.toString() || "—"} />
                          <DetailRow label="Equipment Type" value={open.equipmentType || "—"} />
                          <DetailRow
                            label="Trailer Length"
                            value={open.trailerLength?.toString() || "—"}
                          />
                          <DetailRow
                            label="Load Type"
                            value={open.loadType?.toUpperCase() || "—"}
                          />
                          <DetailRow
                            label="Temperature"
                            value={open.temperature?.toString() || "—"}
                          />
                          <DetailRow label="Stackable" value={open.stackable ? "Yes" : "No"} />
                        </DetailGrid>

                        {open.hazmat && (
                          <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                            <ShieldAlert className="size-4 shrink-0" />
                            This load is marked as hazardous material — confirm carrier hazmat
                            certification before dispatch.
                          </div>
                        )}
                      </DetailSection>

                      <DetailSection icon={<DollarSign className="size-4" />} title="Pricing">
                        <DetailGrid>
                          <DetailRow label="Customer Rate" value={usd(open.customerRate)} mono />
                          <DetailRow label="Carrier Cost" value={usd(open.carrierCost)} mono />
                          <DetailRow
                            label="Accessorials"
                            value={open.accessorialCharges ? usd(open.accessorialCharges) : "—"}
                            mono
                          />
                          <DetailRow label="Revenue" value={usd(open.revenue)} mono />
                        </DetailGrid>

                        <div className="mt-3 rounded-md border border-border bg-muted p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Calculated result
                            </span>
                            <MarginChip margin={open.grossMargin} />
                          </div>
                          <div className="grid gap-1 text-xs">
                            <div className="flex justify-between">
                              <span>Gross Margin</span>
                              <span
                                className={`tabular-nums font-medium ${marginTone(open.grossMargin).color}`}
                              >
                                {usd(open.grossMargin)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Margin %</span>
                              <span
                                className={`tabular-nums font-medium ${marginTone(open.grossMargin).color}`}
                              >
                                {open.marginPercent.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <DetailRow
                            label="Loaded Miles"
                            value={open.loadedMiles?.toString() || "—"}
                          />
                          <DetailRow
                            label="Deadhead Miles"
                            value={open.deadheadMiles?.toString() || "—"}
                          />
                        </div>
                      </DetailSection>
                    </TabsContent>

                    {/* -------------------------------------------------------------- */}
                    {/* Documents                                                        */}
                    {/* -------------------------------------------------------------- */}
                    <TabsContent value="documents" className="pt-4">
                      <DetailSection icon={<FileText className="size-4" />} title="Documents">
                        <div className="overflow-hidden rounded-md border border-border">
                          <table className="w-full text-sm">
                            <tbody>
                              {(open.documents || []).map((d, index) => (
                                <tr
                                  key={d.kind}
                                  className={`border-b border-border last:border-b-0 ${
                                    index % 2 === 0 ? "bg-background" : "bg-card/60"
                                  }`}
                                >
                                  <td className="px-3 py-2">{DOCUMENT_LABELS[d.kind]}</td>
                                  <td className="px-3 py-2 text-right">
                                    {d.uploaded ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                                        <CheckCircle2 className="size-3.5" /> Uploaded
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        Not uploaded
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {(open.documents || []).length === 0 && (
                                <tr>
                                  <td
                                    className="px-3 py-2 text-sm text-muted-foreground"
                                    colSpan={2}
                                  >
                                    No documents tracked for this load.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </DetailSection>
                    </TabsContent>

                    {/* -------------------------------------------------------------- */}
                    {/* Notes                                                            */}
                    {/* -------------------------------------------------------------- */}
                    <TabsContent value="notes" className="space-y-4 pt-4">
                      {open.internalNotes && (
                        <DetailSection
                          icon={<StickyNote className="size-4" />}
                          title="Internal notes"
                        >
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {open.internalNotes}
                          </p>
                        </DetailSection>
                      )}
                      {open.driverInstructions && (
                        <DetailSection
                          icon={<FileText className="size-4" />}
                          title="Driver instructions"
                        >
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {open.driverInstructions}
                          </p>
                        </DetailSection>
                      )}
                      {open.customerNotes && (
                        <DetailSection
                          icon={<MessageSquare className="size-4" />}
                          title="Customer notes"
                        >
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {open.customerNotes}
                          </p>
                        </DetailSection>
                      )}
                      {!open.internalNotes && !open.driverInstructions && !open.customerNotes && (
                        <p className="text-sm text-muted-foreground">No notes on this load.</p>
                      )}
                    </TabsContent>

                    {/* -------------------------------------------------------------- */}
                    {/* History — real table, matching the carriers review-history UI. */}
                    {/* -------------------------------------------------------------- */}
                    <TabsContent value="history" className="pt-4">
                      <DetailSection icon={<Clock className="size-4" />} title="Status history">
                        {open.statusHistory?.length ? (
                          <div className="overflow-x-auto rounded-md border border-border">
                            <table className="w-full min-w-[420px] text-sm">
                              <thead>
                                <tr className="border-b border-border bg-muted/50 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  <th className="px-3 py-2">Date</th>
                                  <th className="px-3 py-2">Changed By</th>
                                  <th className="px-3 py-2">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {open.statusHistory.map((h, i) => (
                                  <tr
                                    key={i}
                                    className={`border-b border-border last:border-b-0 ${
                                      i % 2 === 0 ? "bg-background" : "bg-card/60"
                                    }`}
                                  >
                                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                                      {h.at ? fmtDateTime(h.at) : "—"}
                                    </td>
                                    <td className="px-3 py-2 font-medium">{h.changedBy}</td>
                                    <td className="px-3 py-2">
                                      <StatusBadge value={h.status} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No history.</div>
                        )}
                      </DetailSection>
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

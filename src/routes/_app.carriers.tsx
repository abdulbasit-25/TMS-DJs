import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { can } from "@/lib/roles";
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
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit,
  FileText,
  History,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Truck,
  User,
  X,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/carriers")({
  component: CarriersPage,
});

const CARRIER_STATUSES = ["pending", "under_review", "approved", "rejected", "suspended"] as const;

type CarrierStatus = (typeof CARRIER_STATUSES)[number];

type CarrierItem = {
  id: string;
  legalName: string;
  dba: string;
  companyName: string;
  mcNumber: string;
  dotNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  taxId: string;
  equipmentTypes: string[];
  serviceAreas: Array<string | { region: string; states: string[] }>;
  paymentTerms: string;
  insuredVehicleVINs: string[];
  insuranceCarrier: string;
  insuranceCertificateId: string;
  insurancePolicyNumber: string;
  insuranceExpiresAt: string | null;
  notes: string;
  status: CarrierStatus;
  vettingChecks: {
    authorityVerified: boolean;
    insuranceVerified: boolean;
    safetyVerified: boolean;
    fraudChecked: boolean;
    complianceVerified: boolean;
  };
  reviewHistory: Array<{
    status: CarrierStatus;
    reviewerId: string;
    reviewerName: string;
    reviewDate: string;
    comments: string;
  }>;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CarrierApiResponse = {
  carriers: CarrierItem[];
  total: number;
  page: number;
  limit: number;
};

const SORTABLE_FIELDS = [
  "legalName",
  "mcNumber",
  "dotNumber",
  "contactName",
  "status",
  "createdAt",
  "updatedAt",
] as const;

const VETTING_CHECK_LABELS: Record<keyof CarrierItem["vettingChecks"], string> = {
  authorityVerified: "Authority verified",
  insuranceVerified: "Insurance verified",
  safetyVerified: "Safety verified",
  fraudChecked: "Fraud checked",
  complianceVerified: "Compliance verified",
};

function CarriersPage() {
  const { session } = useAuth();
  const role = session?.role ?? "agent";
  const canApprove = can(role, "approval_actions");
  const canManage = [
    "owner",
    "admin",
    "ops_manager",
    "team_manager",
    "leadagent",
    "agent",
  ].includes(role);
  const canDelete = ["owner", "admin", "ops_manager", "team_manager"].includes(role);

  const [items, setItems] = useState<CarrierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<NonNullable<(typeof SORTABLE_FIELDS)[number]>>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const [form, setForm] = useState({
    legalName: "",
    dba: "",
    companyName: "",
    mcNumber: "",
    dotNumber: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    taxId: "",
    equipmentTypes: "",
    serviceAreas: "",
    paymentTerms: "",
    insuredVehicleVINs: [] as string[],
    vinInput: "",
    insuranceCarrier: "",
    insuranceCertificateId: "",
    insurancePolicyNumber: "",
    insuranceExpiresAt: "",
    notes: "",
    status: "pending" as CarrierStatus,
  });

  const [editForm, setEditForm] = useState({
    legalName: "",
    dba: "",
    companyName: "",
    mcNumber: "",
    dotNumber: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    taxId: "",
    equipmentTypes: "",
    serviceAreas: "",
    paymentTerms: "",
    insuredVehicleVINs: [] as string[],
    vinInput: "",
    insuranceCarrier: "",
    insuranceCertificateId: "",
    insurancePolicyNumber: "",
    insuranceExpiresAt: "",
    notes: "",
    status: "pending" as CarrierStatus,
    authorityVerified: false,
    insuranceVerified: false,
    safetyVerified: false,
    fraudChecked: false,
    complianceVerified: false,
  });

  const open = items.find((item) => item.id === openId) ?? null;

  const loadCarriers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      if (q.trim()) params.set("q", q.trim());
      if (status !== "all") params.set("status", status);

      const payload = await apiFetch<CarrierApiResponse>(`/api/carriers?${params.toString()}`);
      setItems(payload.data.carriers);
      setTotal(payload.data.total);
    } catch (error) {
      console.error(error);
      setItems([]);
      setTotal(0);
      toast.error("Unable to load carriers");
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, status, sortBy, sortOrder]);

  useEffect(() => {
    void loadCarriers();
  }, [loadCarriers]);

  const openCarrier = useCallback((id: string) => {
    setOpenId(id);
    setEditing(false);
    setReviewComment("");
  }, []);

  const resetForm = () => {
    setForm({
      legalName: "",
      dba: "",
      companyName: "",
      mcNumber: "",
      dotNumber: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      taxId: "",
      equipmentTypes: "",
      serviceAreas: "",
      paymentTerms: "",
      insuredVehicleVINs: [],
      vinInput: "",
      insuranceCarrier: "",
      insuranceCertificateId: "",
      insurancePolicyNumber: "",
      insuranceExpiresAt: "",
      notes: "",
      status: "pending",
    });
  };

  const startEdit = () => {
    if (!open) return;
    setEditForm({
      legalName: open.legalName,
      dba: open.dba,
      companyName: open.companyName,
      mcNumber: open.mcNumber,
      dotNumber: open.dotNumber,
      contactName: open.contactName,
      contactEmail: open.contactEmail,
      contactPhone: open.contactPhone,
      address: open.address,
      taxId: open.taxId,
      equipmentTypes: open.equipmentTypes.join(", "),
      serviceAreas: formatServiceAreas(open.serviceAreas),
      paymentTerms: open.paymentTerms,
      insuredVehicleVINs: open.insuredVehicleVINs,
      vinInput: "",
      insuranceCarrier: open.insuranceCarrier,
      insuranceCertificateId: open.insuranceCertificateId,
      insurancePolicyNumber: open.insurancePolicyNumber,
      insuranceExpiresAt: open.insuranceExpiresAt ?? "",
      notes: open.notes,
      status: open.status,
      authorityVerified: open.vettingChecks.authorityVerified,
      insuranceVerified: open.vettingChecks.insuranceVerified,
      safetyVerified: open.vettingChecks.safetyVerified,
      fraudChecked: open.vettingChecks.fraudChecked,
      complianceVerified: open.vettingChecks.complianceVerified,
    });
    setEditing(true);
  };

  const createCarrier = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.legalName.trim() || !form.contactName.trim()) {
      toast.error("Carrier name and contact name are required");
      return;
    }

    setCreating(true);
    try {
      await apiFetch<{ carrier: CarrierItem }>("/api/carriers", {
        method: "POST",
        body: JSON.stringify({
          legalName: form.legalName.trim(),
          dba: form.dba.trim(),
          companyName: form.companyName.trim(),
          mcNumber: form.mcNumber.trim(),
          dotNumber: form.dotNumber.trim(),
          contactName: form.contactName.trim(),
          contactEmail: form.contactEmail.trim(),
          contactPhone: form.contactPhone.trim(),
          address: form.address.trim(),
          taxId: form.taxId.trim(),
          equipmentTypes: form.equipmentTypes,
          serviceAreas: form.serviceAreas,
          paymentTerms: form.paymentTerms.trim(),
          insuredVehicleVINs: getVINPayload(form.insuredVehicleVINs, form.vinInput),
          insuranceCarrier: form.insuranceCarrier.trim(),
          insuranceCertificateId: form.insuranceCertificateId.trim(),
          insurancePolicyNumber: form.insurancePolicyNumber.trim(),
          insuranceExpiresAt: form.insuranceExpiresAt || null,
          notes: form.notes.trim(),
          status: form.status,
        }),
      });
      resetForm();
      setShowCreate(false);
      setPage(1);
      await loadCarriers();
      toast.success("Carrier added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create carrier");
    } finally {
      setCreating(false);
    }
  };

  const saveCarrier = async (event: FormEvent) => {
    event.preventDefault();
    if (!open) return;
    if (!editForm.legalName.trim() || !editForm.contactName.trim()) {
      toast.error("Carrier name and contact name are required");
      return;
    }

    setSaving(true);
    try {
      const payload = await apiFetch<{ carrier: CarrierItem }>("/api/carriers", {
        method: "PATCH",
        body: JSON.stringify({
          carrierId: open.id,
          legalName: editForm.legalName.trim(),
          dba: editForm.dba.trim(),
          companyName: editForm.companyName.trim(),
          mcNumber: editForm.mcNumber.trim(),
          dotNumber: editForm.dotNumber.trim(),
          contactName: editForm.contactName.trim(),
          contactEmail: editForm.contactEmail.trim(),
          contactPhone: editForm.contactPhone.trim(),
          address: editForm.address.trim(),
          taxId: editForm.taxId.trim(),
          equipmentTypes: editForm.equipmentTypes,
          serviceAreas: editForm.serviceAreas,
          paymentTerms: editForm.paymentTerms.trim(),
          insuredVehicleVINs: getVINPayload(editForm.insuredVehicleVINs, editForm.vinInput),
          insuranceCarrier: editForm.insuranceCarrier.trim(),
          insuranceCertificateId: editForm.insuranceCertificateId.trim(),
          insurancePolicyNumber: editForm.insurancePolicyNumber.trim(),
          insuranceExpiresAt: editForm.insuranceExpiresAt || null,
          notes: editForm.notes.trim(),
          status: editForm.status,
          vettingChecks: {
            authorityVerified: editForm.authorityVerified,
            insuranceVerified: editForm.insuranceVerified,
            safetyVerified: editForm.safetyVerified,
            fraudChecked: editForm.fraudChecked,
            complianceVerified: editForm.complianceVerified,
          },
          reviewComment: reviewComment.trim(),
        }),
      });
      setItems((prev) => prev.map((item) => (item.id === open.id ? payload.data.carrier : item)));
      setOpenId(payload.data.carrier.id);
      setEditing(false);
      setReviewComment("");
      toast.success("Carrier saved");
      await loadCarriers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save carrier");
    } finally {
      setSaving(false);
    }
  };

  const deleteCarrier = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch("/api/carriers", {
        method: "DELETE",
        body: JSON.stringify({ carrierId: deleteTarget }),
      });
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget));
      setOpenId((prev) => (prev === deleteTarget ? null : prev));
      setDeleteTarget(null);
      toast.success("Carrier deleted");
      await loadCarriers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete carrier");
    } finally {
      setDeleting(false);
    }
  };

  const exportCarriers = async (format: "csv" | "xls") => {
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status !== "all") params.set("status", status);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("export", format);
      params.set("limit", String(limit));
      params.set("page", String(page));

      const response = await fetch(`/api/carriers?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? response.statusText);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `carriers.${format === "xls" ? "xls" : "csv"}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Carrier export downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export carriers");
    }
  };

  const handleSort = (field: (typeof SORTABLE_FIELDS)[number]) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const vettingProgress = useMemo(
    () => (item: CarrierItem) => {
      const total = Object.values(item.vettingChecks).length;
      const complete = Object.values(item.vettingChecks).filter(Boolean).length;
      return { complete, total, label: `${complete}/${total}` };
    },
    [],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Carriers"
        description="Vet, approve, and manage motor carriers cleared for assignment."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCarriers("csv")}>
              <Download className="size-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCarriers("xls")}>
              <Download className="size-4" /> Excel
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)} disabled={!canManage}>
              <Plus className="size-4" /> Add carrier
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-1">
          <Label htmlFor="carrier-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="carrier-search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search carrier, MC, DOT, contact..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="carrier-status">Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value)}>
            <SelectTrigger id="carrier-status" className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {CARRIER_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Results</Label>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {total} carrier{total === 1 ? "" : "s"}
            </span>
            <span className="h-1 w-1 rounded-full bg-muted" />
            <span>Page {page}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading carriers…
        </div>
      ) : (
        <DataTable
          empty={
            <EmptyState
              icon={<Truck className="size-6" />}
              title="No carriers yet"
              description="Add a carrier to start vetting and tracking."
            />
          }
          rows={items}
          onRowClick={(carrier) => openCarrier(carrier.id)}
          columns={[
            {
              head: (
                <button
                  type="button"
                  className="flex items-center gap-1"
                  onClick={() => handleSort("legalName")}
                >
                  Carrier
                  {sortBy === "legalName" ? (
                    sortOrder === "asc" ? (
                      <ChevronUp className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )
                  ) : null}
                </button>
              ),
              cell: (carrier) => <div className="font-medium">{carrier.legalName}</div>,
            },
            {
              head: (
                <button
                  type="button"
                  className="flex items-center gap-1"
                  onClick={() => handleSort("mcNumber")}
                >
                  MC Number
                  {sortBy === "mcNumber" ? (
                    sortOrder === "asc" ? (
                      <ChevronUp className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )
                  ) : null}
                </button>
              ),
              cell: (carrier) => (
                <span className="font-mono text-xs">{carrier.mcNumber || "—"}</span>
              ),
            },
            {
              head: (
                <button
                  type="button"
                  className="flex items-center gap-1"
                  onClick={() => handleSort("dotNumber")}
                >
                  DOT Number
                  {sortBy === "dotNumber" ? (
                    sortOrder === "asc" ? (
                      <ChevronUp className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )
                  ) : null}
                </button>
              ),
              cell: (carrier) => (
                <span className="font-mono text-xs">{carrier.dotNumber || "—"}</span>
              ),
            },
            {
              head: "Contact",
              cell: (carrier) => (
                <div>
                  <div className="text-sm font-medium">{carrier.contactName || "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {carrier.contactPhone || carrier.contactEmail || "No contact"}
                  </div>
                </div>
              ),
            },
            {
              head: "Vetting",
              cell: (carrier) => {
                const progress = vettingProgress(carrier);
                return (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          progress.complete === progress.total ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${(progress.complete / progress.total) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {progress.label}
                    </span>
                  </div>
                );
              },
            },
            {
              head: (
                <button
                  type="button"
                  className="flex items-center gap-1"
                  onClick={() => handleSort("status")}
                >
                  Carrier Status
                  {sortBy === "status" ? (
                    sortOrder === "asc" ? (
                      <ChevronUp className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )
                  ) : null}
                </button>
              ),
              cell: (carrier) => <StatusBadge value={carrier.status} />,
            },
          ]}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
        <div>
          {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page * limit >= total || loading}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Sheet open={showCreate} onOpenChange={(openState) => !openState && setShowCreate(false)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Add carrier</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-6 pt-2">
            <form className="grid gap-3" onSubmit={createCarrier}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Carrier name">
                  <Input
                    value={form.legalName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, legalName: event.target.value }))
                    }
                    required
                  />
                </Field>
                <Field label="DBA">
                  <Input
                    value={form.dba}
                    onChange={(event) => setForm((prev) => ({ ...prev, dba: event.target.value }))}
                  />
                </Field>
                <Field label="Company">
                  <Input
                    value={form.companyName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, companyName: event.target.value }))
                    }
                  />
                </Field>
                <Field label="MC number">
                  <Input
                    value={form.mcNumber}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, mcNumber: event.target.value }))
                    }
                  />
                </Field>
                <Field label="DOT number">
                  <Input
                    value={form.dotNumber}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, dotNumber: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Contact name">
                  <Input
                    value={form.contactName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, contactName: event.target.value }))
                    }
                    required
                  />
                </Field>
                <Field label="Contact email">
                  <Input
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, contactEmail: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Contact phone">
                  <Input
                    value={form.contactPhone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, contactPhone: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Address" className="md:col-span-2">
                  <Textarea
                    value={form.address}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, address: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Tax ID / EIN">
                  <Input
                    value={form.taxId}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, taxId: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Equipment types">
                  <Input
                    value={form.equipmentTypes}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, equipmentTypes: event.target.value }))
                    }
                    placeholder="Dry van, refrigerated"
                  />
                </Field>
                <Field label="Payment terms">
                  <Input
                    value={form.paymentTerms}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, paymentTerms: event.target.value }))
                    }
                    placeholder="50% on pickup, 50% on delivery"
                  />
                </Field>
                <Field label="Service areas / regions" className="md:col-span-2">
                  <Textarea
                    value={form.serviceAreas}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, serviceAreas: event.target.value }))
                    }
                    placeholder={"Northeast: ME, VT, NH\nSoutheast: NC, SC, GA"}
                    rows={3}
                  />
                </Field>
                <Field label="Insurance carrier">
                  <Input
                    value={form.insuranceCarrier}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, insuranceCarrier: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Insurance policy #">
                  <Input
                    value={form.insurancePolicyNumber}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, insurancePolicyNumber: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Insurance certificate / ID">
                  <Input
                    value={form.insuranceCertificateId}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, insuranceCertificateId: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Insurance expires">
                  <Input
                    type="date"
                    value={form.insuranceExpiresAt}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, insuranceExpiresAt: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Insured vehicle VINs" className="md:col-span-2">
                  <VINInput
                    values={form.insuredVehicleVINs}
                    draft={form.vinInput}
                    onDraftChange={(vinInput) => setForm((prev) => ({ ...prev, vinInput }))}
                    onChange={(insuredVehicleVINs) =>
                      setForm((prev) => ({ ...prev, insuredVehicleVINs }))
                    }
                  />
                </Field>
                <Field label="Status">
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, status: value as CarrierStatus }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Carrier status" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARRIER_STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Notes" className="md:col-span-2">
                  <Textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    rows={4}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-3">
                <Button type="submit" disabled={creating}>
                  {creating ? "Saving…" : "Save carrier"}
                </Button>
                <Button variant="ghost" type="button" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(open)} onOpenChange={(openState) => !openState && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{open ? open.legalName : "Carrier details"}</SheetTitle>
          </SheetHeader>
          {open ? (
            <div className="space-y-4 px-4 pb-6 pt-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Carrier
                  </div>
                  <div className="text-lg font-semibold">{open.legalName}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget(open.id)}
                        >
                          <Trash2 className="size-4" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete carrier</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogDescription>
                          This will permanently remove the carrier from the portal. This action
                          cannot be undone.
                        </AlertDialogDescription>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={deleteCarrier} disabled={deleting}>
                            {deleting ? "Deleting…" : "Delete carrier"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {canManage && !editing && (
                    <Button size="sm" onClick={startEdit}>
                      <Edit className="size-4" /> Edit
                    </Button>
                  )}
                </div>
              </div>

              {editing ? (
                <form className="grid gap-3" onSubmit={saveCarrier}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Carrier name">
                      <Input
                        value={editForm.legalName}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, legalName: event.target.value }))
                        }
                        required
                      />
                    </Field>
                    <Field label="DBA">
                      <Input
                        value={editForm.dba}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, dba: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Company">
                      <Input
                        value={editForm.companyName}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, companyName: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="MC number">
                      <Input
                        value={editForm.mcNumber}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, mcNumber: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="DOT number">
                      <Input
                        value={editForm.dotNumber}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, dotNumber: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Contact name">
                      <Input
                        value={editForm.contactName}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, contactName: event.target.value }))
                        }
                        required
                      />
                    </Field>
                    <Field label="Contact email">
                      <Input
                        type="email"
                        value={editForm.contactEmail}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, contactEmail: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Contact phone">
                      <Input
                        value={editForm.contactPhone}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, contactPhone: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Address" className="md:col-span-2">
                      <Textarea
                        value={editForm.address}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, address: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Tax ID / EIN">
                      <Input
                        value={editForm.taxId}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, taxId: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Equipment types">
                      <Input
                        value={editForm.equipmentTypes}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, equipmentTypes: event.target.value }))
                        }
                        placeholder="Dry van, refrigerated"
                      />
                    </Field>
                    <Field label="Payment terms">
                      <Input
                        value={editForm.paymentTerms}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, paymentTerms: event.target.value }))
                        }
                        placeholder="50% on pickup, 50% on delivery"
                      />
                    </Field>
                    <Field label="Service areas / regions" className="md:col-span-2">
                      <Textarea
                        value={editForm.serviceAreas}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, serviceAreas: event.target.value }))
                        }
                        placeholder={"Northeast: ME, VT, NH\nSoutheast: NC, SC, GA"}
                        rows={3}
                      />
                    </Field>
                    <Field label="Insurance carrier">
                      <Input
                        value={editForm.insuranceCarrier}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, insuranceCarrier: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Insurance policy #">
                      <Input
                        value={editForm.insurancePolicyNumber}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            insurancePolicyNumber: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Insurance certificate / ID">
                      <Input
                        value={editForm.insuranceCertificateId}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            insuranceCertificateId: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Insurance expires">
                      <Input
                        type="date"
                        value={editForm.insuranceExpiresAt ?? ""}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            insuranceExpiresAt: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Insured vehicle VINs" className="md:col-span-2">
                      <VINInput
                        values={editForm.insuredVehicleVINs}
                        draft={editForm.vinInput}
                        onDraftChange={(vinInput) => setEditForm((prev) => ({ ...prev, vinInput }))}
                        onChange={(insuredVehicleVINs) =>
                          setEditForm((prev) => ({ ...prev, insuredVehicleVINs }))
                        }
                      />
                    </Field>
                    <Field label="Status">
                      <Select
                        value={editForm.status}
                        onValueChange={(value) =>
                          setEditForm((prev) => ({ ...prev, status: value as CarrierStatus }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Carrier status" />
                        </SelectTrigger>
                        <SelectContent>
                          {CARRIER_STATUSES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Review notes" className="md:col-span-2">
                      <Textarea
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        rows={3}
                        placeholder="Record reviewer comments"
                      />
                    </Field>
                    <Field label="Vetting checks" className="md:col-span-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(
                          Object.keys(VETTING_CHECK_LABELS) as Array<
                            keyof CarrierItem["vettingChecks"]
                          >
                        ).map((key) => (
                          <label
                            key={key}
                            className="flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-2 text-sm"
                          >
                            <Switch
                              checked={editForm[key]}
                              onCheckedChange={(value) =>
                                setEditForm((prev) => ({ ...prev, [key]: value }))
                              }
                            />
                            {VETTING_CHECK_LABELS[key]}
                          </label>
                        ))}
                      </div>
                    </Field>
                    <Field label="Additional notes" className="md:col-span-2">
                      <Textarea
                        value={editForm.notes}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, notes: event.target.value }))
                        }
                        rows={4}
                      />
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-3">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                    <Button variant="ghost" type="button" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <CarrierDetailView
                  carrier={open}
                  vettingProgress={vettingProgress(open)}
                  canApprove={canApprove}
                  canManage={canManage}
                  saving={saving}
                  onApprove={async () => {
                    setEditForm((prev) => ({ ...prev, status: "approved" }));
                    setReviewComment("Approved by reviewer");
                    await saveCarrier(new Event("submit") as unknown as FormEvent);
                  }}
                  onReject={async () => {
                    setEditForm((prev) => ({ ...prev, status: "rejected" }));
                    setReviewComment("Rejected by reviewer");
                    await saveCarrier(new Event("submit") as unknown as FormEvent);
                  }}
                  onEdit={() => setEditing(true)}
                />
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Read-only carrier detail view                                       */
/* ------------------------------------------------------------------ */

function CarrierDetailView({
  carrier,
  vettingProgress,
  canApprove,
  canManage,
  saving,
  onApprove,
  onReject,
  onEdit,
}: {
  carrier: CarrierItem;
  vettingProgress: { complete: number; total: number; label: string };
  canApprove: boolean;
  canManage: boolean;
  saving: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
}) {
  const insurance = getInsuranceState(carrier.insuranceExpiresAt);

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold">{carrier.legalName}</span>
              <StatusBadge value={carrier.status} />
            </div>
            {carrier.dba && <div className="text-sm text-muted-foreground">DBA: {carrier.dba}</div>}
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <SummaryStat label="MC" value={carrier.mcNumber || "—"} mono />
            <SummaryStat label="DOT" value={carrier.dotNumber || "—"} mono />
            <SummaryStat
              label="Vetting"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      vettingProgress.complete === vettingProgress.total
                        ? "bg-emerald-500"
                        : vettingProgress.complete === 0
                          ? "bg-red-400"
                          : "bg-amber-500"
                    }`}
                  />
                  {vettingProgress.label}
                </span>
              }
            />
          </div>
        </div>

        {carrier.status !== "approved" && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <ShieldAlert className="size-4 shrink-0" />
            This carrier is not approved and cannot be assigned to loads.
          </div>
        )}
      </div>

      {/* Review actions */}
      {canApprove && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="secondary" onClick={onApprove} disabled={saving}>
            <Check className="size-4" /> Approve
          </Button>
          <Button variant="destructive" onClick={onReject} disabled={saving}>
            Reject
          </Button>
          <Button variant="outline" onClick={onEdit} disabled={!canManage}>
            Edit details
          </Button>
        </div>
      )}

      {/* Company details */}
      <DetailSection icon={<Building2 className="size-4" />} title="Company">
        <DetailGrid>
          <DetailRow label="Company" value={carrier.companyName || "—"} />
          <DetailRow label="Tax ID / EIN" value={carrier.taxId || "—"} mono />
          <DetailRow label="Payment terms" value={carrier.paymentTerms || "—"} />
          <DetailRow
            label="Address"
            value={carrier.address || "—"}
            icon={<MapPin className="size-3.5" />}
            span2
          />
        </DetailGrid>
      </DetailSection>

      {/* Primary contact */}
      <DetailSection icon={<User className="size-4" />} title="Primary contact">
        <DetailGrid>
          <DetailRow label="Name" value={carrier.contactName || "—"} />
          <DetailRow
            label="Email"
            value={carrier.contactEmail || "—"}
            icon={<Mail className="size-3.5" />}
          />
          <DetailRow
            label="Phone"
            value={carrier.contactPhone || "—"}
            icon={<Phone className="size-3.5" />}
          />
        </DetailGrid>
      </DetailSection>

      {/* Equipment & coverage */}
      <DetailSection icon={<Truck className="size-4" />} title="Equipment & coverage">
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Equipment types
            </div>
            {carrier.equipmentTypes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {carrier.equipmentTypes.map((type) => (
                  <Pill key={type}>{type}</Pill>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            )}
          </div>
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Service areas
            </div>
            {carrier.serviceAreas.length > 0 ? (
              <div className="space-y-1 text-sm">
                {carrier.serviceAreas.map((area, index) => (
                  <div
                    key={index}
                    className="rounded-md border border-border bg-background px-2.5 py-1.5"
                  >
                    {typeof area === "string" ? area : `${area.region}: ${area.states.join(", ")}`}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            )}
          </div>
        </div>
      </DetailSection>

      {/* Insurance */}
      <DetailSection icon={<ShieldCheck className="size-4" />} title="Insurance">
        <DetailGrid>
          <DetailRow label="Carrier" value={carrier.insuranceCarrier || "—"} />
          <DetailRow label="Policy #" value={carrier.insurancePolicyNumber || "—"} mono />
          <DetailRow label="Certificate / ID" value={carrier.insuranceCertificateId || "—"} mono />
          <DetailRow
            label="Expires"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                {insurance.label}
                {insurance.state !== "ok" && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      insurance.state === "expired"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {insurance.state === "expired" ? "Expired" : "Expiring soon"}
                  </span>
                )}
              </span>
            }
            mono
          />
        </DetailGrid>

        {carrier.insuredVehicleVINs.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Insured vehicle VINs ({carrier.insuredVehicleVINs.length})
            </div>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <tbody>
                  {carrier.insuredVehicleVINs.map((vin, index) => (
                    <tr key={vin} className={index % 2 === 0 ? "bg-background" : "bg-card/60"}>
                      <td className="px-3 py-1.5 font-mono text-xs">{vin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DetailSection>

      {/* Vetting checks */}
      <DetailSection icon={<ClipboardCheck className="size-4" />} title="Vetting checks">
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <tbody>
              {(Object.keys(VETTING_CHECK_LABELS) as Array<keyof CarrierItem["vettingChecks"]>).map(
                (key, index) => {
                  const passed = carrier.vettingChecks[key];
                  return (
                    <tr
                      key={key}
                      className={`border-b border-border last:border-b-0 ${
                        index % 2 === 0 ? "bg-background" : "bg-card/60"
                      }`}
                    >
                      <td className="px-3 py-2">{VETTING_CHECK_LABELS[key]}</td>
                      <td className="px-3 py-2 text-right">
                        {passed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="size-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <XCircle className="size-3.5" /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </DetailSection>

      {/* Notes */}
      <DetailSection icon={<FileText className="size-4" />} title="Notes">
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {carrier.notes || "No notes recorded."}
        </p>
      </DetailSection>

      {/* Review history */}
      <DetailSection icon={<History className="size-4" />} title="Review history">
        {carrier.reviewHistory.length === 0 ? (
          <div className="text-sm text-muted-foreground">No review history yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Reviewer</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Comments</th>
                </tr>
              </thead>
              <tbody>
                {carrier.reviewHistory.map((entry, index) => (
                  <tr
                    key={`${entry.reviewerId}-${index}`}
                    className={`border-b border-border last:border-b-0 align-top ${
                      index % 2 === 0 ? "bg-background" : "bg-card/60"
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {new Date(entry.reviewDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 font-medium">{entry.reviewerName}</td>
                    <td className="px-3 py-2">
                      <StatusBadge value={entry.status} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {entry.comments || "No comments provided."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailSection>
    </div>
  );
}

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
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

function DetailGrid({ children }: { children: React.ReactNode }) {
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
  value: React.ReactNode;
  mono?: boolean;
  span2?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={span2 ? "sm:col-span-2" : undefined}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 flex items-start gap-1.5 ${mono ? "font-mono text-xs" : "text-sm"}`}>
        {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
        <span>{value}</span>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>{value}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium">
      {children}
    </span>
  );
}

function getInsuranceState(expiresAt: string | null): {
  label: string;
  state: "ok" | "soon" | "expired";
} {
  if (!expiresAt) return { label: "—", state: "ok" };
  const expiry = new Date(expiresAt);
  const label = expiry.toLocaleDateString();
  const daysUntil = Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return { label, state: "expired" };
  if (daysUntil <= 30) return { label, state: "soon" };
  return { label, state: "ok" };
}

/* ------------------------------------------------------------------ */
/* Shared form field + VIN input                                       */
/* ------------------------------------------------------------------ */

function Field({
  label,
  value,
  mono,
  className,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children ?? <div className={`mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value}</div>}
    </div>
  );
}

function formatServiceAreas(areas: Array<string | { region: string; states: string[] }>) {
  return areas
    .map((area) => (typeof area === "string" ? area : `${area.region}: ${area.states.join(", ")}`))
    .join("; ");
}

function getVINPayload(values: string[], draft: string) {
  const trimmedDraft = draft.trim().toUpperCase();
  return trimmedDraft ? [...values, trimmedDraft] : values;
}

function VINInput({
  values,
  draft,
  onDraftChange,
  onChange,
}: {
  values: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onChange: (values: string[]) => void;
}) {
  const addVIN = () => {
    const vin = draft.trim().toUpperCase();
    if (!vin) return;
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      toast.error("VINs must be 17 characters and exclude I, O, and Q");
      return;
    }
    if (values.includes(vin)) {
      toast.error("That VIN is already listed");
      return;
    }
    onChange([...values, vin]);
    onDraftChange("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          maxLength={17}
          onChange={(event) => onDraftChange(event.target.value.toUpperCase())}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addVIN();
            }
          }}
          placeholder="Enter 17-character VIN"
          className="font-mono"
        />
        <Button type="button" variant="outline" onClick={addVIN}>
          <Plus className="size-4" /> Add VIN
        </Button>
      </div>
      {values.length > 0 && (
        <div className="space-y-1">
          {values.map((vin) => (
            <div
              key={vin}
              className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-xs"
            >
              <span>{vin}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onChange(values.filter((item) => item !== vin))}
                aria-label={`Remove VIN ${vin}`}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

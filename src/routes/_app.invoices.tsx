// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal, flushSync } from "react-dom";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { usd, fmtDate } from "@/lib/format";
import {
  Plus,
  Edit,
  Trash2,
  Printer,
  Receipt,
  User,
  Download,
  CalendarDays,
  Percent,
  StickyNote,
  Loader2,
  Inbox,
  Send,
  CreditCard,
  Truck,
  MoreHorizontal,
  Copy,
  Eye,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  Search,
  FileText,
  Mail,
  CircleDot,
  CheckCircle2,
  Ban,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { exportRowsToFile, formatExportFilename } from "@/lib/export";

export const Route = createFileRoute("/_app/invoices")({
  component: InvoicesPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type Payment = {
  _id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
};

type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type Invoice = {
  _id: string;
  invoiceNumber: string;
  customerId: string;
  loadIds?: string[];
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerBillingContact?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
  invoiceDate: string;
  dueDate: string;
  paidAt?: string;
  paymentTerms?: string;
  referenceNumber?: string;
  currency?: string;
  notes?: string;
  internalNotes?: string;
  payments: Payment[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type Load = {
  id: string;
  loadNumber: string;
  customerName: string;
  customerId: string;
  pickupCompany?: string;
  deliveryCompany?: string;
  commodity?: string;
  revenue: number;
  deliveryDate?: string;
  status: string;
};

type Customer = {
  _id: string;
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_paid", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_30", label: "Last 30 Days" },
  { value: "last_90", label: "Last 90 Days" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
] as const;

const ITEM_PRESETS = [
  { label: "Line Haul", description: "Line Haul" },
  { label: "Fuel Surcharge", description: "Fuel Surcharge" },
  { label: "Accessorial", description: "Accessorial Charge" },
  { label: "Detention", description: "Detention" },
  { label: "Storage", description: "Storage Fee" },
  { label: "Lumper", description: "Lumper Fee" },
] as const;

const PAYMENT_METHODS = [
  "Check",
  "ACH",
  "Wire Transfer",
  "Credit Card",
  "Cash",
  "Zelle",
  "Other",
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

function InvoicesPage() {
  const { session } = useAuth();

  // Data state
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // UI state
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [createMode, setCreateMode] = useState<"manual" | "load">("manual");
  const [selectedLoads, setSelectedLoads] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");

  // Forms
  const [newCustomerForm, setNewCustomerForm] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  const [form, setForm] = useState({
    invoiceNumber: "",
    customerId: "",
    loadIds: [] as string[],
    items: [{ description: "", quantity: 1, unitPrice: 0 }],
    discount: 0,
    taxRate: 0,
    status: "draft" as const,
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    paymentTerms: "Net 30",
    referenceNumber: "",
    notes: "",
    internalNotes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: 0,
    paymentMethod: "",
    referenceNumber: "",
    notes: "",
  });

  // ─── Computed Values ─────────────────────────────────────────────────────

  const totals = useMemo(() => {
    const subtotal = form.items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
      0,
    );
    const afterDiscount = Math.max(0, subtotal - form.discount);
    const taxAmount = afterDiscount * (form.taxRate / 100);
    const total = afterDiscount + taxAmount;
    return { subtotal, afterDiscount, taxAmount, total };
  }, [form]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: invoices.length };
    for (const inv of invoices) {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    }
    return counts;
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    return invoices.filter((invoice) => {
      // Search
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        invoice.invoiceNumber.toLowerCase().includes(q) ||
        invoice.customerName.toLowerCase().includes(q) ||
        (invoice.referenceNumber || "").toLowerCase().includes(q);

      // Status
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;

      // Customer
      const matchesCustomer = customerFilter === "all" || invoice.customerId === customerFilter;

      // Date range
      let matchesDate = true;
      if (dateRange !== "all") {
        const invDate = new Date(invoice.invoiceDate);
        switch (dateRange) {
          case "this_month":
            matchesDate =
              invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
            break;
          case "last_month": {
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            matchesDate =
              invDate.getMonth() === lm.getMonth() && invDate.getFullYear() === lm.getFullYear();
            break;
          }
          case "last_30":
            matchesDate = invDate >= new Date(now.getTime() - 30 * 86400000);
            break;
          case "last_90":
            matchesDate = invDate >= new Date(now.getTime() - 90 * 86400000);
            break;
          case "this_quarter": {
            const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            matchesDate = invDate >= qStart;
            break;
          }
          case "this_year":
            matchesDate = invDate.getFullYear() === now.getFullYear();
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesCustomer && matchesDate;
    });
  }, [invoices, searchTerm, statusFilter, dateRange, customerFilter]);

  const kpis = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, i) => sum + i.total, 0);
    const totalPaid = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
    const totalOutstanding = invoices.reduce((sum, i) => sum + i.balanceDue, 0);
    const overdueCount = invoices.filter((i) => i.status === "overdue").length;
    const overdueAmount = invoices
      .filter((i) => i.status === "overdue")
      .reduce((sum, i) => sum + i.balanceDue, 0);
    const now = new Date();
    const thisMonthInvoices = invoices.filter(
      (i) =>
        new Date(i.invoiceDate).getMonth() === now.getMonth() &&
        new Date(i.invoiceDate).getFullYear() === now.getFullYear(),
    );
    const thisMonthRevenue = thisMonthInvoices.reduce((sum, i) => sum + i.total, 0);
    const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalPaid,
      totalOutstanding,
      overdueCount,
      overdueAmount,
      thisMonthRevenue,
      thisMonthCount: thisMonthInvoices.length,
      collectionRate,
    };
  }, [invoices]);

  // ─── Data Loading ────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invoiceRes, loadsRes] = await Promise.all([
        apiFetch<{
          invoices: Invoice[];
          customers: Customer[];
          users: any[];
        }>("/api/invoices", { method: "GET" }),
        apiFetch<{
          loads: Load[];
          customers: any[];
          carriers: any[];
        }>("/api/loads", { method: "GET" }),
      ]);
      setInvoices(invoiceRes.data.invoices);
      setCustomers(invoiceRes.data.customers);
      setUsers(invoiceRes.data.users);
      setLoads(loadsRes.data.loads);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const clearPrintInvoice = () => setPrintInvoice(null);
    window.addEventListener("afterprint", clearPrintInvoice);
    return () => window.removeEventListener("afterprint", clearPrintInvoice);
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getNextInvoiceNumber = () => {
    const highest = invoices.reduce((max, inv) => {
      const match = inv.invoiceNumber.match(/(\d+)$/);
      const n = match ? parseInt(match[1], 10) : 0;
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return `INV-${String(highest + 1).padStart(6, "0")}`;
  };

  const getDefaultDueDate = (terms?: string) => {
    const days = terms?.match(/Net\s*(\d+)/i)?.[1];
    const offset = days ? parseInt(days, 10) : 30;
    return new Date(Date.now() + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  };

  // ─── Create / Edit / Delete ──────────────────────────────────────────────

  const openCreate = () => {
    setForm({
      invoiceNumber: getNextInvoiceNumber(),
      customerId: "",
      loadIds: [],
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
      discount: 0,
      taxRate: 0,
      status: "draft",
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: getDefaultDueDate("Net 30"),
      paymentTerms: "Net 30",
      referenceNumber: "",
      notes: "",
      internalNotes: "",
    });
    setSelectedLoads([]);
    setCreateMode("manual");
    setShowCreate(true);
  };

  const handleCustomerSelect = (customerId: string) => {
    setForm({ ...form, customerId });
  };

  const handlePaymentTermsChange = (terms: string) => {
    setForm({
      ...form,
      paymentTerms: terms,
      dueDate: getDefaultDueDate(terms),
    });
  };

  const handleLoadSelect = (loadId: string) => {
    const newSelectedLoads = selectedLoads.includes(loadId)
      ? selectedLoads.filter((id) => id !== loadId)
      : [...selectedLoads, loadId];
    setSelectedLoads(newSelectedLoads);

    const selectedLoadObjs = loads.filter((l) => newSelectedLoads.includes(l.id));
    const newItems = selectedLoadObjs.map((load) => ({
      description: `Load ${load.loadNumber}: ${load.commodity || "Freight"}`,
      quantity: 1,
      unitPrice: load.revenue,
    }));
    setForm({
      ...form,
      loadIds: newSelectedLoads,
      items: newItems.length > 0 ? newItems : [{ description: "", quantity: 1, unitPrice: 0 }],
    });
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerForm.companyName || !newCustomerForm.contactName) {
      toast.error("Company name and contact name are required");
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch<{
        customer: {
          id: string;
          company: string;
          contact: string;
          email: string;
          phone: string;
        };
      }>("/api/customers", {
        method: "POST",
        body: JSON.stringify(newCustomerForm),
      });
      toast.success("Customer created");
      setShowNewCustomer(false);
      const newCustomer = {
        _id: response.data.customer.id,
        companyName: response.data.customer.company,
        contactName: response.data.customer.contact,
        contactEmail: response.data.customer.email,
        contactPhone: response.data.customer.phone,
      };
      setCustomers((prev) => [...prev, newCustomer]);
      setForm((prev) => ({ ...prev, customerId: newCustomer._id }));
      setNewCustomerForm({
        companyName: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create customer");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!form.customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (form.items.every((i) => !i.description)) {
      toast.error("Please add at least one line item");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/invoices", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Invoice created successfully");
      setShowCreate(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setForm({
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      loadIds: invoice.loadIds || [],
      items: invoice.items,
      discount: invoice.discount,
      taxRate: invoice.taxRate,
      status: invoice.status,
      invoiceDate: invoice.invoiceDate.slice(0, 10),
      dueDate: invoice.dueDate.slice(0, 10),
      paymentTerms: invoice.paymentTerms || "",
      referenceNumber: invoice.referenceNumber || "",
      notes: invoice.notes || "",
      internalNotes: invoice.internalNotes || "",
    });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!selectedInvoice) return;
    setSaving(true);
    try {
      await apiFetch("/api/invoices", {
        method: "PATCH",
        body: JSON.stringify({ invoiceId: selectedInvoice._id, ...form }),
      });
      toast.success("Invoice updated");
      setShowEdit(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (invoiceId: string) => {
    try {
      await apiFetch("/api/invoices", {
        method: "DELETE",
        body: JSON.stringify({ invoiceId }),
      });
      toast.success("Invoice deleted");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete invoice");
    }
  };

  const handleDuplicate = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setForm({
      invoiceNumber: getNextInvoiceNumber(),
      customerId: invoice.customerId,
      loadIds: invoice.loadIds || [],
      items: invoice.items.map((i) => ({ ...i })),
      discount: invoice.discount,
      taxRate: invoice.taxRate,
      status: "draft",
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: getDefaultDueDate(invoice.paymentTerms),
      paymentTerms: invoice.paymentTerms || "",
      referenceNumber: "",
      notes: invoice.notes || "",
      internalNotes: invoice.internalNotes || "",
    });
    setShowCreate(true);
    toast.info("Invoice duplicated — edit and save as new");
  };

  // ─── Payments ────────────────────────────────────────────────────────────

  const openPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      paymentDate: new Date().toISOString().slice(0, 10),
      amount: invoice.balanceDue,
      paymentMethod: "",
      referenceNumber: "",
      notes: "",
    });
    setShowPayment(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    if (!paymentForm.paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }
    if (paymentForm.amount <= 0) {
      toast.error("Payment amount must be greater than zero");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/invoices", {
        method: "PATCH",
        body: JSON.stringify({
          invoiceId: selectedInvoice._id,
          action: "add_payment",
          ...paymentForm,
        }),
      });
      toast.success("Payment recorded");
      setShowPayment(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  // ─── View / Print / Send ─────────────────────────────────────────────────

  const openView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowView(true);
  };

  const handlePrint = (invoice: Invoice) => {
    flushSync(() => setPrintInvoice(invoice));
    window.print();
  };

  const handleSend = (invoice: Invoice) => {
    const subject = `Invoice ${invoice.invoiceNumber}`;
    const bodyLines = [
      invoice.customerBillingContact ? `Dear ${invoice.customerBillingContact},` : "Hi,",
      "",
      `Please find below the details for invoice ${invoice.invoiceNumber}.`,
      "",
      `Total: ${usd(invoice.total)}`,
      `Due Date: ${fmtDate(invoice.dueDate)}`,
      invoice.balanceDue > 0 ? `Balance Due: ${usd(invoice.balanceDue)}` : "Status: Paid in Full",
      "",
      "Please remit payment at your earliest convenience.",
      "",
      "Thank you for your business.",
    ];
    const mailto = `mailto:${encodeURIComponent(
      invoice.customerEmail || "",
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    window.location.href = mailto;
  };

  // ─── Export ──────────────────────────────────────────────────────────────

  function exportInvoices(format: "csv" | "xlsx") {
    const rows = filteredInvoices.length > 0 ? filteredInvoices : invoices;
    const exported = exportRowsToFile(
      rows,
      [
        { label: "Invoice #", getValue: (i) => i.invoiceNumber },
        { label: "Customer", getValue: (i) => i.customerName },
        { label: "Status", getValue: (i) => i.status },
        {
          label: "Invoice Date",
          getValue: (i) => (i.invoiceDate ? fmtDate(i.invoiceDate) : ""),
        },
        {
          label: "Due Date",
          getValue: (i) => (i.dueDate ? fmtDate(i.dueDate) : ""),
        },
        { label: "Total", getValue: (i) => i.total },
        { label: "Amount Paid", getValue: (i) => i.amountPaid },
        { label: "Balance Due", getValue: (i) => i.balanceDue },
        {
          label: "Payment Terms",
          getValue: (i) => i.paymentTerms || "",
        },
        { label: "Reference #", getValue: (i) => i.referenceNumber || "" },
      ],
      formatExportFilename("invoices", format),
      format,
      "Invoices",
    );
    if (exported) toast.success(`Exported ${rows.length} invoices`);
  }

  // ─── Line Item Handlers ──────────────────────────────────────────────────

  const addItem = (description = "", unitPrice = 0) => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { description, quantity: 1, unitPrice }],
    }));
  };

  const removeItem = (index: number) => {
    if (form.items.length === 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  // ─── Render: KPI Cards ───────────────────────────────────────────────────

  const renderKpiCards = () => (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Total Revenue */}
      <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-muted/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="size-4 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">All time</span>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums">
            {usd(kpis.totalRevenue)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{invoices.length} total invoices</p>
        </CardContent>
      </Card>

      {/* Outstanding */}
      <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-muted/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
              <DollarSign className="size-4 text-amber-600" />
            </div>
            {kpis.collectionRate < 100 && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                {kpis.collectionRate.toFixed(0)}% collected
              </span>
            )}
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-amber-600">
            {usd(kpis.totalOutstanding)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Outstanding balance</p>
        </CardContent>
      </Card>

      {/* This Month */}
      <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-muted/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
              <CalendarDays className="size-4 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {kpis.thisMonthCount} invoices
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums">
            {usd(kpis.thisMonthRevenue)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">This month's revenue</p>
        </CardContent>
      </Card>

      {/* Overdue */}
      <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-muted/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-lg bg-red-500/10">
              <AlertTriangle className="size-4 text-red-600" />
            </div>
            {kpis.overdueCount > 0 && (
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                {usd(kpis.overdueAmount)}
              </span>
            )}
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-red-600">
            {kpis.overdueCount}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Overdue invoice{kpis.overdueCount !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Render: Filters ─────────────────────────────────────────────────────

  const renderFilters = () => (
    <div className="space-y-3">
      {/* Status pill filters */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((opt) => {
          const count = statusCounts[opt.value] || 0;
          const isActive = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {opt.label}
              <span
                className={`tabular-nums ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                } rounded-full px-1.5 py-0.5 text-[10px] font-semibold`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + dropdowns row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, customer, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <CalendarDays className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <User className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // ─── Render: Table Actions Dropdown ──────────────────────────────────────

  const InvoiceActions = ({ invoice }: { invoice: Invoice }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            openView(invoice);
          }}
        >
          <Eye className="mr-2 size-4" /> View Details
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            openEdit(invoice);
          }}
        >
          <Edit className="mr-2 size-4" /> Edit Invoice
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            openPayment(invoice);
          }}
          disabled={invoice.status === "paid" || invoice.status === "cancelled"}
        >
          <CreditCard className="mr-2 size-4" /> Record Payment
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            handlePrint(invoice);
          }}
        >
          <Printer className="mr-2 size-4" /> Print
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleSend(invoice);
          }}
          disabled={!invoice.customerEmail}
        >
          <Mail className="mr-2 size-4" /> Send via Email
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleDuplicate(invoice);
          }}
        >
          <Copy className="mr-2 size-4" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onSelect={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold">{invoice.invoiceNumber}</span> for{" "}
                {invoice.customerName}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => handleDelete(invoice._id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ─── Render: Data Table ──────────────────────────────────────────────────

  const renderTable = () => (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <DataTable
        rows={filteredInvoices}
        columns={[
          {
            head: "Invoice",
            cell: (inv) => (
              <div onClick={() => openView(inv)} className="cursor-pointer">
                <div className="font-semibold">{inv.invoiceNumber}</div>
                {inv.referenceNumber && (
                  <div className="text-xs text-muted-foreground">Ref: {inv.referenceNumber}</div>
                )}
              </div>
            ),
          },
          {
            head: "Customer",
            cell: (inv) => (
              <div onClick={() => openView(inv)} className="cursor-pointer">
                <div className="font-medium">{inv.customerName}</div>
                {inv.customerBillingContact && (
                  <div className="text-xs text-muted-foreground">{inv.customerBillingContact}</div>
                )}
              </div>
            ),
          },
          {
            head: "Status",
            cell: (inv) => (
              <div onClick={() => openView(inv)} className="cursor-pointer">
                <StatusBadge value={inv.status} />
              </div>
            ),
          },
          {
            head: "Invoice Date",
            cell: (inv) => (
              <div
                onClick={() => openView(inv)}
                className="cursor-pointer text-sm text-muted-foreground"
              >
                {fmtDate(inv.invoiceDate)}
              </div>
            ),
          },
          {
            head: "Due Date",
            cell: (inv) => {
              const isOverdue =
                inv.status !== "paid" &&
                inv.status !== "cancelled" &&
                new Date(inv.dueDate) < new Date();
              return (
                <div
                  onClick={() => openView(inv)}
                  className={`cursor-pointer text-sm ${
                    isOverdue ? "font-medium text-red-600" : "text-muted-foreground"
                  }`}
                >
                  {fmtDate(inv.dueDate)}
                </div>
              );
            },
          },
          {
            head: "Total",
            cell: (inv) => (
              <div
                onClick={() => openView(inv)}
                className="cursor-pointer text-right font-semibold tabular-nums"
              >
                {usd(inv.total)}
              </div>
            ),
          },
          {
            head: "Balance Due",
            cell: (inv) => (
              <div
                onClick={() => openView(inv)}
                className={`cursor-pointer text-right tabular-nums font-medium ${
                  inv.balanceDue > 0 ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {usd(inv.balanceDue)}
              </div>
            ),
          },
          {
            head: "",
            cell: (inv) => <InvoiceActions invoice={inv} />,
          },
        ]}
      />
    </div>
  );

  // ─── Render: Invoice Form (shared by create & edit) ──────────────────────

  const renderFormSections = () => (
    <div className="space-y-5">
      {/* ── Invoice Details ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <FileText className="size-3.5" />
          Invoice Details
        </div>
        <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Invoice Number</Label>
            <Input
              value={form.invoiceNumber}
              onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Invoice Date</Label>
            <Input
              type="date"
              value={form.invoiceDate}
              onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Due Date</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ── Customer ────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <User className="size-3.5" />
          Customer
        </div>
        <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-xs">Customer *</Label>
            <div className="flex gap-1.5">
              <Select value={form.customerId} onValueChange={handleCustomerSelect}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => setShowNewCustomer(true)}
                title="Add new customer"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Payment Terms</Label>
            <Select value={form.paymentTerms} onValueChange={handlePaymentTermsChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select terms" />
              </SelectTrigger>
              <SelectContent>
                {["Net 15", "Net 30", "Net 45", "Net 60", "Due on Receipt", "COD"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reference #</Label>
            <Input
              value={form.referenceNumber}
              onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
              placeholder="PO # or ref"
            />
          </div>
        </div>
      </div>

      {/* ── Line Items ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Receipt className="size-3.5" />
            Line Items
          </div>
          <div className="flex items-center gap-2">
            {/* Quick-add presets */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Plus className="mr-1 size-3" /> Quick Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {ITEM_PRESETS.map((preset) => (
                  <DropdownMenuItem key={preset.label} onClick={() => addItem(preset.description)}>
                    {preset.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addItem()}>
              <Plus className="mr-1 size-3" /> Blank
            </Button>
          </div>
        </div>

        {/* Header row */}
        <div className="hidden gap-3 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[1fr_72px_96px_96px_32px]">
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Unit Price</span>
          <span className="text-right">Total</span>
          <span />
        </div>

        <div className="space-y-2">
          {form.items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-2 items-end gap-2 rounded-lg border border-border/60 bg-card p-3 transition-colors hover:border-border sm:grid-cols-[1fr_72px_96px_96px_32px]"
            >
              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-[10px] uppercase text-muted-foreground sm:hidden">
                  Description
                </Label>
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground sm:hidden">Qty</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                  min="1"
                  className="h-8 text-sm tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground sm:hidden">
                  Price
                </Label>
                <Input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="h-8 text-sm tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground sm:hidden">
                  Total
                </Label>
                <div className="flex h-8 items-center text-sm font-medium tabular-nums">
                  {usd(item.quantity * item.unitPrice)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-red-600"
                disabled={form.items.length === 1}
                onClick={() => removeItem(index)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Discount & Tax ──────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Discount ($)</Label>
          <Input
            type="number"
            value={form.discount || ""}
            onChange={(e) =>
              setForm({
                ...form,
                discount: parseFloat(e.target.value) || 0,
              })
            }
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs">
            <Percent className="size-3" /> Tax Rate
          </Label>
          <Input
            type="number"
            value={form.taxRate || ""}
            onChange={(e) =>
              setForm({
                ...form,
                taxRate: parseFloat(e.target.value) || 0,
              })
            }
            min="0"
            max="100"
            step="0.01"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* ── Totals ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <div className="w-full space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-4 sm:w-72">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{usd(totals.subtotal)}</span>
          </div>
          {form.discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount</span>
              <span className="tabular-nums">-{usd(form.discount)}</span>
            </div>
          )}
          {form.taxRate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({form.taxRate}%)</span>
              <span className="tabular-nums">{usd(totals.taxAmount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="tabular-nums">{usd(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* ── Notes ───────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs">
            <StickyNote className="size-3" /> Customer Notes
          </Label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes visible to customer..."
            rows={3}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs">
            <StickyNote className="size-3" /> Internal Notes
          </Label>
          <textarea
            value={form.internalNotes}
            onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
            placeholder="Internal notes only..."
            rows={3}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
    </div>
  );

  const renderCreateForm = () => (
    <div className="space-y-5">
      <Tabs defaultValue={createMode} onValueChange={(v) => setCreateMode(v as "manual" | "load")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Invoice</TabsTrigger>
          <TabsTrigger value="load">From Loads</TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="mt-4">
          {renderFormSections()}
        </TabsContent>
        <TabsContent value="load" className="mt-4">
          <div className="space-y-4">
            {/* Customer */}
            <div className="space-y-1.5">
              <Label className="text-xs">Select Customer *</Label>
              <div className="flex gap-1.5">
                <Select value={form.customerId} onValueChange={handleCustomerSelect}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a customer to see their loads" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setShowNewCustomer(true)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            {/* Load picker */}
            {form.customerId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Truck className="size-3.5" />
                    Available Loads
                  </div>
                  {selectedLoads.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedLoads.length} selected
                    </Badge>
                  )}
                </div>
                <div className="max-h-56 overflow-auto rounded-lg border border-border/60 divide-y">
                  {loads.filter(
                    (l) =>
                      l.customerId === form.customerId &&
                      !["delivered", "invoiced"].includes(l.status),
                  ).length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No uninvoiced loads found for this customer
                    </div>
                  ) : (
                    loads
                      .filter(
                        (l) =>
                          l.customerId === form.customerId &&
                          !["delivered", "invoiced"].includes(l.status),
                      )
                      .map((load) => {
                        const isSelected = selectedLoads.includes(load.id);
                        return (
                          <div
                            key={load.id}
                            className={`flex cursor-pointer items-center gap-3 p-3 transition-colors ${
                              isSelected
                                ? "bg-primary/5 border-l-2 border-l-primary"
                                : "hover:bg-muted/50 border-l-2 border-l-transparent"
                            }`}
                            onClick={() => handleLoadSelect(load.id)}
                          >
                            <div
                              className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/30"
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="size-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{load.loadNumber}</span>
                                <span className="font-semibold text-sm tabular-nums">
                                  {usd(load.revenue)}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {load.pickupCompany} → {load.deliveryCompany}
                                {load.commodity ? ` · ${load.commodity}` : ""}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            )}

            {selectedLoads.length > 0 && renderFormSections()}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  // ─── Render: Invoice View ────────────────────────────────────────────────

  const renderInvoiceView = (invoice: Invoice | null = selectedInvoice) => {
    if (!invoice) return null;
    return (
      <div className="space-y-0">
        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => handlePrint(invoice)}>
            <Printer className="mr-1.5 size-3.5" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSend(invoice)}
            disabled={!invoice.customerEmail}
          >
            <Mail className="mr-1.5 size-3.5" /> Send
          </Button>
          <Button variant="outline" size="sm" onClick={() => openEdit(invoice)}>
            <Edit className="mr-1.5 size-3.5" /> Edit
          </Button>
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <Button
              size="sm"
              onClick={() => {
                setShowView(false);
                openPayment(invoice);
              }}
            >
              <CreditCard className="mr-1.5 size-3.5" /> Record Payment
            </Button>
          )}
        </div>

        {/* Invoice header */}
        <div className="flex items-start justify-between pb-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">INVOICE</h2>
            <p className="mt-1 text-lg font-medium text-muted-foreground">
              {invoice.invoiceNumber}
            </p>
            <div className="mt-2">
              <StatusBadge value={invoice.status} />
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-sm text-muted-foreground">
              Issued:{" "}
              <span className="font-medium text-foreground">{fmtDate(invoice.invoiceDate)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Due: <span className="font-medium text-foreground">{fmtDate(invoice.dueDate)}</span>
            </div>
            {invoice.paymentTerms && (
              <div className="text-sm text-muted-foreground">
                Terms: <span className="font-medium text-foreground">{invoice.paymentTerms}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-6 rounded-lg border border-border/60 bg-muted/20 p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Bill To
          </div>
          <div className="text-lg font-semibold">{invoice.customerName}</div>
          {invoice.customerBillingContact && (
            <div className="text-sm text-muted-foreground">
              Attn: {invoice.customerBillingContact}
            </div>
          )}
          {invoice.customerAddress && (
            <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
              {invoice.customerAddress}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
            {invoice.customerEmail && <span>{invoice.customerEmail}</span>}
            {invoice.customerPhone && <span>{invoice.customerPhone}</span>}
          </div>
        </div>

        {/* Items table */}
        <div className="mb-6 overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <colgroup>
              <col className="w-[45%]" />
              <col className="w-[12%]" />
              <col className="w-[18%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Qty
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unit Price
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {invoice.items.map((item, i) => (
                <tr key={i} className={i % 2 === 1 ? "bg-muted/10" : ""}>
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{usd(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {usd(item.quantity * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-full space-y-1.5 sm:w-72">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{usd(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span>
                <span className="tabular-nums">-{usd(invoice.discount)}</span>
              </div>
            )}
            {invoice.taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({invoice.taxRate}%)</span>
                <span className="tabular-nums">{usd(invoice.taxAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span className="tabular-nums">{usd(invoice.total)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="tabular-nums text-emerald-600">{usd(invoice.amountPaid)}</span>
            </div>
            <div
              className={`flex justify-between text-base font-bold ${
                invoice.balanceDue > 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              <span>Balance Due</span>
              <span className="tabular-nums">{usd(invoice.balanceDue)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-6 rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Notes
            </div>
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</div>
          </div>
        )}

        {/* Payments history */}
        {invoice.payments.length > 0 && (
          <div className="mb-6">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Payment History
            </div>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Method
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Reference
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {invoice.payments.map((p) => (
                    <tr key={p._id}>
                      <td className="px-4 py-2.5">{fmtDate(p.paymentDate)}</td>
                      <td className="px-4 py-2.5">{p.paymentMethod}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {p.referenceNumber || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-emerald-600">
                        {usd(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
          Thank you for your business!
        </div>
      </div>
    );
  };

  // ─── Render: Print-only Invoice ──────────────────────────────────────────

  const renderPrintInvoice = () => {
    if (!printInvoice) return null;
    const inv = printInvoice;
    return createPortal(
      <div
        id="invoice-print-root"
        style={{ display: "none" }}
        className="font-sans text-[11px] leading-relaxed text-gray-900"
      >
        <div className="max-w-[7.5in] mx-auto p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="text-2xl font-bold tracking-tight">INVOICE</div>
              <div className="mt-1 text-sm text-gray-500">{inv.invoiceNumber}</div>
            </div>
            <div className="text-right text-sm">
              <div>
                <span className="text-gray-500">Date: </span>
                {fmtDate(inv.invoiceDate)}
              </div>
              <div>
                <span className="text-gray-500">Due: </span>
                {fmtDate(inv.dueDate)}
              </div>
              {inv.paymentTerms && (
                <div>
                  <span className="text-gray-500">Terms: </span>
                  {inv.paymentTerms}
                </div>
              )}
              {inv.referenceNumber && (
                <div>
                  <span className="text-gray-500">Ref: </span>
                  {inv.referenceNumber}
                </div>
              )}
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-6 rounded border border-gray-200 p-4">
            <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">
              Bill To
            </div>
            <div className="text-base font-bold">{inv.customerName}</div>
            {inv.customerBillingContact && (
              <div className="text-gray-600">Attn: {inv.customerBillingContact}</div>
            )}
            {inv.customerAddress && (
              <div className="mt-0.5 whitespace-pre-wrap text-gray-600">{inv.customerAddress}</div>
            )}
            <div className="mt-1 text-gray-600">
              {[inv.customerEmail, inv.customerPhone].filter(Boolean).join(" · ")}
            </div>
          </div>

          {/* Items */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="pb-2 text-left text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  Description
                </th>
                <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  Qty
                </th>
                <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  Unit Price
                </th>
                <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{usd(item.unitPrice)}</td>
                  <td className="py-2 text-right font-medium tabular-nums">
                    {usd(item.quantity * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-56">
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Subtotal</span>
                <span className="tabular-nums">{usd(inv.subtotal)}</span>
              </div>
              {inv.discount > 0 && (
                <div className="flex justify-between py-1 text-gray-700">
                  <span>Discount</span>
                  <span className="tabular-nums">-{usd(inv.discount)}</span>
                </div>
              )}
              {inv.taxRate > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Tax ({inv.taxRate}%)</span>
                  <span className="tabular-nums">{usd(inv.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-gray-300 pt-2 text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums">{usd(inv.total)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                <span className="text-gray-500">Paid</span>
                <span className="tabular-nums">{usd(inv.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900">
                <span>Balance Due</span>
                <span className="tabular-nums">{usd(inv.balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {inv.notes && (
            <div className="mb-6 rounded border border-gray-200 p-3 text-gray-600">
              <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">
                Notes
              </div>
              <div className="whitespace-pre-wrap">{inv.notes}</div>
            </div>
          )}

          {/* Payments */}
          {inv.payments.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">
                Payments Received
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-1 text-left text-[9px] font-bold uppercase text-gray-500">
                      Date
                    </th>
                    <th className="pb-1 text-left text-[9px] font-bold uppercase text-gray-500">
                      Method
                    </th>
                    <th className="pb-1 text-left text-[9px] font-bold uppercase text-gray-500">
                      Reference
                    </th>
                    <th className="pb-1 text-right text-[9px] font-bold uppercase text-gray-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inv.payments.map((p) => (
                    <tr key={p._id} className="border-b border-gray-100">
                      <td className="py-1.5">{fmtDate(p.paymentDate)}</td>
                      <td className="py-1.5">{p.paymentMethod}</td>
                      <td className="py-1.5 text-gray-500">{p.referenceNumber || "—"}</td>
                      <td className="py-1.5 text-right font-medium tabular-nums">
                        {usd(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-4 text-center text-[10px] text-gray-400">
            Thank you for your business!
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 print:hidden">
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#invoice-print-root) { display: none !important; }
          #invoice-print-root { display: block !important; }
          #invoice-print-root, #invoice-print-root * { visibility: visible !important; color-adjust: exact; -webkit-print-color-adjust: exact; }
          @page { size: letter; margin: 0.4in; }
        }
      `}</style>

      {/* Print portal */}
      {renderPrintInvoice()}

      {/* Page header */}
      <PageHeader
        title="Invoices"
        description="Create, manage, and track all your invoices"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-1.5 size-3.5" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportInvoices("csv")}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportInvoices("xlsx")}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" /> New Invoice
            </Button>
          </div>
        }
      />

      {/* KPI cards */}
      {!loading && renderKpiCards()}

      {/* Filters */}
      {renderFilters()}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-card p-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading invoices…</span>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-card p-16">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/50">
            <Inbox className="size-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">
              {invoices.length === 0 ? "No invoices yet" : "No matching invoices"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {invoices.length === 0
                ? "Create your first invoice to start billing customers"
                : "Try adjusting your search or filters"}
            </p>
          </div>
          {invoices.length === 0 && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" /> New Invoice
            </Button>
          )}
        </div>
      ) : (
        renderTable()
      )}

      {/* ── Create Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          {renderCreateForm()}
          <DialogFooter className="pt-4 border-t border-border/60">
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Invoice — {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {renderFormSections()}
          <DialogFooter className="pt-4 border-t border-border/60">
            <Button variant="outline" onClick={() => setShowEdit(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showView} onOpenChange={setShowView}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {renderInvoiceView()}
        </DialogContent>
      </Dialog>

      {/* ── Payment Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedInvoice?.invoiceNumber} — Balance Due:{" "}
              <span className="font-semibold text-red-600">
                {selectedInvoice && usd(selectedInvoice.balanceDue)}
              </span>
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Date</Label>
              <Input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    paymentDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Method *</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount *</Label>
              <Input
                type="number"
                value={paymentForm.amount || ""}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                min="0.01"
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reference #</Label>
              <Input
                value={paymentForm.referenceNumber}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    referenceNumber: e.target.value,
                  })
                }
                placeholder="Check #, transaction ID, etc."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={2}
                placeholder="Optional payment notes..."
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-border/60">
            <Button variant="outline" onClick={() => setShowPayment(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              <CreditCard className="mr-1.5 size-4" /> Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Customer Dialog ────────────────────────────────────────── */}
      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Company Name *</Label>
              <Input
                value={newCustomerForm.companyName}
                onChange={(e) =>
                  setNewCustomerForm({
                    ...newCustomerForm,
                    companyName: e.target.value,
                  })
                }
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contact Name *</Label>
              <Input
                value={newCustomerForm.contactName}
                onChange={(e) =>
                  setNewCustomerForm({
                    ...newCustomerForm,
                    contactName: e.target.value,
                  })
                }
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={newCustomerForm.contactEmail}
                onChange={(e) =>
                  setNewCustomerForm({
                    ...newCustomerForm,
                    contactEmail: e.target.value,
                  })
                }
                placeholder="john@acme.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                value={newCustomerForm.contactPhone}
                onChange={(e) =>
                  setNewCustomerForm({
                    ...newCustomerForm,
                    contactPhone: e.target.value,
                  })
                }
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-border/60">
            <Button variant="outline" onClick={() => setShowNewCustomer(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

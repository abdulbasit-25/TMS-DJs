// Requires: npm install jspdf
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import jsPDF from "jspdf";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePortalSettings } from "@/hooks/use-portal-settings";
import { FileDown, Plus, Trash2, ReceiptText, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_app/customer-invoice")({
  component: CustomerInvoicePage,
});

// ---------- Types ----------

interface LoadRow {
  id: string;
  loadNo: string;
  pickup: string;
  delivery: string;
  origin: string;
  destination: string;
  description: string;
  amount: string;
}

function emptyRow(): LoadRow {
  return {
    id: crypto.randomUUID(),
    loadNo: "",
    pickup: "",
    delivery: "",
    origin: "",
    destination: "",
    description: "",
    amount: "",
  };
}

const COMPANY = {
  address: "1209 N Saginaw Blvd., Suite G-194, Saginaw, TX 76179",
  contact: "(682) 552-3169 | info@company.com | company.com",
  mcDot: "FMCSA PROPERTY BROKER | MC 1551655 | USDOT 4079462",
};

function nextInvoiceNumber() {
  const key = "invoice-next-seq";
  const seq = Number(localStorage.getItem(key) ?? "1");
  localStorage.setItem(key, String(seq + 1));
  return `INV-${String(seq).padStart(3, "0")}`;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

const sectionClass = "rounded-xl border border-slate-200 bg-card text-card-foreground shadow-sm";

// ---------- Component ----------

function CustomerInvoicePage() {
  const { companyName } = usePortalSettings();
  const companyDisplayName = companyName?.trim() || "TMS Freight Portal";
  const [invoiceNo, setInvoiceNo] = useState(() => nextInvoiceNumber());
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");

  const [customerCompany, setCustomerCompany] = useState("");
  const [apContact, setApContact] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [poReference, setPoReference] = useState("");

  const [factoringCompany, setFactoringCompany] = useState("");

  const [loads, setLoads] = useState<LoadRow[]>([emptyRow()]);

  const [approvedAccessorials, setApprovedAccessorials] = useState("0");
  const [creditsAdjustments, setCreditsAdjustments] = useState("0");

  const [notes, setNotes] = useState("");

  const [docs, setDocs] = useState({
    rateConfirmation: false,
    signedBOL: false,
    pod: false,
    accessorialReceipts: false,
    other: false,
  });
  const [otherDocText, setOtherDocText] = useState("");

  const [preparedBy, setPreparedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [internalStatus, setInternalStatus] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const subtotal = useMemo(
    () => loads.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0),
    [loads],
  );
  const total = useMemo(
    () =>
      subtotal + (parseFloat(approvedAccessorials) || 0) + (parseFloat(creditsAdjustments) || 0),
    [subtotal, approvedAccessorials, creditsAdjustments],
  );

  function updateRow(id: string, field: keyof LoadRow, value: string) {
    setLoads((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setErrors((prev) => ({ ...prev, loads: "" }));
  }
  function addRow() {
    setLoads((rows) => [...rows, emptyRow()]);
  }
  function removeRow(id: string) {
    setLoads((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!customerCompany.trim()) next.customerCompany = "Customer / Company is required.";
    if (!invoiceNo.trim()) next.invoiceNo = "Invoice No. is required.";
    if (!loads.some((r) => (parseFloat(r.amount) || 0) > 0)) {
      next.loads = "At least one load row needs an amount greater than $0.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function generatePDF() {
    if (!validate()) return;

    const NAVY: [number, number, number] = [21, 38, 61];
    const GOLD: [number, number, number] = [173, 138, 84];
    const BORDER: [number, number, number] = [214, 219, 226];
    const TEXT: [number, number, number] = [26, 32, 40];
    const MUTED: [number, number, number] = [110, 118, 128];

    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;
    const footerTop = pageHeight - 34;
    let y = 0;

    const drawHeader = (pageNumber: number, title: string) => {
      doc.setFillColor(...NAVY);
      doc.roundedRect(margin, 24, 70, 34, 4, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("BROKER", margin + 13, 46);

      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(companyDisplayName, margin + 94, 39);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(COMPANY.address, margin + 94, 51);
      doc.text(COMPANY.contact, margin + 94, 63);

      doc.setDrawColor(...GOLD);
      doc.setLineWidth(1);
      doc.line(margin, 70, pageWidth - margin, 70);

      doc.setTextColor(20, 40, 58);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.text(title, margin, 90);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.3);
      doc.text(invoiceNo, pageWidth - margin, 90, { align: "right" });
      doc.setFontSize(8.1);
      doc.text(`Page ${pageNumber}`, pageWidth - margin, 102, { align: "right" });

      y = 112;
    };

    const drawFooter = () => {
      doc.setTextColor(38, 50, 62);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.text(COMPANY.mcDot, margin, pageHeight - 18);
      doc.text(
        "CONTROLLED TEMPLATE | Verify current revision",
        pageWidth - margin,
        pageHeight - 18,
        { align: "right" },
      );
    };

    const sectionHeader = (title: string) => {
      doc.setFillColor(...NAVY);
      doc.rect(margin, y, contentWidth, 18, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(title.toUpperCase(), margin + 6, y + 12);
      y += 22;
    };

    const fieldBox = (
      x: number,
      boxY: number,
      w: number,
      h: number,
      labelText: string,
      value: string,
    ) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.75);
      doc.roundedRect(x, boxY, w, h, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(...MUTED);
      doc.text(labelText.toUpperCase(), x + 5, boxY + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(...TEXT);
      const lines = doc.splitTextToSize(value || "—", w - 12);
      const maxLines = Math.max(1, Math.floor((h - 22) / 9));
      for (let i = 0; i < Math.min(lines.length, maxLines); i += 1) {
        doc.text(lines[i] || "", x + 5, boxY + 24 + i * 9);
      }
    };

    const fieldRow = (fields: { label: string; value: string; w: number }[], h = 36) => {
      let cx = margin;
      fields.forEach((field) => {
        fieldBox(cx, y, field.w, h, field.label, field.value);
        cx += field.w + 8;
      });
      y += h + 10;
    };

    const drawTableHeader = (columns: Array<{ key: string; label: string; w: number }>) => {
      doc.setFillColor(241, 244, 248);
      doc.rect(margin, y, contentWidth, 20, "F");
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.75);
      doc.rect(margin, y, contentWidth, 20);
      let cx = margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(...MUTED);
      columns.forEach((column) => {
        doc.text(column.label.toUpperCase(), cx + 4, y + 13, { charSpace: 0.3 });
        cx += column.w;
      });
      y += 20;
    };

    drawHeader(1, "CUSTOMER INVOICE");

    fieldRow([
      { label: "Invoice No.", value: invoiceNo, w: contentWidth / 4 - 6 },
      { label: "Issue Date", value: issueDate, w: contentWidth / 4 - 6 },
      { label: "Due Date", value: dueDate, w: contentWidth / 4 - 6 },
      { label: "Payment Terms", value: paymentTerms, w: contentWidth / 4 - 6 },
    ]);

    const halfW = contentWidth / 2 - 6;
    const billToLines = [
      customerCompany || "—",
      billingAddress || "—",
      apContact || "—",
      poReference ? `PO / Ref: ${poReference}` : "—",
    ].filter(Boolean);
    const remitLines = [
      companyDisplayName,
      COMPANY.address,
      COMPANY.contact,
      factoringCompany ? `Factoring / Payee: ${factoringCompany}` : "—",
    ];

    const billBoxHeight = Math.max(92, 40 + billToLines.length * 11 + 8);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.75);
    doc.roundedRect(margin, y, halfW, billBoxHeight, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(...MUTED);
    doc.text("BILL TO", margin + 5, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(...TEXT);
    billToLines.forEach((line, index) => {
      doc.text(line, margin + 5, y + 24 + index * 11);
    });

    doc.roundedRect(margin + halfW + 12, y, halfW, billBoxHeight, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(...MUTED);
    doc.text("REMIT TO", margin + halfW + 17, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(...TEXT);
    remitLines.forEach((line, index) => {
      doc.text(line, margin + halfW + 17, y + 24 + index * 11);
    });
    y += billBoxHeight + 12;

    sectionHeader("Load / Service Details");

    const columns = [
      { key: "loadNo", label: "Load No.", w: 52 },
      { key: "pickup", label: "Pickup", w: 52 },
      { key: "delivery", label: "Delivery", w: 52 },
      { key: "origin", label: "Origin", w: 78 },
      { key: "destination", label: "Destination", w: 78 },
      { key: "description", label: "Description", w: 150 },
      { key: "amount", label: "Amount", w: 68 },
    ];
    drawTableHeader(columns);
    loads.forEach((row) => {
      const descLines = doc.splitTextToSize(row.description || "-", columns[5].w - 8);
      const rowHeight = Math.max(20, descLines.length * 10 + 10);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.75);
      doc.rect(margin, y, contentWidth, rowHeight, "FD");

      let cx = margin;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(...TEXT);
      const values = [
        row.loadNo || "-",
        row.pickup || "-",
        row.delivery || "-",
        row.origin || "-",
        row.destination || "-",
        descLines.join(" ") || "-",
        row.amount ? money(parseFloat(row.amount) || 0) : "-",
      ];

      columns.forEach((column, index) => {
        const text = values[index] ?? "-";
        doc.text(String(text), cx + 4, y + 13);
        cx += column.w;
      });

      y += rowHeight + 4;
    });

    const totalsX = pageWidth - margin - 220;
    y += 8;
    const totalLine = (labelText: string, value: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(bold ? 10 : 8.6);
      doc.setTextColor(...(bold ? NAVY : MUTED));
      doc.text(labelText, totalsX, y);
      doc.text(value, totalsX + 220, y, { align: "right" });
      y += bold ? 16 : 14;
    };

    totalLine("Subtotal", money(subtotal));
    totalLine("Approved Accessorials", money(parseFloat(approvedAccessorials) || 0));
    totalLine("Credits / Adjustments", money(parseFloat(creditsAdjustments) || 0));
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(1);
    doc.line(totalsX, y - 3, totalsX + 220, y - 3);
    totalLine("TOTAL AMOUNT DUE", money(total), true);

    y += 12;
    sectionHeader("Notes / Special Instructions");
    const noteText = notes || "—";
    const noteLines = doc.splitTextToSize(noteText, contentWidth - 14);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.75);
    doc.roundedRect(margin, y, contentWidth, Math.max(46, 22 + noteLines.length * 10), 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(...TEXT);
    doc.text(noteLines, margin + 6, y + 18);
    y += Math.max(46, 22 + noteLines.length * 10) + 10;

    sectionHeader("Supporting Documents and Certification");
    const checks: [string, boolean][] = [
      ["Rate confirmation", docs.rateConfirmation],
      ["Signed BOL", docs.signedBOL],
      ["POD", docs.pod],
      ["Accessorial receipts", docs.accessorialReceipts],
      [`Other${otherDocText ? `: ${otherDocText}` : ""}`, docs.other],
    ];

    let cx = margin;
    checks.forEach(([text, checked]) => {
      doc.setDrawColor(...NAVY);
      doc.setLineWidth(0.9);
      doc.setFillColor(checked ? NAVY[0] : 255, checked ? NAVY[1] : 255, checked ? NAVY[2] : 255);
      doc.roundedRect(cx, y, 10, 10, 1.5, 1.5, "FD");
      if (checked) {
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(1.3);
        doc.line(cx + 2, y + 2, cx + 4, y + 7);
        doc.line(cx + 4, y + 7, cx + 8, y + 2);
      }
      doc.setTextColor(...TEXT);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.3);
      doc.text(text, cx + 16, y + 8);
      cx += doc.getTextWidth(text) + 42;
    });
    y += 20;

    const sigW = contentWidth / 3 - 8;
    fieldRow([
      { label: "Prepared By", value: preparedBy || "—", w: sigW },
      { label: "Approved By", value: approvedBy || "—", w: sigW },
      { label: "Internal Status / Paid Date", value: internalStatus || "—", w: sigW },
    ]);

    drawFooter();

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p += 1) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.3);
      doc.setTextColor(...MUTED);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, 94, { align: "right" });
    }

    doc.save(`${invoiceNo}.pdf`);
  }

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer Invoice"
        description="Fill in load and billing details, then export a print-ready invoice PDF."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {hasErrors ? (
          <Alert variant="destructive" className="sm:flex-1">
            <AlertCircle className="size-4" />
            <AlertTitle>Missing required fields</AlertTitle>
            <AlertDescription>{Object.values(errors).filter(Boolean).join(" ")}</AlertDescription>
          </Alert>
        ) : (
          <div />
        )}
        <Button onClick={generatePDF} className="shrink-0">
          <FileDown className="size-4" />
          Generate PDF
        </Button>
      </div>

      <Card className={sectionClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="size-4 text-slate-500" />
            Invoice Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Invoice No." required error={errors.invoiceNo}>
            <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </Field>
          <Field label="Issue Date">
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Due Date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Payment Terms">
            <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card className={sectionClass}>
        <CardHeader>
          <CardTitle className="text-base">Bill To</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Customer / Company" required error={errors.customerCompany}>
            <Input value={customerCompany} onChange={(e) => setCustomerCompany(e.target.value)} />
          </Field>
          <Field label="AP Email / Phone">
            <Input value={apContact} onChange={(e) => setApContact(e.target.value)} />
          </Field>
          <Field label="Billing Address">
            <Textarea
              rows={2}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
            />
          </Field>
          <Field label="PO / Reference No.">
            <Input value={poReference} onChange={(e) => setPoReference(e.target.value)} />
          </Field>
          <Field label="Factoring Company / Remit-To Payee (optional)">
            <Input value={factoringCompany} onChange={(e) => setFactoringCompany(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card className={sectionClass}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Load / Service Details</CardTitle>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="size-4" />
            Add Row
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {errors.loads ? <p className="text-xs text-red-600">{errors.loads}</p> : null}
          {loads.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-7"
            >
              <Input
                placeholder="Load No."
                value={row.loadNo}
                onChange={(e) => updateRow(row.id, "loadNo", e.target.value)}
              />
              <Input
                type="date"
                placeholder="Pickup"
                value={row.pickup}
                onChange={(e) => updateRow(row.id, "pickup", e.target.value)}
              />
              <Input
                type="date"
                placeholder="Delivery"
                value={row.delivery}
                onChange={(e) => updateRow(row.id, "delivery", e.target.value)}
              />
              <Input
                placeholder="Origin"
                value={row.origin}
                onChange={(e) => updateRow(row.id, "origin", e.target.value)}
              />
              <Input
                placeholder="Destination"
                value={row.destination}
                onChange={(e) => updateRow(row.id, "destination", e.target.value)}
              />
              <Input
                placeholder="Description"
                value={row.description}
                onChange={(e) => updateRow(row.id, "description", e.target.value)}
                className="sm:col-span-1"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={(e) => updateRow(row.id, "amount", e.target.value)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeRow(row.id)}
                  disabled={loads.length === 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={sectionClass}>
        <CardHeader>
          <CardTitle className="text-base">Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Approved Accessorials">
              <Input
                type="number"
                value={approvedAccessorials}
                onChange={(e) => setApprovedAccessorials(e.target.value)}
              />
            </Field>
            <Field label="Credits / Adjustments">
              <Input
                type="number"
                value={creditsAdjustments}
                onChange={(e) => setCreditsAdjustments(e.target.value)}
              />
            </Field>
          </div>
          <Separator />
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total Amount Due</span>
              <span>{money(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionClass}>
        <CardHeader>
          <CardTitle className="text-base">Notes / Special Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </CardContent>
      </Card>

      <Card className={sectionClass}>
        <CardHeader>
          <CardTitle className="text-base">Supporting Documents and Certification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <CheckField
            label="Rate confirmation"
            checked={docs.rateConfirmation}
            onChange={(v) => setDocs((d) => ({ ...d, rateConfirmation: v }))}
          />
          <CheckField
            label="Signed BOL"
            checked={docs.signedBOL}
            onChange={(v) => setDocs((d) => ({ ...d, signedBOL: v }))}
          />
          <CheckField
            label="POD"
            checked={docs.pod}
            onChange={(v) => setDocs((d) => ({ ...d, pod: v }))}
          />
          <CheckField
            label="Accessorial receipts"
            checked={docs.accessorialReceipts}
            onChange={(v) => setDocs((d) => ({ ...d, accessorialReceipts: v }))}
          />
          <div className="flex items-center gap-2">
            <CheckField
              label="Other"
              checked={docs.other}
              onChange={(v) => setDocs((d) => ({ ...d, other: v }))}
            />
            <Input
              className="w-40"
              placeholder="Describe"
              value={otherDocText}
              onChange={(e) => setOtherDocText(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={sectionClass}>
        <CardHeader>
          <CardTitle className="text-base">Prepared / Approved / Status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Prepared By">
            <Input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
          </Field>
          <Field label="Approved By">
            <Input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
          </Field>
          <Field label="Internal Status / Paid Date">
            <Input value={internalStatus} onChange={(e) => setInternalStatus(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={generatePDF}>
          <FileDown className="size-4" />
          Generate PDF
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      {label}
    </label>
  );
}

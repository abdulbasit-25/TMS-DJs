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

    // ----- Palette (shared with Carrier Rate Confirmation for a consistent brand system) -----
    const NAVY: [number, number, number] = [21, 38, 61];
    const GOLD: [number, number, number] = [173, 138, 84];
    const BORDER: [number, number, number] = [214, 219, 226];
    const TEXT: [number, number, number] = [26, 32, 40];
    const MUTED: [number, number, number] = [110, 118, 128];

    const doc = new jsPDF({ unit: "pt", format: "letter" }); // 612 x 792
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    const footerTop = pageHeight - 34;
    let y = 0;

    const drawHeader = (continued: boolean) => {
      doc.setFillColor(...NAVY);
      doc.roundedRect(margin, 26, 76, 30, 4, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12.5);
      doc.text("BROKER", margin + 12, 46);

      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12.5);
      doc.text(companyDisplayName, margin + 92, 38);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(...MUTED);
      doc.text(COMPANY.address, margin + 92, 49);
      doc.text(COMPANY.contact, margin + 92, 59);

      doc.setDrawColor(...GOLD);
      doc.setLineWidth(1.4);
      doc.line(margin, 70, pageWidth - margin, 70);

      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14.5);
      doc.text(continued ? "CUSTOMER INVOICE (CONTINUED)" : "CUSTOMER INVOICE", margin, 90);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.3);
      doc.setTextColor(...MUTED);
      doc.text(invoiceNo, pageWidth - margin, 82, { align: "right" });
      // Page number stamped in a final pass once total page count is known.

      y = 108;
    };

    const drawFooter = () => {
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.6);
      doc.line(margin, footerTop - 8, pageWidth - margin, footerTop - 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(COMPANY.mcDot, margin, footerTop);
      doc.text(
        "Generated invoice — verify against current template revision",
        pageWidth - margin,
        footerTop,
        { align: "right" },
      );
    };

    const ensureSpace = (h: number) => {
      if (y + h > footerTop - 14) {
        drawFooter();
        doc.addPage();
        drawHeader(true);
      }
    };

    const label = (text: string, x: number, yPos: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.4);
      doc.setTextColor(...MUTED);
      doc.text(text.toUpperCase(), x, yPos, { charSpace: 0.4 });
    };

    // Bordered field box — fill is set explicitly every call so it never inherits
    // whatever color a previous section happened to leave active.
    const fieldBox = (x: number, boxY: number, w: number, h: number, lbl: string, val: string) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.75);
      doc.roundedRect(x, boxY, w, h, 2, 2, "FD");
      label(lbl, x + 7, boxY + 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.6);
      doc.setTextColor(...TEXT);
      const maxLines = Math.max(1, Math.floor((h - 21) / 9.5));
      const lines = doc.splitTextToSize(val || "—", w - 14);
      doc.text(lines.slice(0, maxLines), x + 7, boxY + 24);
    };

    const fieldRow = (fields: { label: string; value: string; w: number }[], h = 36) => {
      ensureSpace(h + 10);
      let cx = margin;
      fields.forEach((f) => {
        fieldBox(cx, y, f.w, h, f.label, f.value);
        cx += f.w + 8;
      });
      y += h + 10;
    };

    const sectionHeader = (title: string) => {
      ensureSpace(30);
      doc.setFillColor(...NAVY);
      doc.rect(margin, y, contentWidth, 20, "F");
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(1.2);
      doc.line(margin, y + 20, margin + contentWidth, y + 20);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(title.toUpperCase(), margin + 8, y + 14, { charSpace: 0.5 });
      y += 30;
    };

    // ---- Header ----
    drawHeader(false);

    // ---- Invoice Information ----
    fieldRow([
      { label: "Invoice No.", value: invoiceNo, w: contentWidth / 4 - 6 },
      { label: "Issue Date", value: issueDate, w: contentWidth / 4 - 6 },
      { label: "Due Date", value: dueDate, w: contentWidth / 4 - 6 },
      { label: "Payment Terms", value: paymentTerms, w: contentWidth / 4 - 6 },
    ]);

    // ---- Bill To / Remit To ----
    // Height is computed from the actual address + reference lines instead of a
    // fixed value, so a longer billing address can no longer overflow the box.
    const halfW = contentWidth / 2 - 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const addrLines = doc.splitTextToSize(billingAddress || "—", halfW - 14);
    const billLines = [
      apContact && `AP: ${apContact}`,
      poReference && `PO / Ref: ${poReference}`,
    ].filter(Boolean) as string[];
    const billH = Math.max(92, 40 + (addrLines.length + billLines.length) * 11 + 8);
    ensureSpace(billH + 14);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.75);
    doc.roundedRect(margin, y, halfW, billH, 2, 2, "FD");
    label("Bill To", margin + 7, y + 13);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    doc.text(customerCompany || "—", margin + 7, y + 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    let by = y + 41;
    addrLines.forEach((line: string) => {
      doc.text(line, margin + 7, by);
      by += 11;
    });
    billLines.forEach((line) => {
      doc.text(line, margin + 7, by);
      by += 11;
    });

    const remitX = margin + halfW + 12;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(remitX, y, halfW, billH, 2, 2, "FD");
    label("Remit To / Notice of Assignment", remitX + 7, y + 13);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    doc.text(companyDisplayName, remitX + 7, y + 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(COMPANY.address, remitX + 7, y + 40);
    doc.text(COMPANY.contact, remitX + 7, y + 51);
    if (factoringCompany) {
      doc.setTextColor(...TEXT);
      doc.text(`Factoring / Payee: ${factoringCompany}`, remitX + 7, y + 65);
    }
    doc.setTextColor(...MUTED);
    doc.setFontSize(6.8);
    const secNote = doc.splitTextToSize(
      "Payment security: verify remit-to changes by calling (682) 552-3169. Never rely on email alone.",
      halfW - 14,
    );
    doc.text(secNote, remitX + 7, y + billH - secNote.length * 8 - 6);

    y += billH + 14;

    // ---- Load / Service Details table ----
    sectionHeader("Load / Service Details");

    const cols = [
      { key: "loadNo", label: "Load No.", w: 55 },
      { key: "pickup", label: "Pickup", w: 55 },
      { key: "delivery", label: "Delivery", w: 55 },
      { key: "origin", label: "Origin", w: 80 },
      { key: "destination", label: "Destination", w: 80 },
      { key: "description", label: "Description", w: 145 },
      { key: "amount", label: "Amount", w: 70 },
    ] as const;

    const drawTableHeader = () => {
      ensureSpace(20);
      doc.setFillColor(241, 244, 248);
      doc.rect(margin, y, contentWidth, 20, "F");
      doc.setDrawColor(...BORDER);
      doc.rect(margin, y, contentWidth, 20);
      let cx = margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(...MUTED);
      cols.forEach((c) => {
        doc.text(c.label.toUpperCase(), cx + 4, y + 13, { charSpace: 0.3 });
        cx += c.w;
      });
      y += 20;
    };
    drawTableHeader();

    loads.forEach((row) => {
      const descLines = doc.splitTextToSize(row.description || "", cols[5].w - 8);
      const rowH = Math.max(18, descLines.length * 10 + 8);
      const brokeToNewPage = y + rowH + 20 > footerTop - 14;
      ensureSpace(rowH + 20);
      if (brokeToNewPage) drawTableHeader();

      let cx = margin;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...BORDER);
      doc.rect(margin, y, contentWidth, rowH, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...TEXT);

      doc.text(row.loadNo || "-", cx + 4, y + 12);
      cx += cols[0].w;
      doc.text(row.pickup || "-", cx + 4, y + 12);
      cx += cols[1].w;
      doc.text(row.delivery || "-", cx + 4, y + 12);
      cx += cols[2].w;
      doc.text(doc.splitTextToSize(row.origin || "-", cols[3].w - 8), cx + 4, y + 12);
      cx += cols[3].w;
      doc.text(doc.splitTextToSize(row.destination || "-", cols[4].w - 8), cx + 4, y + 12);
      cx += cols[4].w;
      doc.text(descLines.length ? descLines : ["-"], cx + 4, y + 12);
      cx += cols[5].w;
      doc.text(row.amount ? money(parseFloat(row.amount) || 0) : "-", cx + 4, y + 12);

      let sepX = margin;
      doc.setDrawColor(...BORDER);
      cols.forEach((c) => {
        doc.line(sepX, y, sepX, y + rowH);
        sepX += c.w;
      });
      doc.line(sepX, y, sepX, y + rowH);

      y += rowH;
    });

    y += 10;

    // ---- Totals ----
    const totalsW = 220;
    const totalsX = pageWidth - margin - totalsW;
    ensureSpace(90);

    const totalLine = (lbl: string, val: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(bold ? 10 : 9);
      doc.setTextColor(...(bold ? NAVY : MUTED));
      doc.text(lbl, totalsX, y);
      doc.text(val, totalsX + totalsW, y, { align: "right" });
      y += bold ? 16 : 14;
    };
    totalLine("Subtotal", money(subtotal));
    totalLine("Approved Accessorials", money(parseFloat(approvedAccessorials) || 0));
    totalLine("Credits / Adjustments", money(parseFloat(creditsAdjustments) || 0));
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(1);
    doc.line(totalsX, y - 4, totalsX + totalsW, y - 4);
    totalLine("TOTAL AMOUNT DUE", money(total), true);

    y += 12;

    // ---- Notes ----
    // Height now grows with content instead of a fixed 55pt box that could clip text.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const noteLines = doc.splitTextToSize(notes || "—", contentWidth - 14);
    const notesH = Math.max(40, 24 + noteLines.length * 11);
    ensureSpace(notesH + 12);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(margin, y, contentWidth, notesH, 2, 2, "FD");
    label("Notes / Special Instructions", margin + 7, y + 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    doc.text(noteLines, margin + 7, y + 27);
    y += notesH + 12;

    // ---- Supporting Documents ----
    sectionHeader("Supporting Documents and Certification");
    const checks: [string, boolean][] = [
      ["Rate confirmation", docs.rateConfirmation],
      ["Signed BOL", docs.signedBOL],
      ["POD", docs.pod],
      ["Accessorial receipts", docs.accessorialReceipts],
      [`Other${otherDocText ? `: ${otherDocText}` : ""}`, docs.other],
    ];
    ensureSpace(20);
    let cxx = margin;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    checks.forEach(([txt, checked]) => {
      doc.setDrawColor(...NAVY);
      doc.setLineWidth(0.9);
      doc.setFillColor(checked ? NAVY[0] : 255, checked ? NAVY[1] : 255, checked ? NAVY[2] : 255);
      doc.roundedRect(cxx, y - 8, 10, 10, 1.5, 1.5, "FD");
      if (checked) {
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(1.3);
        doc.line(cxx + 2, y - 3, cxx + 4.2, y - 0.6);
        doc.line(cxx + 4.2, y - 0.6, cxx + 8, y - 7);
      }
      doc.setTextColor(...TEXT);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.4);
      doc.text(txt, cxx + 15, y);
      cxx += doc.getTextWidth(txt) + 38;
    });
    y += 24;

    // ---- Prepared / Approved / Status ----
    const sigW = contentWidth / 3 - 8;
    fieldRow(
      [
        { label: "Prepared By", value: preparedBy, w: sigW },
        { label: "Approved By", value: approvedBy, w: sigW },
        { label: "Internal Status / Paid Date", value: internalStatus, w: sigW },
      ],
      38,
    );

    drawFooter();

    // Stamp final page numbers now that the true page count is known.
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
\

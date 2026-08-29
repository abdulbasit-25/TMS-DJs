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
import { FileDown, Plus, Trash2, ReceiptText } from "lucide-react";

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
  name: "DJ'S FREIGHT BROKER LLC",
  address: "1209 N Saginaw Blvd., Suite G-194, Saginaw, TX 76179",
  contact: "(682) 552-3169 | info@djsfreightbroker.com | djsfreightbroker.com",
  mcDot: "FMCSA PROPERTY BROKER | MC 1551655 | USDOT 4079462",
};

function nextInvoiceNumber() {
  const key = "djfb-next-invoice-seq";
  const seq = Number(localStorage.getItem(key) ?? "1");
  localStorage.setItem(key, String(seq + 1));
  return `DJFB-IN-${String(seq).padStart(3, "0")}`;
}

// ---------- Component ----------

function CustomerInvoicePage() {
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
  }
  function addRow() {
    setLoads((rows) => [...rows, emptyRow()]);
  }
  function removeRow(id: string) {
    setLoads((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  }

  function money(n: number) {
    return `$${n.toFixed(2)}`;
  }

  function generatePDF() {
    const doc = new jsPDF({ unit: "pt", format: "letter" }); // 612 x 792
    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageBreak = (needed: number) => {
      if (y + needed > pageHeight - 60) {
        doc.addPage();
        y = margin;
      }
    };

    const label = (text: string, x: number, yPos: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(110);
      doc.text(text.toUpperCase(), x, yPos);
    };
    const value = (text: string, x: number, yPos: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(20);
      doc.text(text || "-", x, yPos);
    };

    // Draws a bordered field box with a label and value
    function fieldBox(x: number, boxY: number, w: number, h: number, lbl: string, val: string) {
      doc.setDrawColor(190);
      doc.rect(x, boxY, w, h);
      label(lbl, x + 6, boxY + 12);
      value(val, x + 6, boxY + 27);
    }

    // ---- Header ----
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(20);
    doc.text("DJFB", margin, y + 16);

    doc.setFontSize(11);
    doc.text(COMPANY.name, margin, y + 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90);
    doc.text(COMPANY.address, margin, y + 44);
    doc.text(COMPANY.contact, margin, y + 55);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(20);
    doc.text("CUSTOMER INVOICE", pageWidth - margin, y + 16, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(invoiceNo, pageWidth - margin, y + 30, { align: "right" });

    y += 70;
    doc.setDrawColor(20);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;

    // ---- Invoice Information ----
    const infoColW = contentWidth / 4;
    const infoH = 38;
    fieldBox(margin, y, infoColW, infoH, "Invoice No.", invoiceNo);
    fieldBox(margin + infoColW, y, infoColW, infoH, "Issue Date", issueDate);
    fieldBox(margin + infoColW * 2, y, infoColW, infoH, "Due Date", dueDate);
    fieldBox(margin + infoColW * 3, y, infoColW, infoH, "Payment Terms", paymentTerms);
    y += infoH + 10;

    // ---- Bill To / Remit To ----
    const halfW = contentWidth / 2 - 6;
    const billH = 92;

    doc.setDrawColor(190);
    doc.rect(margin, y, halfW, billH);
    label("Bill To", margin + 6, y + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(20);
    doc.text(customerCompany || "-", margin + 6, y + 27);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60);
    const billLines = [
      apContact && `AP: ${apContact}`,
      poReference && `PO / Ref: ${poReference}`,
    ].filter(Boolean) as string[];
    const addrLines = doc.splitTextToSize(billingAddress || "-", halfW - 12);
    let by = y + 40;
    addrLines.slice(0, 3).forEach((line: string) => {
      doc.text(line, margin + 6, by);
      by += 11;
    });
    billLines.forEach((line) => {
      doc.text(line, margin + 6, by);
      by += 11;
    });

    const remitX = margin + halfW + 12;
    doc.rect(remitX, y, halfW, billH);
    label("Remit To / Notice of Assignment", remitX + 6, y + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(20);
    doc.text(COMPANY.name, remitX + 6, y + 27);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60);
    doc.text(COMPANY.address, remitX + 6, y + 39);
    doc.text(COMPANY.contact, remitX + 6, y + 50);
    if (factoringCompany) {
      doc.setTextColor(20);
      doc.text(`Factoring / Payee: ${factoringCompany}`, remitX + 6, y + 64);
    }
    doc.setTextColor(120);
    doc.setFontSize(7);
    const secNote = doc.splitTextToSize(
      "Payment security: verify remit-to changes by calling (682) 552-3169. Never rely on email alone.",
      halfW - 12,
    );
    doc.text(secNote, remitX + 6, y + billH - 16);

    y += billH + 14;

    // ---- Load / Service Details table ----
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20);
    doc.text("LOAD / SERVICE DETAILS", margin, y);
    y += 8;

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
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, contentWidth, 20, "F");
      doc.setDrawColor(190);
      doc.rect(margin, y, contentWidth, 20);
      let cx = margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(80);
      cols.forEach((c) => {
        doc.text(c.label.toUpperCase(), cx + 4, y + 13);
        cx += c.w;
      });
      y += 20;
    };
    drawTableHeader();

    loads.forEach((row) => {
      const descLines = doc.splitTextToSize(row.description || "", cols[5].w - 8);
      const rowH = Math.max(18, descLines.length * 10 + 8);
      checkPageBreak(rowH + 20);
      if (y === margin) drawTableHeader();

      let cx = margin;
      doc.setDrawColor(210);
      doc.rect(margin, y, contentWidth, rowH);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30);

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

      // vertical column separators
      let sepX = margin;
      cols.forEach((c) => {
        doc.setDrawColor(225);
        doc.line(sepX, y, sepX, y + rowH);
        sepX += c.w;
      });
      doc.line(sepX, y, sepX, y + rowH);

      y += rowH;
    });

    y += 4;

    // ---- Totals ----
    const totalsW = 220;
    const totalsX = pageWidth - margin - totalsW;
    checkPageBreak(90);

    const totalLine = (lbl: string, val: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(bold ? 10 : 9);
      doc.setTextColor(bold ? 20 : 60);
      doc.text(lbl, totalsX, y);
      doc.text(val, totalsX + totalsW, y, { align: "right" });
      y += bold ? 16 : 14;
    };
    totalLine("Subtotal", money(subtotal));
    totalLine("Approved Accessorials", money(parseFloat(approvedAccessorials) || 0));
    totalLine("Credits / Adjustments", money(parseFloat(creditsAdjustments) || 0));
    doc.setDrawColor(20);
    doc.line(totalsX, y - 4, totalsX + totalsW, y - 4);
    totalLine("TOTAL AMOUNT DUE", money(total), true);

    y += 12;

    // ---- Notes ----
    checkPageBreak(60);
    doc.setDrawColor(190);
    const notesH = 55;
    doc.rect(margin, y, contentWidth, notesH);
    label("Notes / Special Instructions", margin + 6, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(40);
    doc.text(doc.splitTextToSize(notes || "-", contentWidth - 12), margin + 6, y + 26);
    y += notesH + 12;

    // ---- Supporting Documents ----
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(20);
    doc.text("SUPPORTING DOCUMENTS AND CERTIFICATION", margin, y);
    y += 14;
    const checks: [string, boolean][] = [
      ["Rate confirmation", docs.rateConfirmation],
      ["Signed BOL", docs.signedBOL],
      ["POD", docs.pod],
      ["Accessorial receipts", docs.accessorialReceipts],
      [`Other${otherDocText ? `: ${otherDocText}` : ""}`, docs.other],
    ];
    let cxx = margin;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    checks.forEach(([txt, checked]) => {
      doc.setDrawColor(80);
      doc.rect(cxx, y - 8, 8, 8);
      if (checked) {
        doc.setLineWidth(1.1);
        doc.line(cxx, y - 8, cxx + 8, y);
        doc.line(cxx + 8, y - 8, cxx, y);
        doc.setLineWidth(1);
      }
      doc.setTextColor(30);
      doc.text(txt, cxx + 12, y);
      cxx += doc.getTextWidth(txt) + 32;
    });
    y += 22;

    // ---- Prepared / Approved / Status ----
    checkPageBreak(48);
    const sigW = contentWidth / 3 - 8;
    fieldBox(margin, y, sigW, 38, "Prepared By", preparedBy);
    fieldBox(margin + sigW + 12, y, sigW, 38, "Approved By", approvedBy);
    fieldBox(margin + (sigW + 12) * 2, y, sigW, 38, "Internal Status / Paid Date", internalStatus);

    // ---- Footer ----
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(COMPANY.mcDot, margin, pageHeight - 30);
    doc.text(
      "Generated invoice — verify against current template revision",
      pageWidth - margin,
      pageHeight - 30,
      {
        align: "right",
      },
    );

    doc.save(`${invoiceNo}.pdf`);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer Invoice"
        description="Fill in load and billing details, then export a print-ready invoice PDF."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="size-4" />
            Invoice Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Invoice No.">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bill To</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Customer / Company">
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Load / Service Details</CardTitle>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="size-4" />
            Add Row
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
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

      <Card>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes / Special Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
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

      <Card>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
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

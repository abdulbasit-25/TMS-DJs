import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { usePortalSettings } from "@/hooks/use-portal-settings";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileDown,
  FileSignature,
  Flame,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";

export const Route = createFileRoute("/_app/straight-bill-of-lading")({
  component: StraightBillOfLadingPage,
});

// ---------------------------------------------------------------------------
// Broker letterhead constants — centralised so the header/footer never drift
// out of sync with each other (previously duplicated + hardcoded in 3 spots).
// ---------------------------------------------------------------------------
const BROKER_ADDRESS = "1209 N Saginaw Blvd., Suite G-194, Saginaw, TX 76179";
const BROKER_PHONE = "(682) 552-3169";
const BROKER_EMAIL = "info@company.com";
const BROKER_WEBSITE = "company.com";
const BROKER_MC_NUMBER = "MC 1551655";
const BROKER_USDOT_NUMBER = "USDOT 4079462";
const DOCUMENT_REVISION = "Rev 1.0";

type FreightItem = {
  id: string;
  hm: string;
  units: string;
  pkg: string;
  commodity: string;
  nmfcClass: string;
  weight: string;
};

type BOLFormState = {
  loadNo: string;
  bolNo: string;
  customerReference: string;
  dateIssued: string;
  pickupDate: string;
  pickupTime: string;
  pickupTimezone: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveryTimezone: string;
  equipmentType: string;
  shipperName: string;
  shipperContact: string;
  pickupAddress: string;
  pickupDock: string;
  consigneeName: string;
  consigneeContact: string;
  deliveryAddress: string;
  deliveryDock: string;
  hazmat: "Yes" | "No";
  declaredValue: string;
  specialInstructions: string;
  carrierLegalName: string;
  carrierMcUsdot: string;
  driverName: string;
  driverPhone: string;
  tractorTrailerNo: string;
  sealNo: string;
  reqActualTemp: string;
  trackingLink: string;
  driverCountedFreight: boolean;
  shipperLoadAndCount: boolean;
  sealVerified: boolean;
  pickupExceptions: string;
  shipperSignature: string;
  shipperTypedName: string;
  shipperDateTime: string;
  shipperTitle: string;
  carrierReceiptText: string;
  driverSignature: string;
  driverTypedName: string;
  driverDateTime: string;
  sealConfirmed: string;
  deliveryExceptions: string;
  consigneeSignature: string;
  consigneeTypedName: string;
  consigneeDateTime: string;
  consigneeTitle: string;
};

const createFreightItem = (): FreightItem => ({
  id: crypto.randomUUID(),
  hm: "",
  units: "",
  pkg: "",
  commodity: "",
  nmfcClass: "",
  weight: "",
});

const initialState: BOLFormState = {
  loadNo: "LOAD-2048",
  bolNo: "BL-001",
  customerReference: "PO-11842",
  dateIssued: "2026-08-04",
  pickupDate: "2026-08-05",
  pickupTime: "08:00",
  pickupTimezone: "CST",
  deliveryDate: "2026-08-06",
  deliveryTime: "18:30",
  deliveryTimezone: "CST",
  equipmentType: "53' Dry Van",
  shipperName: "North Texas Distribution Center",
  shipperContact: "(214) 555-0188",
  pickupAddress: "1209 N Saginaw Blvd, Suite G-194, Saginaw, TX 76179",
  pickupDock: "Dock 4",
  consigneeName: "Atlas Retail Group",
  consigneeContact: "(972) 555-2222",
  deliveryAddress: "5400 Commerce Ave, Dallas, TX 75247",
  deliveryDock: "Warehouse B",
  hazmat: "No",
  declaredValue: "",
  specialInstructions: "Handle with care. Keep freight secure and deliver by appointment window.",
  carrierLegalName: "",
  carrierMcUsdot: "",
  driverName: "",
  driverPhone: "",
  tractorTrailerNo: "",
  sealNo: "",
  reqActualTemp: "",
  trackingLink: "",
  driverCountedFreight: false,
  shipperLoadAndCount: false,
  sealVerified: false,
  pickupExceptions: "",
  shipperSignature: "",
  shipperTypedName: "",
  shipperDateTime: "",
  shipperTitle: "",
  carrierReceiptText:
    "Carrier acknowledges receipt and custody of the freight in apparent good order except as written above. Driver confirms the carrier, driver, tractor, trailer, seal, and shipment information shown on this BOL.",
  driverSignature: "",
  driverTypedName: "",
  driverDateTime: "",
  sealConfirmed: "",
  deliveryExceptions: "",
  consigneeSignature: "",
  consigneeTypedName: "",
  consigneeDateTime: "",
  consigneeTitle: "",
};

const initialFreightItems: FreightItem[] = [
  {
    id: crypto.randomUUID(),
    hm: "",
    units: "1",
    pkg: "Pallet",
    commodity: "Consumer Goods",
    nmfcClass: "N/A",
    weight: "1200",
  },
  {
    id: crypto.randomUUID(),
    hm: "",
    units: "2",
    pkg: "Pallet",
    commodity: "General Freight",
    nmfcClass: "N/A",
    weight: "1800",
  },
];

const sectionClass = "app-surface-card";

const REQUIRED_FIELDS: Array<{ key: keyof BOLFormState; label: string }> = [
  { key: "loadNo", label: "Load No." },
  { key: "bolNo", label: "BOL No." },
  { key: "dateIssued", label: "Date issued" },
  { key: "shipperName", label: "Shipper name" },
  { key: "consigneeName", label: "Consignee name" },
];

function formatDate(value: string) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <CardTitle className="flex items-center gap-2 text-base font-bold text-[var(--color-doc-text)]">
      <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--color-doc-brand-soft)] text-[var(--color-brand)]">
        <Icon className="size-4" />
      </span>
      {children}
    </CardTitle>
  );
}

function StraightBillOfLadingPage() {
  const { companyName } = usePortalSettings();
  const portalCompanyName = companyName?.trim() || "TMS Freight Portal";
  const [form, setForm] = useState<BOLFormState>(initialState);
  const [freightItems, setFreightItems] = useState<FreightItem[]>(initialFreightItems);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const totals = useMemo(() => {
    const units = freightItems.reduce((sum, row) => sum + Number(row.units || 0), 0);
    const weight = freightItems.reduce((sum, row) => sum + Number(row.weight || 0), 0);
    return { units, weight };
  }, [freightItems]);

  const completion = useMemo(() => {
    const done = REQUIRED_FIELDS.filter((f) => String(form[f.key] ?? "").trim().length > 0).length;
    const missing = REQUIRED_FIELDS.filter((f) => String(form[f.key] ?? "").trim().length === 0);
    return { done, total: REQUIRED_FIELDS.length, missing };
  }, [form]);

  const updateField = <K extends keyof BOLFormState>(field: K, value: BOLFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const onFreightChange = (id: string, field: keyof FreightItem, value: string) => {
    setFreightItems((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addFreightRow = () => setFreightItems((rows) => [...rows, createFreightItem()]);

  const removeFreightRow = (id: string) => {
    setFreightItems((rows) => (rows.length > 1 ? rows.filter((row) => row.id !== id) : rows));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.loadNo.trim()) nextErrors.loadNo = "Load number is required.";
    if (!form.bolNo.trim()) nextErrors.bolNo = "BOL number is required.";
    if (!form.dateIssued) nextErrors.dateIssued = "Date issued is required.";
    if (!form.shipperName.trim()) nextErrors.shipperName = "Shipper name is required.";
    if (!form.consigneeName.trim()) nextErrors.consigneeName = "Consignee name is required.";
    if (freightItems.length === 0) nextErrors.freight = "Add at least one freight item.";
    const hasMissingFreight = freightItems.some(
      (row) => !row.commodity.trim() && !row.pkg.trim() && !row.weight.trim(),
    );
    if (hasMissingFreight) nextErrors.freight = "Complete each freight row before generating.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const generatePDF = () => {
    if (!validate()) {
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      const safeBottom = pageHeight - 56;
      const contentTop = 138;

      // ---------------------------------------------------------------- //
      // Design system — a quiet, premium "ledger" aesthetic: serif titles,
      // hairline rules instead of filled boxes, one restrained gold accent,
      // generous whitespace. Helvetica carries the data, Times carries the
      // title/legal voice.
      // ---------------------------------------------------------------- //
      const NAVY: [number, number, number] = [16, 30, 46];
      const CHARCOAL: [number, number, number] = [32, 41, 51];
      const MUTED: [number, number, number] = [107, 120, 137];
      const HAIRLINE: [number, number, number] = [210, 216, 224];
      const HAIRLINE_SOFT: [number, number, number] = [231, 234, 239];
      const GOLD: [number, number, number] = [163, 130, 76];
      const ZEBRA: [number, number, number] = [248, 248, 246];
      const NOTICE_BG: [number, number, number] = [250, 248, 243];
      const DANGER: [number, number, number] = [140, 32, 32];

      const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
      const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
      const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);

      const initials =
        portalCompanyName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? "")
          .join("") || "B";

      const drawHeader = (title: string, subtitle?: string) => {
        setDraw(GOLD);
        doc.setLineWidth(2);
        doc.line(margin, 18, pageWidth - margin, 18);

        const topY = 34;

        setDraw(NAVY);
        doc.setLineWidth(1);
        doc.rect(margin, topY, 36, 36);
        doc.setFont("times", "bold");
        doc.setFontSize(16);
        setText(NAVY);
        doc.text(initials, margin + 18, topY + 24, { align: "center" });

        const textX = margin + 50;
        doc.setFont("times", "bold");
        doc.setFontSize(15);
        setText(NAVY);
        doc.text(portalCompanyName, textX, topY + 11);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        setText(GOLD);
        doc.text("LICENSED PROPERTY BROKER", textX, topY + 20);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.4);
        setText(MUTED);
        doc.text(BROKER_ADDRESS, textX, topY + 29);
        doc.text(`${BROKER_PHONE}  ·  ${BROKER_EMAIL}  ·  ${BROKER_WEBSITE}`, textX, topY + 38);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.6);
        setText(MUTED);
        doc.text(`BOL ${form.bolNo || "—"}`, pageWidth - margin, topY + 6, { align: "right" });
        doc.text(DOCUMENT_REVISION, pageWidth - margin, topY + 15, { align: "right" });
        doc.text(`Effective ${formatDate(form.dateIssued)}`, pageWidth - margin, topY + 24, {
          align: "right",
        });

        const ruleY = topY + 48;
        setDraw(HAIRLINE);
        doc.setLineWidth(0.75);
        doc.line(margin, ruleY, pageWidth - margin, ruleY);
        setDraw(GOLD);
        doc.setLineWidth(1.5);
        doc.line(margin, ruleY, margin + 54, ruleY);

        doc.setFont("times", "bold");
        doc.setFontSize(14.5);
        setText(NAVY);
        doc.text(title, margin, ruleY + 22);

        if (subtitle) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.6);
          setText(GOLD);
          doc.text(subtitle.toUpperCase(), margin, ruleY + 32);
        }
      };

      const drawFooter = () => {
        setDraw(HAIRLINE_SOFT);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        setText(MUTED);
        doc.text(
          `FMCSA PROPERTY BROKER  ·  ${BROKER_MC_NUMBER}  ·  ${BROKER_USDOT_NUMBER}`,
          margin,
          pageHeight - 24,
        );
        doc.text(
          "CONTROLLED TEMPLATE — VERIFY CURRENT REVISION",
          pageWidth - margin,
          pageHeight - 24,
          { align: "right" },
        );
      };

      const newPage = (title: string, subtitle?: string) => {
        drawFooter();
        doc.addPage();
        drawHeader(title, subtitle);
        return contentTop;
      };

      // Ensures the next block of `neededHeight` fits before the footer; if
      // not, starts a continuation page automatically instead of overflowing.
      const ensureSpace = (
        currentY: number,
        neededHeight: number,
        continuationTitle: string,
        continuationSubtitle = "Continued",
      ) => {
        if (currentY + neededHeight > safeBottom) {
          return newPage(continuationTitle, continuationSubtitle);
        }
        return currentY;
      };

      const sectionHeading = (label: string, x: number, y: number, width: number) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.3);
        setText(NAVY);
        doc.text(label.toUpperCase(), x, y);
        setDraw(GOLD);
        doc.setLineWidth(1.3);
        doc.line(x, y + 4, x + 22, y + 4);
        setDraw(HAIRLINE_SOFT);
        doc.setLineWidth(0.5);
        doc.line(x + 26, y + 4, x + width, y + 4);
      };

      const drawField = (
        x: number,
        y: number,
        w: number,
        label: string,
        value: string,
        align: "left" | "right" = "left",
      ) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.6);
        setText(MUTED);
        doc.text(label.toUpperCase(), align === "right" ? x + w : x, y, {
          align: align === "right" ? "right" : "left",
        });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setText(CHARCOAL);
        const lines = doc.splitTextToSize(value || "—", w);
        const maxLines = Math.max(1, Math.min(2, lines.length));
        for (let i = 0; i < maxLines; i += 1) {
          doc.text(lines[i] || "", align === "right" ? x + w : x, y + 15 + i * 10, {
            align: align === "right" ? "right" : "left",
          });
        }

        setDraw(HAIRLINE);
        doc.setLineWidth(0.6);
        doc.line(x, y + 24, x + w, y + 24);
      };

      const drawLongBox = (
        x: number,
        y: number,
        w: number,
        h: number,
        label: string,
        value: string,
      ) => {
        setDraw(HAIRLINE);
        doc.setLineWidth(0.75);
        doc.rect(x, y, w, h);
        if (label) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.8);
          setText(MUTED);
          doc.text(label.toUpperCase(), x + 8, y + 13);
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        setText(CHARCOAL);
        const lines = doc.splitTextToSize(value || "—", w - 16);
        lines.forEach((line: string, idx: number) => {
          doc.text(line, x + 8, y + (label ? 25 : 14) + idx * 11);
        });
      };

      const drawCheck = (x: number, y: number, checked: boolean, label: string) => {
        setDraw(NAVY);
        doc.setLineWidth(0.8);
        doc.rect(x, y, 9, 9);
        if (checked) {
          setDraw(GOLD);
          doc.setLineWidth(1.3);
          doc.line(x + 1.5, y + 5, x + 3.5, y + 7.5);
          doc.line(x + 3.5, y + 7.5, x + 7.5, y + 2);
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.3);
        setText(CHARCOAL);
        doc.text(label, x + 16, y + 8);
      };

      const drawRadio = (
        x: number,
        y: number,
        selected: boolean,
        label: string,
        danger = false,
      ) => {
        setDraw(NAVY);
        doc.setLineWidth(0.8);
        doc.circle(x, y, 4.5, "S");
        if (selected) {
          setFill(danger ? DANGER : GOLD);
          doc.circle(x, y, 2.1, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.3);
        setText(danger && selected ? DANGER : CHARCOAL);
        doc.text(label, x + 12, y + 3);
      };

      // ---------------------------------------------------------------- //
      // Page 1 — Shipment identification & freight description
      // ---------------------------------------------------------------- //
      drawHeader("Straight Bill of Lading", "Non-Negotiable");
      let y = contentTop;

      sectionHeading("Shipment Identification", margin, y, contentWidth);
      y += 24;
      const quarter = contentWidth / 4;
      drawField(margin, y, quarter - 10, "Load No.", form.loadNo);
      drawField(margin + quarter, y, quarter - 10, "BOL No.", form.bolNo);
      drawField(
        margin + quarter * 2,
        y,
        quarter - 10,
        "Customer PO / Reference",
        form.customerReference,
      );
      drawField(margin + quarter * 3, y, quarter, "Date Issued", formatDate(form.dateIssued));
      y += 36;

      const third = contentWidth / 3;
      drawField(
        margin,
        y,
        third - 10,
        "Pickup Date / Time / Zone",
        `${formatDate(form.pickupDate)}  ${form.pickupTime}  ${form.pickupTimezone}`.trim(),
      );
      drawField(
        margin + third,
        y,
        third - 10,
        "Delivery Date / Time / Zone",
        `${formatDate(form.deliveryDate)}  ${form.deliveryTime}  ${form.deliveryTimezone}`.trim(),
      );
      drawField(margin + third * 2, y, third, "Equipment Type", form.equipmentType);
      y += 30;

      doc.setFont("times", "italic");
      doc.setFontSize(8);
      setText(MUTED);
      doc.text(`${portalCompanyName} acts solely as a property broker.`, pageWidth - margin, y, {
        align: "right",
      });
      y += 20;

      sectionHeading("Origin / Shipper", margin, y, contentWidth);
      y += 24;
      const half = contentWidth / 2;
      drawField(margin, y, half - 10, "Shipper Name", form.shipperName);
      drawField(margin + half, y, half, "Contact / Phone", form.shipperContact);
      y += 36;
      drawField(margin, y, half - 10, "Pickup Address", form.pickupAddress);
      drawField(margin + half, y, half, "Dock / Appointment No.", form.pickupDock);
      y += 40;

      sectionHeading("Destination / Consignee", margin, y, contentWidth);
      y += 24;
      drawField(margin, y, half - 10, "Consignee Name", form.consigneeName);
      drawField(margin + half, y, half, "Contact / Phone", form.consigneeContact);
      y += 36;
      drawField(margin, y, half - 10, "Delivery Address", form.deliveryAddress);
      drawField(margin + half, y, half, "Dock / Appointment No.", form.deliveryDock);
      y += 44;

      y = ensureSpace(y, 60, "Straight Bill of Lading");
      sectionHeading("Freight Description", margin, y, contentWidth);
      doc.setFont("times", "italic");
      doc.setFontSize(7.3);
      setText(MUTED);
      doc.text(
        "Shipper must identify hazardous materials and special handling needs.",
        pageWidth - margin,
        y,
        { align: "right" },
      );
      y += 18;

      const colW = { hm: 34, units: 52, pkg: 55, nmfc: 78, weight: 68 };
      const commodityW = contentWidth - (colW.hm + colW.units + colW.pkg + colW.nmfc + colW.weight);
      const headers: Array<{ label: string; w: number; align: "left" | "center" | "right" }> = [
        { label: "HM", w: colW.hm, align: "center" },
        { label: "Units", w: colW.units, align: "right" },
        { label: "Pkg", w: colW.pkg, align: "left" },
        { label: "Commodity / Description", w: commodityW, align: "left" },
        { label: "NMFC / Class", w: colW.nmfc, align: "left" },
        { label: "Weight", w: colW.weight, align: "right" },
      ];

      const drawTableHeader = (headerY: number) => {
        let x = margin;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.2);
        setText(NAVY);
        headers.forEach((col) => {
          const tx =
            col.align === "right" ? x + col.w - 4 : col.align === "center" ? x + col.w / 2 : x + 4;
          doc.text(col.label.toUpperCase(), tx, headerY, { align: col.align });
          x += col.w;
        });
        setDraw(GOLD);
        doc.setLineWidth(1.2);
        doc.line(margin, headerY + 5, pageWidth - margin, headerY + 5);
        return headerY + 5;
      };

      let tableY = drawTableHeader(y);
      const rowHeight = 24;
      freightItems.forEach((row, idx) => {
        tableY = ensureSpace(tableY, rowHeight + 10, "Straight Bill of Lading");
        if (tableY === contentTop) {
          tableY = drawTableHeader(tableY);
        }
        if (idx % 2 === 1) {
          setFill(ZEBRA);
          doc.rect(margin, tableY, contentWidth, rowHeight, "F");
        }
        let x = margin;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.8);
        setText(CHARCOAL);
        const cells = [row.hm || "—", row.units, row.pkg, row.commodity, row.nmfcClass, row.weight];
        cells.forEach((value, colIdx) => {
          const col = headers[colIdx];
          const lines = doc.splitTextToSize(value || "—", col.w - 8);
          const tx =
            col.align === "right" ? x + col.w - 4 : col.align === "center" ? x + col.w / 2 : x + 4;
          const displayValue =
            colIdx === 5 && value ? `${formatNumber(Number(value) || 0)} lb` : lines[0] || "—";
          doc.text(displayValue, tx, tableY + 15, { align: col.align });
          x += col.w;
        });
        setDraw(HAIRLINE_SOFT);
        doc.setLineWidth(0.5);
        doc.line(margin, tableY + rowHeight, pageWidth - margin, tableY + rowHeight);
        tableY += rowHeight;
      });
      y = tableY + 14;

      y = ensureSpace(y, 100, "Straight Bill of Lading");
      setDraw(GOLD);
      doc.setLineWidth(1.2);
      doc.line(margin, y, pageWidth - margin, y);
      y += 18;
      drawField(margin, y, third - 10, "Total Units", formatNumber(totals.units));
      drawField(margin + third, y, third - 10, "Total Weight", `${formatNumber(totals.weight)} lb`);
      drawField(margin + third * 2, y, third, "Declared Value (If Any)", form.declaredValue);
      y += 34;

      drawRadio(margin + 6, y, form.hazmat === "Yes", "Hazmat — Yes", true);
      drawRadio(margin + 130, y, form.hazmat === "No", "Hazmat — No");
      y += 20;

      drawLongBox(
        margin,
        y,
        contentWidth,
        70,
        "Special Instructions / Handling / Temperature / Securement",
        form.specialInstructions,
      );
      y += 70;

      // ---------------------------------------------------------------- //
      // Page 2 — Custody, signatures, proof of delivery
      // ---------------------------------------------------------------- //
      let y2 = newPage("Custody & Receipts", "Carrier, Driver & Signatures");

      sectionHeading("Carrier, Driver and Cargo Control", margin, y2, contentWidth);
      y2 += 24;
      drawField(margin, y2, half - 10, "Carrier Legal Name", form.carrierLegalName);
      drawField(margin + half, y2, half, "Carrier MC / USDOT", form.carrierMcUsdot);
      y2 += 36;
      drawField(margin, y2, third - 10, "Driver Name", form.driverName);
      drawField(margin + third, y2, third - 10, "Driver Phone", form.driverPhone);
      drawField(margin + third * 2, y2, third, "Tractor / Trailer No.", form.tractorTrailerNo);
      y2 += 36;
      drawField(margin, y2, third - 10, "Seal No.", form.sealNo);
      drawField(margin + third, y2, third - 10, "Required / Actual Temp", form.reqActualTemp);
      drawField(margin + third * 2, y2, third, "Tracking Link / Reference", form.trackingLink);
      y2 += 30;

      drawCheck(margin, y2, form.driverCountedFreight, "Driver counted freight");
      drawCheck(margin + 190, y2, form.shipperLoadAndCount, "Shipper load and count (SLC)");
      drawCheck(margin + 400, y2, form.sealVerified, "Seal verified at pickup");
      y2 += 26;

      sectionHeading("Pickup Certifications and Exceptions", margin, y2, contentWidth);
      y2 += 20;
      doc.setFont("times", "italic");
      doc.setFontSize(8.2);
      setText(CHARCOAL);
      const certText =
        "Shipper certification: the freight is properly described, packaged, marked, labeled, and in apparent good order. For hazardous materials, the shipper certifies compliance with applicable transportation regulations and has supplied required shipping papers.";
      const certLines = doc.splitTextToSize(certText, contentWidth);
      doc.text(certLines, margin, y2 + 10);
      y2 += certLines.length * 10.5 + 16;

      y2 = ensureSpace(y2, 60, "Custody & Receipts", "Continued");
      drawLongBox(
        margin,
        y2,
        contentWidth,
        54,
        "Exceptions / Visible Damage / Count Discrepancy at Pickup",
        form.pickupExceptions,
      );
      y2 += 70;

      y2 = ensureSpace(y2, 90, "Custody & Receipts", "Continued");
      drawField(margin, y2, third - 10, "Shipper Signature / Typed Name", form.shipperTypedName);
      drawField(margin + third, y2, third - 10, "Date / Time", form.shipperDateTime);
      drawField(margin + third * 2, y2, third, "Title", form.shipperTitle);
      if (form.shipperSignature) {
        try {
          doc.addImage(form.shipperSignature, "PNG", margin + 2, y2 + 26, 140, 30);
        } catch {
          // ignore malformed signature data
        }
      }
      y2 += 56;

      const carrierLines = doc.splitTextToSize(form.carrierReceiptText, contentWidth);
      y2 = ensureSpace(y2, carrierLines.length * 10.5 + 100, "Custody & Receipts", "Continued");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      setText(NAVY);
      doc.text("CARRIER RECEIPT", margin, y2);
      setDraw(GOLD);
      doc.setLineWidth(1.2);
      doc.line(margin, y2 + 4, margin + 22, y2 + 4);
      doc.setFont("times", "italic");
      doc.setFontSize(8.2);
      setText(CHARCOAL);
      doc.text(carrierLines, margin, y2 + 16);
      y2 += 16 + carrierLines.length * 10.5 + 6;

      drawField(margin, y2, third - 10, "Driver Signature / Typed Name", form.driverTypedName);
      drawField(margin + third, y2, third - 10, "Date / Time", form.driverDateTime);
      drawField(margin + third * 2, y2, third, "Seal No. Confirmed", form.sealConfirmed);
      if (form.driverSignature) {
        try {
          doc.addImage(form.driverSignature, "PNG", margin + 2, y2 + 26, 140, 30);
        } catch {
          // ignore malformed signature data
        }
      }
      y2 += 70;

      y2 = ensureSpace(y2, 150, "Custody & Receipts", "Continued");
      sectionHeading("Delivery Receipt / Proof of Delivery", margin, y2, contentWidth);
      y2 += 20;
      drawLongBox(
        margin,
        y2,
        contentWidth,
        54,
        "Delivery Exceptions / Shortage / Over / Damage / Seal Condition",
        form.deliveryExceptions,
      );
      y2 += 70;
      drawField(
        margin,
        y2,
        third - 10,
        "Consignee Signature / Typed Name",
        form.consigneeTypedName,
      );
      drawField(margin + third, y2, third - 10, "Date / Time", form.consigneeDateTime);
      drawField(margin + third * 2, y2, third, "Title", form.consigneeTitle);
      if (form.consigneeSignature) {
        try {
          doc.addImage(form.consigneeSignature, "PNG", margin + 2, y2 + 26, 140, 30);
        } catch {
          // ignore malformed signature data
        }
      }
      y2 += 66;

      y2 = ensureSpace(y2, 84, "Custody & Receipts", "Continued");
      setFill(NOTICE_BG);
      setDraw(NAVY);
      doc.setLineWidth(0.9);
      doc.rect(margin, y2, contentWidth, 74, "FD");
      doc.setFont("times", "bold");
      doc.setFontSize(9.8);
      setText(NAVY);
      doc.text("BROKER STATUS AND CONTROLLING DOCUMENTS", margin + 10, y2 + 17);
      doc.setFont("times", "italic");
      doc.setFontSize(8.1);
      setText(CHARCOAL);
      const legalText = `${portalCompanyName} is a property broker, not the motor carrier or warehouseman. The motor carrier has exclusive custody, control, and responsibility for transportation, loading review, securement, and delivery. This BOL does not change the load-specific rate confirmation or any signed broker-carrier agreement. Cargo claims are governed by applicable law and controlling contracts, including 49 U.S.C. 14706 when applicable.`;
      const legalLines = doc.splitTextToSize(legalText, contentWidth - 20);
      doc.text(legalLines, margin + 10, y2 + 29);

      drawFooter();

      // Stamp accurate, dynamic "Page X of N" now that the true page count
      // is known.
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p += 1) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.8);
        setText(MUTED);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, 112, { align: "right" });
      }

      doc.save(`${form.bolNo || "Bill_of_Lading"}.pdf`);
    } catch (error) {
      console.error(error);
      alert("PDF generation failed. Please check the form values and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Straight Bill of Lading"
        description="Complete the shipment record, review the live preview, and generate a polished PDF for release and compliance."
      />

      <div className="sticky top-0 z-20 -mx-1 rounded-[26px] border border-[var(--color-doc-border)] bg-[var(--color-doc-surface)]/90 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-[var(--color-doc-surface)]/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand)] text-xs font-black tracking-[0.18em] text-[var(--color-cta-text)]">
              BOL
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--color-doc-text)]">
                {form.bolNo || "Untitled BOL"} · {form.loadNo || "No load number"}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--color-doc-text-subtle)]">
                {completion.missing.length === 0 ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-[var(--color-success)]" />
                    Ready to generate
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-3.5 text-[var(--color-warning)]" />
                    {completion.done}/{completion.total} required fields complete
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm(initialState)}
              className="app-button-secondary border"
            >
              Reset form
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFreightItems(initialFreightItems)}
              className="app-button-secondary border"
            >
              Clear freight rows
            </Button>
            <Button
              type="button"
              onClick={generatePDF}
              disabled={isGenerating}
              className="app-button-primary shadow-sm"
            >
              <FileDown className="mr-2 size-4" />
              {isGenerating ? "Generating…" : "Generate PDF"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.7fr)]">
        <div className="space-y-6">
          <Card className={sectionClass}>
            <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <SectionTitle icon={ClipboardList}>Shipment Identification</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Load No." error={errors.loadNo}>
                  <Input
                    value={form.loadNo}
                    onChange={(e) => updateField("loadNo", e.target.value)}
                  />
                </Field>
                <Field label="BOL No." error={errors.bolNo}>
                  <Input
                    value={form.bolNo}
                    onChange={(e) => updateField("bolNo", e.target.value)}
                  />
                </Field>
                <Field label="Customer PO / reference">
                  <Input
                    value={form.customerReference}
                    onChange={(e) => updateField("customerReference", e.target.value)}
                  />
                </Field>
                <Field label="Date issued" error={errors.dateIssued}>
                  <Input
                    type="date"
                    value={form.dateIssued}
                    onChange={(e) => updateField("dateIssued", e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Pickup date / time / time zone">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      type="date"
                      value={form.pickupDate}
                      onChange={(e) => updateField("pickupDate", e.target.value)}
                    />
                    <Input
                      type="time"
                      value={form.pickupTime}
                      onChange={(e) => updateField("pickupTime", e.target.value)}
                    />
                    <Input
                      value={form.pickupTimezone}
                      onChange={(e) => updateField("pickupTimezone", e.target.value)}
                    />
                  </div>
                </Field>
                <Field label="Delivery date / time / time zone">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      type="date"
                      value={form.deliveryDate}
                      onChange={(e) => updateField("deliveryDate", e.target.value)}
                    />
                    <Input
                      type="time"
                      value={form.deliveryTime}
                      onChange={(e) => updateField("deliveryTime", e.target.value)}
                    />
                    <Input
                      value={form.deliveryTimezone}
                      onChange={(e) => updateField("deliveryTimezone", e.target.value)}
                    />
                  </div>
                </Field>
                <Field label="Equipment type">
                  <Input
                    value={form.equipmentType}
                    onChange={(e) => updateField("equipmentType", e.target.value)}
                  />
                </Field>
              </div>

              <div className="app-surface-subtle rounded-lg border px-3 py-2 text-right text-xs italic text-[var(--color-doc-text-subtle)]">
                {portalCompanyName} acts solely as a property broker
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <SectionTitle icon={MapPin}>Origin / Shipper</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Shipper name" error={errors.shipperName}>
                  <Input
                    value={form.shipperName}
                    onChange={(e) => updateField("shipperName", e.target.value)}
                  />
                </Field>
                <Field label="Contact / phone">
                  <Input
                    value={form.shipperContact}
                    onChange={(e) => updateField("shipperContact", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Pickup address">
                  <Textarea
                    value={form.pickupAddress}
                    onChange={(e) => updateField("pickupAddress", e.target.value)}
                    className="min-h-20"
                  />
                </Field>
                <Field label="Dock / appointment no.">
                  <Input
                    value={form.pickupDock}
                    onChange={(e) => updateField("pickupDock", e.target.value)}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <SectionTitle icon={MapPin}>Destination / Consignee</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Consignee name" error={errors.consigneeName}>
                  <Input
                    value={form.consigneeName}
                    onChange={(e) => updateField("consigneeName", e.target.value)}
                  />
                </Field>
                <Field label="Contact / phone">
                  <Input
                    value={form.consigneeContact}
                    onChange={(e) => updateField("consigneeContact", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Delivery address">
                  <Textarea
                    value={form.deliveryAddress}
                    onChange={(e) => updateField("deliveryAddress", e.target.value)}
                    className="min-h-20"
                  />
                </Field>
                <Field label="Dock / appointment no.">
                  <Input
                    value={form.deliveryDock}
                    onChange={(e) => updateField("deliveryDock", e.target.value)}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle icon={Package}>Freight Description</SectionTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFreightRow}
                  className="app-button-secondary border"
                >
                  <Plus className="mr-2 size-4" /> Add row
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {errors.freight ? (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-doc-danger-soft)] px-3 py-2 text-xs font-medium text-[var(--color-danger)]">
                  <AlertTriangle className="size-3.5" />
                  {errors.freight}
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-lg border border-[var(--color-doc-border)]">
                <div className="min-w-[780px]">
                  <div className="grid grid-cols-[46px_52px_60px_1.7fr_0.8fr_88px_32px] gap-2 border-b border-[var(--color-doc-border)] bg-[var(--color-doc-surface-strong)] px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-doc-text-muted)]">
                    <span>HM</span>
                    <span>Units</span>
                    <span>Pkg</span>
                    <span>Commodity / description</span>
                    <span>NMFC / class</span>
                    <span>Weight</span>
                    <span />
                  </div>

                  {freightItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`grid grid-cols-[46px_52px_60px_1.7fr_0.8fr_88px_32px] items-start gap-2 px-2 py-2 ${
                        idx % 2 === 1
                          ? "bg-[var(--color-doc-surface-muted)]"
                          : "bg-[var(--color-doc-surface)]"
                      }`}
                    >
                      <Input
                        aria-label="Hazmat marker"
                        value={item.hm}
                        onChange={(e) => onFreightChange(item.id, "hm", e.target.value)}
                      />
                      <Input
                        aria-label="Units"
                        value={item.units}
                        onChange={(e) => onFreightChange(item.id, "units", e.target.value)}
                      />
                      <Input
                        aria-label="Package type"
                        value={item.pkg}
                        onChange={(e) => onFreightChange(item.id, "pkg", e.target.value)}
                      />
                      <Input
                        aria-label="Commodity description"
                        value={item.commodity}
                        onChange={(e) => onFreightChange(item.id, "commodity", e.target.value)}
                      />
                      <Input
                        aria-label="NMFC / class"
                        value={item.nmfcClass}
                        onChange={(e) => onFreightChange(item.id, "nmfcClass", e.target.value)}
                      />
                      <Input
                        aria-label="Weight"
                        value={item.weight}
                        onChange={(e) => onFreightChange(item.id, "weight", e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFreightRow(item.id)}
                        disabled={freightItems.length === 1}
                        aria-label="Remove row"
                      >
                        <Trash2 className="size-4 text-[var(--color-danger)]" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Total units">
                  <Input
                    value={formatNumber(totals.units)}
                    readOnly
                    className="bg-[var(--color-doc-surface-strong)]"
                  />
                </Field>
                <Field label="Total weight">
                  <Input
                    value={`${formatNumber(totals.weight)} lb`}
                    readOnly
                    className="bg-[var(--color-doc-surface-strong)]"
                  />
                </Field>
                <Field label="Declared value (if any)">
                  <Input
                    placeholder="$0.00"
                    value={form.declaredValue}
                    onChange={(e) => updateField("declaredValue", e.target.value)}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => updateField("hazmat", "No")}
                  aria-pressed={form.hazmat === "No"}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    form.hazmat === "No"
                      ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-cta-text)]"
                      : "border-[var(--color-doc-border)] bg-[var(--color-doc-surface)] text-[var(--color-doc-text)] hover:bg-[var(--color-doc-surface-strong)]"
                  }`}
                >
                  Hazmat — No
                </button>
                <button
                  type="button"
                  onClick={() => updateField("hazmat", "Yes")}
                  aria-pressed={form.hazmat === "Yes"}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    form.hazmat === "Yes"
                      ? "border-[var(--color-danger)] bg-[var(--color-danger)] text-[var(--color-on-danger)]"
                      : "border-[var(--color-doc-border)] bg-[var(--color-doc-surface)] text-[var(--color-doc-text)] hover:bg-[var(--color-doc-surface-strong)]"
                  }`}
                >
                  <Flame className="size-3.5" />
                  Hazmat — Yes
                </button>
              </div>

              <div className="app-surface-subtle rounded-lg border px-3 py-2 text-right text-xs italic text-[var(--color-doc-text-subtle)]">
                Shipper must identify hazardous materials and special handling needs
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <SectionTitle icon={ClipboardList}>Special Instructions</SectionTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Field label="Handling / temperature / securement">
                <Textarea
                  value={form.specialInstructions}
                  onChange={(e) => updateField("specialInstructions", e.target.value)}
                  className="min-h-28"
                />
              </Field>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <SectionTitle icon={Truck}>Carrier, Driver and Cargo Control</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Carrier legal name">
                  <Input
                    value={form.carrierLegalName}
                    onChange={(e) => updateField("carrierLegalName", e.target.value)}
                  />
                </Field>
                <Field label="Carrier MC / USDOT">
                  <Input
                    value={form.carrierMcUsdot}
                    onChange={(e) => updateField("carrierMcUsdot", e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Driver name">
                  <Input
                    value={form.driverName}
                    onChange={(e) => updateField("driverName", e.target.value)}
                  />
                </Field>
                <Field label="Driver phone">
                  <Input
                    value={form.driverPhone}
                    onChange={(e) => updateField("driverPhone", e.target.value)}
                  />
                </Field>
                <Field label="Tractor / trailer no.">
                  <Input
                    value={form.tractorTrailerNo}
                    onChange={(e) => updateField("tractorTrailerNo", e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Seal no.">
                  <Input
                    value={form.sealNo}
                    onChange={(e) => updateField("sealNo", e.target.value)}
                  />
                </Field>
                <Field label="Required / actual temp">
                  <Input
                    value={form.reqActualTemp}
                    onChange={(e) => updateField("reqActualTemp", e.target.value)}
                  />
                </Field>
                <Field label="Tracking link / reference">
                  <Input
                    value={form.trackingLink}
                    onChange={(e) => updateField("trackingLink", e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-doc-text)]">
                  <Checkbox
                    checked={form.driverCountedFreight}
                    onCheckedChange={(checked) =>
                      updateField("driverCountedFreight", checked === true)
                    }
                  />
                  Driver counted freight
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-doc-text)]">
                  <Checkbox
                    checked={form.shipperLoadAndCount}
                    onCheckedChange={(checked) =>
                      updateField("shipperLoadAndCount", checked === true)
                    }
                  />
                  Shipper load and count (SLC)
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-doc-text)]">
                  <Checkbox
                    checked={form.sealVerified}
                    onCheckedChange={(checked) => updateField("sealVerified", checked === true)}
                  />
                  Seal verified at pickup
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <SectionTitle icon={ShieldCheck}>Pickup Certifications and Exceptions</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Shipper certification:{" "}
                </span>
                The freight is properly described, packaged, marked, labeled, and in apparent good
                order. For hazardous materials, the shipper certifies compliance with applicable
                transportation regulations and has supplied required shipping papers.
              </p>

              <Field label="Exceptions / visible damage / count discrepancy at pickup">
                <Textarea
                  value={form.pickupExceptions}
                  onChange={(e) => updateField("pickupExceptions", e.target.value)}
                  className="min-h-28"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Shipper signature / typed name">
                  <Input
                    value={form.shipperTypedName}
                    onChange={(e) => updateField("shipperTypedName", e.target.value)}
                  />
                </Field>
                <Field label="Date / time">
                  <Input
                    type="datetime-local"
                    value={form.shipperDateTime}
                    onChange={(e) => updateField("shipperDateTime", e.target.value)}
                  />
                </Field>
                <Field label="Title">
                  <Input
                    value={form.shipperTitle}
                    onChange={(e) => updateField("shipperTitle", e.target.value)}
                  />
                </Field>
              </div>

              <SignatureField
                label="Shipper signature"
                value={form.shipperSignature}
                onChange={(val) => updateField("shipperSignature", val)}
              />
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <SectionTitle icon={FileSignature}>Carrier Receipt</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Field label="Carrier receipt acknowledgment text">
                <Textarea
                  value={form.carrierReceiptText}
                  onChange={(e) => updateField("carrierReceiptText", e.target.value)}
                  className="min-h-20"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Driver signature / typed name">
                  <Input
                    value={form.driverTypedName}
                    onChange={(e) => updateField("driverTypedName", e.target.value)}
                  />
                </Field>
                <Field label="Date / time">
                  <Input
                    type="datetime-local"
                    value={form.driverDateTime}
                    onChange={(e) => updateField("driverDateTime", e.target.value)}
                  />
                </Field>
                <Field label="Seal no. confirmed">
                  <Input
                    value={form.sealConfirmed}
                    onChange={(e) => updateField("sealConfirmed", e.target.value)}
                  />
                </Field>
              </div>

              <SignatureField
                label="Driver signature"
                value={form.driverSignature}
                onChange={(val) => updateField("driverSignature", val)}
              />
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <SectionTitle icon={CheckCircle2}>Delivery Receipt / Proof of Delivery</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Field label="Delivery exceptions / shortage / over / damage / seal condition">
                <Textarea
                  value={form.deliveryExceptions}
                  onChange={(e) => updateField("deliveryExceptions", e.target.value)}
                  className="min-h-28"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Consignee signature / typed name">
                  <Input
                    value={form.consigneeTypedName}
                    onChange={(e) => updateField("consigneeTypedName", e.target.value)}
                  />
                </Field>
                <Field label="Date / time">
                  <Input
                    type="datetime-local"
                    value={form.consigneeDateTime}
                    onChange={(e) => updateField("consigneeDateTime", e.target.value)}
                  />
                </Field>
                <Field label="Title">
                  <Input
                    value={form.consigneeTitle}
                    onChange={(e) => updateField("consigneeTitle", e.target.value)}
                  />
                </Field>
              </div>

              <SignatureField
                label="Consignee signature"
                value={form.consigneeSignature}
                onChange={(val) => updateField("consigneeSignature", val)}
              />
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <SectionTitle icon={ShieldCheck}>
                Broker Status and Controlling Documents
              </SectionTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm leading-6 text-[var(--color-doc-text)]">
                {portalCompanyName} is a property broker, not the motor carrier or warehouseman. The
                motor carrier has exclusive custody, control, and responsibility for transportation,
                loading review, securement, and delivery. This BOL does not change the load-specific
                rate confirmation or any signed broker-carrier agreement. Cargo claims are governed
                by applicable law and controlling contracts, including 49 U.S.C. 14706 when
                applicable.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card className={sectionClass}>
            <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-blue-950 dark:text-blue-100">
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="overflow-hidden rounded-[18px] border border-[var(--color-doc-border)] bg-[var(--color-doc-surface)] shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <div className="border-b border-[var(--color-doc-border)] bg-[var(--color-brand)] px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-11 items-center justify-center rounded-md bg-[var(--color-cta-text)] text-[10px] font-black tracking-[0.2em] text-[var(--color-brand)]">
                        BOL
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-cta-text)]">
                          {portalCompanyName}
                        </div>
                        <div className="text-[9px] text-[var(--color-doc-text-secondary)]">
                          Straight Bill of Lading
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] font-medium text-[var(--color-cta-text)]">
                      {form.bolNo || "BOL"} · {DOCUMENT_REVISION}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-3 text-[11px] text-[var(--color-doc-text)]">
                  <div className="grid grid-cols-2 gap-2">
                    <FieldPreview label="Load No." value={form.loadNo} />
                    <FieldPreview label="Date issued" value={formatDate(form.dateIssued)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldPreview label="Shipper" value={form.shipperName} />
                    <FieldPreview label="Consignee" value={form.consigneeName} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldPreview label="Pickup" value={form.pickupAddress} />
                    <FieldPreview label="Delivery" value={form.deliveryAddress} />
                  </div>

                  <div className="rounded-lg border border-[var(--color-doc-border)] bg-[var(--color-doc-surface-strong)] p-2">
                    <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[var(--color-doc-text-muted)]">
                      <span>Freight summary</span>
                      <span>
                        {formatNumber(totals.units)} units · {formatNumber(totals.weight)} lb
                      </span>
                    </div>
                    {freightItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="mb-1 flex justify-between gap-2 text-[10px]">
                        <span className="truncate">{item.commodity || "Untitled commodity"}</span>
                        <span className="shrink-0 text-[var(--color-doc-text-subtle)]">
                          {item.weight || "0"} lb
                        </span>
                      </div>
                    ))}
                    {freightItems.length > 3 ? (
                      <div className="text-[10px] text-[var(--color-doc-text-subtle)]">
                        +{freightItems.length - 3} more row
                        {freightItems.length - 3 === 1 ? "" : "s"}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        form.hazmat === "Yes"
                          ? "bg-[var(--color-doc-danger-soft)] text-[var(--color-danger)]"
                          : "bg-[var(--color-doc-surface-strong)] text-[var(--color-doc-text-muted)]"
                      }`}
                    >
                      {form.hazmat === "Yes" ? <Flame className="size-3" /> : null}
                      Hazmat: {form.hazmat}
                    </span>
                    <span className="text-[10px] text-[var(--color-doc-text-subtle)]">
                      2-page document
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-[var(--color-doc-border)] bg-[var(--color-doc-surface-strong)] p-3 text-xs">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-doc-text)]">
                    Required fields
                  </span>
                  <span className="text-[var(--color-doc-text-muted)]">
                    {completion.done}/{completion.total}
                  </span>
                </div>
                <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-doc-surface)]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      completion.missing.length === 0
                        ? "bg-[var(--color-success)]"
                        : "bg-[var(--color-brand)]"
                    }`}
                    style={{ width: `${(completion.done / completion.total) * 100}%` }}
                  />
                </div>
                {completion.missing.length > 0 ? (
                  <ul className="space-y-1 text-[var(--color-warning)]">
                    {completion.missing.map((f) => (
                      <li key={f.key} className="flex items-center gap-1.5">
                        <AlertTriangle className="size-3" /> {f.label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-1.5 text-[var(--color-success)]">
                    <CheckCircle2 className="size-3.5" /> All required fields are complete
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 text-left">
      <Label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-doc-text-muted)]">
        {label}
      </Label>
      {children}
      {error ? (
        <span className="flex items-center gap-1 text-xs font-medium text-[var(--color-danger)]">
          <AlertTriangle className="size-3" /> {error}
        </span>
      ) : null}
    </div>
  );
}

function FieldPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-doc-border)] bg-[var(--color-doc-surface)] p-2">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-doc-text-subtle)]">
        {label}
      </div>
      <div className="truncate text-[10px] text-[var(--color-doc-text)]">{value || "—"}</div>
    </div>
  );
}

function SignatureField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getPoint = (canvas: HTMLCanvasElement, event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.setPointerCapture(event.pointerId);
    const { x, y } = getPoint(canvas, event);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    setIsDrawing(true);
  };

  const continueDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getPoint(canvas, event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-doc-text-muted)]">
          {label}
        </Label>
        <Button type="button" variant="ghost" size="sm" onClick={clearSignature}>
          Clear
        </Button>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={320}
          height={120}
          onPointerDown={startDraw}
          onPointerMove={continueDraw}
          onPointerUp={stopDraw}
          onPointerLeave={stopDraw}
          className="w-full touch-none rounded-lg border border-[var(--color-doc-border)] bg-[var(--color-doc-surface)]"
        />
        {!value ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-[var(--color-doc-text-subtle)]">
            Sign here
          </span>
        ) : null}
      </div>
      {value ? (
        <img
          src={value}
          alt={label}
          className="h-12 rounded border border-[var(--color-doc-border)] bg-[var(--color-doc-surface)]"
        />
      ) : null}
    </div>
  );
}

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

const sectionClass =
  "rounded-[22px] border border-slate-200 bg-white/95 text-card-foreground shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-all duration-200 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-100";

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
    <CardTitle className="flex items-center gap-2 text-base font-bold text-blue-950 dark:text-blue-100">
      <span className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
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
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;
      const safeBottom = pageHeight - 54;

      const drawHeader = (title: string) => {
        const leftX = margin;
        const topY = 24;

        doc.setFillColor(12, 28, 47);
        doc.roundedRect(leftX, topY, 96, 40, 5, 5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(21);
        doc.text("BROKER", leftX + 15, topY + 25);

        doc.setTextColor(22, 49, 76);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text(portalCompanyName, leftX + 118, topY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.2);
        doc.text(BROKER_ADDRESS, leftX + 118, topY + 28);
        doc.text(`${BROKER_PHONE} | ${BROKER_EMAIL} | ${BROKER_WEBSITE}`, leftX + 118, topY + 39);

        doc.setDrawColor(151, 172, 190);
        doc.setLineWidth(0.8);
        doc.line(margin, topY + 53, pageWidth - margin, topY + 53);

        doc.setTextColor(24, 38, 54);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(title, margin, 86);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.1);
        doc.setTextColor(86, 96, 108);
        doc.text(
          `${form.bolNo || "BOL"} | ${DOCUMENT_REVISION} | Effective ${formatDate(form.dateIssued)}`,
          pageWidth - margin,
          86,
          { align: "right" },
        );
      };

      const drawFooter = () => {
        doc.setTextColor(40, 52, 62);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.4);
        doc.text(
          `FMCSA PROPERTY BROKER | ${BROKER_MC_NUMBER} | ${BROKER_USDOT_NUMBER}`,
          margin,
          pageHeight - 18,
        );
        doc.text(
          "CONTROLLED TEMPLATE | Verify current revision",
          pageWidth - margin,
          pageHeight - 18,
          {
            align: "right",
          },
        );
      };

      let pageNumber = 1;

      const newPage = (title: string) => {
        drawFooter();
        doc.addPage();
        pageNumber += 1;
        drawHeader(title);
        return 110;
      };

      // Ensures the next block of `neededHeight` fits before the footer; if
      // not, starts a continuation page automatically instead of overflowing
      // (previous version had no protection here, so extra freight rows or
      // long free-text fields could silently run off the bottom of the page).
      const ensureSpace = (currentY: number, neededHeight: number, continuationTitle: string) => {
        if (currentY + neededHeight > safeBottom) {
          return newPage(continuationTitle);
        }
        return currentY;
      };

      const drawField = (
        x: number,
        y: number,
        w: number,
        h: number,
        label: string,
        value: string,
        labelSize = 7,
      ) => {
        doc.setDrawColor(204, 214, 224);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, w, h, 2, 2, "FD");
        doc.setTextColor(40, 52, 62);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(labelSize);
        doc.text(label, x + 5, y + 12);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.4);
        doc.setTextColor(18, 23, 32);
        const text = value || "";
        const lines = doc.splitTextToSize(text, w - 12);
        const lineHeight = 9;
        const startY = y + 22;
        const maxLines = Math.max(1, Math.min(3, lines.length));
        for (let i = 0; i < maxLines; i += 1) {
          doc.text(lines[i] || "", x + 5, startY + i * lineHeight);
        }
      };

      const drawCheck = (x: number, y: number, checked: boolean) => {
        doc.setDrawColor(125, 136, 147);
        doc.rect(x, y, 10, 10);
        if (checked) {
          doc.setDrawColor(20, 31, 47);
          doc.line(x + 2, y + 5, x + 4, y + 7);
          doc.line(x + 4, y + 7, x + 8, y + 3);
        }
      };

      const drawSectionHeading = (label: string, x: number, y: number, width: number) => {
        doc.setFillColor(235, 241, 247);
        doc.roundedRect(x, y, width, 18, 2, 2, "F");
        doc.setTextColor(17, 39, 61);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.6);
        doc.text(label, x + 6, y + 12);
      };

      const drawLongBox = (
        x: number,
        y: number,
        width: number,
        height: number,
        label: string,
        value: string,
      ) => {
        doc.setDrawColor(151, 171, 193);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, width, height, 0, 0, "FD");
        if (label) {
          doc.setTextColor(41, 50, 70);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.text(label, x + 5, y + 13);
        }
        doc.setTextColor(18, 23, 32);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.2);
        const text = doc.splitTextToSize(value || "", width - 12);
        text.forEach((line: string, idx: number) => {
          doc.text(line, x + 5, y + 23 + idx * 10);
        });
      };

      // ---------------------------------------------------------------- //
      // Page 1
      // ---------------------------------------------------------------- //
      drawHeader("STRAIGHT BILL OF LADING - NON-NEGOTIABLE");

      let y = 110;
      drawSectionHeading("SHIPMENT IDENTIFICATION", margin, y, contentWidth);
      y += 24;

      drawField(margin, y, contentWidth / 4 - 6, 28, "LOAD NO.", form.loadNo);
      drawField(margin + contentWidth / 4, y, contentWidth / 4 - 6, 28, "BOL NO.", form.bolNo);
      drawField(
        margin + (contentWidth / 4) * 2,
        y,
        contentWidth / 4 - 6,
        28,
        "CUSTOMER PO / REFERENCE",
        form.customerReference,
      );
      drawField(
        margin + (contentWidth / 4) * 3 + 6,
        y,
        contentWidth / 4 - 12,
        28,
        "DATE ISSUED",
        formatDate(form.dateIssued),
      );
      y += 38;

      drawField(
        margin,
        y,
        contentWidth / 3 - 8,
        28,
        "PICKUP DATE / TIME / TIME ZONE",
        `${form.pickupDate} ${form.pickupTime} ${form.pickupTimezone}`.trim(),
      );
      drawField(
        margin + contentWidth / 3,
        y,
        contentWidth / 3 - 8,
        28,
        "DELIVERY DATE / TIME / TIME ZONE",
        `${form.deliveryDate} ${form.deliveryTime} ${form.deliveryTimezone}`.trim(),
      );
      drawField(
        margin + (contentWidth / 3) * 2 + 8,
        y,
        contentWidth / 3 - 16,
        28,
        "EQUIPMENT TYPE",
        form.equipmentType,
      );
      y += 42;

      doc.setFont("helvetica", "italic");
      doc.setTextColor(90, 96, 103);
      doc.setFontSize(8.5);
      doc.text(`${portalCompanyName} acts solely as a property broker`, pageWidth - margin, y + 4, {
        align: "right",
      });

      y += 12;
      drawSectionHeading("ORIGIN / SHIPPER", margin, y, contentWidth);
      y += 24;
      drawField(margin, y, contentWidth / 2 - 8, 28, "SHIPPER NAME", form.shipperName);
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        28,
        "CONTACT / PHONE",
        form.shipperContact,
      );
      y += 38;
      drawField(margin, y, contentWidth / 2 - 8, 28, "PICKUP ADDRESS", form.pickupAddress);
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        28,
        "DOCK / APPOINTMENT NO.",
        form.pickupDock,
      );
      y += 46;

      drawSectionHeading("DESTINATION / CONSIGNEE", margin, y, contentWidth);
      y += 24;
      drawField(margin, y, contentWidth / 2 - 8, 28, "CONSIGNEE NAME", form.consigneeName);
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        28,
        "CONTACT / PHONE",
        form.consigneeContact,
      );
      y += 38;
      drawField(margin, y, contentWidth / 2 - 8, 28, "DELIVERY ADDRESS", form.deliveryAddress);
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        28,
        "DOCK / APPOINTMENT NO.",
        form.deliveryDock,
      );
      y += 46;

      y = ensureSpace(y, 40, "STRAIGHT BILL OF LADING - NON-NEGOTIABLE (CONTINUED)");
      drawSectionHeading("FREIGHT DESCRIPTION", margin, y, contentWidth);
      doc.setTextColor(90, 96, 103);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.3);
      doc.text(
        "Shipper must identify hazardous materials and special handling needs",
        pageWidth - margin,
        y + 12,
        { align: "right" },
      );
      y += 22;

      const rowHeight = 36;
      const colW = { hm: 46, units: 52, pkg: 50, commodity: 200, nmfc: 83, weight: 64 };
      const headers = ["HM", "Units", "Pkg", "Commodity / Description", "NMFC / Class", "Weight"];
      const headerWidths = [colW.hm, colW.units, colW.pkg, colW.commodity, colW.nmfc, colW.weight];

      const drawFreightTableHeader = (headerY: number) => {
        let hx = margin;
        headers.forEach((header, idx) => {
          doc.setFillColor(243, 247, 250);
          doc.setDrawColor(151, 171, 193);
          doc.rect(hx, headerY, headerWidths[idx], 18, "FD");
          doc.setTextColor(35, 46, 60);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.2);
          doc.text(header, hx + 4, headerY + 12);
          hx += headerWidths[idx];
        });
        return headerY + 18;
      };

      let currentY = drawFreightTableHeader(y);
      freightItems.forEach((row) => {
        currentY = ensureSpace(
          currentY,
          rowHeight,
          "STRAIGHT BILL OF LADING - NON-NEGOTIABLE (CONTINUED)",
        );
        // re-draw the column header at the top of a continuation page for readability
        if (currentY === 110) {
          currentY = drawFreightTableHeader(currentY);
        }
        let x = margin;
        const rowValues = [row.hm, row.units, row.pkg, row.commodity, row.nmfcClass, row.weight];
        rowValues.forEach((value, idx) => {
          doc.setDrawColor(151, 171, 193);
          doc.rect(x, currentY, headerWidths[idx], rowHeight, "S");
          if (idx === 3) {
            const lines = doc.splitTextToSize(value || "", headerWidths[idx] - 10);
            const lineStartY = currentY + 12;
            lines.slice(0, 2).forEach((line: string, lineIndex: number) => {
              doc.text(line, x + 5, lineStartY + lineIndex * 10);
            });
          } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text(value || "", x + 5, currentY + 12);
          }
          x += headerWidths[idx];
        });
        currentY += rowHeight;
      });
      y = currentY + 10;

      y = ensureSpace(y, 90, "STRAIGHT BILL OF LADING - NON-NEGOTIABLE (CONTINUED)");
      drawField(margin, y, 172, 26, "TOTAL UNITS", formatNumber(totals.units));
      drawField(margin + 172 + 10, y, 172, 26, "TOTAL WEIGHT", `${formatNumber(totals.weight)} lb`);
      drawField(margin + 354 + 20, y, 136, 26, "DECLARED VALUE (IF ANY)", form.declaredValue);
      y += 38;

      drawCheck(margin + 350, y, form.hazmat === "Yes");
      doc.setTextColor(28, 34, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.4);
      doc.text("Hazmat - Yes", margin + 366, y + 8);
      drawCheck(margin + 450, y, form.hazmat === "No");
      doc.text("Hazmat - No", margin + 466, y + 8);
      y += 16;

      drawLongBox(
        margin,
        y,
        contentWidth,
        72,
        "SPECIAL INSTRUCTIONS / HANDLING / TEMPERATURE / SECUREMENT",
        form.specialInstructions,
      );
      y += 90;

      // ---------------------------------------------------------------- //
      // Page 2
      // ---------------------------------------------------------------- //
      let y2 = newPage("STRAIGHT BILL OF LADING - CUSTODY & RECEIPTS");

      drawSectionHeading("CARRIER, DRIVER AND CARGO CONTROL", margin, y2, contentWidth);
      y2 += 22;
      drawField(margin, y2, contentWidth / 2 - 8, 28, "CARRIER LEGAL NAME", form.carrierLegalName);
      drawField(
        margin + contentWidth / 2 + 8,
        y2,
        contentWidth / 2 - 16,
        28,
        "CARRIER MC / USDOT",
        form.carrierMcUsdot,
      );
      y2 += 38;
      drawField(margin, y2, contentWidth / 3 - 8, 28, "DRIVER NAME", form.driverName);
      drawField(
        margin + contentWidth / 3,
        y2,
        contentWidth / 3 - 8,
        28,
        "DRIVER PHONE",
        form.driverPhone,
      );
      drawField(
        margin + (contentWidth / 3) * 2 + 8,
        y2,
        contentWidth / 3 - 16,
        28,
        "TRACTOR / TRAILER NO.",
        form.tractorTrailerNo,
      );
      y2 += 38;
      drawField(margin, y2, contentWidth / 3 - 8, 28, "SEAL NO.", form.sealNo);
      drawField(
        margin + contentWidth / 3,
        y2,
        contentWidth / 3 - 8,
        28,
        "REQUIRED / ACTUAL TEMP",
        form.reqActualTemp,
      );
      drawField(
        margin + (contentWidth / 3) * 2 + 8,
        y2,
        contentWidth / 3 - 16,
        28,
        "TRACKING LINK / REFERENCE",
        form.trackingLink,
      );
      y2 += 46;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.4);
      drawCheck(margin, y2, form.driverCountedFreight);
      doc.text("Driver counted freight", margin + 18, y2 + 8);
      drawCheck(margin + 195, y2, form.shipperLoadAndCount);
      doc.text("Shipper load and count (SLC)", margin + 213, y2 + 8);
      drawCheck(margin + 390, y2, form.sealVerified);
      doc.text("Seal verified at pickup", margin + 408, y2 + 8);
      y2 += 22;

      drawSectionHeading("PICKUP CERTIFICATIONS AND EXCEPTIONS", margin, y2, contentWidth);
      y2 += 22;
      doc.setTextColor(35, 44, 58);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.3);
      const certText =
        "SHIPPER CERTIFICATION: The freight is properly described, packaged, marked, labeled, and in apparent good order. For hazardous materials, the shipper certifies compliance with applicable transportation regulations and has supplied required shipping papers.";
      const certLines = doc.splitTextToSize(certText, contentWidth - 12);
      doc.text(certLines, margin + 6, y2 + 12);
      y2 += 12 + certLines.length * 10 + 8;

      y2 = ensureSpace(y2, 52, "STRAIGHT BILL OF LADING - CUSTODY & RECEIPTS (CONTINUED)");
      drawLongBox(
        margin,
        y2,
        contentWidth,
        52,
        "EXCEPTIONS / VISIBLE DAMAGE / COUNT DISCREPANCY AT PICKUP",
        form.pickupExceptions,
      );
      y2 += 70;

      y2 = ensureSpace(y2, 84, "STRAIGHT BILL OF LADING - CUSTODY & RECEIPTS (CONTINUED)");
      drawField(
        margin,
        y2,
        contentWidth / 3 - 8,
        28,
        "SHIPPER SIGNATURE / TYPED NAME",
        form.shipperTypedName,
      );
      drawField(
        margin + contentWidth / 3,
        y2,
        contentWidth / 3 - 8,
        28,
        "DATE / TIME",
        form.shipperDateTime,
      );
      drawField(
        margin + (contentWidth / 3) * 2 + 8,
        y2,
        contentWidth / 3 - 16,
        28,
        "TITLE",
        form.shipperTitle,
      );
      if (form.shipperSignature) {
        try {
          doc.addImage(form.shipperSignature, "PNG", margin + 8, y2 + 30, 150, 32);
        } catch {
          // ignore malformed signature data
        }
      }
      y2 += 54;

      const carrierLines = doc.splitTextToSize(form.carrierReceiptText, contentWidth - 8);
      y2 = ensureSpace(
        y2,
        carrierLines.length * 10 + 100,
        "STRAIGHT BILL OF LADING - CUSTODY & RECEIPTS (CONTINUED)",
      );
      doc.setTextColor(35, 44, 58);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.3);
      doc.text("CARRIER RECEIPT:", margin + 6, y2 + 6);
      doc.setFont("helvetica", "normal");
      doc.text(carrierLines, margin + 6, y2 + 18);
      y2 += 18 + carrierLines.length * 10;
      drawField(
        margin,
        y2,
        contentWidth / 3 - 8,
        28,
        "DRIVER SIGNATURE / TYPED NAME",
        form.driverTypedName,
      );
      drawField(
        margin + contentWidth / 3,
        y2,
        contentWidth / 3 - 8,
        28,
        "DATE / TIME",
        form.driverDateTime,
      );
      drawField(
        margin + (contentWidth / 3) * 2 + 8,
        y2,
        contentWidth / 3 - 16,
        28,
        "SEAL NO. CONFIRMED",
        form.sealConfirmed,
      );
      if (form.driverSignature) {
        try {
          doc.addImage(form.driverSignature, "PNG", margin + 8, y2 + 32, 150, 32);
        } catch {
          // ignore malformed signature data
        }
      }
      y2 += 70;

      y2 = ensureSpace(y2, 160, "STRAIGHT BILL OF LADING - CUSTODY & RECEIPTS (CONTINUED)");
      drawSectionHeading("DELIVERY RECEIPT / PROOF OF DELIVERY", margin, y2, contentWidth);
      y2 += 24;
      drawLongBox(
        margin,
        y2,
        contentWidth,
        52,
        "DELIVERY EXCEPTIONS / SHORTAGE / OVER / DAMAGE / SEAL CONDITION",
        form.deliveryExceptions,
      );
      y2 += 70;
      drawField(
        margin,
        y2,
        contentWidth / 3 - 8,
        28,
        "CONSIGNEE SIGNATURE / TYPED NAME",
        form.consigneeTypedName,
      );
      drawField(
        margin + contentWidth / 3,
        y2,
        contentWidth / 3 - 8,
        28,
        "DATE / TIME",
        form.consigneeDateTime,
      );
      drawField(
        margin + (contentWidth / 3) * 2 + 8,
        y2,
        contentWidth / 3 - 16,
        28,
        "TITLE",
        form.consigneeTitle,
      );
      if (form.consigneeSignature) {
        try {
          doc.addImage(form.consigneeSignature, "PNG", margin + 8, y2 + 32, 150, 32);
        } catch {
          // ignore malformed signature data
        }
      }
      y2 += 70;

      y2 = ensureSpace(y2, 60, "STRAIGHT BILL OF LADING - CUSTODY & RECEIPTS (CONTINUED)");
      doc.setFillColor(230, 238, 246);
      doc.roundedRect(margin, y2, contentWidth, 52, 1.5, 1.5, "F");
      doc.setTextColor(20, 44, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.8);
      doc.text("BROKER STATUS AND CONTROLLING DOCUMENTS", margin + 8, y2 + 15);
      doc.setTextColor(35, 44, 58);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.15);
      const legalText = `${portalCompanyName} is a property broker, not the motor carrier or warehouseman. The motor carrier has exclusive custody, control, and responsibility for transportation, loading review, securement, and delivery. This BOL does not change the load-specific rate confirmation or any signed broker-carrier agreement. Cargo claims are governed by applicable law and controlling contracts, including 49 U.S.C. 14706 when applicable.`;
      const legalLines = doc.splitTextToSize(legalText, contentWidth - 18);
      doc.text(legalLines, margin + 8, y2 + 26);

      drawFooter();

      // Stamp accurate, dynamic "Page X of N" now that the true page count
      // is known (previously hardcoded as "Page X of 2", which broke as
      // soon as content overflowed onto extra pages).
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p += 1) {
        doc.setPage(p);
        doc.setTextColor(90, 96, 103);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.1);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, 90, { align: "right" });
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

      <div className="sticky top-0 z-20 -mx-1 rounded-[26px] border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-700 dark:bg-slate-950/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-black tracking-[0.18em] text-white">
              BOL
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">
                {form.bolNo || "Untitled BOL"} · {form.loadNo || "No load number"}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                {completion.missing.length === 0 ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    Ready to generate
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-3.5 text-amber-500" />
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
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Reset form
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFreightItems(initialFreightItems)}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Clear freight rows
            </Button>
            <Button
              type="button"
              onClick={generatePDF}
              disabled={isGenerating}
              className="bg-slate-900 text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
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

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs italic text-slate-500">
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
                  className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Plus className="mr-2 size-4" /> Add row
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {errors.freight ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  <AlertTriangle className="size-3.5" />
                  {errors.freight}
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="min-w-[780px]">
                  <div className="grid grid-cols-[46px_52px_60px_1.7fr_0.8fr_88px_32px] gap-2 border-b border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
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
                          ? "bg-slate-50/60 dark:bg-slate-800/40"
                          : "dark:bg-slate-900/50"
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
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Total units">
                  <Input value={formatNumber(totals.units)} readOnly className="bg-slate-50" />
                </Field>
                <Field label="Total weight">
                  <Input
                    value={`${formatNumber(totals.weight)} lb`}
                    readOnly
                    className="bg-slate-50"
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
                      ? "border-slate-800 bg-slate-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
                      ? "border-red-600 bg-red-600 text-white dark:border-red-500 dark:bg-red-500"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <Flame className="size-3.5" />
                  Hazmat — Yes
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs italic text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
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
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Checkbox
                    checked={form.driverCountedFreight}
                    onCheckedChange={(checked) =>
                      updateField("driverCountedFreight", checked === true)
                    }
                  />
                  Driver counted freight
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Checkbox
                    checked={form.shipperLoadAndCount}
                    onCheckedChange={(checked) =>
                      updateField("shipperLoadAndCount", checked === true)
                    }
                  />
                  Shipper load and count (SLC)
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
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
              <p className="text-sm leading-6 text-slate-700">
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
              <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-700/80 bg-slate-900 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-11 items-center justify-center rounded-md bg-white text-[10px] font-black tracking-[0.2em] text-slate-900">
                        BOL
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                          {portalCompanyName}
                        </div>
                        <div className="text-[9px] text-slate-300">Straight Bill of Lading</div>
                      </div>
                    </div>
                    <div className="text-[9px] font-medium text-slate-300">
                      {form.bolNo || "BOL"} · {DOCUMENT_REVISION}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-3 text-[11px] text-slate-700 dark:text-slate-200">
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

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                      <span>Freight summary</span>
                      <span>
                        {formatNumber(totals.units)} units · {formatNumber(totals.weight)} lb
                      </span>
                    </div>
                    {freightItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="mb-1 flex justify-between gap-2 text-[10px]">
                        <span className="truncate">{item.commodity || "Untitled commodity"}</span>
                        <span className="shrink-0 text-slate-500 dark:text-slate-300">
                          {item.weight || "0"} lb
                        </span>
                      </div>
                    ))}
                    {freightItems.length > 3 ? (
                      <div className="text-[10px] text-slate-400 dark:text-slate-400">
                        +{freightItems.length - 3} more row
                        {freightItems.length - 3 === 1 ? "" : "s"}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        form.hazmat === "Yes"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {form.hazmat === "Yes" ? <Flame className="size-3" /> : null}
                      Hazmat: {form.hazmat}
                    </span>
                    <span className="text-[10px] text-slate-400">2-page document</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs dark:border-slate-600 dark:bg-slate-800/60">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Required fields
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {completion.done}/{completion.total}
                  </span>
                </div>
                <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${
                      completion.missing.length === 0 ? "bg-emerald-500" : "bg-blue-800"
                    }`}
                    style={{ width: `${(completion.done / completion.total) * 100}%` }}
                  />
                </div>
                {completion.missing.length > 0 ? (
                  <ul className="space-y-1 text-amber-700">
                    {completion.missing.map((f) => (
                      <li key={f.key} className="flex items-center gap-1.5">
                        <AlertTriangle className="size-3" /> {f.label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-700">
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
      <Label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
        {label}
      </Label>
      {children}
      {error ? (
        <span className="flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertTriangle className="size-3" /> {error}
        </span>
      ) : null}
    </div>
  );
}

function FieldPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="truncate text-[10px] text-slate-700 dark:text-slate-200">{value || "—"}</div>
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
        <Label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
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
          className="w-full touch-none rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
        />
        {!value ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-slate-300">
            Sign here
          </span>
        ) : null}
      </div>
      {value ? (
        <img src={value} alt={label} className="h-12 rounded border border-slate-200 bg-white" />
      ) : null}
    </div>
  );
}

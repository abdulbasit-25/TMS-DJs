import { useMemo, useState } from "react";
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
  DollarSign,
  FileDown,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";

export const Route = createFileRoute("/_app/load-tender")({
  component: LoadTenderPage,
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

type TenderFormState = {
  tenderNo: string;
  loadNo: string;
  tenderedDateTime: string;
  poReference: string;
  offerExpires: string;
  commodityDescription: string;
  weightPieces: string;
  declaredCargoValue: string;
  shipperFacility: string;
  shipperContact: string;
  shipperAddress: string;
  shipperDateTime: string;
  consigneeFacility: string;
  consigneeContact: string;
  consigneeAddress: string;
  consigneeDateTime: string;
  equipmentDryVan: boolean;
  equipmentReefer: boolean;
  equipmentFlatbed: boolean;
  equipmentStepDeck: boolean;
  equipmentPowerOnly: boolean;
  equipmentOther: boolean;
  trailerSpec: string;
  tempSecurement: string;
  driverAssist: boolean;
  palletExchange: boolean;
  lumperPossible: boolean;
  twicRequired: boolean;
  hazmat: boolean;
  linehaul: string;
  fuelSurcharge: string;
  preApprovedAccessorial: string;
  other: string;
  total: string;
  paymentTerms: string;
  rateNotes: string;
  carrierLegalName: string;
  carrierMcUsdot: string;
  dispatcherContact: string;
  verifiedPhoneEmail: string;
  driverName: string;
  driverPhone: string;
  tractorTrailerNo: string;
  materialCarrierRequirements: string;
  carrierRepresentativeTitle: string;
  carrierSignatureName: string;
  carrierDateTime: string;
  authorityActive: boolean;
  coiVerified: boolean;
  w9OnFile: boolean;
  carrierAgreement: boolean;
  identityPhoneVerified: boolean;
  driverVerified: boolean;
  trackingAccepted: boolean;
  fraudChecksCleared: boolean;
  agentOperationsLead: string;
  verificationDateTime: string;
  exceptionApprovalRef: string;
};

const initialState: TenderFormState = {
  tenderNo: "LT-001",
  loadNo: "LOAD-2048",
  tenderedDateTime: "2026-08-29T09:00",
  poReference: "PO-11842",
  offerExpires: "2026-08-29T17:00",
  commodityDescription: "Consumer goods / retail merchandise",
  weightPieces: "2,400 lbs / 8 pieces",
  declaredCargoValue: "$25,000.00",
  shipperFacility: "North Texas Distribution Center",
  shipperContact: "Ops Manager | (214) 555-0188 | Dock 4",
  shipperAddress: "1209 N Saginaw Blvd, Suite G-194, Saginaw, TX 76179",
  shipperDateTime: "2026-08-05 08:00 CST",
  consigneeFacility: "Atlas Retail Group",
  consigneeContact: "Receiving | (972) 555-2222 | Warehouse B",
  consigneeAddress: "5400 Commerce Ave, Dallas, TX 75247",
  consigneeDateTime: "2026-08-06 18:30 CST",
  equipmentDryVan: true,
  equipmentReefer: false,
  equipmentFlatbed: false,
  equipmentStepDeck: false,
  equipmentPowerOnly: false,
  equipmentOther: false,
  trailerSpec: "53' dry van / no tarp / standard",
  tempSecurement: "Standard securement",
  driverAssist: false,
  palletExchange: true,
  lumperPossible: false,
  twicRequired: false,
  hazmat: false,
  linehaul: "$1,250.00",
  fuelSurcharge: "$150.00",
  preApprovedAccessorial: "$0.00",
  other: "$0.00",
  total: "$1,400.00",
  paymentTerms: "Net 30",
  rateNotes:
    "Includes standard linehaul and fuel surcharge. No additional charges without written approval.",
  carrierLegalName: "",
  carrierMcUsdot: "",
  dispatcherContact: "",
  verifiedPhoneEmail: "",
  driverName: "",
  driverPhone: "",
  tractorTrailerNo: "",
  materialCarrierRequirements: "",
  carrierRepresentativeTitle: "",
  carrierSignatureName: "",
  carrierDateTime: "",
  authorityActive: false,
  coiVerified: false,
  w9OnFile: false,
  carrierAgreement: false,
  identityPhoneVerified: false,
  driverVerified: false,
  trackingAccepted: false,
  fraudChecksCleared: false,
  agentOperationsLead: "",
  verificationDateTime: "",
  exceptionApprovalRef: "",
};

const sectionClass =
  "rounded-2xl border border-slate-200/80 bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md";

const REQUIRED_FIELDS: Array<{ key: keyof TenderFormState; label: string }> = [
  { key: "loadNo", label: "Load No." },
  { key: "shipperFacility", label: "Shipper facility" },
  { key: "consigneeFacility", label: "Consignee facility" },
  { key: "commodityDescription", label: "Commodity description" },
  { key: "linehaul", label: "Linehaul rate" },
];

// Parses currency-ish strings like "$1,250.00" into a number, defaulting to 0
// for empty/unparsable input instead of NaN.
function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDateOnly(value: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <CardTitle className="flex items-center gap-2 text-base font-bold text-blue-950">
      <span className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-900">
        <Icon className="size-4" />
      </span>
      {children}
    </CardTitle>
  );
}

function LoadTenderPage() {
  const { companyName } = usePortalSettings();
  const portalCompanyName = companyName?.trim() || "TMS Freight Portal";
  const [form, setForm] = useState<TenderFormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const updateField = <K extends keyof TenderFormState>(field: K, value: TenderFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const rateBreakdown = useMemo(() => {
    const computed =
      parseCurrency(form.linehaul) +
      parseCurrency(form.fuelSurcharge) +
      parseCurrency(form.preApprovedAccessorial) +
      parseCurrency(form.other);
    const entered = parseCurrency(form.total);
    const mismatch = Math.abs(computed - entered) > 0.01;
    return { computed, entered, mismatch };
  }, [form.linehaul, form.fuelSurcharge, form.preApprovedAccessorial, form.other, form.total]);

  const completion = useMemo(() => {
    const done = REQUIRED_FIELDS.filter((f) => String(form[f.key] ?? "").trim().length > 0).length;
    const missing = REQUIRED_FIELDS.filter((f) => String(form[f.key] ?? "").trim().length === 0);
    return { done, total: REQUIRED_FIELDS.length, missing };
  }, [form]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.loadNo.trim()) nextErrors.loadNo = "Load number required.";
    if (!form.shipperFacility.trim()) nextErrors.shipperFacility = "Shipper facility required.";
    if (!form.consigneeFacility.trim())
      nextErrors.consigneeFacility = "Consignee facility required.";
    if (!form.commodityDescription.trim())
      nextErrors.commodityDescription = "Commodity description required.";
    if (!form.linehaul.trim()) nextErrors.linehaul = "Linehaul required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const generatePDF = () => {
    if (!validate()) return;

    setIsGenerating(true);
    try {
      // ----- Palette — shared with Customer Invoice / Carrier Rate Confirmation
      // so all three generated documents read as one consistent brand system. -----
      const NAVY: [number, number, number] = [21, 38, 61];
      const GOLD: [number, number, number] = [173, 138, 84];
      const BORDER: [number, number, number] = [190, 197, 208];
      const TEXT: [number, number, number] = [26, 32, 40];
      const MUTED: [number, number, number] = [110, 118, 128];

      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;
      const safeBottom = pageHeight - 54;

      const drawHeader = (title: string) => {
        doc.setFillColor(...NAVY);
        doc.roundedRect(margin, 26, 68, 30, 4, 4, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("BROKER", margin + 10, 46);

        doc.setTextColor(...NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12.5);
        doc.text(portalCompanyName, margin + 84, 38);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.7);
        doc.setTextColor(...MUTED);
        doc.text(BROKER_ADDRESS, margin + 84, 49);
        doc.text(`${BROKER_PHONE} | ${BROKER_EMAIL} | ${BROKER_WEBSITE}`, margin + 84, 59);

        doc.setDrawColor(...GOLD);
        doc.setLineWidth(1.3);
        doc.line(margin, 70, pageWidth - margin, 70);

        // Title and its metadata now sit on separate lines. Previously both were
        // drawn on the same y=90 baseline — the left-aligned title and the
        // right-aligned "LT-001 | Rev 1.0 | Effective ..." text overlapped
        // whenever a long continuation title ("... (CONTINUED)") ran past the
        // horizontal midpoint of the page.
        doc.setTextColor(...NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14.5);
        doc.text(title, margin, 90);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.3);
        doc.setTextColor(...MUTED);
        doc.text(
          `${form.tenderNo || "LT"}  |  ${DOCUMENT_REVISION}  |  Effective ${formatDateOnly(
            form.tenderedDateTime,
          )}`,
          pageWidth - margin,
          104,
          { align: "right" },
        );
      };

      const drawFooter = () => {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.6);
        doc.line(margin, pageHeight - 26, pageWidth - margin, pageHeight - 26);
        doc.setTextColor(...MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.text(
          `CONFIDENTIAL CARRIER RATE DOCUMENT | ${BROKER_MC_NUMBER} | ${BROKER_USDOT_NUMBER}`,
          margin,
          pageHeight - 16,
        );
        doc.text(
          "CONTROLLED TEMPLATE | Verify current revision",
          pageWidth - margin,
          pageHeight - 16,
          { align: "right" },
        );
      };

      let pageNumber = 1;

      const newPage = (title: string) => {
        drawFooter();
        doc.addPage();
        pageNumber += 1;
        drawHeader(title);
        return 118;
      };

      // Auto-inserts a continuation page instead of letting content run off
      // the bottom of the page.
      const ensureSpace = (currentY: number, neededHeight: number, continuationTitle: string) => {
        if (currentY + neededHeight > safeBottom) {
          return newPage(continuationTitle);
        }
        return currentY;
      };

      // Fill color is set explicitly on every box so it never inherits
      // whatever color a previous section (or the header's navy logo badge)
      // last left active — that leak previously turned any field box drawn
      // right after a page break into an unreadable dark-navy-on-dark box.
      // Labels now wrap instead of running past the box edge into the next
      // field, and the number of value lines shown scales with the actual
      // space left in the box instead of a flat 2-line cap.
      const drawField = (
        x: number,
        y: number,
        w: number,
        h: number,
        labelText: string,
        value: string,
      ) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.75);
        doc.roundedRect(x, y, w, h, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...MUTED);
        const labelLines = doc.splitTextToSize(labelText.toUpperCase(), w - 10);
        doc.text(labelLines, x + 5, y + 10, { charSpace: 0.2 });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.2);
        doc.setTextColor(...TEXT);
        const valueStartY = y + 10 + labelLines.length * 7.5;
        const maxLines = Math.max(1, Math.floor((y + h - valueStartY) / 10));
        const lines = doc.splitTextToSize(value || "—", w - 10);
        doc.text(lines.slice(0, maxLines), x + 5, valueStartY);
      };

      const drawChecklist = (x: number, y: number, checked: boolean, labelText: string) => {
        doc.setDrawColor(...NAVY);
        doc.setLineWidth(0.9);
        doc.setFillColor(checked ? NAVY[0] : 255, checked ? NAVY[1] : 255, checked ? NAVY[2] : 255);
        doc.roundedRect(x, y, 10, 10, 1.5, 1.5, "FD");
        if (checked) {
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(1.2);
          doc.line(x + 2, y + 5, x + 4.2, y + 7.4);
          doc.line(x + 4.2, y + 7.4, x + 8, y + 1.5);
        }
        doc.setTextColor(...TEXT);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.2);
        doc.text(labelText, x + 15, y + 8);
      };

      const drawSectionHeading = (labelText: string, x: number, y: number, width: number) => {
        doc.setFillColor(...NAVY);
        doc.rect(x, y, width, 18, "F");
        doc.setDrawColor(...GOLD);
        doc.setLineWidth(1.1);
        doc.line(x, y + 18, x + width, y + 18);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(labelText.toUpperCase(), x + 6, y + 12.5, { charSpace: 0.4 });
      };

      // Height now grows with the actual text instead of a fixed value with a
      // hardcoded 6-line cap — the latter silently dropped most of the default
      // "Material Carrier Requirements" boilerplate, which runs well past 6
      // lines at this width.
      const measureLongBox = (w: number, value: string, minH: number) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.1);
        const lines = doc.splitTextToSize(value || "", w - 10);
        return { lines, h: Math.max(minH, 24 + lines.length * 9.5) };
      };

      const drawLongBox = (
        x: number,
        y: number,
        w: number,
        h: number,
        labelText: string,
        lines: string[],
      ) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.75);
        doc.roundedRect(x, y, w, h, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.8);
        doc.setTextColor(...MUTED);
        doc.text(labelText.toUpperCase(), x + 5, y + 12, { charSpace: 0.3 });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.1);
        doc.setTextColor(...TEXT);
        doc.text(lines, x + 5, y + 24);
      };

      drawHeader("LOAD TENDER - PRELIMINARY OFFER");
      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("NOT AN AUTHORIZATION TO PICK UP", margin, 118);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(...TEXT);
      const authText = `This tender is a preliminary offer only. Carrier is not authorized to dispatch, enter a facility, or pick up freight until ${portalCompanyName} issues a signed carrier rate confirmation and the carrier accepts it.`;
      const authLines = doc.splitTextToSize(authText, contentWidth - 8);
      doc.text(authLines, margin, 130);

      let y = 130 + authLines.length * 10 + 10;
      drawSectionHeading("LOAD DETAILS", margin, y, contentWidth);
      y += 24;

      drawField(margin, y, contentWidth / 4 - 6, 32, "LOAD NO.", form.loadNo);
      drawField(
        margin + contentWidth / 4,
        y,
        contentWidth / 4 - 6,
        32,
        "DATE / TIME TENDERED",
        form.tenderedDateTime,
      );
      drawField(
        margin + (contentWidth / 4) * 2,
        y,
        contentWidth / 4 - 6,
        32,
        "PO / REFERENCE",
        form.poReference,
      );
      drawField(
        margin + (contentWidth / 4) * 3 + 6,
        y,
        contentWidth / 4 - 12,
        32,
        "OFFER EXPIRES",
        form.offerExpires,
      );
      y += 42;
      drawField(
        margin,
        y,
        contentWidth / 2 - 8,
        34,
        "COMMODITY / DESCRIPTION",
        form.commodityDescription,
      );
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        34,
        "WEIGHT / PIECES",
        form.weightPieces,
      );
      y += 44;
      // These three labels are long relative to a third-width column, so the
      // boxes are a touch taller (40 instead of 32) to give the wrapped label
      // room without crowding out the value.
      drawField(
        margin,
        y,
        contentWidth / 3 - 8,
        40,
        "DECLARED CARGO VALUE",
        form.declaredCargoValue,
      );
      drawField(
        margin + contentWidth / 3,
        y,
        contentWidth / 3 - 8,
        40,
        "TRAILER SIZE / TYPE / AGE / SPECIAL EQUIPMENT",
        form.trailerSpec,
      );
      drawField(
        margin + (contentWidth / 3) * 2 + 8,
        y,
        contentWidth / 3 - 16,
        40,
        "TEMPERATURE / TARPS / STRAPS / SECUREMENT",
        form.tempSecurement,
      );
      y += 54;

      y = ensureSpace(y, 108, "LOAD TENDER - PRELIMINARY OFFER (CONTINUED)");
      drawSectionHeading("PICKUP STOP", margin, y, contentWidth);
      y += 24;
      drawField(margin, y, contentWidth / 2 - 8, 32, "FACILITY / SHIPPER", form.shipperFacility);
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        32,
        "CONTACT / PHONE / APPOINTMENT",
        form.shipperContact,
      );
      y += 42;
      drawField(margin, y, contentWidth, 32, "FULL ADDRESS", form.shipperAddress);
      y += 40;
      drawField(margin, y, contentWidth, 32, "DATE / TIME / TIME ZONE", form.shipperDateTime);
      y += 46;

      y = ensureSpace(y, 116, "LOAD TENDER - PRELIMINARY OFFER (CONTINUED)");
      drawSectionHeading("DELIVERY STOP", margin, y, contentWidth);
      y += 24;
      drawField(
        margin,
        y,
        contentWidth / 2 - 8,
        32,
        "FACILITY / CONSIGNEE",
        form.consigneeFacility,
      );
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        32,
        "CONTACT / PHONE / APPOINTMENT",
        form.consigneeContact,
      );
      y += 42;
      drawField(margin, y, contentWidth, 32, "FULL ADDRESS", form.consigneeAddress);
      y += 40;
      drawField(margin, y, contentWidth, 32, "DATE / TIME / TIME ZONE", form.consigneeDateTime);
      y += 54;

      y = ensureSpace(y, 84, "LOAD TENDER - PRELIMINARY OFFER (CONTINUED)");
      drawSectionHeading("EQUIPMENT AND SERVICE REQUIREMENTS", margin, y, contentWidth);
      y += 26;
      const equipmentRows: Array<[string, boolean]> = [
        ["Dry van", form.equipmentDryVan],
        ["Reefer", form.equipmentReefer],
        ["Flatbed", form.equipmentFlatbed],
        ["Step deck", form.equipmentStepDeck],
        ["Power only", form.equipmentPowerOnly],
        ["Other", form.equipmentOther],
      ];
      let rowX = margin;
      equipmentRows.forEach(([labelText, checked]) => {
        drawChecklist(rowX, y, checked, labelText);
        rowX += 90;
      });
      y += 20;
      drawChecklist(margin, y, form.driverAssist, "Driver assist");
      drawChecklist(margin + 150, y, form.palletExchange, "Pallet exchange");
      drawChecklist(margin + 300, y, form.lumperPossible, "Lumper possible");
      y += 18;
      drawChecklist(margin, y, form.twicRequired, "TWIC required");
      drawChecklist(margin + 150, y, form.hazmat, "Hazmat");
      y += 28;

      y = ensureSpace(y, 100, "LOAD TENDER - PRELIMINARY OFFER (CONTINUED)");
      drawSectionHeading("PROPOSED RATE", margin, y, contentWidth);
      y += 24;
      drawField(margin, y, contentWidth / 5 - 8, 28, "LINEHAUL", form.linehaul);
      drawField(
        margin + contentWidth / 5,
        y,
        contentWidth / 5 - 8,
        28,
        "FUEL SURCHARGE",
        form.fuelSurcharge,
      );
      drawField(
        margin + (contentWidth / 5) * 2,
        y,
        contentWidth / 5 - 8,
        28,
        "PRE-APPROVED ACCESSORIAL",
        form.preApprovedAccessorial,
      );
      drawField(
        margin + (contentWidth / 5) * 3 + 8,
        y,
        contentWidth / 5 - 16,
        28,
        "OTHER",
        form.other,
      );
      y += 38;
      drawField(margin, y, contentWidth / 2 - 8, 28, "TOTAL", form.total);
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        28,
        "PROPOSED PAYMENT TERMS",
        form.paymentTerms,
      );
      y += 38;

      const rateNotesMeasure = measureLongBox(contentWidth, form.rateNotes, 44);
      y = ensureSpace(y, rateNotesMeasure.h + 6, "LOAD TENDER - PRELIMINARY OFFER (CONTINUED)");
      drawLongBox(
        margin,
        y,
        contentWidth,
        rateNotesMeasure.h,
        "RATE NOTES / INCLUDED CHARGES",
        rateNotesMeasure.lines,
      );
      drawFooter();

      // ---------------------------------------------------------------- //
      // Page 2
      // ---------------------------------------------------------------- //
      let y2 = newPage("LOAD TENDER - CARRIER ACCEPTANCE");
      drawSectionHeading("CARRIER, DRIVER AND EQUIPMENT INFORMATION", margin, y2, contentWidth);
      y2 += 24;
      drawField(margin, y2, contentWidth / 2 - 8, 28, "CARRIER LEGAL NAME", form.carrierLegalName);
      drawField(
        margin + contentWidth / 2 + 8,
        y2,
        contentWidth / 2 - 16,
        28,
        "MC / USDOT",
        form.carrierMcUsdot,
      );
      y2 += 38;
      drawField(
        margin,
        y2,
        contentWidth / 2 - 8,
        28,
        "DISPATCHER / CONTACT",
        form.dispatcherContact,
      );
      drawField(
        margin + contentWidth / 2 + 8,
        y2,
        contentWidth / 2 - 16,
        28,
        "VERIFIED PHONE / EMAIL",
        form.verifiedPhoneEmail,
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
      y2 += 52;

      const materialRequirementsText =
        form.materialCarrierRequirements ||
        `Maintain active FMCSA authority and all required cargo, auto, and general liability insurance through final delivery. Activate approved GPS tracking before pickup and keep it active through delivery; do not handle tracking while driving. Do not rebroker, transfer, cross-dock, or substitute the driver, tractor, or trailer without ${portalCompanyName} prior written approval. Report arrival, loaded status, departure, delays, incidents, cargo exceptions, and delivery immediately to operations. Confirm seal number and cargo condition at pickup and delivery. Do not break a seal except as legally required or authorized in writing. Obtain written pre-approval for accessorials and submit signed receipts, in/out times, invoice, signed BOL, and POD.`;

      const materialMeasure = measureLongBox(contentWidth, materialRequirementsText, 90);
      y2 = ensureSpace(y2, materialMeasure.h + 10, "LOAD TENDER - CARRIER ACCEPTANCE (CONTINUED)");
      drawLongBox(
        margin,
        y2,
        contentWidth,
        materialMeasure.h,
        "MATERIAL CARRIER REQUIREMENTS",
        materialMeasure.lines,
      );
      y2 += materialMeasure.h + 12;

      y2 = ensureSpace(y2, 100, "LOAD TENDER - CARRIER ACCEPTANCE (CONTINUED)");
      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("CARRIER ACKNOWLEDGMENT", margin, y2);
      y2 += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(...TEXT);
      const ackText =
        "Carrier confirms the information above is accurate, accepts this preliminary tender subject to the final rate confirmation, and understands that acceptance does not authorize pickup before the final rate confirmation is issued and accepted.";
      const ackLines = doc.splitTextToSize(ackText, contentWidth - 10);
      doc.text(ackLines, margin, y2);
      y2 += 12 + ackLines.length * 10;
      drawField(
        margin,
        y2,
        contentWidth / 2 - 8,
        28,
        "CARRIER REPRESENTATIVE / TITLE",
        form.carrierRepresentativeTitle,
      );
      drawField(
        margin + contentWidth / 2 + 8,
        y2,
        contentWidth / 2 - 16,
        28,
        "SIGNATURE / TYPED NAME",
        form.carrierSignatureName,
      );
      y2 += 38;
      drawField(margin, y2, contentWidth / 2 - 8, 28, "DATE / TIME", form.carrierDateTime);
      drawField(
        margin + contentWidth / 2 + 8,
        y2,
        contentWidth / 2 - 16,
        28,
        "AGENT / OPERATIONS LEAD",
        form.agentOperationsLead,
      );
      y2 += 52;

      y2 = ensureSpace(y2, 110, "LOAD TENDER - CARRIER ACCEPTANCE (CONTINUED)");
      drawSectionHeading(
        "INTERNAL CARRIER VERIFICATION - COMPLETE BEFORE RATE CONFIRMATION",
        margin,
        y2,
        contentWidth,
      );
      y2 += 24;
      const checks: Array<[string, boolean]> = [
        ["Authority active", form.authorityActive],
        ["COI verified", form.coiVerified],
        ["W-9 on file", form.w9OnFile],
        ["Carrier agreement", form.carrierAgreement],
        ["Identity / phone verified", form.identityPhoneVerified],
        ["Driver verified", form.driverVerified],
        ["Tracking accepted", form.trackingAccepted],
        ["Fraud checks cleared", form.fraudChecksCleared],
      ];
      let checkX = margin;
      checks.forEach(([labelText, checked], index) => {
        drawChecklist(checkX, y2 + (index % 4) * 18, checked, labelText);
        if (index % 4 === 3) {
          checkX += 190;
        }
      });
      y2 += 80;

      y2 = ensureSpace(y2, 40, "LOAD TENDER - CARRIER ACCEPTANCE (CONTINUED)");
      drawField(
        margin,
        y2,
        contentWidth / 2 - 8,
        28,
        "VERIFICATION DATE / TIME",
        form.verificationDateTime,
      );
      drawField(
        margin + contentWidth / 2 + 8,
        y2,
        contentWidth / 2 - 16,
        28,
        "EXCEPTION / APPROVAL REF.",
        form.exceptionApprovalRef,
      );
      drawFooter();

      // Stamp accurate, dynamic "Page X of N" now that the true page count
      // is known (previously hardcoded as "Page X of 2", which broke as
      // soon as content overflowed onto extra pages).
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p += 1) {
        doc.setPage(p);
        doc.setTextColor(...MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 40, {
          align: "right",
        });
      }

      doc.save(`${form.tenderNo || "Load_Tender"}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Load tender PDF generation failed. Please verify your input and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Load Tender"
        description="Preliminary offer, carrier acceptance, and dispatch verification."
      />

      {/* Sticky action + progress bar */}
      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-900 text-xs font-bold text-white">
            LT
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {form.tenderNo || "Untitled tender"} · {form.loadNo || "No load number"}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
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
          <Button type="button" variant="outline" size="sm" onClick={() => setForm(initialState)}>
            Reset form
          </Button>
          <Button type="button" onClick={generatePDF} disabled={isGenerating}>
            <FileDown className="mr-2 size-4" />
            {isGenerating ? "Generating…" : "Generate PDF"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.7fr)]">
        <div className="space-y-6">
          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <SectionTitle icon={ClipboardList}>Load Details</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Tender No.">
                  <Input
                    value={form.tenderNo}
                    onChange={(e) => updateField("tenderNo", e.target.value)}
                  />
                </Field>
                <Field label="Load No." error={errors.loadNo}>
                  <Input
                    value={form.loadNo}
                    onChange={(e) => updateField("loadNo", e.target.value)}
                  />
                </Field>
                <Field label="Date / time tendered">
                  <Input
                    type="datetime-local"
                    value={form.tenderedDateTime}
                    onChange={(e) => updateField("tenderedDateTime", e.target.value)}
                  />
                </Field>
                <Field label="PO / reference">
                  <Input
                    value={form.poReference}
                    onChange={(e) => updateField("poReference", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Offer expires">
                  <Input
                    type="datetime-local"
                    value={form.offerExpires}
                    onChange={(e) => updateField("offerExpires", e.target.value)}
                  />
                </Field>
                <Field label="Weight / pieces">
                  <Input
                    value={form.weightPieces}
                    onChange={(e) => updateField("weightPieces", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Commodity / description" error={errors.commodityDescription}>
                <Textarea
                  value={form.commodityDescription}
                  onChange={(e) => updateField("commodityDescription", e.target.value)}
                  className="min-h-20"
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Declared cargo value">
                  <Input
                    value={form.declaredCargoValue}
                    onChange={(e) => updateField("declaredCargoValue", e.target.value)}
                  />
                </Field>
                <Field label="Trailer size / type / age / special equipment">
                  <Input
                    value={form.trailerSpec}
                    onChange={(e) => updateField("trailerSpec", e.target.value)}
                  />
                </Field>
                <Field label="Temperature / tarps / straps / securement">
                  <Input
                    value={form.tempSecurement}
                    onChange={(e) => updateField("tempSecurement", e.target.value)}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <SectionTitle icon={MapPin}>Pickup Stop</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Facility / shipper" error={errors.shipperFacility}>
                  <Input
                    value={form.shipperFacility}
                    onChange={(e) => updateField("shipperFacility", e.target.value)}
                  />
                </Field>
                <Field label="Contact / phone / appointment">
                  <Input
                    value={form.shipperContact}
                    onChange={(e) => updateField("shipperContact", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Full address">
                <Textarea
                  value={form.shipperAddress}
                  onChange={(e) => updateField("shipperAddress", e.target.value)}
                  className="min-h-20"
                />
              </Field>
              <Field label="Date / time / time zone">
                <Input
                  value={form.shipperDateTime}
                  onChange={(e) => updateField("shipperDateTime", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <SectionTitle icon={MapPin}>Delivery Stop</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Facility / consignee" error={errors.consigneeFacility}>
                  <Input
                    value={form.consigneeFacility}
                    onChange={(e) => updateField("consigneeFacility", e.target.value)}
                  />
                </Field>
                <Field label="Contact / phone / appointment">
                  <Input
                    value={form.consigneeContact}
                    onChange={(e) => updateField("consigneeContact", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Full address">
                <Textarea
                  value={form.consigneeAddress}
                  onChange={(e) => updateField("consigneeAddress", e.target.value)}
                  className="min-h-20"
                />
              </Field>
              <Field label="Date / time / time zone">
                <Input
                  value={form.consigneeDateTime}
                  onChange={(e) => updateField("consigneeDateTime", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <SectionTitle icon={Package}>Equipment and Service Requirements</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Equipment type
                </div>
                <div className="flex flex-wrap gap-2">
                  <ToggleChip
                    label="Dry van"
                    checked={form.equipmentDryVan}
                    onChange={(v) => updateField("equipmentDryVan", v)}
                  />
                  <ToggleChip
                    label="Reefer"
                    checked={form.equipmentReefer}
                    onChange={(v) => updateField("equipmentReefer", v)}
                  />
                  <ToggleChip
                    label="Flatbed"
                    checked={form.equipmentFlatbed}
                    onChange={(v) => updateField("equipmentFlatbed", v)}
                  />
                  <ToggleChip
                    label="Step deck"
                    checked={form.equipmentStepDeck}
                    onChange={(v) => updateField("equipmentStepDeck", v)}
                  />
                  <ToggleChip
                    label="Power only"
                    checked={form.equipmentPowerOnly}
                    onChange={(v) => updateField("equipmentPowerOnly", v)}
                  />
                  <ToggleChip
                    label="Other"
                    checked={form.equipmentOther}
                    onChange={(v) => updateField("equipmentOther", v)}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Service requirements
                </div>
                <div className="flex flex-wrap gap-2">
                  <ToggleChip
                    label="Driver assist"
                    checked={form.driverAssist}
                    onChange={(v) => updateField("driverAssist", v)}
                  />
                  <ToggleChip
                    label="Pallet exchange"
                    checked={form.palletExchange}
                    onChange={(v) => updateField("palletExchange", v)}
                  />
                  <ToggleChip
                    label="Lumper possible"
                    checked={form.lumperPossible}
                    onChange={(v) => updateField("lumperPossible", v)}
                  />
                  <ToggleChip
                    label="TWIC required"
                    checked={form.twicRequired}
                    onChange={(v) => updateField("twicRequired", v)}
                  />
                  <ToggleChip
                    label="Hazmat"
                    checked={form.hazmat}
                    onChange={(v) => updateField("hazmat", v)}
                    tone="warning"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <SectionTitle icon={DollarSign}>Proposed Rate</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Field label="Linehaul" error={errors.linehaul}>
                  <Input
                    value={form.linehaul}
                    onChange={(e) => updateField("linehaul", e.target.value)}
                  />
                </Field>
                <Field label="Fuel surcharge">
                  <Input
                    value={form.fuelSurcharge}
                    onChange={(e) => updateField("fuelSurcharge", e.target.value)}
                  />
                </Field>
                <Field label="Pre-approved accessorial">
                  <Input
                    value={form.preApprovedAccessorial}
                    onChange={(e) => updateField("preApprovedAccessorial", e.target.value)}
                  />
                </Field>
                <Field label="Other">
                  <Input
                    value={form.other}
                    onChange={(e) => updateField("other", e.target.value)}
                  />
                </Field>
                <Field label="Total">
                  <Input
                    value={form.total}
                    onChange={(e) => updateField("total", e.target.value)}
                  />
                </Field>
              </div>

              {rateBreakdown.mismatch ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" />
                    Linehaul + fuel + accessorial + other = {formatCurrency(rateBreakdown.computed)}
                    , but Total is {formatCurrency(rateBreakdown.entered)}.
                  </span>
                  <button
                    type="button"
                    onClick={() => updateField("total", formatCurrency(rateBreakdown.computed))}
                    className="rounded-md border border-amber-300 bg-white px-2 py-1 font-medium text-amber-800 hover:bg-amber-100"
                  >
                    Use {formatCurrency(rateBreakdown.computed)}
                  </button>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Proposed payment terms">
                  <Input
                    value={form.paymentTerms}
                    onChange={(e) => updateField("paymentTerms", e.target.value)}
                  />
                </Field>
                <Field label="Rate notes / included charges">
                  <Textarea
                    value={form.rateNotes}
                    onChange={(e) => updateField("rateNotes", e.target.value)}
                    className="min-h-20"
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <SectionTitle icon={Truck}>Carrier Acceptance</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Carrier legal name">
                  <Input
                    value={form.carrierLegalName}
                    onChange={(e) => updateField("carrierLegalName", e.target.value)}
                  />
                </Field>
                <Field label="MC / USDOT">
                  <Input
                    value={form.carrierMcUsdot}
                    onChange={(e) => updateField("carrierMcUsdot", e.target.value)}
                  />
                </Field>
                <Field label="Dispatcher / contact">
                  <Input
                    value={form.dispatcherContact}
                    onChange={(e) => updateField("dispatcherContact", e.target.value)}
                  />
                </Field>
                <Field label="Verified phone / email">
                  <Input
                    value={form.verifiedPhoneEmail}
                    onChange={(e) => updateField("verifiedPhoneEmail", e.target.value)}
                  />
                </Field>
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
                <Field label="Agent / operations lead">
                  <Input
                    value={form.agentOperationsLead}
                    onChange={(e) => updateField("agentOperationsLead", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Material carrier requirements">
                <Textarea
                  value={form.materialCarrierRequirements}
                  onChange={(e) => updateField("materialCarrierRequirements", e.target.value)}
                  placeholder="Leave blank to use the standard carrier requirements language in the generated PDF."
                  className="min-h-32"
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Carrier representative / title">
                  <Input
                    value={form.carrierRepresentativeTitle}
                    onChange={(e) => updateField("carrierRepresentativeTitle", e.target.value)}
                  />
                </Field>
                <Field label="Signature / typed name">
                  <Input
                    value={form.carrierSignatureName}
                    onChange={(e) => updateField("carrierSignatureName", e.target.value)}
                  />
                </Field>
                <Field label="Date / time">
                  <Input
                    type="datetime-local"
                    value={form.carrierDateTime}
                    onChange={(e) => updateField("carrierDateTime", e.target.value)}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <SectionTitle icon={ShieldCheck}>Internal Carrier Verification</SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <CheckRow
                  label="Authority active"
                  checked={form.authorityActive}
                  onChange={(v) => updateField("authorityActive", v)}
                />
                <CheckRow
                  label="COI verified"
                  checked={form.coiVerified}
                  onChange={(v) => updateField("coiVerified", v)}
                />
                <CheckRow
                  label="W-9 on file"
                  checked={form.w9OnFile}
                  onChange={(v) => updateField("w9OnFile", v)}
                />
                <CheckRow
                  label="Carrier agreement"
                  checked={form.carrierAgreement}
                  onChange={(v) => updateField("carrierAgreement", v)}
                />
                <CheckRow
                  label="Identity / phone verified"
                  checked={form.identityPhoneVerified}
                  onChange={(v) => updateField("identityPhoneVerified", v)}
                />
                <CheckRow
                  label="Driver verified"
                  checked={form.driverVerified}
                  onChange={(v) => updateField("driverVerified", v)}
                />
                <CheckRow
                  label="Tracking accepted"
                  checked={form.trackingAccepted}
                  onChange={(v) => updateField("trackingAccepted", v)}
                />
                <CheckRow
                  label="Fraud checks cleared"
                  checked={form.fraudChecksCleared}
                  onChange={(v) => updateField("fraudChecksCleared", v)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Verification date / time">
                  <Input
                    type="datetime-local"
                    value={form.verificationDateTime}
                    onChange={(e) => updateField("verificationDateTime", e.target.value)}
                  />
                </Field>
                <Field label="Exception / approval ref.">
                  <Input
                    value={form.exceptionApprovalRef}
                    onChange={(e) => updateField("exceptionApprovalRef", e.target.value)}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-blue-950">Tender Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-amber-500/60 bg-slate-900 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wide text-white">
                      {portalCompanyName}
                    </div>
                    <div className="text-[10px] font-medium text-slate-300">
                      {form.tenderNo || "LT"} · {DOCUMENT_REVISION}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 p-3 text-[11px] text-slate-700">
                  <PreviewRow label="Load No." value={form.loadNo} />
                  <PreviewRow label="Tendered" value={form.tenderedDateTime} />
                  <PreviewRow label="Shipper" value={form.shipperFacility} />
                  <PreviewRow label="Consignee" value={form.consigneeFacility} />
                  <PreviewRow label="Rate" value={form.total} warn={rateBreakdown.mismatch} />
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
                <div className="mb-1 font-semibold text-slate-700">Document summary</div>
                <div>Commodity: {form.commodityDescription || "—"}</div>
                <div>Equipment: {equipmentSummary(form)}</div>
              </div>

              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Required fields</span>
                  <span className="text-slate-500">
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
      <Label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
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

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      {label}
    </label>
  );
}

function ToggleChip({
  label,
  checked,
  onChange,
  tone = "default",
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  tone?: "default" | "warning";
}) {
  const activeClass =
    tone === "warning"
      ? "border-amber-600 bg-amber-600 text-white"
      : "border-slate-800 bg-slate-800 text-white";

  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        checked ? activeClass : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function PreviewRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-1.5 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className={`text-right font-medium ${warn ? "text-amber-600" : "text-slate-700"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function equipmentSummary(form: TenderFormState) {
  const selected = [
    form.equipmentDryVan ? "Dry van" : null,
    form.equipmentReefer ? "Reefer" : null,
    form.equipmentFlatbed ? "Flatbed" : null,
    form.equipmentStepDeck ? "Step deck" : null,
    form.equipmentPowerOnly ? "Power only" : null,
    form.equipmentOther ? "Other" : null,
  ].filter(Boolean);
  return selected.length ? selected.join(", ") : "Not specified";
}

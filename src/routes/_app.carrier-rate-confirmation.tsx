// Requires: npm install jspdf
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import { usePortalSettings } from "@/hooks/use-portal-settings";
import {
  FileDown,
  IdCard,
  MapPin,
  MapPinCheck,
  Package,
  DollarSign,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/_app/carrier-rate-confirmation")({
  component: CarrierRateConfirmationPage,
});

// ---------- Types ----------

type RateFormState = {
  loadNo: string;
  confirmationDate: string;
  poReference: string;
  brokerAgent: string;
  carrierLegalName: string;
  carrierMcUsdot: string;
  dispatcherContact: string;
  factoringCompany: string;
  driverName: string;
  driverPhone: string;
  tractorTrailerNo: string;
  pickupFacility: string;
  pickupContact: string;
  pickupAddress: string;
  pickupDateTime: string;
  deliveryFacility: string;
  deliveryContact: string;
  deliveryAddress: string;
  deliveryDateTime: string;
  commodityDescription: string;
  weightPieces: string;
  declaredCargoValue: string;
  equipmentType: string;
  temperatureSecurement: string;
  sealTrackingRef: string;
  linehaul: string;
  fuel: string;
  preApprovedAccessorial: string;
  other: string;
  totalRate: string;
  paymentTerms: string;
  rateIncludesExcludes: string;
  specialInstructions: string;
  otherRequiredDocuments: string;
  brokerRepresentativeTitle: string;
  brokerSignatureName: string;
  brokerDateTime: string;
  carrierRepresentativeTitle: string;
  carrierSignatureName: string;
  carrierDateTime: string;
  authorityActive: boolean;
  coiVerified: boolean;
  agreementAndW9: boolean;
  phoneVerified: boolean;
  driverEquipmentVerified: boolean;
};

const initialState: RateFormState = {
  loadNo: "LOAD-2048",
  confirmationDate: "2026-08-29",
  poReference: "PO-11842",
  brokerAgent: "A. Johnson",
  carrierLegalName: "Crossroads Logistics Group",
  carrierMcUsdot: "MC 154602 / USDOT 3984402",
  dispatcherContact: "Dispatch Desk | (214) 555-0148",
  factoringCompany: "N/A",
  driverName: "R. Thompson",
  driverPhone: "(817) 555-0131",
  tractorTrailerNo: "TX 4521 / TR 8896",
  pickupFacility: "North Texas Distribution Center",
  pickupContact: "Ops Manager | (214) 555-0188 | Dock 4",
  pickupAddress: "1209 N Saginaw Blvd, Suite G-194, Saginaw, TX 76179",
  pickupDateTime: "2026-08-05 08:00 CST",
  deliveryFacility: "Atlas Retail Group",
  deliveryContact: "Receiving | (972) 555-2222 | Warehouse B",
  deliveryAddress: "5400 Commerce Ave, Dallas, TX 75247",
  deliveryDateTime: "2026-08-06 18:30 CST",
  commodityDescription: "Consumer goods / retail merchandise",
  weightPieces: "2,400 lbs / 8 pieces",
  declaredCargoValue: "$25,000.00",
  equipmentType: "53' Dry Van",
  temperatureSecurement: "Standard securement",
  sealTrackingRef: "Seal 1892 / GPS tracking active",
  linehaul: "$1,250.00",
  fuel: "$150.00",
  preApprovedAccessorial: "$0.00",
  other: "$0.00",
  totalRate: "$1,400.00",
  paymentTerms: "Net 30",
  rateIncludesExcludes: "Includes linehaul and fuel. No extra charges unless approved in writing.",
  specialInstructions:
    "Confirm arrival and departure updates with the Broker's operations team. Keep GPS active through delivery.",
  otherRequiredDocuments: "Carrier invoice; signed BOL; clean POD; receipts; photos; other",
  brokerRepresentativeTitle: "Broker Agent",
  brokerSignatureName: "A. Johnson",
  brokerDateTime: "2026-08-29T09:00",
  carrierRepresentativeTitle: "Dispatch Manager",
  carrierSignatureName: "R. Thompson",
  carrierDateTime: "2026-08-29T09:10",
  authorityActive: true,
  coiVerified: true,
  agreementAndW9: true,
  phoneVerified: true,
  driverEquipmentVerified: true,
};

const REQUIRED_FIELDS: { key: keyof RateFormState; label: string }[] = [
  { key: "loadNo", label: "Load No." },
  { key: "carrierLegalName", label: "Carrier Legal Name" },
  { key: "commodityDescription", label: "Commodity / Description" },
  { key: "pickupAddress", label: "Pickup Full Address" },
  { key: "deliveryAddress", label: "Delivery Full Address" },
  { key: "totalRate", label: "Total Rate" },
];

// Static legal boilerplate — kept out of component state since it never changes per-load.
const TERMS_INTRO =
  "Active GPS tracking is a material condition of this shipment. Tracking must be activated before pickup and remain active through delivery. Carrier shall not rebroker, transfer, cross-dock, or substitute a driver or equipment without the Broker's prior written approval. Failure to comply is a material breach and may result in cancellation, nonpayment where legally permitted, indemnification, and recovery of resulting losses. Safety instruction: tracking setup and updates must be completed while safely parked, never while driving.";

const TERMS_CLAUSES: { num: number; title: string; body: string }[] = [
  {
    num: 1,
    title: "Authority, Identity and Insurance",
    body: "Carrier warrants that its legal name, MC/USDOT number, dispatch contact, driver, tractor, and trailer information are accurate and match the carrier vetted by the Broker. Carrier will maintain active operating authority and all insurance required by law, the broker-carrier agreement, and this load through final delivery. Carrier must immediately disclose any authority, insurance, ownership, contact, or factoring change.",
  },
  {
    num: 2,
    title: "Exclusive Custody and No Substitution",
    body: "Carrier retains exclusive possession, control, and use of the equipment and assumes full responsibility for the freight from pickup through delivery. No trip lease, interchange, subcontracting, team/driver change, trailer swap, cross-dock, transload, storage, or other transfer is permitted without the Broker's prior written approval. Approval of a change does not release Carrier from responsibility.",
  },
  {
    num: 3,
    title: "Communication and Incident Reporting",
    body: "Carrier must report arrival, loaded status, departure, location/status updates, delays, route deviations, OS&D, seal issues, accidents, theft, cargo exposure, temperature deviations, and delivery immediately. Emergencies must be reported to 911 first when appropriate, then to the Broker's dispatch contact using the contact details provided on the load. Carrier must preserve documents, photos, telematics, and other evidence relating to any incident.",
  },
  {
    num: 4,
    title: "Cargo, Seals and Securement",
    body: "Carrier and driver must inspect the trailer and visible cargo condition, verify counts when allowed, confirm load distribution and securement, record the seal, and note exceptions on the BOL before leaving pickup. Carrier may not break or replace a seal except as legally required or with prior written authorization; any required seal break must be documented immediately.",
  },
  {
    num: 5,
    title: "Accessorials, Detention and Route Costs",
    body: "The total rate is all-inclusive except items expressly listed on page 1 or later approved in writing by the Broker. Accessorials require prior written approval and supporting receipts. Detention requires timely arrival, immediate notice at the start of delay, signed facility in/out times, and the free-time/rate stated in the special instructions or controlling agreement. Tolls, permits, fuel, parking, and ordinary operating costs are included unless stated otherwise.",
  },
  {
    num: 6,
    title: "Documents and Payment",
    body: "Payment is conditioned on receipt of a correct carrier invoice, this accepted rate confirmation, signed BOL, clean POD, and all required receipts and shipment records. Documents should be submitted promptly to the Broker's designated billing contact unless the Broker provides another written billing address. Quick Pay, if offered, is subject to separate approval and fees. Carrier may not change payment or factoring instructions without verified written documentation.",
  },
  {
    num: 7,
    title: "Customer Service and Cargo Claims",
    body: "Carrier will perform safely, lawfully, and on schedule and will cooperate with reasonable cargo-claim investigation. Carrier remains responsible for loss, damage, delay, contamination, and theft to the extent imposed by applicable law and controlling contracts. No notation by a driver or facility waives the Broker's or the customer's rights.",
  },
  {
    num: 8,
    title: "Indemnity and Recovery of Loss",
    body: "To the fullest extent permitted by law, Carrier will defend, indemnify, and hold harmless the Broker, the customer, and their personnel from claims, fines, penalties, liabilities, cargo loss, property damage, bodily injury, costs, and reasonable attorney fees arising from Carrier's or its personnel's acts, omissions, breach, regulatory violation, identity misrepresentation, unauthorized rebrokering, or unauthorized transfer. The Broker may offset documented amounts owed by Carrier against freight charges when permitted by law and controlling agreements.",
  },
  {
    num: 9,
    title: "Broker Role; Independent Contractor",
    body: "The Broker is a licensed property broker arranging transportation and is not the motor carrier, driver, employer, or warehouseman. Carrier is an independent contractor with exclusive control over its personnel and safe operation. Nothing in this rate confirmation creates an employment, agency, partnership, or joint-venture relationship.",
  },
  {
    num: 10,
    title: "Controlling Documents; No Unilateral Changes",
    body: "This rate confirmation supplements the signed broker-carrier agreement. Load-specific rates, stops, dates, cargo, equipment, and special instructions in this document control for this load; the broker-carrier agreement controls general legal terms if a conflict exists. Carrier tariffs, invoices, BOL language, stamps, portals, or other unilateral terms do not amend the Broker's obligations unless the Broker expressly agrees in writing.",
  },
  {
    num: 11,
    title: "Acceptance; Electronic Records",
    body: "Carrier accepts this rate confirmation by signature, electronic acceptance, written confirmation, dispatch, or pickup after receiving it. Electronic signatures and records are enforceable to the same extent as originals. Carrier must notify the Broker in writing before pickup of any disagreement; silence followed by performance constitutes acceptance.",
  },
  {
    num: 12,
    title: "Governing Law; Severability; No Waiver",
    body: "Except where federal law controls, Texas law applies, and venue lies in state or federal courts in Tarrant County, Texas. If any term is unenforceable, the remaining obligations remain enforceable. No waiver or course of dealing excuses a breach unless signed in writing by the Broker.",
  },
  {
    num: 13,
    title: "Signatures and Validation",
    body: "By accepting this confirmation, Carrier confirms the rate, terms, and supporting load information, and authorizes the Broker to rely on the information provided for freight tendering and payment processing.",
  },
];

// ---------- Helpers ----------

function parseCurrency(value: string): number {
  const n = parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

const sectionClass = "rounded-xl border border-slate-200 bg-card text-card-foreground shadow-sm";

// ---------- Component ----------

function CarrierRateConfirmationPage() {
  const { companyName } = usePortalSettings();
  const portalCompanyName = companyName?.trim() || "TMS Freight Portal";
  const [form, setForm] = useState<RateFormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const updateField = <K extends keyof RateFormState>(field: K, value: RateFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const computedRateTotal = useMemo(
    () =>
      parseCurrency(form.linehaul) +
      parseCurrency(form.fuel) +
      parseCurrency(form.preApprovedAccessorial) +
      parseCurrency(form.other),
    [form.linehaul, form.fuel, form.preApprovedAccessorial, form.other],
  );

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    REQUIRED_FIELDS.forEach(({ key, label }) => {
      if (!form[key] || !String(form[key]).trim()) nextErrors[key] = `${label} is required.`;
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const generatePDF = () => {
    if (!validate()) return;
    setIsGenerating(true);

    try {
      // ----- Palette -----
      const NAVY: [number, number, number] = [21, 38, 61];
      const GOLD: [number, number, number] = [173, 138, 84];
      const BORDER: [number, number, number] = [214, 219, 226];
      const TEXT: [number, number, number] = [26, 32, 40];
      const MUTED: [number, number, number] = [110, 118, 128];

      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      const footerTop = pageHeight - 34;
      let y = 0;

      const drawHeader = (continued: boolean) => {
        doc.setFillColor(...NAVY);
        doc.roundedRect(margin, 26, 64, 30, 4, 4, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("BROKER", margin + 12, 46);

        doc.setTextColor(...NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12.5);
        doc.text(portalCompanyName, margin + 80, 38);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.8);
        doc.setTextColor(...MUTED);
        doc.text("1209 N Saginaw Blvd., Suite G-194, Saginaw, TX 76179", margin + 80, 49);
        doc.text(
          "(682) 552-3169  |  broker-billing@company.com  |  broker-company.com",
          margin + 80,
          59,
        );

        doc.setDrawColor(...GOLD);
        doc.setLineWidth(1.4);
        doc.line(margin, 70, pageWidth - margin, 70);

        doc.setTextColor(...NAVY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14.5);
        doc.text(
          continued ? "CARRIER RATE CONFIRMATION (CONTINUED)" : "CARRIER RATE CONFIRMATION",
          margin,
          90,
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.3);
        doc.setTextColor(...MUTED);
        doc.text("RC-001  |  Rev 1.0  |  Effective Aug 4, 2026", pageWidth - margin, 82, {
          align: "right",
        });
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
        doc.text(
          "CONFIDENTIAL CARRIER RATE DOCUMENT  |  MC 1551655  |  USDOT 4079462",
          margin,
          footerTop,
        );
        doc.text("CONTROLLED TEMPLATE — verify current revision", pageWidth - margin, footerTop, {
          align: "right",
        });
      };

      const ensureSpace = (h: number) => {
        if (y + h > footerTop - 14) {
          drawFooter();
          doc.addPage();
          drawHeader(true);
        }
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

      // Bordered field box with dynamic line capacity based on its own height — fixes
      // both the fill-color leak (explicit white fill every time) and silent text
      // clipping (line count now scales with box height instead of a hard cap of 2).
      const fieldBox = (x: number, by: number, w: number, h: number, lbl: string, val: string) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.75);
        doc.roundedRect(x, by, w, h, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.4);
        doc.setTextColor(...MUTED);
        doc.text(lbl.toUpperCase(), x + 7, by + 13, { charSpace: 0.4 });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.6);
        doc.setTextColor(...TEXT);
        const maxLines = Math.max(1, Math.floor((h - 21) / 9.5));
        const lines = doc.splitTextToSize(val || "—", w - 14);
        doc.text(lines.slice(0, maxLines), x + 7, by + 24);
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

      // Auto-sized box for long free text — height grows with content instead of
      // silently truncating at a fixed line count.
      const longBox = (lbl: string, text: string, minLines = 2) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.6);
        const lines = doc.splitTextToSize(text || "—", contentWidth - 14);
        const lineCount = Math.max(lines.length, minLines);
        const h = 24 + lineCount * 10.5;
        ensureSpace(h + 10);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.75);
        doc.roundedRect(margin, y, contentWidth, h, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.4);
        doc.setTextColor(...MUTED);
        doc.text(lbl.toUpperCase(), margin + 7, y + 13, { charSpace: 0.4 });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.6);
        doc.setTextColor(...TEXT);
        doc.text(lines, margin + 7, y + 26);
        y += h + 10;
      };

      const checkRow = (items: [string, boolean][]) => {
        ensureSpace(20);
        let cx = margin;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.3);
        items.forEach(([lbl, checked]) => {
          doc.setDrawColor(...NAVY);
          doc.setLineWidth(0.9);
          doc.setFillColor(
            checked ? NAVY[0] : 255,
            checked ? NAVY[1] : 255,
            checked ? NAVY[2] : 255,
          );
          doc.roundedRect(cx, y - 8, 10, 10, 1.5, 1.5, "FD");
          if (checked) {
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(1.3);
            doc.line(cx + 2, y - 3, cx + 4.2, y - 0.6);
            doc.line(cx + 4.2, y - 0.6, cx + 8, y - 7);
          }
          doc.setTextColor(...TEXT);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.3);
          doc.text(lbl, cx + 15, y);
          cx += doc.getTextWidth(lbl) + 38;
        });
        y += 20;
      };

      const paragraph = (text: string, size = 7.8) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(size);
        doc.setTextColor(...TEXT);
        const lines = doc.splitTextToSize(text, contentWidth);
        const lineH = size * 1.3;
        lines.forEach((line: string) => {
          ensureSpace(lineH + 2);
          doc.text(line, margin, y);
          y += lineH;
        });
        y += 4;
      };

      const clause = (num: number, title: string, body: string) => {
        ensureSpace(24);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.4);
        doc.setTextColor(...NAVY);
        doc.text(`${num}. ${title.toUpperCase()}`, margin, y);
        y += 12;
        paragraph(body);
      };

      // ---------- Page 1: load data ----------
      drawHeader(false);

      doc.setDrawColor(...GOLD);
      doc.setLineWidth(1);
      doc.roundedRect(margin, y, 330, 20, 3, 3, "D");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.4);
      doc.setTextColor(...NAVY);
      doc.text("CONFIDENTIAL — RATE INFORMATION PROTECTED BY LAW", margin + 10, y + 13, {
        charSpace: 0.3,
      });
      y += 32;

      sectionHeader("Load and Carrier Identification");
      fieldRow([
        { label: "Load No.", value: form.loadNo, w: contentWidth / 4 - 6 },
        { label: "Confirmation Date", value: form.confirmationDate, w: contentWidth / 4 - 6 },
        { label: "PO / Reference", value: form.poReference, w: contentWidth / 4 - 6 },
        { label: "Broker Agent", value: form.brokerAgent, w: contentWidth / 4 - 6 },
      ]);
      fieldRow([
        {
          label: "Carrier Legal Name (must match FMCSA)",
          value: form.carrierLegalName,
          w: contentWidth / 2 - 4,
        },
        { label: "MC / USDOT", value: form.carrierMcUsdot, w: contentWidth / 2 - 4 },
      ]);
      fieldRow([
        {
          label: "Dispatcher / Verified Phone / Email",
          value: form.dispatcherContact,
          w: contentWidth / 2 - 4,
        },
        {
          label: "Factoring Company (if applicable)",
          value: form.factoringCompany,
          w: contentWidth / 2 - 4,
        },
      ]);
      fieldRow([
        { label: "Driver Name", value: form.driverName, w: contentWidth / 3 - 6 },
        { label: "Driver Phone", value: form.driverPhone, w: contentWidth / 3 - 6 },
        { label: "Tractor / Trailer No.", value: form.tractorTrailerNo, w: contentWidth / 3 - 6 },
      ]);

      sectionHeader("Pickup");
      fieldRow([
        { label: "Facility / Shipper", value: form.pickupFacility, w: contentWidth / 2 - 4 },
        {
          label: "Contact / Phone / Appointment",
          value: form.pickupContact,
          w: contentWidth / 2 - 4,
        },
      ]);
      fieldRow([{ label: "Full Address", value: form.pickupAddress, w: contentWidth }]);
      fieldRow([{ label: "Date / Time / Time Zone", value: form.pickupDateTime, w: contentWidth }]);

      sectionHeader("Delivery");
      fieldRow([
        { label: "Facility / Consignee", value: form.deliveryFacility, w: contentWidth / 2 - 4 },
        {
          label: "Contact / Phone / Appointment",
          value: form.deliveryContact,
          w: contentWidth / 2 - 4,
        },
      ]);
      fieldRow([{ label: "Full Address", value: form.deliveryAddress, w: contentWidth }]);
      fieldRow([
        { label: "Date / Time / Time Zone", value: form.deliveryDateTime, w: contentWidth },
      ]);

      sectionHeader("Freight and Equipment");
      fieldRow([
        {
          label: "Commodity / Description",
          value: form.commodityDescription,
          w: contentWidth / 2 - 4,
        },
        { label: "Weight / Pieces", value: form.weightPieces, w: contentWidth / 2 - 4 },
      ]);
      fieldRow([
        { label: "Declared Cargo Value", value: form.declaredCargoValue, w: contentWidth / 3 - 6 },
        { label: "Equipment Type / Size", value: form.equipmentType, w: contentWidth / 3 - 6 },
        {
          label: "Temperature / Securement",
          value: form.temperatureSecurement,
          w: contentWidth / 3 - 6,
        },
      ]);
      fieldRow([{ label: "Seal / Tracking Ref.", value: form.sealTrackingRef, w: contentWidth }]);

      sectionHeader("Confirmed Rate and Payment");
      fieldRow([
        { label: "Linehaul", value: form.linehaul, w: contentWidth / 5 - 6 },
        { label: "Fuel", value: form.fuel, w: contentWidth / 5 - 6 },
        {
          label: "Pre-Approved Accessorial",
          value: form.preApprovedAccessorial,
          w: contentWidth / 5 - 6,
        },
        { label: "Other", value: form.other, w: contentWidth / 5 - 6 },
        { label: "Total Rate", value: form.totalRate, w: contentWidth / 5 - 6 },
      ]);
      fieldRow([{ label: "Payment Terms", value: form.paymentTerms, w: contentWidth }]);
      longBox("Rate Includes / Excludes", form.rateIncludesExcludes);

      // ---------- Terms ----------
      sectionHeader("Carrier Terms and Conditions");
      paragraph(TERMS_INTRO);
      TERMS_CLAUSES.forEach((c) => clause(c.num, c.title, c.body));

      // ---------- Acceptance ----------
      sectionHeader("Acceptance and Verification");
      longBox(
        "Special Instructions / Stop Notes / Detention Terms / Customer Requirements",
        form.specialInstructions,
        3,
      );
      longBox("Other Required Documents / Submission Deadline", form.otherRequiredDocuments);
      fieldRow([
        {
          label: "Authorization and Acceptance",
          value: form.carrierSignatureName,
          w: contentWidth / 2 - 4,
        },
        {
          label: "Broker Signature / Typed Name",
          value: form.brokerSignatureName,
          w: contentWidth / 2 - 4,
        },
      ]);
      fieldRow([
        { label: "Date / Time", value: form.carrierDateTime, w: contentWidth / 2 - 4 },
        {
          label: "Broker Representative / Title",
          value: form.brokerRepresentativeTitle,
          w: contentWidth / 2 - 4,
        },
      ]);
      checkRow([
        ["Authority active", form.authorityActive],
        ["COI active / official", form.coiVerified],
        ["Agreement + W-9", form.agreementAndW9],
      ]);
      checkRow([
        ["Phone/email verified", form.phoneVerified],
        ["Driver/equipment verified", form.driverEquipmentVerified],
      ]);

      drawFooter();

      // Stamp final page numbers now that the true page count is known — replaces
      // the old hardcoded "Page X of 3", which broke as soon as content reflowed.
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p += 1) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.3);
        doc.setTextColor(...MUTED);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, 94, { align: "right" });
      }

      doc.save(`Rate_Confirmation_${form.loadNo || "BROKER"}.pdf`);
    } catch (error) {
      console.error(error);
      alert(
        "Rate confirmation PDF generation failed. Please review the form values and try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Carrier Rate Confirmation"
        description="Carrier pricing acceptance and legal terms."
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
        <Button type="button" onClick={generatePDF} disabled={isGenerating} className="shrink-0">
          <FileDown className="mr-2 size-4" />
          {isGenerating ? "Generating..." : "Generate PDF"}
        </Button>
      </div>

      <div className="space-y-5">
        <Card className={sectionClass}>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <IdCard className="size-4 text-slate-500" />
            <CardTitle className="text-lg font-bold text-slate-900">
              Load and Carrier Identification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Load No." required error={errors.loadNo}>
                <Input
                  value={form.loadNo}
                  onChange={(e) => updateField("loadNo", e.target.value)}
                />
              </Field>
              <Field label="Confirmation Date">
                <Input
                  type="date"
                  value={form.confirmationDate}
                  onChange={(e) => updateField("confirmationDate", e.target.value)}
                />
              </Field>
              <Field label="PO / Reference">
                <Input
                  value={form.poReference}
                  onChange={(e) => updateField("poReference", e.target.value)}
                />
              </Field>
              <Field label="Broker Agent">
                <Input
                  value={form.brokerAgent}
                  onChange={(e) => updateField("brokerAgent", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Carrier Legal Name (must match FMCSA)"
                required
                error={errors.carrierLegalName}
              >
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
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Dispatcher / Verified Phone / Email">
                <Input
                  value={form.dispatcherContact}
                  onChange={(e) => updateField("dispatcherContact", e.target.value)}
                />
              </Field>
              <Field label="Factoring Company (if applicable)">
                <Input
                  value={form.factoringCompany}
                  onChange={(e) => updateField("factoringCompany", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Driver Name">
                <Input
                  value={form.driverName}
                  onChange={(e) => updateField("driverName", e.target.value)}
                />
              </Field>
              <Field label="Driver Phone">
                <Input
                  value={form.driverPhone}
                  onChange={(e) => updateField("driverPhone", e.target.value)}
                />
              </Field>
              <Field label="Tractor / Trailer No.">
                <Input
                  value={form.tractorTrailerNo}
                  onChange={(e) => updateField("tractorTrailerNo", e.target.value)}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card className={sectionClass}>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <MapPin className="size-4 text-slate-500" />
            <CardTitle className="text-lg font-bold text-slate-900">Pickup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Facility / Shipper">
                <Input
                  value={form.pickupFacility}
                  onChange={(e) => updateField("pickupFacility", e.target.value)}
                />
              </Field>
              <Field label="Contact / Phone / Appointment">
                <Input
                  value={form.pickupContact}
                  onChange={(e) => updateField("pickupContact", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Full Address" required error={errors.pickupAddress}>
              <Textarea
                value={form.pickupAddress}
                onChange={(e) => updateField("pickupAddress", e.target.value)}
                className="min-h-20"
              />
            </Field>
            <Field label="Date / Time / Time Zone">
              <Input
                value={form.pickupDateTime}
                onChange={(e) => updateField("pickupDateTime", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className={sectionClass}>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <MapPinCheck className="size-4 text-slate-500" />
            <CardTitle className="text-lg font-bold text-slate-900">Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Facility / Consignee">
                <Input
                  value={form.deliveryFacility}
                  onChange={(e) => updateField("deliveryFacility", e.target.value)}
                />
              </Field>
              <Field label="Contact / Phone / Appointment">
                <Input
                  value={form.deliveryContact}
                  onChange={(e) => updateField("deliveryContact", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Full Address" required error={errors.deliveryAddress}>
              <Textarea
                value={form.deliveryAddress}
                onChange={(e) => updateField("deliveryAddress", e.target.value)}
                className="min-h-20"
              />
            </Field>
            <Field label="Date / Time / Time Zone">
              <Input
                value={form.deliveryDateTime}
                onChange={(e) => updateField("deliveryDateTime", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className={sectionClass}>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Package className="size-4 text-slate-500" />
            <CardTitle className="text-lg font-bold text-slate-900">
              Freight and Equipment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Commodity / Description" required error={errors.commodityDescription}>
                <Textarea
                  value={form.commodityDescription}
                  onChange={(e) => updateField("commodityDescription", e.target.value)}
                  className="min-h-20"
                />
              </Field>
              <Field label="Weight / Pieces">
                <Input
                  value={form.weightPieces}
                  onChange={(e) => updateField("weightPieces", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Declared Cargo Value">
                <Input
                  value={form.declaredCargoValue}
                  onChange={(e) => updateField("declaredCargoValue", e.target.value)}
                />
              </Field>
              <Field label="Equipment Type / Size">
                <Input
                  value={form.equipmentType}
                  onChange={(e) => updateField("equipmentType", e.target.value)}
                />
              </Field>
              <Field label="Temperature / Securement">
                <Input
                  value={form.temperatureSecurement}
                  onChange={(e) => updateField("temperatureSecurement", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Seal / Tracking Ref.">
              <Input
                value={form.sealTrackingRef}
                onChange={(e) => updateField("sealTrackingRef", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className={sectionClass}>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <DollarSign className="size-4 text-slate-500" />
            <CardTitle className="text-lg font-bold text-slate-900">
              Confirmed Rate and Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-5">
              <Field label="Linehaul">
                <Input
                  value={form.linehaul}
                  onChange={(e) => updateField("linehaul", e.target.value)}
                />
              </Field>
              <Field label="Fuel">
                <Input value={form.fuel} onChange={(e) => updateField("fuel", e.target.value)} />
              </Field>
              <Field label="Pre-Approved Accessorial">
                <Input
                  value={form.preApprovedAccessorial}
                  onChange={(e) => updateField("preApprovedAccessorial", e.target.value)}
                />
              </Field>
              <Field label="Other">
                <Input value={form.other} onChange={(e) => updateField("other", e.target.value)} />
              </Field>
              <Field label="Total Rate" required error={errors.totalRate}>
                <Input
                  value={form.totalRate}
                  onChange={(e) => updateField("totalRate", e.target.value)}
                />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Linehaul + Fuel + Accessorial + Other = {money(computedRateTotal)}
              {Math.abs(computedRateTotal - parseCurrency(form.totalRate)) > 0.01
                ? ` (doesn't match Total Rate — double-check before sending)`
                : ""}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Payment Terms">
                <Input
                  value={form.paymentTerms}
                  onChange={(e) => updateField("paymentTerms", e.target.value)}
                />
              </Field>
              <Field label="Rate Includes / Excludes">
                <Textarea
                  value={form.rateIncludesExcludes}
                  onChange={(e) => updateField("rateIncludesExcludes", e.target.value)}
                  className="min-h-20"
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card className={sectionClass}>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ShieldCheck className="size-4 text-slate-500" />
            <CardTitle className="text-lg font-bold text-slate-900">
              Acceptance and Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Special Instructions / Stop Notes / Detention Terms / Customer Requirements">
              <Textarea
                value={form.specialInstructions}
                onChange={(e) => updateField("specialInstructions", e.target.value)}
                className="min-h-28"
              />
            </Field>
            <Field label="Other Required Documents / Submission Deadline">
              <Textarea
                value={form.otherRequiredDocuments}
                onChange={(e) => updateField("otherRequiredDocuments", e.target.value)}
                className="min-h-20"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Broker Representative / Title">
                <Input
                  value={form.brokerRepresentativeTitle}
                  onChange={(e) => updateField("brokerRepresentativeTitle", e.target.value)}
                />
              </Field>
              <Field label="Broker Signature / Typed Name">
                <Input
                  value={form.brokerSignatureName}
                  onChange={(e) => updateField("brokerSignatureName", e.target.value)}
                />
              </Field>
              <Field label="Date / Time">
                <Input
                  type="datetime-local"
                  value={form.brokerDateTime}
                  onChange={(e) => updateField("brokerDateTime", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Carrier Representative / Title">
                <Input
                  value={form.carrierRepresentativeTitle}
                  onChange={(e) => updateField("carrierRepresentativeTitle", e.target.value)}
                />
              </Field>
              <Field label="Carrier Signature / Typed Name">
                <Input
                  value={form.carrierSignatureName}
                  onChange={(e) => updateField("carrierSignatureName", e.target.value)}
                />
              </Field>
              <Field label="Date / Time">
                <Input
                  type="datetime-local"
                  value={form.carrierDateTime}
                  onChange={(e) => updateField("carrierDateTime", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <CheckRow
                label="Authority active"
                checked={form.authorityActive}
                onChange={(v) => updateField("authorityActive", v)}
              />
              <CheckRow
                label="COI active / official"
                checked={form.coiVerified}
                onChange={(v) => updateField("coiVerified", v)}
              />
              <CheckRow
                label="Agreement + W-9"
                checked={form.agreementAndW9}
                onChange={(v) => updateField("agreementAndW9", v)}
              />
              <CheckRow
                label="Phone/email verified"
                checked={form.phoneVerified}
                onChange={(v) => updateField("phoneVerified", v)}
              />
              <CheckRow
                label="Driver/equipment verified"
                checked={form.driverEquipmentVerified}
                onChange={(v) => updateField("driverEquipmentVerified", v)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={generatePDF} disabled={isGenerating}>
          <FileDown className="mr-2 size-4" />
          {isGenerating ? "Generating..." : "Generate PDF"}
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
    <label className="block space-y-1.5 text-left">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
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

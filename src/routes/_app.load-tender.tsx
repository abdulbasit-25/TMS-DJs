import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { FileDown } from "lucide-react";

export const Route = createFileRoute("/_app/load-tender")({
  component: LoadTenderPage,
});

type TenderFormState = {
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
  loadNo: "DJFB-LOAD-2048",
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

const sectionClass = "rounded-xl border border-slate-200 bg-card text-card-foreground shadow-sm";

function LoadTenderPage() {
  const [form, setForm] = useState<TenderFormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const updateField = <K extends keyof TenderFormState>(field: K, value: TenderFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

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
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      const drawHeader = (pageNumber: number, title: string) => {
        doc.setFillColor(24, 47, 70);
        doc.roundedRect(margin, 24, 70, 34, 4, 4, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.text("DJFB", margin + 13, 46);

        doc.setTextColor(24, 47, 70);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("DJ'S FREIGHT BROKER LLC", margin + 94, 39);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text("1209 N Saginaw Blvd., Suite G-194, Saginaw, TX 76179", margin + 94, 51);
        doc.text(
          "(682) 552-3169 | info@djsfreightbroker.com | djsfreightbroker.com",
          margin + 94,
          63,
        );

        doc.setDrawColor(180, 20, 20);
        doc.setLineWidth(1);
        doc.line(margin, 70, pageWidth - margin, 70);

        doc.setTextColor(20, 40, 58);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        doc.text(title, margin, 90);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.3);
        doc.text("DJFB-LT-001 | Revision 1.0 | Effective August 4, 2026", pageWidth - margin, 90, {
          align: "right",
        });
        doc.setFontSize(8.1);
        doc.text(`Page ${pageNumber} of 2`, pageWidth - margin, 102, { align: "right" });
      };

      const drawFooter = () => {
        doc.setTextColor(38, 50, 62);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.text(
          "CONFIDENTIAL CARRIER RATE DOCUMENT | MC 1551655 | USDOT 4079462",
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

      const drawField = (
        x: number,
        y: number,
        w: number,
        h: number,
        label: string,
        value: string,
      ) => {
        doc.setDrawColor(150, 168, 184);
        doc.roundedRect(x, y, w, h, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.1);
        doc.setTextColor(40, 52, 62);
        doc.text(label, x + 5, y + 12);
        doc.setTextColor(20, 23, 30);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.2);
        const text = doc.splitTextToSize(value || "-", w - 12);
        const startY = y + 22;
        for (let i = 0; i < Math.min(2, text.length); i += 1) {
          doc.text(text[i] || "", x + 5, startY + i * 10);
        }
      };

      const drawChecklist = (x: number, y: number, checked: boolean, label: string) => {
        doc.setDrawColor(100, 110, 124);
        doc.rect(x, y, 10, 10);
        if (checked) {
          doc.line(x + 2, y + 2, x + 4, y + 7);
          doc.line(x + 4, y + 7, x + 8, y + 2);
        }
        doc.setTextColor(20, 30, 42);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.2);
        doc.text(label, x + 18, y + 8);
      };

      const drawLongBox = (
        x: number,
        y: number,
        w: number,
        h: number,
        label: string,
        value: string,
      ) => {
        doc.setDrawColor(150, 168, 184);
        doc.roundedRect(x, y, w, h, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.2);
        doc.setTextColor(45, 55, 70);
        doc.text(label, x + 5, y + 12);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.1);
        doc.setTextColor(20, 23, 30);
        const lines = doc.splitTextToSize(value || "", w - 12);
        for (let i = 0; i < Math.min(6, lines.length); i += 1) {
          doc.text(lines[i] || "", x + 5, y + 24 + i * 9);
        }
      };

      drawHeader(1, "LOAD TENDER - PRELIMINARY OFFER");
      doc.setTextColor(64, 72, 82);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("NOT AN AUTHORIZATION TO PICK UP", margin, 118);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      const authText =
        "This tender is a preliminary offer only. Carrier is not authorized to dispatch, enter a facility, or pick up freight until DJ's issues a signed carrier rate confirmation and the carrier accepts it.";
      const authLines = doc.splitTextToSize(authText, contentWidth - 8);
      doc.text(authLines, margin, 130);

      let y = 150;
      doc.setFillColor(228, 235, 242);
      doc.rect(margin, y, contentWidth, 18, "F");
      doc.setTextColor(24, 47, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("LOAD DETAILS", margin + 6, y + 12);
      y += 22;

      drawField(margin, y, contentWidth / 4 - 6, 32, "DJFB LOAD NO.", form.loadNo);
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
      drawField(
        margin,
        y,
        contentWidth / 3 - 8,
        32,
        "DECLARED CARGO VALUE",
        form.declaredCargoValue,
      );
      drawField(
        margin + contentWidth / 3,
        y,
        contentWidth / 3 - 8,
        32,
        "TRAILER SIZE / TYPE / AGE / SPECIAL EQUIPMENT",
        form.trailerSpec,
      );
      drawField(
        margin + (contentWidth / 3) * 2 + 8,
        y,
        contentWidth / 3 - 16,
        32,
        "TEMPERATURE / TARPS / STRAPS / SECUREMENT",
        form.tempSecurement,
      );
      y += 46;

      doc.setFillColor(228, 235, 242);
      doc.rect(margin, y, contentWidth, 18, "F");
      doc.setTextColor(24, 47, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("PICKUP STOP", margin + 6, y + 12);
      y += 22;
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

      doc.setFillColor(228, 235, 242);
      doc.rect(margin, y, contentWidth, 18, "F");
      doc.setTextColor(24, 47, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DELIVERY STOP", margin + 6, y + 12);
      y += 22;
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

      doc.setFillColor(228, 235, 242);
      doc.rect(margin, y, contentWidth, 18, "F");
      doc.setTextColor(24, 47, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("EQUIPMENT AND SERVICE REQUIREMENTS", margin + 6, y + 12);
      y += 24;
      const equipmentRows = [
        ["Dry van", form.equipmentDryVan],
        ["Reefer", form.equipmentReefer],
        ["Flatbed", form.equipmentFlatbed],
        ["Step deck", form.equipmentStepDeck],
        ["Power only", form.equipmentPowerOnly],
        ["Other", form.equipmentOther],
      ];
      let rowX = margin;
      equipmentRows.forEach(([label, checked]) => {
        drawChecklist(rowX, y, Boolean(checked), String(label));
        rowX += 120;
      });
      y += 20;
      drawChecklist(margin, y, form.driverAssist, "Driver assist");
      drawChecklist(margin + 150, y, form.palletExchange, "Pallet exchange");
      drawChecklist(margin + 300, y, form.lumperPossible, "Lumper possible");
      y += 18;
      drawChecklist(margin, y, form.twicRequired, "TWIC required");
      drawChecklist(margin + 150, y, form.hazmat, "Hazmat");
      y += 28;

      doc.setFillColor(228, 235, 242);
      doc.rect(margin, y, contentWidth, 18, "F");
      doc.setTextColor(24, 47, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("PROPOSED RATE", margin + 6, y + 12);
      y += 22;
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
      drawLongBox(margin, y, contentWidth, 54, "RATE NOTES / INCLUDED CHARGES", form.rateNotes);
      drawFooter();
      doc.addPage();

      drawHeader(2, "LOAD TENDER - CARRIER ACCEPTANCE");
      let y2 = 120;
      doc.setFillColor(228, 235, 242);
      doc.rect(margin, y2, contentWidth, 18, "F");
      doc.setTextColor(24, 47, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("CARRIER, DRIVER AND EQUIPMENT INFORMATION", margin + 6, y2 + 12);
      y2 += 22;
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

      drawLongBox(
        margin,
        y2,
        contentWidth,
        120,
        "MATERIAL CARRIER REQUIREMENTS",
        form.materialCarrierRequirements ||
          "Maintain active FMCSA authority and all required cargo, auto, and general liability insurance through final delivery. Activate DJ's-approved GPS tracking before pickup and keep it active through delivery; do not handle tracking while driving. Do not rebroker, transfer, cross-dock, or substitute the driver, tractor, or trailer without DJ's prior written approval. Report arrival, loaded status, departure, delays, incidents, cargo exceptions, and delivery immediately to DJ's Operations. Confirm seal number and cargo condition at pickup and delivery. Do not break a seal except as legally required or authorized in writing. Obtain written pre-approval for accessorials and submit signed receipts, in/out times, invoice, signed BOL, and POD.",
      );
      y2 += 130;

      doc.setTextColor(35, 45, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("CARRIER ACKNOWLEDGMENT", margin, y2);
      y2 += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      const ackText =
        "Carrier confirms the information above is accurate, accepts this preliminary tender subject to the final rate confirmation, and understands that acceptance does not authorize pickup before the final rate confirmation is issued and accepted.";
      const ackLines = doc.splitTextToSize(ackText, contentWidth - 10);
      doc.text(ackLines, margin, y2);
      y2 += 28;
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

      doc.setFillColor(228, 235, 242);
      doc.rect(margin, y2, contentWidth, 18, "F");
      doc.setTextColor(24, 47, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(
        "DJFB INTERNAL CARRIER VERIFICATION - COMPLETE BEFORE RATE CONFIRMATION",
        margin + 6,
        y2 + 12,
      );
      y2 += 22;
      const checks = [
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
      checks.forEach(([label, checked], index) => {
        drawChecklist(checkX, y2 + (index % 4) * 18, Boolean(checked), String(label));
        if (index % 4 === 3) {
          checkX += 170;
        }
      });
      y2 += 80;
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

      doc.save("DJFB-LT-001_Load_Tender.pdf");
    } catch (error) {
      console.error(error);
      alert("Load tender PDF generation failed. Please verify your input and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Load Tender"
        description="DJFB-LT-001 preliminary offer, carrier acceptance, and dispatch verification."
      />

      <div className="flex justify-end">
        <Button type="button" onClick={generatePDF} disabled={isGenerating}>
          <FileDown className="mr-2 size-4" />
          {isGenerating ? "Generating..." : "Generate PDF"}
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.7fr)]">
        <div className="space-y-5">
          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-blue-900">Load Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="DJFB LOAD NO." error={errors.loadNo}>
                  <Input
                    value={form.loadNo}
                    onChange={(e) => updateField("loadNo", e.target.value)}
                  />
                </Field>
                <Field label="DATE / TIME TENDERED">
                  <Input
                    type="datetime-local"
                    value={form.tenderedDateTime}
                    onChange={(e) => updateField("tenderedDateTime", e.target.value)}
                  />
                </Field>
                <Field label="PO / REFERENCE">
                  <Input
                    value={form.poReference}
                    onChange={(e) => updateField("poReference", e.target.value)}
                  />
                </Field>
                <Field label="OFFER EXPIRES">
                  <Input
                    type="datetime-local"
                    value={form.offerExpires}
                    onChange={(e) => updateField("offerExpires", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="COMMODITY / DESCRIPTION" error={errors.commodityDescription}>
                  <Textarea
                    value={form.commodityDescription}
                    onChange={(e) => updateField("commodityDescription", e.target.value)}
                    className="min-h-20"
                  />
                </Field>
                <Field label="WEIGHT / PIECES">
                  <Input
                    value={form.weightPieces}
                    onChange={(e) => updateField("weightPieces", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="DECLARED CARGO VALUE">
                  <Input
                    value={form.declaredCargoValue}
                    onChange={(e) => updateField("declaredCargoValue", e.target.value)}
                  />
                </Field>
                <Field label="TRAILER SIZE / TYPE / AGE / SPECIAL EQUIPMENT">
                  <Input
                    value={form.trailerSpec}
                    onChange={(e) => updateField("trailerSpec", e.target.value)}
                  />
                </Field>
                <Field label="TEMPERATURE / TARPS / STRAPS / SECUREMENT">
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
              <CardTitle className="text-lg font-bold text-blue-900">Pickup Stop</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="FACILITY / SHIPPER" error={errors.shipperFacility}>
                  <Input
                    value={form.shipperFacility}
                    onChange={(e) => updateField("shipperFacility", e.target.value)}
                  />
                </Field>
                <Field label="CONTACT / PHONE / APPOINTMENT">
                  <Input
                    value={form.shipperContact}
                    onChange={(e) => updateField("shipperContact", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="FULL ADDRESS">
                <Textarea
                  value={form.shipperAddress}
                  onChange={(e) => updateField("shipperAddress", e.target.value)}
                  className="min-h-20"
                />
              </Field>
              <Field label="DATE / TIME / TIME ZONE">
                <Input
                  value={form.shipperDateTime}
                  onChange={(e) => updateField("shipperDateTime", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-blue-900">Delivery Stop</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="FACILITY / CONSIGNEE" error={errors.consigneeFacility}>
                  <Input
                    value={form.consigneeFacility}
                    onChange={(e) => updateField("consigneeFacility", e.target.value)}
                  />
                </Field>
                <Field label="CONTACT / PHONE / APPOINTMENT">
                  <Input
                    value={form.consigneeContact}
                    onChange={(e) => updateField("consigneeContact", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="FULL ADDRESS">
                <Textarea
                  value={form.consigneeAddress}
                  onChange={(e) => updateField("consigneeAddress", e.target.value)}
                  className="min-h-20"
                />
              </Field>
              <Field label="DATE / TIME / TIME ZONE">
                <Input
                  value={form.consigneeDateTime}
                  onChange={(e) => updateField("consigneeDateTime", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-blue-900">
                Equipment and Service Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <CheckRow
                  label="Dry van"
                  checked={form.equipmentDryVan}
                  onChange={(v) => updateField("equipmentDryVan", v)}
                />
                <CheckRow
                  label="Reefer"
                  checked={form.equipmentReefer}
                  onChange={(v) => updateField("equipmentReefer", v)}
                />
                <CheckRow
                  label="Flatbed"
                  checked={form.equipmentFlatbed}
                  onChange={(v) => updateField("equipmentFlatbed", v)}
                />
                <CheckRow
                  label="Step deck"
                  checked={form.equipmentStepDeck}
                  onChange={(v) => updateField("equipmentStepDeck", v)}
                />
                <CheckRow
                  label="Power only"
                  checked={form.equipmentPowerOnly}
                  onChange={(v) => updateField("equipmentPowerOnly", v)}
                />
                <CheckRow
                  label="Other"
                  checked={form.equipmentOther}
                  onChange={(v) => updateField("equipmentOther", v)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <CheckRow
                  label="Driver assist"
                  checked={form.driverAssist}
                  onChange={(v) => updateField("driverAssist", v)}
                />
                <CheckRow
                  label="Pallet exchange"
                  checked={form.palletExchange}
                  onChange={(v) => updateField("palletExchange", v)}
                />
                <CheckRow
                  label="Lumper possible"
                  checked={form.lumperPossible}
                  onChange={(v) => updateField("lumperPossible", v)}
                />
                <CheckRow
                  label="TWIC required"
                  checked={form.twicRequired}
                  onChange={(v) => updateField("twicRequired", v)}
                />
                <CheckRow
                  label="Hazmat"
                  checked={form.hazmat}
                  onChange={(v) => updateField("hazmat", v)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-blue-900">Proposed Rate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Field label="LINEHAUL" error={errors.linehaul}>
                  <Input
                    value={form.linehaul}
                    onChange={(e) => updateField("linehaul", e.target.value)}
                  />
                </Field>
                <Field label="FUEL SURCHARGE">
                  <Input
                    value={form.fuelSurcharge}
                    onChange={(e) => updateField("fuelSurcharge", e.target.value)}
                  />
                </Field>
                <Field label="PRE-APPROVED ACCESSORIAL">
                  <Input
                    value={form.preApprovedAccessorial}
                    onChange={(e) => updateField("preApprovedAccessorial", e.target.value)}
                  />
                </Field>
                <Field label="OTHER">
                  <Input
                    value={form.other}
                    onChange={(e) => updateField("other", e.target.value)}
                  />
                </Field>
                <Field label="TOTAL">
                  <Input
                    value={form.total}
                    onChange={(e) => updateField("total", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="PROPOSED PAYMENT TERMS">
                  <Input
                    value={form.paymentTerms}
                    onChange={(e) => updateField("paymentTerms", e.target.value)}
                  />
                </Field>
                <Field label="RATE NOTES / INCLUDED CHARGES">
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
              <CardTitle className="text-lg font-bold text-blue-900">Carrier Acceptance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="CARRIER LEGAL NAME">
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
                <Field label="DISPATCHER / CONTACT">
                  <Input
                    value={form.dispatcherContact}
                    onChange={(e) => updateField("dispatcherContact", e.target.value)}
                  />
                </Field>
                <Field label="VERIFIED PHONE / EMAIL">
                  <Input
                    value={form.verifiedPhoneEmail}
                    onChange={(e) => updateField("verifiedPhoneEmail", e.target.value)}
                  />
                </Field>
                <Field label="DRIVER NAME">
                  <Input
                    value={form.driverName}
                    onChange={(e) => updateField("driverName", e.target.value)}
                  />
                </Field>
                <Field label="DRIVER PHONE">
                  <Input
                    value={form.driverPhone}
                    onChange={(e) => updateField("driverPhone", e.target.value)}
                  />
                </Field>
                <Field label="TRACTOR / TRAILER NO.">
                  <Input
                    value={form.tractorTrailerNo}
                    onChange={(e) => updateField("tractorTrailerNo", e.target.value)}
                  />
                </Field>
                <Field label="AGENT / OPERATIONS LEAD">
                  <Input
                    value={form.agentOperationsLead}
                    onChange={(e) => updateField("agentOperationsLead", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="MATERIAL CARRIER REQUIREMENTS">
                <Textarea
                  value={form.materialCarrierRequirements}
                  onChange={(e) => updateField("materialCarrierRequirements", e.target.value)}
                  className="min-h-32"
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="CARRIER REPRESENTATIVE / TITLE">
                  <Input
                    value={form.carrierRepresentativeTitle}
                    onChange={(e) => updateField("carrierRepresentativeTitle", e.target.value)}
                  />
                </Field>
                <Field label="SIGNATURE / TYPED NAME">
                  <Input
                    value={form.carrierSignatureName}
                    onChange={(e) => updateField("carrierSignatureName", e.target.value)}
                  />
                </Field>
                <Field label="DATE / TIME">
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
              <CardTitle className="text-lg font-bold text-blue-900">
                Internal Carrier Verification
              </CardTitle>
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
                <Field label="VERIFICATION DATE / TIME">
                  <Input
                    type="datetime-local"
                    value={form.verificationDateTime}
                    onChange={(e) => updateField("verificationDateTime", e.target.value)}
                  />
                </Field>
                <Field label="EXCEPTION / APPROVAL REF.">
                  <Input
                    value={form.exceptionApprovalRef}
                    onChange={(e) => updateField("exceptionApprovalRef", e.target.value)}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-blue-900">Tender Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-700">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wide">DJFB</div>
                  <div className="text-[9px] text-slate-500">P1 of 2</div>
                </div>
                <div className="space-y-2">
                  <PreviewRow label="Load No." value={form.loadNo} />
                  <PreviewRow label="Tendered" value={form.tenderedDateTime} />
                  <PreviewRow label="Shipper" value={form.shipperFacility} />
                  <PreviewRow label="Consignee" value={form.consigneeFacility} />
                  <PreviewRow label="Rate" value={form.total} />
                </div>
              </div>
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-[11px]">
                <div className="font-semibold text-slate-700">Document summary</div>
                <div className="mt-2">Commodity: {form.commodityDescription || "—"}</div>
                <div>Equipment: {equipmentSummary(form)}</div>
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
    <label className="block space-y-1.5 text-left">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
        {label}
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

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-200 pb-1 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-700">{value || "—"}</span>
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

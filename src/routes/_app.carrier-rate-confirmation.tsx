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

export const Route = createFileRoute("/_app/carrier-rate-confirmation")({
  component: CarrierRateConfirmationPage,
});

type RateFormState = {
  loadNo: string;
  confirmationDate: string;
  poReference: string;
  djfbAgent: string;
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
  loadNo: "DJFB-LOAD-2048",
  confirmationDate: "2026-08-29",
  poReference: "PO-11842",
  djfbAgent: "A. Johnson",
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
    "Confirm arrival and departure updates with DJ's Operations. Keep GPS active through delivery.",
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

const sectionClass = "rounded-xl border border-slate-200 bg-card text-card-foreground shadow-sm";

function CarrierRateConfirmationPage() {
  const [form, setForm] = useState<RateFormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const updateField = <K extends keyof RateFormState>(field: K, value: RateFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.loadNo.trim()) nextErrors.loadNo = "Load number required.";
    if (!form.carrierLegalName.trim()) nextErrors.carrierLegalName = "Carrier legal name required.";
    if (!form.commodityDescription.trim()) nextErrors.commodityDescription = "Commodity required.";
    if (!form.totalRate.trim()) nextErrors.totalRate = "Total rate required.";
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
        doc.text("DJFB-RC-001 | Revision 1.0 | Effective August 4, 2026", pageWidth - margin, 90, {
          align: "right",
        });
        doc.setFontSize(8.1);
        doc.text(`Page ${pageNumber} of 3`, pageWidth - margin, 102, { align: "right" });
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
          { align: "right" },
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
        doc.setFontSize(7.2);
        doc.setTextColor(40, 52, 62);
        doc.text(label, x + 5, y + 12);
        doc.setTextColor(20, 23, 30);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.1);
        const lines = doc.splitTextToSize(value || "-", w - 12);
        const startY = y + 24;
        for (let i = 0; i < Math.min(2, lines.length); i += 1) {
          doc.text(lines[i] || "", x + 5, startY + i * 10);
        }
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
        doc.setTextColor(40, 52, 62);
        doc.text(label, x + 5, y + 12);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.1);
        doc.setTextColor(20, 23, 30);
        const lines = doc.splitTextToSize(value || "", w - 12);
        for (let i = 0; i < Math.min(7, lines.length); i += 1) {
          doc.text(lines[i] || "", x + 5, y + 24 + i * 9);
        }
      };

      const drawCheck = (x: number, y: number, checked: boolean, label: string) => {
        doc.setDrawColor(100, 110, 124);
        doc.rect(x, y, 10, 10);
        if (checked) {
          doc.line(x + 2, y + 2, x + 4, y + 7);
          doc.line(x + 4, y + 7, x + 8, y + 2);
        }
        doc.setTextColor(20, 23, 30);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.1);
        doc.text(label, x + 18, y + 8);
      };

      drawHeader(1, "CARRIER RATE CONFIRMATION");
      doc.setTextColor(60, 70, 80);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.7);
      doc.text(
        "CONFIDENTIAL - RATE INFORMATION MAY NOT BE DISCLOSED EXCEPT AS REQUIRED BY LAW",
        margin,
        116,
      );
      let y = 132;
      doc.setFillColor(228, 235, 242);
      doc.rect(margin, y, contentWidth, 18, "F");
      doc.setTextColor(24, 47, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("LOAD AND CARRIER IDENTIFICATION", margin + 6, y + 12);
      y += 22;
      drawField(margin, y, contentWidth / 4 - 6, 32, "DJFB LOAD NO.", form.loadNo);
      drawField(
        margin + contentWidth / 4,
        y,
        contentWidth / 4 - 6,
        32,
        "CONFIRMATION DATE",
        form.confirmationDate,
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
        "DJFB AGENT",
        form.djfbAgent,
      );
      y += 42;
      drawField(
        margin,
        y,
        contentWidth / 2 - 8,
        32,
        "CARRIER LEGAL NAME (MUST MATCH FMCSA)",
        form.carrierLegalName,
      );
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        32,
        "MC / USDOT",
        form.carrierMcUsdot,
      );
      y += 42;
      drawField(
        margin,
        y,
        contentWidth / 2 - 8,
        32,
        "DISPATCHER / VERIFIED PHONE / EMAIL",
        form.dispatcherContact,
      );
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        32,
        "FACTORING COMPANY (IF APPLICABLE)",
        form.factoringCompany,
      );
      y += 42;
      drawField(margin, y, contentWidth / 3 - 8, 32, "DRIVER NAME", form.driverName);
      drawField(
        margin + contentWidth / 3,
        y,
        contentWidth / 3 - 8,
        32,
        "DRIVER PHONE",
        form.driverPhone,
      );
      drawField(
        margin + (contentWidth / 3) * 2 + 8,
        y,
        contentWidth / 3 - 16,
        32,
        "TRACTOR / TRAILER NO.",
        form.tractorTrailerNo,
      );
      y += 52;
      doc.setFillColor(228, 235, 242);
      doc.rect(margin, y, contentWidth, 18, "F");
      doc.setTextColor(24, 47, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("PICKUP", margin + 6, y + 12);
      y += 22;
      drawField(margin, y, contentWidth / 2 - 8, 32, "FACILITY / SHIPPER", form.pickupFacility);
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        32,
        "CONTACT / PHONE / APPOINTMENT",
        form.pickupContact,
      );
      y += 42;
      drawField(margin, y, contentWidth, 32, "FULL ADDRESS", form.pickupAddress);
      y += 40;
      drawField(margin, y, contentWidth, 32, "DATE / TIME / TIME ZONE", form.pickupDateTime);
      y += 52;
      doc.setFillColor(228, 235, 242);
      doc.rect(margin, y, contentWidth, 18, "F");
      doc.setTextColor(24, 47, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DELIVERY", margin + 6, y + 12);
      y += 22;
      drawField(margin, y, contentWidth / 2 - 8, 32, "FACILITY / CONSIGNEE", form.deliveryFacility);
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        32,
        "CONTACT / PHONE / APPOINTMENT",
        form.deliveryContact,
      );
      y += 42;
      drawField(margin, y, contentWidth, 32, "FULL ADDRESS", form.deliveryAddress);
      y += 40;
      drawField(margin, y, contentWidth, 32, "DATE / TIME / TIME ZONE", form.deliveryDateTime);
      y += 52;
      doc.setFillColor(228, 235, 242);
      doc.rect(margin, y, contentWidth, 18, "F");
      doc.setTextColor(24, 47, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("FREIGHT AND EQUIPMENT", margin + 6, y + 12);
      y += 22;
      drawField(
        margin,
        y,
        contentWidth / 2 - 8,
        32,
        "COMMODITY / DESCRIPTION",
        form.commodityDescription,
      );
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        32,
        "WEIGHT / PIECES",
        form.weightPieces,
      );
      y += 42;
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
        "EQUIPMENT TYPE / SIZE",
        form.equipmentType,
      );
      drawField(
        margin + (contentWidth / 3) * 2 + 8,
        y,
        contentWidth / 3 - 16,
        32,
        "TEMPERATURE / SECUREMENT",
        form.temperatureSecurement,
      );
      y += 42;
      drawField(margin, y, contentWidth / 2 - 8, 32, "SEAL / TRACKING REF.", form.sealTrackingRef);
      drawField(
        margin + contentWidth / 2 + 8,
        y,
        contentWidth / 2 - 16,
        32,
        "CONFIRMED RATE AND PAYMENT",
        form.totalRate,
      );
      drawFooter();
      doc.addPage();

      drawHeader(2, "CARRIER TERMS - TRACKING, SECURITY & PERFORMANCE");
      let y2 = 120;
      const termsText =
        "Active GPS tracking is a material condition of this shipment. Tracking must be activated before pickup and remain active through delivery. Carrier shall not rebroker, transfer, cross-dock, or substitute a driver or equipment without DJ's prior written approval. Failure to comply is a material breach and may result in cancellation, nonpayment where legally permitted, indemnification, and recovery of resulting losses. Safety instruction: tracking setup and updates must be completed while safely parked, never while driving. 1. AUTHORITY, IDENTITY AND INSURANCE Carrier warrants that its legal name, MC/USDOT number, dispatch contact, driver, tractor, and trailer information are accurate and match the carrier vetted by DJ's. Carrier will maintain active operating authority and all insurance required by law, the broker-carrier agreement, and this load through final delivery. Carrier must immediately disclose any authority, insurance, ownership, contact, or factoring change. 2. EXCLUSIVE CUSTODY AND NO SUBSTITUTION Carrier retains exclusive possession, control, and use of the equipment and assumes full responsibility for the freight from pickup through delivery. No trip lease, interchange, subcontracting, team/driver change, trailer swap, cross-dock, transload, storage, or other transfer is permitted without DJ's prior written approval. Approval of a change does not release Carrier from responsibility. 3. COMMUNICATION AND INCIDENT REPORTING Carrier must report arrival, loaded status, departure, location/status updates, delays, route deviations, OS&D, seal issues, accidents, theft, cargo exposure, temperature deviations, and delivery immediately. Emergencies must be reported to 911 first when appropriate, then to DJ's at (682) 552-3169. Carrier must preserve documents, photos, telematics, and other evidence relating to any incident. 4. CARGO, SEALS AND SECUREMENT Carrier and driver must inspect the trailer and visible cargo condition, verify counts when allowed, confirm load distribution and securement, record the seal, and note exceptions on the BOL before leaving pickup. Carrier may not break or replace a seal except as legally required or with prior written authorization; any required seal break must be documented immediately. 5. ACCESSORIALS, DETENTION AND ROUTE COSTS The total rate is all-inclusive except items expressly listed on page 1 or later approved in writing by DJ's. Accessorials require prior written approval and supporting receipts. Detention requires timely arrival, immediate notice at the start of delay, signed facility in/out times, and the free-time/rate stated in the special instructions or controlling agreement. Tolls, permits, fuel, parking, and ordinary operating costs are included unless stated otherwise. 6. DOCUMENTS AND PAYMENT Payment is conditioned on receipt of a correct carrier invoice, this accepted rate confirmation, signed BOL, clean POD, and all required receipts and shipment records. Documents should be submitted promptly to info@djsfreightbroker.com unless DJ's provides another written billing address. Quick Pay, if offered, is subject to separate approval and fees. Carrier may not change payment or factoring instructions without verified written documentation. 7. CUSTOMER SERVICE AND CARGO CLAIMS Carrier will perform safely, lawfully, and on schedule and will cooperate with reasonable cargo-claim investigation. Carrier remains responsible for loss, damage, delay, contamination, and theft to the extent imposed by applicable law and controlling contracts. No notation by a driver or facility waives DJ's or the customer's rights.";
      const termLines = doc.splitTextToSize(termsText, contentWidth - 8);
      doc.setTextColor(20, 24, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.text(termLines, margin, y2);
      drawFooter();
      doc.addPage();

      drawHeader(3, "CARRIER TERMS - LEGAL, DOCUMENTS & ACCEPTANCE");
      let y3 = 120;
      const legalText =
        "8. INDEMNITY AND RECOVERY OF LOSS To the fullest extent permitted by law, Carrier will defend, indemnify, and hold harmless DJ's Freight Broker LLC, the customer, and their personnel from claims, fines, penalties, liabilities, cargo loss, property damage, bodily injury, costs, and reasonable attorney fees arising from Carrier's or its personnel's acts, omissions, breach, regulatory violation, identity misrepresentation, unauthorized rebrokering, or unauthorized transfer. DJ's may offset documented amounts owed by Carrier against freight charges when permitted by law and controlling agreements. 9. BROKER ROLE; INDEPENDENT CONTRACTOR DJ's is a licensed property broker arranging transportation and is not the motor carrier, driver, employer, or warehouseman. Carrier is an independent contractor with exclusive control over its personnel and safe operation. Nothing in this rate confirmation creates an employment, agency, partnership, or joint-venture relationship. 10. CONTROLLING DOCUMENTS; NO UNILATERAL CHANGES This rate confirmation supplements the signed broker-carrier agreement. Load-specific rates, stops, dates, cargo, equipment, and special instructions in this document control for this load; the broker-carrier agreement controls general legal terms if a conflict exists. Carrier tariffs, invoices, BOL language, stamps, portals, or other unilateral terms do not amend DJ's obligations unless DJ's expressly agrees in writing. 11. ACCEPTANCE; ELECTRONIC RECORDS Carrier accepts this rate confirmation by signature, electronic acceptance, written confirmation, dispatch, or pickup after receiving it. Electronic signatures and records are enforceable to the same extent as originals. Carrier must notify DJ's in writing before pickup of any disagreement; silence followed by performance constitutes acceptance. 12. GOVERNING LAW; SEVERABILITY; NO WAIVER Except where federal law controls, Texas law applies, and venue lies in state or federal courts in Tarrant County, Texas. If any provision is unenforceable, it will be narrowed or severed without affecting the remainder. A waiver must be in writing and applies only to that instance.";
      doc.setTextColor(20, 24, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.7);
      doc.text(doc.splitTextToSize(legalText, contentWidth - 8), margin, y3);
      y3 += 200;
      drawLongBox(
        margin,
        y3,
        contentWidth,
        72,
        "SPECIAL INSTRUCTIONS / STOP NOTES / DETENTION TERMS / CUSTOMER REQUIREMENTS",
        form.specialInstructions,
      );
      y3 += 92;
      drawField(margin, y3, contentWidth / 3 - 8, 28, "CARRIER INVOICE", "");
      drawField(margin + contentWidth / 3, y3, contentWidth / 3 - 8, 28, "SIGNED BOL", "");
      drawField(
        margin + (contentWidth / 3) * 2 + 8,
        y3,
        contentWidth / 3 - 16,
        28,
        "CLEAN POD",
        "",
      );
      y3 += 42;
      drawField(
        margin,
        y3,
        contentWidth / 2 - 8,
        28,
        "AUTHORIZATION AND ACCEPTANCE",
        form.carrierSignatureName,
      );
      drawField(
        margin + contentWidth / 2 + 8,
        y3,
        contentWidth / 2 - 16,
        28,
        "BROKER SIGNATURE / TYPED NAME",
        form.brokerSignatureName,
      );
      y3 += 42;
      drawField(margin, y3, contentWidth / 2 - 8, 28, "DATE / TIME", form.carrierDateTime);
      drawField(
        margin + contentWidth / 2 + 8,
        y3,
        contentWidth / 2 - 16,
        28,
        "BROKER REPRESENTATIVE / TITLE",
        form.brokerRepresentativeTitle,
      );
      y3 += 52;
      drawCheck(margin, y3, form.authorityActive, "Authority active");
      drawCheck(margin + 160, y3, form.coiVerified, "COI active / official");
      drawCheck(margin + 330, y3, form.agreementAndW9, "Agreement + W-9");
      y3 += 18;
      drawCheck(margin, y3, form.phoneVerified, "Phone/email verified");
      drawCheck(margin + 160, y3, form.driverEquipmentVerified, "Driver/equipment verified");
      drawFooter();

      doc.save("DJFB-RC-001_Carrier_Rate_Confirmation.pdf");
    } catch (error) {
      console.error(error);
      alert(
        "Rate confirmation PDF generation failed. Please review the form values and try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Carrier Rate Confirmation"
        description="DJFB-RC-001 carrier pricing acceptance and legal terms."
      />

      <div className="flex justify-end">
        <Button type="button" onClick={generatePDF} disabled={isGenerating}>
          <FileDown className="mr-2 size-4" />
          {isGenerating ? "Generating..." : "Generate PDF"}
        </Button>
      </div>

      <div className="space-y-5">
        <Card className={sectionClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-blue-900">
              Load and Carrier Identification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="DJFB LOAD NO." error={errors.loadNo}>
                <Input
                  value={form.loadNo}
                  onChange={(e) => updateField("loadNo", e.target.value)}
                />
              </Field>
              <Field label="CONFIRMATION DATE">
                <Input
                  type="date"
                  value={form.confirmationDate}
                  onChange={(e) => updateField("confirmationDate", e.target.value)}
                />
              </Field>
              <Field label="PO / REFERENCE">
                <Input
                  value={form.poReference}
                  onChange={(e) => updateField("poReference", e.target.value)}
                />
              </Field>
              <Field label="DJFB AGENT">
                <Input
                  value={form.djfbAgent}
                  onChange={(e) => updateField("djfbAgent", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="CARRIER LEGAL NAME (MUST MATCH FMCSA)" error={errors.carrierLegalName}>
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
              <Field label="DISPATCHER / VERIFIED PHONE / EMAIL">
                <Input
                  value={form.dispatcherContact}
                  onChange={(e) => updateField("dispatcherContact", e.target.value)}
                />
              </Field>
              <Field label="FACTORING COMPANY (IF APPLICABLE)">
                <Input
                  value={form.factoringCompany}
                  onChange={(e) => updateField("factoringCompany", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
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
            </div>
          </CardContent>
        </Card>

        <Card className={sectionClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-blue-900">Pickup and Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="PICKUP FACILITY / SHIPPER">
                <Input
                  value={form.pickupFacility}
                  onChange={(e) => updateField("pickupFacility", e.target.value)}
                />
              </Field>
              <Field label="PICKUP CONTACT / PHONE / APPOINTMENT">
                <Input
                  value={form.pickupContact}
                  onChange={(e) => updateField("pickupContact", e.target.value)}
                />
              </Field>
            </div>
            <Field label="PICKUP FULL ADDRESS">
              <Textarea
                value={form.pickupAddress}
                onChange={(e) => updateField("pickupAddress", e.target.value)}
                className="min-h-20"
              />
            </Field>
            <Field label="PICKUP DATE / TIME / TIME ZONE">
              <Input
                value={form.pickupDateTime}
                onChange={(e) => updateField("pickupDateTime", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="DELIVERY FACILITY / CONSIGNEE">
                <Input
                  value={form.deliveryFacility}
                  onChange={(e) => updateField("deliveryFacility", e.target.value)}
                />
              </Field>
              <Field label="DELIVERY CONTACT / PHONE / APPOINTMENT">
                <Input
                  value={form.deliveryContact}
                  onChange={(e) => updateField("deliveryContact", e.target.value)}
                />
              </Field>
            </div>
            <Field label="DELIVERY FULL ADDRESS">
              <Textarea
                value={form.deliveryAddress}
                onChange={(e) => updateField("deliveryAddress", e.target.value)}
                className="min-h-20"
              />
            </Field>
            <Field label="DELIVERY DATE / TIME / TIME ZONE">
              <Input
                value={form.deliveryDateTime}
                onChange={(e) => updateField("deliveryDateTime", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className={sectionClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-blue-900">Freight and Equipment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Field label="EQUIPMENT TYPE / SIZE">
                <Input
                  value={form.equipmentType}
                  onChange={(e) => updateField("equipmentType", e.target.value)}
                />
              </Field>
              <Field label="TEMPERATURE / SECUREMENT">
                <Input
                  value={form.temperatureSecurement}
                  onChange={(e) => updateField("temperatureSecurement", e.target.value)}
                />
              </Field>
            </div>
            <Field label="SEAL / TRACKING REF.">
              <Input
                value={form.sealTrackingRef}
                onChange={(e) => updateField("sealTrackingRef", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className={sectionClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-blue-900">
              Confirmed Rate and Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-5">
              <Field label="LINEHAUL">
                <Input
                  value={form.linehaul}
                  onChange={(e) => updateField("linehaul", e.target.value)}
                />
              </Field>
              <Field label="FUEL">
                <Input value={form.fuel} onChange={(e) => updateField("fuel", e.target.value)} />
              </Field>
              <Field label="PRE-APPROVED ACCESSORIAL">
                <Input
                  value={form.preApprovedAccessorial}
                  onChange={(e) => updateField("preApprovedAccessorial", e.target.value)}
                />
              </Field>
              <Field label="OTHER">
                <Input value={form.other} onChange={(e) => updateField("other", e.target.value)} />
              </Field>
              <Field label="TOTAL RATE" error={errors.totalRate}>
                <Input
                  value={form.totalRate}
                  onChange={(e) => updateField("totalRate", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="PAYMENT TERMS">
                <Input
                  value={form.paymentTerms}
                  onChange={(e) => updateField("paymentTerms", e.target.value)}
                />
              </Field>
              <Field label="RATE INCLUDES / EXCLUDES">
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
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-blue-900">
              Acceptance and Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="SPECIAL INSTRUCTIONS / STOP NOTES / DETENTION TERMS / CUSTOMER REQUIREMENTS">
              <Textarea
                value={form.specialInstructions}
                onChange={(e) => updateField("specialInstructions", e.target.value)}
                className="min-h-28"
              />
            </Field>
            <Field label="OTHER REQUIRED DOCUMENTS / SUBMISSION DEADLINE">
              <Textarea
                value={form.otherRequiredDocuments}
                onChange={(e) => updateField("otherRequiredDocuments", e.target.value)}
                className="min-h-20"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="BROKER REPRESENTATIVE / TITLE">
                <Input
                  value={form.brokerRepresentativeTitle}
                  onChange={(e) => updateField("brokerRepresentativeTitle", e.target.value)}
                />
              </Field>
              <Field label="BROKER SIGNATURE / TYPED NAME">
                <Input
                  value={form.brokerSignatureName}
                  onChange={(e) => updateField("brokerSignatureName", e.target.value)}
                />
              </Field>
              <Field label="DATE / TIME">
                <Input
                  type="datetime-local"
                  value={form.brokerDateTime}
                  onChange={(e) => updateField("brokerDateTime", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="CARRIER REPRESENTATIVE / TITLE">
                <Input
                  value={form.carrierRepresentativeTitle}
                  onChange={(e) => updateField("carrierRepresentativeTitle", e.target.value)}
                />
              </Field>
              <Field label="CARRIER SIGNATURE / TYPED NAME">
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

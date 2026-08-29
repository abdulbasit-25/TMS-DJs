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
import { FileDown, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/straight-bill-of-lading")({
  component: StraightBillOfLadingPage,
});

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
  specialInstructions: string;
  carrierLegalName: string;
  carrierMcUsdot: string;
  driverName: string;
  driverPhone: string;
  tractorTrailerNo: string;
  sealNo: string;
  sealRequired: string;
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
  loadNo: "DJFB-LOAD-2048",
  bolNo: "DJFB-BL-001",
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
  specialInstructions: "Handle with care. Keep freight secure and deliver by appointment window.",
  carrierLegalName: "",
  carrierMcUsdot: "",
  driverName: "",
  driverPhone: "",
  tractorTrailerNo: "",
  sealNo: "",
  sealRequired: "",
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

const sectionClass = "rounded-xl border border-slate-200 bg-card text-card-foreground shadow-sm";

function StraightBillOfLadingPage() {
  const [form, setForm] = useState<BOLFormState>(initialState);
  const [freightItems, setFreightItems] = useState<FreightItem[]>(initialFreightItems);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const totals = useMemo(() => {
    const units = freightItems.reduce((sum, row) => sum + Number(row.units || 0), 0);
    const weight = freightItems.reduce((sum, row) => sum + Number(row.weight || 0), 0);
    return { units, weight };
  }, [freightItems]);

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

      const drawHeader = (pageNumber: number, title: string) => {
        const leftX = margin;
        const topY = 28;

        doc.setFillColor(24, 47, 70);
        doc.roundedRect(leftX, topY, 72, 34, 4, 4, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.text("DJFB", leftX + 13, topY + 22);

        doc.setTextColor(26, 56, 86);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("DJ'S FREIGHT BROKER LLC", leftX + 92, topY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.6);
        doc.text("1209 N Saginaw Blvd., Suite G-194, Saginaw, TX 76179", leftX + 92, topY + 27);
        doc.text("(682) 552-3169 | info@djsfreightbroker.com | djsfreightbroker.com", leftX + 92, topY + 38);

        doc.setDrawColor(180, 20, 20);
        doc.setLineWidth(1.2);
        doc.line(margin, topY + 46, pageWidth - margin, topY + 46);

        doc.setTextColor(23, 40, 58);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(title, margin, 78);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.3);
        doc.text(
          `DJFB-BL-001 | Revision 1.0 | Effective August 4, 2026`,
          pageWidth - margin,
          78,
          { align: "right" },
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.1);
        doc.text(`Page ${pageNumber} of 2`, pageWidth - margin, 90, { align: "right" });
      };

      const drawFooter = () => {
        doc.setTextColor(40, 52, 62);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.4);
        doc.text("FMCSA PROPERTY BROKER | MC 1551655 | USDOT 4079462", margin, pageHeight - 18);
        doc.text("CONTROLLED TEMPLATE | Verify current revision", pageWidth - margin, pageHeight - 18, {
          align: "right",
        });
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
        doc.setDrawColor(151, 171, 193);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, w, h, 1.5, 1.5, "FD");
        doc.setTextColor(40, 52, 62);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(labelSize);
        doc.text(label, x + 5, y + 13);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(18, 23, 32);
        const text = value || "";
        const lines = doc.splitTextToSize(text, w - 12);
        const lineHeight = 9;
        const startY = y + 24;
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
        doc.setFillColor(229, 236, 245);
        doc.roundedRect(x, y, width, 18, 0, 0, "F");
        doc.setTextColor(20, 44, 70);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.8);
        doc.text(label, x + 6, y + 12);
      };

      const drawLongBox = (x: number, y: number, width: number, height: number, label: string, value: string) => {
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

      // page 1
      drawHeader(1, "STRAIGHT BILL OF LADING - NON-NEGOTIABLE");

      let y = 110;
      drawSectionHeading("SHIPMENT IDENTIFICATION", margin, y, contentWidth);
      y += 24;

      drawField(margin, y, contentWidth / 4 - 6, 28, "DJFB LOAD NO.", form.loadNo);
      drawField(margin + contentWidth / 4, y, contentWidth / 4 - 6, 28, "BOL NO.", form.bolNo);
      drawField(
        margin + (contentWidth / 4) * 2,
        y,
        contentWidth / 4 - 6,
        28,
        "CUSTOMER PO / REFERENCE",
        form.customerReference,
      );
      drawField(margin + (contentWidth / 4) * 3 + 6, y, contentWidth / 4 - 12, 28, "DATE ISSUED", form.dateIssued);
      y += 38;

      drawField(margin, y, contentWidth / 3 - 8, 28, "PICKUP DATE / TIME / TIME ZONE", `${form.pickupDate} ${form.pickupTime} ${form.pickupTimezone}`);
      drawField(margin + contentWidth / 3, y, contentWidth / 3 - 8, 28, "DELIVERY DATE / TIME / TIME ZONE", `${form.deliveryDate} ${form.deliveryTime} ${form.deliveryTimezone}`);
      drawField(margin + (contentWidth / 3) * 2 + 8, y, contentWidth / 3 - 16, 28, "EQUIPMENT TYPE", form.equipmentType);
      y += 42;

      doc.setFont("helvetica", "italic");
      doc.setTextColor(90, 96, 103);
      doc.setFontSize(8.5);
      doc.text("DJ's Freight Broker LLC acts solely as a property broker", pageWidth - margin, y + 4, {
        align: "right",
      });

      y += 12;
      drawSectionHeading("ORIGIN / SHIPPER", margin, y, contentWidth);
      y += 24;
      drawField(margin, y, contentWidth / 2 - 8, 28, "SHIPPER NAME", form.shipperName);
      drawField(margin + contentWidth / 2 + 8, y, contentWidth / 2 - 16, 28, "CONTACT / PHONE", form.shipperContact);
      y += 38;
      drawField(margin, y, contentWidth / 2 - 8, 28, "PICKUP ADDRESS", form.pickupAddress);
      drawField(margin + contentWidth / 2 + 8, y, contentWidth / 2 - 16, 28, "DOCK / APPOINTMENT NO.", form.pickupDock);
      y += 46;

      drawSectionHeading("DESTINATION / CONSIGNEE", margin, y, contentWidth);
      y += 24;
      drawField(margin, y, contentWidth / 2 - 8, 28, "CONSIGNEE NAME", form.consigneeName);
      drawField(margin + contentWidth / 2 + 8, y, contentWidth / 2 - 16, 28, "CONTACT / PHONE", form.consigneeContact);
      y += 38;
      drawField(margin, y, contentWidth / 2 - 8, 28, "DELIVERY ADDRESS", form.deliveryAddress);
      drawField(margin + contentWidth / 2 + 8, y, contentWidth / 2 - 16, 28, "DOCK / APPOINTMENT NO.", form.deliveryDock);
      y += 46;

      drawSectionHeading("FREIGHT DESCRIPTION", margin, y, contentWidth);
      doc.setTextColor(90, 96, 103);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.3);
      doc.text("Shipper must identify hazardous materials and special handling needs", pageWidth - margin, y + 12, {
        align: "right",
      });
      y += 22;

      const freightTableY = y;
      const rowHeight = 36;
      const tableWidth = contentWidth;
      const colW = {
        hm: 46,
        units: 52,
        pkg: 50,
        commodity: 200,
        nmfc: 83,
        weight: 64,
      };
      let x = margin;
      const headers = ["HM", "Units", "Pkg", "Commodity / Description", "NMFC / Class", "Weight"];
      const headerWidths = [colW.hm, colW.units, colW.pkg, colW.commodity, colW.nmfc, colW.weight];

      headers.forEach((header, idx) => {
        doc.setFillColor(243, 247, 250);
        doc.setDrawColor(151, 171, 193);
        doc.rect(x, freightTableY, headerWidths[idx], 18, "FD");
        doc.setTextColor(35, 46, 60);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.2);
        doc.text(header, x + 4, freightTableY + 12);
        x += headerWidths[idx];
      });

      let currentY = freightTableY + 18;
      freightItems.forEach((row) => {
        x = margin;
        const rowValues = [
          row.hm,
          row.units,
          row.pkg,
          row.commodity,
          row.nmfcClass,
          row.weight,
        ];
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

      drawField(margin, y, 172, 26, "TOTAL UNITS", String(totals.units));
      drawField(margin + 172 + 10, y, 172, 26, "TOTAL WEIGHT", String(totals.weight));
      drawField(margin + 354 + 20, y, 136, 26, "DECLARED VALUE (IF ANY)", "");
      y += 38;

      drawCheck(margin + 350, y, form.hazmat === "Yes");
      doc.setTextColor(28, 34, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.4);
      doc.text("Hazmat - Yes", margin + 366, y + 8);
      drawCheck(margin + 450, y, form.hazmat === "No");
      doc.text("Hazmat - No", margin + 466, y + 8);
      y += 16;

      drawLongBox(margin, y, contentWidth, 72, "SPECIAL INSTRUCTIONS / HANDLING / TEMPERATURE / SECUREMENT", form.specialInstructions);
      y += 90;

      drawFooter();
      doc.addPage();

      drawHeader(2, "STRAIGHT BILL OF LADING - CUSTODY & RECEIPTS");
      let y2 = 110;

      drawSectionHeading("CARRIER, DRIVER AND CARGO CONTROL", margin, y2, contentWidth);
      y2 += 22;
      drawField(margin, y2, contentWidth / 2 - 8, 28, "CARRIER LEGAL NAME", form.carrierLegalName);
      drawField(margin + contentWidth / 2 + 8, y2, contentWidth / 2 - 16, 28, "CARRIER MC / USDOT", form.carrierMcUsdot);
      y2 += 38;
      drawField(margin, y2, contentWidth / 3 - 8, 28, "DRIVER NAME", form.driverName);
      drawField(margin + contentWidth / 3, y2, contentWidth / 3 - 8, 28, "DRIVER PHONE", form.driverPhone);
      drawField(margin + (contentWidth / 3) * 2 + 8, y2, contentWidth / 3 - 16, 28, "TRACTOR / TRAILER NO.", form.tractorTrailerNo);
      y2 += 38;
      drawField(margin, y2, contentWidth / 3 - 8, 28, "SEAL NO.", form.sealNo);
      drawField(margin + contentWidth / 3, y2, contentWidth / 3 - 8, 28, "REQUIRED / ACTUAL TEMP", `${form.sealRequired}`);
      drawField(margin + (contentWidth / 3) * 2 + 8, y2, contentWidth / 3 - 16, 28, "TRACKING LINK / REFERENCE", form.trackingLink);
      y2 += 46;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.4);
      const checkY = y2;
      drawCheck(margin, checkY, form.driverCountedFreight);
      doc.text("Driver counted freight", margin + 18, checkY + 8);
      drawCheck(margin + 195, checkY, form.shipperLoadAndCount);
      doc.text("Shipper load and count (SLC)", margin + 213, checkY + 8);
      drawCheck(margin + 390, checkY, form.sealVerified);
      doc.text("Seal verified at pickup", margin + 408, checkY + 8);
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
      y2 += 28;
      drawLongBox(margin, y2, contentWidth, 52, "EXCEPTIONS / VISIBLE DAMAGE / COUNT DISCREPANCY AT PICKUP", form.pickupExceptions);
      y2 += 70;
      drawField(margin, y2, contentWidth / 3 - 8, 28, "SHIPPER SIGNATURE / TYPED NAME", form.shipperTypedName);
      drawField(margin + contentWidth / 3, y2, contentWidth / 3 - 8, 28, "DATE / TIME", form.shipperDateTime);
      drawField(margin + (contentWidth / 3) * 2 + 8, y2, contentWidth / 3 - 16, 28, "TITLE", form.shipperTitle);
      if (form.shipperSignature) {
        try {
          doc.addImage(form.shipperSignature, "PNG", margin + 8, y2 + 30, 150, 32);
        } catch {
          // no-op
        }
      }
      y2 += 54;

      const carrierReceiptText =
        "CARRIER RECEIPT: Carrier acknowledges receipt and custody of the freight in apparent good order except as written above. Driver confirms the carrier, driver, tractor, trailer, seal, and shipment information shown on this BOL.";
      const carrierLines = doc.splitTextToSize(carrierReceiptText, contentWidth - 8);
      doc.text(carrierLines, margin + 6, y2 + 6);
      y2 += 18;
      drawField(margin, y2, contentWidth / 3 - 8, 28, "DRIVER SIGNATURE / TYPED NAME", form.driverTypedName);
      drawField(margin + contentWidth / 3, y2, contentWidth / 3 - 8, 28, "DATE / TIME", form.driverDateTime);
      drawField(margin + (contentWidth / 3) * 2 + 8, y2, contentWidth / 3 - 16, 28, "SEAL NO. CONFIRMED", form.sealConfirmed);
      if (form.driverSignature) {
        try {
          doc.addImage(form.driverSignature, "PNG", margin + 8, y2 + 32, 150, 32);
        } catch {
          // no-op
        }
      }
      y2 += 70;

      drawSectionHeading("DELIVERY RECEIPT / PROOF OF DELIVERY", margin, y2, contentWidth);
      y2 += 24;
      drawLongBox(margin, y2, contentWidth, 52, "DELIVERY EXCEPTIONS / SHORTAGE / OVER / DAMAGE / SEAL CONDITION", form.deliveryExceptions);
      y2 += 70;
      drawField(margin, y2, contentWidth / 3 - 8, 28, "CONSIGNEE SIGNATURE / TYPED NAME", form.consigneeTypedName);
      drawField(margin + contentWidth / 3, y2, contentWidth / 3 - 8, 28, "DATE / TIME", form.consigneeDateTime);
      drawField(margin + (contentWidth / 3) * 2 + 8, y2, contentWidth / 3 - 16, 28, "TITLE", form.consigneeTitle);
      if (form.consigneeSignature) {
        try {
          doc.addImage(form.consigneeSignature, "PNG", margin + 8, y2 + 32, 150, 32);
        } catch {
          // no-op
        }
      }
      y2 += 70;

      doc.setFillColor(230, 238, 246);
      doc.roundedRect(margin, y2, contentWidth, 52, 1.5, 1.5, "F");
      doc.setTextColor(20, 44, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.8);
      doc.text("BROKER STATUS AND CONTROLLING DOCUMENTS", margin + 8, y2 + 15);
      doc.setTextColor(35, 44, 58);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.15);
      const legalText =
        "DJ's Freight Broker LLC is a property broker, not the motor carrier or warehouseman. The motor carrier has exclusive custody, control, and responsibility for transportation, loading review, securement, and delivery. This BOL does not change the load-specific rate confirmation or any signed broker-carrier agreement. Cargo claims are governed by applicable law and controlling contracts, including 49 U.S.C. 14706 when applicable.";
      const legalLines = doc.splitTextToSize(legalText, contentWidth - 18);
      doc.text(legalLines, margin + 8, y2 + 26);

      drawFooter();

      doc.save("DJFB-BL-001-Bill-of-Lading.pdf");
    } catch (error) {
      console.error(error);
      alert("PDF generation failed. Please check the form values and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Straight Bill of Lading"
        description="DJFB-BL-001 document workflow with preview and PDF generation."
      />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setForm(initialState)}>
          Reset
        </Button>
        <Button type="button" variant="outline" onClick={() => setFreightItems(initialFreightItems)}>
          Clear freight rows
        </Button>
        <Button type="button" onClick={generatePDF} disabled={isGenerating}>
          <FileDown className="mr-2 size-4" />
          {isGenerating ? "Generating..." : "Generate PDF"}
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.7fr)]">
        <div className="space-y-5">
          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-blue-900">Shipment Identification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="DJFB LOAD NO." error={errors.loadNo}>
                  <Input value={form.loadNo} onChange={(e) => updateField("loadNo", e.target.value)} />
                </Field>
                <Field label="BOL NO." error={errors.bolNo}>
                  <Input value={form.bolNo} onChange={(e) => updateField("bolNo", e.target.value)} />
                </Field>
                <Field label="CUSTOMER PO / REFERENCE">
                  <Input value={form.customerReference} onChange={(e) => updateField("customerReference", e.target.value)} />
                </Field>
                <Field label="DATE ISSUED" error={errors.dateIssued}>
                  <Input type="date" value={form.dateIssued} onChange={(e) => updateField("dateIssued", e.target.value)} />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="PICKUP DATE / TIME / TIME ZONE">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input type="date" value={form.pickupDate} onChange={(e) => updateField("pickupDate", e.target.value)} />
                    <Input type="time" value={form.pickupTime} onChange={(e) => updateField("pickupTime", e.target.value)} />
                    <Input value={form.pickupTimezone} onChange={(e) => updateField("pickupTimezone", e.target.value)} />
                  </div>
                </Field>
                <Field label="DELIVERY DATE / TIME / TIME ZONE">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input type="date" value={form.deliveryDate} onChange={(e) => updateField("deliveryDate", e.target.value)} />
                    <Input type="time" value={form.deliveryTime} onChange={(e) => updateField("deliveryTime", e.target.value)} />
                    <Input value={form.deliveryTimezone} onChange={(e) => updateField("deliveryTimezone", e.target.value)} />
                  </div>
                </Field>
                <Field label="EQUIPMENT TYPE">
                  <Input value={form.equipmentType} onChange={(e) => updateField("equipmentType", e.target.value)} />
                </Field>
              </div>

              <div className="rounded-md border border-muted bg-slate-50 px-3 py-2 text-right text-xs italic text-slate-600">
                DJ&apos;s Freight Broker LLC acts solely as a property broker
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-blue-900">Origin / Shipper</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="SHIPPER NAME" error={errors.shipperName}>
                  <Input value={form.shipperName} onChange={(e) => updateField("shipperName", e.target.value)} />
                </Field>
                <Field label="CONTACT / PHONE">
                  <Input value={form.shipperContact} onChange={(e) => updateField("shipperContact", e.target.value)} />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="PICKUP ADDRESS">
                  <Textarea value={form.pickupAddress} onChange={(e) => updateField("pickupAddress", e.target.value)} className="min-h-20" />
                </Field>
                <Field label="DOCK / APPOINTMENT NO.">
                  <Input value={form.pickupDock} onChange={(e) => updateField("pickupDock", e.target.value)} />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-blue-900">Destination / Consignee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="CONSIGNEE NAME" error={errors.consigneeName}>
                  <Input value={form.consigneeName} onChange={(e) => updateField("consigneeName", e.target.value)} />
                </Field>
                <Field label="CONTACT / PHONE">
                  <Input value={form.consigneeContact} onChange={(e) => updateField("consigneeContact", e.target.value)} />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="DELIVERY ADDRESS">
                  <Textarea value={form.deliveryAddress} onChange={(e) => updateField("deliveryAddress", e.target.value)} className="min-h-20" />
                </Field>
                <Field label="DOCK / APPOINTMENT NO.">
                  <Input value={form.deliveryDock} onChange={(e) => updateField("deliveryDock", e.target.value)} />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg font-bold text-blue-900">Freight Description</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addFreightRow}>
                  <Plus className="mr-2 size-4" /> Add row
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <div className="min-w-[760px] space-y-2">
                  <div className="grid grid-cols-[46px_52px_60px_1.7fr_0.8fr_88px] gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    <span>HM</span>
                    <span>Units</span>
                    <span>Pkg</span>
                    <span>Commodity / Description</span>
                    <span>NMFC / Class</span>
                    <span>Weight</span>
                  </div>

                  {freightItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-[46px_52px_60px_1.7fr_0.8fr_88px_28px] items-start gap-2">
                      <Input value={item.hm} onChange={(e) => onFreightChange(item.id, "hm", e.target.value)} />
                      <Input value={item.units} onChange={(e) => onFreightChange(item.id, "units", e.target.value)} />
                      <Input value={item.pkg} onChange={(e) => onFreightChange(item.id, "pkg", e.target.value)} />
                      <Input value={item.commodity} onChange={(e) => onFreightChange(item.id, "commodity", e.target.value)} />
                      <Input value={item.nmfcClass} onChange={(e) => onFreightChange(item.id, "nmfcClass", e.target.value)} />
                      <Input value={item.weight} onChange={(e) => onFreightChange(item.id, "weight", e.target.value)} />
                      <Button variant="ghost" size="icon" onClick={() => removeFreightRow(item.id)} aria-label="Remove row">
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="TOTAL UNITS">
                  <Input value={totals.units} readOnly />
                </Field>
                <Field label="TOTAL WEIGHT">
                  <Input value={totals.weight} readOnly />
                </Field>
                <Field label="DECLARED VALUE (IF ANY)">
                  <Input value="" />
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Checkbox checked={form.hazmat === "Yes"} onCheckedChange={() => updateField("hazmat", "Yes")} />
                  Hazmat - Yes
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Checkbox checked={form.hazmat === "No"} onCheckedChange={() => updateField("hazmat", "No")} />
                  Hazmat - No
                </label>
              </div>

              <div className="rounded-md border border-muted bg-slate-50 px-3 py-2 text-right text-xs italic text-slate-600">
                Shipper must identify hazardous materials and special handling needs
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-blue-900">Special Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Field label="SPECIAL INSTRUCTIONS / HANDLING / TEMPERATURE / SECUREMENT">
                <Textarea value={form.specialInstructions} onChange={(e) => updateField("specialInstructions", e.target.value)} className="min-h-28" />
              </Field>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-blue-900">Carrier, Driver and Cargo Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="CARRIER LEGAL NAME">
                  <Input value={form.carrierLegalName} onChange={(e) => updateField("carrierLegalName", e.target.value)} />
                </Field>
                <Field label="CARRIER MC / USDOT">
                  <Input value={form.carrierMcUsdot} onChange={(e) => updateField("carrierMcUsdot", e.target.value)} />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="DRIVER NAME">
                  <Input value={form.driverName} onChange={(e) => updateField("driverName", e.target.value)} />
                </Field>
                <Field label="DRIVER PHONE">
                  <Input value={form.driverPhone} onChange={(e) => updateField("driverPhone", e.target.value)} />
                </Field>
                <Field label="TRACTOR / TRAILER NO.">
                  <Input value={form.tractorTrailerNo} onChange={(e) => updateField("tractorTrailerNo", e.target.value)} />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="SEAL NO.">
                  <Input value={form.sealNo} onChange={(e) => updateField("sealNo", e.target.value)} />
                </Field>
                <Field label="REQUIRED / ACTUAL TEMP">
                  <Input value={form.sealRequired} onChange={(e) => updateField("sealRequired", e.target.value)} />
                </Field>
                <Field label="TRACKING LINK / REFERENCE">
                  <Input value={form.trackingLink} onChange={(e) => updateField("trackingLink", e.target.value)} />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Checkbox checked={form.driverCountedFreight} onCheckedChange={(checked) => updateField("driverCountedFreight", checked === true)} />
                  Driver counted freight
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Checkbox checked={form.shipperLoadAndCount} onCheckedChange={(checked) => updateField("shipperLoadAndCount", checked === true)} />
                  Shipper load and count (SLC)
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Checkbox checked={form.sealVerified} onCheckedChange={(checked) => updateField("sealVerified", checked === true)} />
                  Seal verified at pickup
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-blue-900">Pickup Certifications and Exceptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-700">
                SHIPPER CERTIFICATION: The freight is properly described, packaged, marked, labeled,
                and in apparent good order. For hazardous materials, the shipper certifies compliance
                with applicable transportation regulations and has supplied required shipping papers.
              </p>

              <Field label="EXCEPTIONS / VISIBLE DAMAGE / COUNT DISCREPANCY AT PICKUP">
                <Textarea value={form.pickupExceptions} onChange={(e) => updateField("pickupExceptions", e.target.value)} className="min-h-28" />
              </Field>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="SHIPPER SIGNATURE / TYPED NAME">
                  <Input value={form.shipperTypedName} onChange={(e) => updateField("shipperTypedName", e.target.value)} />
                </Field>
                <Field label="DATE / TIME">
                  <Input type="datetime-local" value={form.shipperDateTime} onChange={(e) => updateField("shipperDateTime", e.target.value)} />
                </Field>
                <Field label="TITLE">
                  <Input value={form.shipperTitle} onChange={(e) => updateField("shipperTitle", e.target.value)} />
                </Field>
              </div>

              <SignatureField
                label="Signature"
                value={form.shipperSignature}
                onChange={(val) => updateField("shipperSignature", val)}
              />
            </CardContent>
          </Card>

          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-blue-900">Carrier Receipt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-700">
                CARRIER RECEIPT: Carrier acknowledges receipt and custody of the freight in apparent
                good order except as written above. Driver confirms the carrier, driver, tractor,
                trailer, seal, and shipment information shown on this BOL.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="DRIVER SIGNATURE / TYPED NAME">
                  <Input value={form.driverTypedName} onChange={(e) => updateField("driverTypedName", e.target.value)} />
                </Field>
                <Field label="DATE / TIME">
                  <Input type="datetime-local" value={form.driverDateTime} onChange={(e) => updateField("driverDateTime", e.target.value)} />
                </Field>
                <Field label="SEAL NO. CONFIRMED">
                  <Input value={form.sealConfirmed} onChange={(e) => updateField("sealConfirmed", e.target.value)} />
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
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-blue-900">Delivery Receipt / Proof of Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="DELIVERY EXCEPTIONS / SHORTAGE / OVER / DAMAGE / SEAL CONDITION">
                <Textarea value={form.deliveryExceptions} onChange={(e) => updateField("deliveryExceptions", e.target.value)} className="min-h-28" />
              </Field>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="CONSIGNEE SIGNATURE / TYPED NAME">
                  <Input value={form.consigneeTypedName} onChange={(e) => updateField("consigneeTypedName", e.target.value)} />
                </Field>
                <Field label="DATE / TIME">
                  <Input type="datetime-local" value={form.consigneeDateTime} onChange={(e) => updateField("consigneeDateTime", e.target.value)} />
                </Field>
                <Field label="TITLE">
                  <Input value={form.consigneeTitle} onChange={(e) => updateField("consigneeTitle", e.target.value)} />
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
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-blue-900">Broker Status and Controlling Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-700">
                DJ&apos;s Freight Broker LLC is a property broker, not the motor carrier or warehouseman.
                The motor carrier has exclusive custody, control, and responsibility for transportation,
                loading review, securement, and delivery. This BOL does not change the load-specific
                rate confirmation or any signed broker-carrier agreement. Cargo claims are governed by
                applicable law and controlling contracts, including 49 U.S.C. 14706 when applicable.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className={sectionClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-blue-900">BOL Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-12 items-center justify-center rounded-md bg-blue-900 text-xs font-bold text-white">
                      DJFB
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-700">DJ&apos;S FREIGHT BROKER LLC</div>
                      <div className="text-[10px] text-slate-500">Straight Bill of Lading</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-medium text-slate-500">Page 1 of 2</div>
                </div>

                <div className="space-y-3 text-[11px] text-slate-700">
                  <div className="grid grid-cols-2 gap-2">
                    <FieldPreview label="Load No." value={form.loadNo} />
                    <FieldPreview label="BOL No." value={form.bolNo} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldPreview label="Shipper" value={form.shipperName} />
                    <FieldPreview label="Consignee" value={form.consigneeName} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldPreview label="Pickup" value={form.pickupAddress} />
                    <FieldPreview label="Delivery" value={form.deliveryAddress} />
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600">Freight summary</div>
                    {freightItems.slice(0, 2).map((item) => (
                      <div key={item.id} className="mb-1 flex justify-between gap-2 text-[10px]">
                        <span>{item.commodity || "Commodity"}</span>
                        <span>{item.weight || "0"} lb</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
                <div className="font-semibold text-slate-700">Status</div>
                <div className="mt-2">Load no: {form.loadNo || "Not set"}</div>
                <div>BOL no: {form.bolNo || "Not set"}</div>
                <div>Hazmat: {form.hazmat}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
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

function FieldPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-[10px] text-slate-700">{value || "—"}</div>
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

  const startDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.8;
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

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);

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
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
          {label}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={clearSignature}>
          Clear
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        onPointerDown={startDraw}
        onPointerMove={continueDraw}
        onPointerUp={stopDraw}
        onPointerLeave={stopDraw}
        className="w-full rounded-md border border-slate-300 bg-white"
      />
      {value ? <img src={value} alt={label} className="h-12 rounded border border-slate-200 bg-white" /> : null}
    </div>
  );
}

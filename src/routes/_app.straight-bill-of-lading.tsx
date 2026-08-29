import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Plus, Trash2, RotateCcw, FileText } from "lucide-react";
import { useState, useCallback } from "react";
import { generateBOL, type BOLData, type FreightItem } from "@/components/bol-pdf-document";

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_app/straight-bill-of-lading")({
  component: StraightBillOfLadingPage,
});

// ─── Constants ───────────────────────────────────────────────────────────────

const TIME_ZONES = [
  { value: "ET", label: "Eastern (ET)" },
  { value: "CT", label: "Central (CT)" },
  { value: "MT", label: "Mountain (MT)" },
  { value: "PT", label: "Pacific (PT)" },
  { value: "AK", label: "Alaska (AK)" },
  { value: "HI", label: "Hawaii (HI)" },
];

const EQUIPMENT_TYPES = [
  { value: "Dry Van", label: "Dry Van" },
  { value: "Reefer / Refrigerated", label: "Reefer / Refrigerated" },
  { value: "Flatbed", label: "Flatbed" },
  { value: "Step Deck", label: "Step Deck" },
  { value: "Conestoga", label: "Conestoga" },
  { value: "Box Truck", label: "Box Truck" },
  { value: "Hotshot", label: "Hotshot" },
  { value: "Lowboy", label: "Lowboy" },
  { value: "Tanker", label: "Tanker" },
  { value: "Other", label: "Other" },
];

const PKG_TYPES = [
  "Pallets",
  "Skids",
  "Crates",
  "Cartons",
  "Drums",
  "Totes",
  "Boxes",
  "Bundles",
  "Pieces",
  "Rolls",
  "Coils",
  "Other",
];

const blankItem = (): FreightItem => ({
  id: crypto.randomUUID(),
  hm: false,
  units: "",
  pkg: "",
  commodity: "",
  nmfcClass: "",
  weight: "",
});

const defaultData: BOLData = {
  djfbLoadNo: "",
  bolNo: "",
  customerPO: "",
  dateIssued: new Date().toISOString().split("T")[0],
  pickupDate: "",
  pickupTime: "",
  pickupTimeZone: "CT",
  deliveryDate: "",
  deliveryTime: "",
  deliveryTimeZone: "CT",
  equipmentType: "",
  shipperName: "",
  shipperContact: "",
  shipperPhone: "",
  pickupAddress: "",
  dockAppointment: "",
  consigneeName: "",
  consigneeContact: "",
  consigneePhone: "",
  deliveryAddress: "",
  deliveryDockAppointment: "",
  freightItems: [blankItem()],
  totalUnits: "",
  totalWeight: "",
  declaredValue: "",
  hazmat: "",
  specialInstructions: "",
  carrierName: "",
  carrierMcUsdot: "",
  driverName: "",
  driverPhone: "",
  tractorTrailerNo: "",
  sealNo: "",
  requiredTemp: "",
  actualTemp: "",
  trackingLink: "",
  driverCounted: false,
  slc: false,
  sealVerified: false,
  pickupExceptions: "",
  shipperSignature: "",
  shipperDate: "",
  shipperTime: "",
  shipperTitle: "",
  driverSignature: "",
  driverDate: "",
  driverTime: "",
  sealNoConfirmed: "",
  deliveryExceptions: "",
  consigneeSignature: "",
  consigneeDate: "",
  consigneeTime: "",
  consigneeTitle: "",
};

// ─── Reusable Form Field ─────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  className = "",
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 h-8 text-sm"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className = "",
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="mt-1 h-8 text-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Page Component ──────────────────────────────────────────────────────────

function StraightBillOfLadingPage() {
  const [data, setData] = useState<BOLData>(defaultData);

  const set = useCallback((key: keyof BOLData, value: BOLData[keyof BOLData]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setItem = useCallback((id: string, key: keyof FreightItem, value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      freightItems: prev.freightItems.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }));
  }, []);

  const addItem = useCallback(() => {
    setData((prev) => ({
      ...prev,
      freightItems: [...prev.freightItems, blankItem()],
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      freightItems:
        prev.freightItems.length > 1
          ? prev.freightItems.filter((i) => i.id !== id)
          : prev.freightItems,
    }));
  }, []);

  const handleGenerate = () => {
    generateBOL(data);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Straight Bill of Lading"
        description="Complete the form below and generate a professional PDF document."
      />

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleGenerate} size="sm">
          <Download className="mr-2 h-4 w-4" />
          Generate PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => setData(defaultData)}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Clear Form
        </Button>
      </div>

      {/* ── Shipment Identification ── */}
      <Section
        title="Shipment Identification"
        description="DJ's Freight Broker LLC acts solely as a property broker"
      >
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="DJFB Load No."
            value={data.djfbLoadNo}
            onChange={(v) => set("djfbLoadNo", v)}
            placeholder="e.g. LD-20260804-001"
          />
          <Field
            label="BOL No."
            value={data.bolNo}
            onChange={(v) => set("bolNo", v)}
            placeholder="e.g. BOL-001"
          />
          <Field
            label="Customer PO / Reference"
            value={data.customerPO}
            onChange={(v) => set("customerPO", v)}
            placeholder="PO number"
          />
          <Field
            label="Date Issued"
            type="date"
            value={data.dateIssued}
            onChange={(v) => set("dateIssued", v)}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Pickup Date"
            type="date"
            value={data.pickupDate}
            onChange={(v) => set("pickupDate", v)}
          />
          <Field
            label="Pickup Time"
            type="time"
            value={data.pickupTime}
            onChange={(v) => set("pickupTime", v)}
          />
          <SelectField
            label="Pickup Time Zone"
            value={data.pickupTimeZone}
            onValueChange={(v) => set("pickupTimeZone", v)}
            options={TIME_ZONES}
          />
          <div />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Delivery Date"
            type="date"
            value={data.deliveryDate}
            onChange={(v) => set("deliveryDate", v)}
          />
          <Field
            label="Delivery Time"
            type="time"
            value={data.deliveryTime}
            onChange={(v) => set("deliveryTime", v)}
          />
          <SelectField
            label="Delivery Time Zone"
            value={data.deliveryTimeZone}
            onValueChange={(v) => set("deliveryTimeZone", v)}
            options={TIME_ZONES}
          />
          <SelectField
            label="Equipment Type"
            value={data.equipmentType}
            onValueChange={(v) => set("equipmentType", v)}
            options={EQUIPMENT_TYPES}
            placeholder="Select type…"
          />
        </div>
      </Section>

      {/* ── Origin / Shipper ── */}
      <Section title="Origin / Shipper">
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 lg:grid-cols-3">
          <Field
            label="Shipper Name"
            value={data.shipperName}
            onChange={(v) => set("shipperName", v)}
            placeholder="Company or individual"
            className="lg:col-span-2"
          />
          <Field
            label="Contact / Phone"
            value={data.shipperContact}
            onChange={(v) => set("shipperContact", v)}
            placeholder="Name / (phone)"
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 lg:grid-cols-3">
          <Field
            label="Pickup Address"
            value={data.pickupAddress}
            onChange={(v) => set("pickupAddress", v)}
            placeholder="Street, City, State ZIP"
            className="lg:col-span-2"
          />
          <Field
            label="Dock / Appointment No."
            value={data.dockAppointment}
            onChange={(v) => set("dockAppointment", v)}
            placeholder="Dock # or appt ref"
          />
        </div>
      </Section>

      {/* ── Destination / Consignee ── */}
      <Section title="Destination / Consignee">
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 lg:grid-cols-3">
          <Field
            label="Consignee Name"
            value={data.consigneeName}
            onChange={(v) => set("consigneeName", v)}
            placeholder="Company or individual"
            className="lg:col-span-2"
          />
          <Field
            label="Contact / Phone"
            value={data.consigneeContact}
            onChange={(v) => set("consigneeContact", v)}
            placeholder="Name / (phone)"
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 lg:grid-cols-3">
          <Field
            label="Delivery Address"
            value={data.deliveryAddress}
            onChange={(v) => set("deliveryAddress", v)}
            placeholder="Street, City, State ZIP"
            className="lg:col-span-2"
          />
          <Field
            label="Dock / Appointment No."
            value={data.deliveryDockAppointment}
            onChange={(v) => set("deliveryDockAppointment", v)}
            placeholder="Dock # or appt ref"
          />
        </div>
      </Section>

      {/* ── Freight Description ── */}
      <Section
        title="Freight Description"
        description="Shipper must identify hazardous materials and special handling needs"
      >
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-2 py-2">HM</th>
                <th className="w-16 px-2 py-2">Units</th>
                <th className="w-24 px-2 py-2">Pkg</th>
                <th className="px-2 py-2">Commodity / Description</th>
                <th className="w-28 px-2 py-2">NMFC / Class</th>
                <th className="w-24 px-2 py-2">Weight</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.freightItems.map((item) => (
                <tr key={item.id} className="border-b border-border/50 align-top">
                  <td className="px-2 py-1.5">
                    <Checkbox
                      checked={item.hm}
                      onCheckedChange={(c) => setItem(item.id, "hm", c === true)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      className="h-7 text-xs"
                      value={item.units}
                      onChange={(e) => setItem(item.id, "units", e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Select value={item.pkg} onValueChange={(v) => setItem(item.id, "pkg", v)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Pkg" />
                      </SelectTrigger>
                      <SelectContent>
                        {PKG_TYPES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      className="h-7 text-xs"
                      value={item.commodity}
                      onChange={(e) => setItem(item.id, "commodity", e.target.value)}
                      placeholder="Description of freight"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      className="h-7 text-xs"
                      value={item.nmfcClass}
                      onChange={(e) => setItem(item.id, "nmfcClass", e.target.value)}
                      placeholder="NMFC / Class"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      className="h-7 text-xs"
                      value={item.weight}
                      onChange={(e) => setItem(item.id, "weight", e.target.value)}
                      placeholder="lbs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                      disabled={data.freightItems.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {data.freightItems.map((item, idx) => (
            <div key={item.id} className="space-y-2 rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Line {idx + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                  disabled={data.freightItems.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Units"
                  value={item.units}
                  onChange={(v) => setItem(item.id, "units", v)}
                />
                <SelectField
                  label="Pkg"
                  value={item.pkg}
                  onValueChange={(v) => setItem(item.id, "pkg", v)}
                  options={PKG_TYPES.map((p) => ({ value: p, label: p }))}
                  placeholder="Pkg"
                />
                <Field
                  label="NMFC / Class"
                  value={item.nmfcClass}
                  onChange={(v) => setItem(item.id, "nmfcClass", v)}
                />
                <Field
                  label="Weight (lbs)"
                  value={item.weight}
                  onChange={(v) => setItem(item.id, "weight", v)}
                />
              </div>
              <Field
                label="Commodity / Description"
                value={item.commodity}
                onChange={(v) => setItem(item.id, "commodity", v)}
                className="w-full"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={item.hm}
                  onCheckedChange={(c) => setItem(item.id, "hm", c === true)}
                  id={`hm-mobile-${item.id}`}
                />
                <Label htmlFor={`hm-mobile-${item.id}`} className="text-xs font-normal">
                  Hazardous Material
                </Label>
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" className="mt-3" onClick={addItem}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Line Item
        </Button>

        <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Field
            label="Total Units"
            value={data.totalUnits}
            onChange={(v) => set("totalUnits", v)}
            placeholder="Sum of units"
          />
          <Field
            label="Total Weight"
            value={data.totalWeight}
            onChange={(v) => set("totalWeight", v)}
            placeholder="Total lbs"
          />
          <Field
            label="Declared Value (if any)"
            value={data.declaredValue}
            onChange={(v) => set("declaredValue", v)}
            placeholder="$0.00"
          />
        </div>
        <div className="mt-3 flex items-center gap-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Hazmat:
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={data.hazmat === "yes" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => set("hazmat", data.hazmat === "yes" ? "" : "yes")}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={data.hazmat === "no" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => set("hazmat", data.hazmat === "no" ? "" : "no")}
            >
              No
            </Button>
          </div>
        </div>
      </Section>

      {/* ── Special Instructions ── */}
      <Section title="Special Instructions / Handling / Temperature / Securement">
        <Textarea
          value={data.specialInstructions}
          onChange={(e) => set("specialInstructions", e.target.value)}
          placeholder="Enter any special handling, temperature requirements, securement instructions, or other notes…"
          rows={3}
          className="text-sm"
        />
      </Section>

      {/* ── Carrier, Driver and Cargo Control ── */}
      <Section title="Carrier, Driver and Cargo Control">
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 lg:grid-cols-3">
          <Field
            label="Carrier Legal Name"
            value={data.carrierName}
            onChange={(v) => set("carrierName", v)}
            placeholder="Carrier LLC name"
            className="lg:col-span-2"
          />
          <Field
            label="Carrier MC / USDOT"
            value={data.carrierMcUsdot}
            onChange={(v) => set("carrierMcUsdot", v)}
            placeholder="MC###### / USDOT######"
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Driver Name"
            value={data.driverName}
            onChange={(v) => set("driverName", v)}
            placeholder="Full name"
          />
          <Field
            label="Driver Phone"
            value={data.driverPhone}
            onChange={(v) => set("driverPhone", v)}
            placeholder="(###) ###-####"
          />
          <Field
            label="Tractor / Trailer No."
            value={data.tractorTrailerNo}
            onChange={(v) => set("tractorTrailerNo", v)}
            placeholder="Tractor# / Trailer#"
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Field
            label="Seal No."
            value={data.sealNo}
            onChange={(v) => set("sealNo", v)}
            placeholder="Seal number"
          />
          <Field
            label="Required Temp"
            value={data.requiredTemp}
            onChange={(v) => set("requiredTemp", v)}
            placeholder="e.g. 34°F"
          />
          <Field
            label="Actual Temp"
            value={data.actualTemp}
            onChange={(v) => set("actualTemp", v)}
            placeholder="e.g. 35°F"
          />
        </div>
        <div className="mt-3">
          <Field
            label="Tracking Link / Reference"
            value={data.trackingLink}
            onChange={(v) => set("trackingLink", v)}
            placeholder="URL or tracking number"
            className="max-w-lg"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-5">
          <div className="flex items-center gap-2">
            <Checkbox
              id="driverCounted"
              checked={data.driverCounted}
              onCheckedChange={(c) => set("driverCounted", c === true)}
            />
            <Label htmlFor="driverCounted" className="text-sm font-normal">
              Driver counted freight
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="slc" checked={data.slc} onCheckedChange={(c) => set("slc", c === true)} />
            <Label htmlFor="slc" className="text-sm font-normal">
              Shipper load and count (SLC)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="sealVerified"
              checked={data.sealVerified}
              onCheckedChange={(c) => set("sealVerified", c === true)}
            />
            <Label htmlFor="sealVerified" className="text-sm font-normal">
              Seal verified at pickup
            </Label>
          </div>
        </div>
      </Section>

      {/* ── Pickup Certifications ── */}
      <Section title="Pickup Certifications and Exceptions">
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold">SHIPPER CERTIFICATION:</span> The freight is properly
          described, packaged, marked, labeled, and in apparent good order. For hazardous materials,
          the shipper certifies compliance with applicable transportation regulations and has
          supplied required shipping papers.
        </p>
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Exceptions / Visible Damage / Count Discrepancy at Pickup
        </Label>
        <Textarea
          value={data.pickupExceptions}
          onChange={(e) => set("pickupExceptions", e.target.value)}
          placeholder="Note any exceptions, visible damage, or count discrepancies observed at pickup…"
          rows={2}
          className="mt-1 text-sm"
        />
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Field
            label="Shipper Signature / Typed Name"
            value={data.shipperSignature}
            onChange={(v) => set("shipperSignature", v)}
            placeholder="Full name"
          />
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Date"
              type="date"
              value={data.shipperDate}
              onChange={(v) => set("shipperDate", v)}
            />
            <Field
              label="Time"
              type="time"
              value={data.shipperTime}
              onChange={(v) => set("shipperTime", v)}
            />
          </div>
          <Field
            label="Title"
            value={data.shipperTitle}
            onChange={(v) => set("shipperTitle", v)}
            placeholder="Job title"
          />
        </div>
      </Section>

      {/* ── Carrier Receipt ── */}
      <Section title="Carrier Receipt">
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold">CARRIER RECEIPT:</span> Carrier acknowledges receipt and
          custody of the freight in apparent good order except as written above. Driver confirms the
          carrier, driver, tractor, trailer, seal, and shipment information shown on this BOL.
        </p>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Field
            label="Driver Signature / Typed Name"
            value={data.driverSignature}
            onChange={(v) => set("driverSignature", v)}
            placeholder="Full name"
          />
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Date"
              type="date"
              value={data.driverDate}
              onChange={(v) => set("driverDate", v)}
            />
            <Field
              label="Time"
              type="time"
              value={data.driverTime}
              onChange={(v) => set("driverTime", v)}
            />
          </div>
          <Field
            label="Seal No. Confirmed"
            value={data.sealNoConfirmed}
            onChange={(v) => set("sealNoConfirmed", v)}
            placeholder="Seal number"
          />
        </div>
      </Section>

      {/* ── Delivery Receipt / Proof of Delivery ── */}
      <Section title="Delivery Receipt / Proof of Delivery">
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Delivery Exceptions / Shortage / Over / Damage / Seal Condition
        </Label>
        <Textarea
          value={data.deliveryExceptions}
          onChange={(e) => set("deliveryExceptions", e.target.value)}
          placeholder="Note any exceptions, shortage, overage, damage, or seal condition at delivery…"
          rows={2}
          className="mt-1 text-sm"
        />
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Field
            label="Consignee Signature / Typed Name"
            value={data.consigneeSignature}
            onChange={(v) => set("consigneeSignature", v)}
            placeholder="Full name"
          />
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Date"
              type="date"
              value={data.consigneeDate}
              onChange={(v) => set("consigneeDate", v)}
            />
            <Field
              label="Time"
              type="time"
              value={data.consigneeTime}
              onChange={(v) => set("consigneeTime", v)}
            />
          </div>
          <Field
            label="Title"
            value={data.consigneeTitle}
            onChange={(v) => set("consigneeTitle", v)}
            placeholder="Job title"
          />
        </div>
      </Section>

      {/* ── Sticky Bottom Action ── */}
      <div className="sticky bottom-4 z-10 flex justify-end gap-3 pt-2">
        <Button onClick={handleGenerate} size="lg">
          <FileText className="mr-2 h-4 w-4" />
          Generate PDF
        </Button>
      </div>
    </div>
  );
}

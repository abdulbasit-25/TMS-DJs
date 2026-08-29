// src/components/bol-pdf-document.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FreightItem {
  id: string;
  hm: boolean;
  units: string;
  pkg: string;
  commodity: string;
  nmfcClass: string;
  weight: string;
}

export interface BOLData {
  djfbLoadNo: string;
  bolNo: string;
  customerPO: string;
  dateIssued: string;
  pickupDate: string;
  pickupTime: string;
  pickupTimeZone: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveryTimeZone: string;
  equipmentType: string;
  shipperName: string;
  shipperContact: string;
  shipperPhone: string;
  pickupAddress: string;
  dockAppointment: string;
  consigneeName: string;
  consigneeContact: string;
  consigneePhone: string;
  deliveryAddress: string;
  deliveryDockAppointment: string;
  freightItems: FreightItem[];
  totalUnits: string;
  totalWeight: string;
  declaredValue: string;
  hazmat: string;
  specialInstructions: string;
  carrierName: string;
  carrierMcUsdot: string;
  driverName: string;
  driverPhone: string;
  tractorTrailerNo: string;
  sealNo: string;
  requiredTemp: string;
  actualTemp: string;
  trackingLink: string;
  driverCounted: boolean;
  slc: boolean;
  sealVerified: boolean;
  pickupExceptions: string;
  shipperSignature: string;
  shipperDate: string;
  shipperTime: string;
  shipperTitle: string;
  driverSignature: string;
  driverDate: string;
  driverTime: string;
  sealNoConfirmed: string;
  deliveryExceptions: string;
  consigneeSignature: string;
  consigneeDate: string;
  consigneeTime: string;
  consigneeTitle: string;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    padding: 32,
    paddingTop: 24,
    paddingBottom: 44,
    color: "#000",
    lineHeight: 1.2,
  },
  headerLogo: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    letterSpacing: 5,
    marginBottom: 1,
  },
  headerName: {
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 1,
  },
  headerAddr: { fontSize: 7, textAlign: "center", color: "#333" },
  headerContact: {
    fontSize: 7,
    textAlign: "center",
    color: "#333",
    marginBottom: 5,
  },
  docTitle: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 1,
  },
  docMeta: {
    fontSize: 6.5,
    textAlign: "center",
    color: "#555",
    marginBottom: 4,
  },
  hr: { height: 1, backgroundColor: "#000", marginVertical: 4 },
  secTitle: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  secTitleText: {
    fontSize: 8,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
  },
  secNote: {
    fontSize: 6,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 3,
  },
  row: { flexDirection: "row", marginBottom: 2 },
  field: { flex: 1, marginRight: 6, marginBottom: 3 },
  field2: { flex: 2, marginRight: 6, marginBottom: 3 },
  fLabel: {
    fontSize: 6,
    color: "#555",
    textTransform: "uppercase",
    marginBottom: 1,
  },
  fValue: {
    fontSize: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    paddingBottom: 1.5,
    minHeight: 11,
  },
  tHead: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    paddingVertical: 2,
    paddingHorizontal: 3,
  },
  tHeadCell: {
    fontSize: 6,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  tRow: {
    flexDirection: "row",
    borderBottomWidth: 0.25,
    borderBottomColor: "#ddd",
    paddingVertical: 1.5,
    paddingHorizontal: 3,
    minHeight: 13,
  },
  tCell: { fontSize: 7 },
  cbRow: { flexDirection: "row", marginTop: 2, marginBottom: 4 },
  cbItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  cbBox: {
    width: 8,
    height: 8,
    borderWidth: 0.5,
    borderColor: "#000",
    marginRight: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  cbFill: { width: 5, height: 5, backgroundColor: "#000" },
  bodyText: { fontSize: 6.5, lineHeight: 8.5, marginBottom: 3 },
  bodyBold: {
    fontSize: 6.5,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    lineHeight: 8.5,
    marginBottom: 1,
  },
  sigLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    paddingBottom: 1,
    minHeight: 12,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 5.5,
    textAlign: "center",
    color: "#999",
  },
  textBlock: {
    borderWidth: 0.5,
    borderColor: "#ccc",
    padding: 4,
    minHeight: 24,
    marginBottom: 4,
  },
});

// ─── PDF Helper Components ───────────────────────────────────────────────────

function F({
  label,
  value,
  style,
}: {
  label: string;
  value: string;
  style?: Record<string, unknown>;
}) {
  return (
    <View style={[s.field, style]}>
      <Text style={s.fLabel}>{label}</Text>
      <Text style={s.fValue}>{value || " "}</Text>
    </View>
  );
}

function R({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>;
}

function Sec({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 7 }}>
      <View style={s.secTitle}>
        <Text style={s.secTitleText}>{title}</Text>
      </View>
      {note && <Text style={s.secNote}>{note}</Text>}
      {children}
    </View>
  );
}

function CB({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={s.cbItem}>
      <View style={s.cbBox}>{checked && <View style={s.cbFill} />}</View>
      <Text style={{ fontSize: 7 }}>{label}</Text>
    </View>
  );
}

function Sig({
  label,
  value,
  style,
}: {
  label: string;
  value: string;
  style?: Record<string, unknown>;
}) {
  return (
    <View style={[s.field, style]}>
      <Text style={s.fLabel}>{label}</Text>
      <View style={s.sigLine}>
        <Text style={{ fontSize: 8 }}>{value || " "}</Text>
      </View>
    </View>
  );
}

function DocHeader({ title, page, total }: { title: string; page: number; total: number }) {
  return (
    <View>
      <Text style={s.headerLogo}>DJFB</Text>
      <Text style={s.headerName}>DJ'S FREIGHT BROKER LLC</Text>
      <Text style={s.headerAddr}>1209 N Saginaw Blvd., Suite G-194, Saginaw, TX 76179</Text>
      <Text style={s.headerContact}>
        (682) 552-3169 | info@djsfreightbroker.com | djsfreightbroker.com
      </Text>
      <Text style={s.docTitle}>{title}</Text>
      <Text style={s.docMeta}>
        DJFB-BL-001 | Revision 1.0 | Effective August 4, 2026{"       "}Page {page} of {total}
      </Text>
      <View style={s.hr} />
    </View>
  );
}

const FOOTER =
  "FMCSA PROPERTY BROKER | MC 1551655 | USDOT 4079462 CONTROLLED TEMPLATE | Verify current revision";

// ─── Main PDF Document ───────────────────────────────────────────────────────

export function BolDocument({ data }: { data: BOLData }) {
  const v = (val: string) => val || " ";
  const dt = (date: string, time: string, tz: string) =>
    [date, time, tz].filter(Boolean).join(" ") || " ";

  return (
    <Document>
      {/* ── PAGE 1 ── */}
      <Page size="LETTER" style={s.page}>
        <DocHeader title="STRAIGHT BILL OF LADING - NON-NEGOTIABLE" page={1} total={2} />

        <Sec
          title="SHIPMENT IDENTIFICATION"
          note="DJ's Freight Broker LLC acts solely as a property broker"
        >
          <R>
            <F label="DJFB LOAD NO." value={v(data.djfbLoadNo)} />
            <F label="BOL NO." value={v(data.bolNo)} />
            <F label="CUSTOMER PO / REFERENCE" value={v(data.customerPO)} />
            <F label="DATE ISSUED" value={v(data.dateIssued)} />
          </R>
          <R>
            <F
              label="PICKUP DATE / TIME / TIME ZONE"
              value={dt(data.pickupDate, data.pickupTime, data.pickupTimeZone)}
            />
            <F
              label="DELIVERY DATE / TIME / TIME ZONE"
              value={dt(data.deliveryDate, data.deliveryTime, data.deliveryTimeZone)}
            />
            <F label="EQUIPMENT TYPE" value={v(data.equipmentType)} />
          </R>
        </Sec>

        <Sec title="ORIGIN / SHIPPER">
          <R>
            <F label="SHIPPER NAME" value={v(data.shipperName)} style={s.field2} />
            <F
              label="CONTACT / PHONE"
              value={v(data.shipperContact) + (data.shipperPhone ? ` / ${data.shipperPhone}` : "")}
            />
          </R>
          <R>
            <F label="PICKUP ADDRESS" value={v(data.pickupAddress)} style={s.field2} />
            <F label="DOCK / APPOINTMENT NO." value={v(data.dockAppointment)} />
          </R>
        </Sec>

        <Sec title="DESTINATION / CONSIGNEE">
          <R>
            <F label="CONSIGNEE NAME" value={v(data.consigneeName)} style={s.field2} />
            <F
              label="CONTACT / PHONE"
              value={
                v(data.consigneeContact) + (data.consigneePhone ? ` / ${data.consigneePhone}` : "")
              }
            />
          </R>
          <R>
            <F label="DELIVERY ADDRESS" value={v(data.deliveryAddress)} style={s.field2} />
            <F label="DOCK / APPOINTMENT NO." value={v(data.deliveryDockAppointment)} />
          </R>
        </Sec>

        <Sec
          title="FREIGHT DESCRIPTION"
          note="Shipper must identify hazardous materials and special handling needs"
        >
          <View style={s.tHead}>
            <Text style={[s.tHeadCell, { width: 20 }]}>HM</Text>
            <Text style={[s.tHeadCell, { width: 40 }]}>Units</Text>
            <Text style={[s.tHeadCell, { width: 40 }]}>Pkg</Text>
            <Text style={[s.tHeadCell, { flex: 1 }]}>Commodity / Description</Text>
            <Text style={[s.tHeadCell, { width: 75 }]}>NMFC / Class</Text>
            <Text style={[s.tHeadCell, { width: 60 }]}>Weight</Text>
          </View>
          {data.freightItems.map((item) => (
            <View key={item.id} style={s.tRow}>
              <Text style={[s.tCell, { width: 20 }]}>{item.hm ? "✓" : ""}</Text>
              <Text style={[s.tCell, { width: 40 }]}>{v(item.units)}</Text>
              <Text style={[s.tCell, { width: 40 }]}>{v(item.pkg)}</Text>
              <Text style={[s.tCell, { flex: 1 }]}>{v(item.commodity)}</Text>
              <Text style={[s.tCell, { width: 75 }]}>{v(item.nmfcClass)}</Text>
              <Text style={[s.tCell, { width: 60 }]}>{v(item.weight)}</Text>
            </View>
          ))}
          <R>
            <F label="TOTAL UNITS" value={v(data.totalUnits)} />
            <F label="TOTAL WEIGHT" value={v(data.totalWeight)} />
            <F label="DECLARED VALUE (IF ANY)" value={v(data.declaredValue)} />
          </R>
          <View style={s.cbRow}>
            <CB checked={data.hazmat === "yes"} label="Hazmat - Yes" />
            <CB checked={data.hazmat === "no"} label="Hazmat - No" />
          </View>
        </Sec>

        <Sec title="SPECIAL INSTRUCTIONS / HANDLING / TEMPERATURE / SECUREMENT">
          <View style={s.textBlock}>
            <Text style={s.tCell}>{v(data.specialInstructions)}</Text>
          </View>
        </Sec>

        <Text style={s.footer}>{FOOTER}</Text>
      </Page>

      {/* ── PAGE 2 ── */}
      <Page size="LETTER" style={s.page}>
        <DocHeader title="STRAIGHT BILL OF LADING - CUSTODY & RECEIPTS" page={2} total={2} />

        <Sec title="CARRIER, DRIVER AND CARGO CONTROL">
          <R>
            <F label="CARRIER LEGAL NAME" value={v(data.carrierName)} style={s.field2} />
            <F label="CARRIER MC / USDOT" value={v(data.carrierMcUsdot)} />
          </R>
          <R>
            <F label="DRIVER NAME" value={v(data.driverName)} style={s.field2} />
            <F label="DRIVER PHONE" value={v(data.driverPhone)} />
            <F label="TRACTOR / TRAILER NO." value={v(data.tractorTrailerNo)} />
          </R>
          <R>
            <F label="SEAL NO." value={v(data.sealNo)} />
            <F
              label="REQUIRED / ACTUAL TEMP"
              value={v(data.requiredTemp) + (data.actualTemp ? ` / ${data.actualTemp}` : "")}
            />
            <F label="TRACKING LINK / REFERENCE" value={v(data.trackingLink)} />
          </R>
          <View style={s.cbRow}>
            <CB checked={data.driverCounted} label="Driver counted freight" />
            <CB checked={data.slc} label="Shipper load and count (SLC)" />
            <CB checked={data.sealVerified} label="Seal verified at pickup" />
          </View>
        </Sec>

        <Sec title="PICKUP CERTIFICATIONS AND EXCEPTIONS">
          <Text style={s.bodyBold}>SHIPPER CERTIFICATION:</Text>
          <Text style={s.bodyText}>
            The freight is properly described, packaged, marked, labeled, and in apparent good
            order. For hazardous materials, the shipper certifies compliance with applicable
            transportation regulations and has supplied required shipping papers.
          </Text>
          <Text style={s.bodyBold}>EXCEPTIONS / VISIBLE DAMAGE / COUNT DISCREPANCY AT PICKUP</Text>
          <View style={s.textBlock}>
            <Text style={s.tCell}>{v(data.pickupExceptions)}</Text>
          </View>
          <R>
            <Sig label="SHIPPER SIGNATURE / TYPED NAME" value={v(data.shipperSignature)} />
            <Sig label="DATE / TIME" value={dt(data.shipperDate, data.shipperTime, "")} />
            <Sig label="TITLE" value={v(data.shipperTitle)} />
          </R>
        </Sec>

        <Sec title="CARRIER RECEIPT">
          <Text style={s.bodyText}>
            CARRIER RECEIPT: Carrier acknowledges receipt and custody of the freight in apparent
            good order except as written above. Driver confirms the carrier, driver, tractor,
            trailer, seal, and shipment information shown on this BOL.
          </Text>
          <R>
            <Sig label="DRIVER SIGNATURE / TYPED NAME" value={v(data.driverSignature)} />
            <Sig label="DATE / TIME" value={dt(data.driverDate, data.driverTime, "")} />
            <Sig label="SEAL NO. CONFIRMED" value={v(data.sealNoConfirmed)} />
          </R>
        </Sec>

        <Sec title="DELIVERY RECEIPT / PROOF OF DELIVERY">
          <Text style={s.bodyBold}>
            DELIVERY EXCEPTIONS / SHORTAGE / OVER / DAMAGE / SEAL CONDITION
          </Text>
          <View style={s.textBlock}>
            <Text style={s.tCell}>{v(data.deliveryExceptions)}</Text>
          </View>
          <R>
            <Sig label="CONSIGNEE SIGNATURE / TYPED NAME" value={v(data.consigneeSignature)} />
            <Sig label="DATE / TIME" value={dt(data.consigneeDate, data.consigneeTime, "")} />
            <Sig label="TITLE" value={v(data.consigneeTitle)} />
          </R>
        </Sec>

        <Sec title="BROKER STATUS AND CONTROLLING DOCUMENTS">
          <Text style={s.bodyText}>
            DJ's Freight Broker LLC is a property broker, not the motor carrier or warehouseman. The
            motor carrier has exclusive custody, control, and responsibility for transportation,
            loading review, securement, and delivery. This BOL does not change the load-specific
            rate confirmation or any signed broker-carrier agreement. Cargo claims are governed by
            applicable law and controlling contracts, including 49 U.S.C. 14706 when applicable.
          </Text>
        </Sec>

        <Text style={s.footer}>{FOOTER}</Text>
      </Page>
    </Document>
  );
}

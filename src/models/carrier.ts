import mongoose from "mongoose";

export const CARRIER_STATUSES = [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "suspended",
] as const;
export type CarrierStatus = (typeof CARRIER_STATUSES)[number];

export type CarrierServiceArea = string | { region: string; states: string[] };

export interface CarrierDocument extends mongoose.Document {
  legalName: string;
  dba?: string;
  companyName?: string;
  mcNumber?: string;
  dotNumber?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  taxId?: string;
  equipmentTypes: string[];
  serviceAreas: CarrierServiceArea[];
  paymentTerms?: string;
  insuredVehicleVINs?: string[];
  insuranceCertificateId?: string;
  insuranceCarrier?: string;
  insurancePolicyNumber?: string;
  insuranceExpiresAt?: Date;
  notes?: string;
  status: CarrierStatus;
  vettingChecks: {
    authorityVerified: boolean;
    insuranceVerified: boolean;
    safetyVerified: boolean;
    fraudChecked: boolean;
    complianceVerified: boolean;
  };
  reviewHistory: Array<{
    status: CarrierStatus;
    reviewerId: mongoose.Types.ObjectId;
    reviewerName: string;
    reviewDate: Date;
    comments: string;
  }>;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reviewHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: CARRIER_STATUSES,
      required: true,
    },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewerName: { type: String, required: true, trim: true },
    reviewDate: { type: Date, required: true },
    comments: { type: String, required: false, trim: true },
  },
  { _id: false },
);

const carrierSchema = new mongoose.Schema<CarrierDocument>(
  {
    legalName: { type: String, required: true, trim: true },
    dba: { type: String, required: false, trim: true },
    companyName: { type: String, required: false, trim: true },
    mcNumber: { type: String, required: false, trim: true },
    dotNumber: { type: String, required: false, trim: true },
    contactName: { type: String, required: false, trim: true },
    contactPhone: { type: String, required: false, trim: true },
    contactEmail: { type: String, required: false, trim: true },
    address: { type: String, required: false, trim: true },
    taxId: { type: String, required: false, trim: true },
    equipmentTypes: { type: [String], default: [] },
    serviceAreas: { type: [mongoose.Schema.Types.Mixed], default: [] },
    paymentTerms: { type: String, required: false, trim: true },
    insuredVehicleVINs: { type: [String], required: false, default: [] },
    insuranceCertificateId: { type: String, required: false, trim: true },
    insuranceCarrier: { type: String, required: false, trim: true },
    insurancePolicyNumber: { type: String, required: false, trim: true },
    insuranceExpiresAt: { type: Date, required: false },
    notes: { type: String, required: false, trim: true },
    status: {
      type: String,
      enum: CARRIER_STATUSES,
      default: "pending",
    },
    vettingChecks: {
      authorityVerified: { type: Boolean, default: false },
      insuranceVerified: { type: Boolean, default: false },
      safetyVerified: { type: Boolean, default: false },
      fraudChecked: { type: Boolean, default: false },
      complianceVerified: { type: Boolean, default: false },
    },
    reviewHistory: { type: [reviewHistorySchema], default: [] },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    reviewedAt: { type: Date, required: false },
    deletedAt: { type: Date, required: false },
  },
  { timestamps: true },
);

const existingCarrier = mongoose.models.Carrier;
if (existingCarrier) {
  existingCarrier.schema.add({
    serviceAreas: { type: [mongoose.Schema.Types.Mixed], default: [] },
    paymentTerms: { type: String, required: false, trim: true },
    insuredVehicleVINs: { type: [String], required: false, default: [] },
    insuranceCertificateId: { type: String, required: false, trim: true },
  });
}

export const Carrier = existingCarrier ?? mongoose.model<CarrierDocument>("Carrier", carrierSchema);

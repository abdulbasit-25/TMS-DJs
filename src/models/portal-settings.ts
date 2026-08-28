import mongoose from "mongoose";

export interface PortalSettingsDocument extends mongoose.Document {
  companyName: string;
  supportEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

const portalSettingsSchema = new mongoose.Schema<PortalSettingsDocument>(
  {
    companyName: { type: String, required: true, trim: true, default: "TMS Freight Portal" },
    supportEmail: { type: String, required: true, trim: true, lowercase: true, default: "ops@djfreight.example" },
  },
  { timestamps: true },
);

export const PortalSettings =
  mongoose.models.PortalSettings ??
  mongoose.model<PortalSettingsDocument>("PortalSettings", portalSettingsSchema);
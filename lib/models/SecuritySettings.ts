import mongoose from "mongoose";

export interface ISecuritySettings {
  key: string;
  inactivityTimeoutMinutes: number;
  warningSeconds: number;
  inactivityEnabled: boolean;
  screenPrivacyBlur: boolean;
  maskSensitiveData: boolean;
  maxSessionHours: number;
  showActivityBadge: boolean;
  updatedBy?: string;
  updatedAt?: Date;
  createdAt?: Date;
}

const securitySettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    inactivityTimeoutMinutes: { type: Number, required: true, default: 5, min: 1, max: 1440 },
    warningSeconds: { type: Number, required: true, default: 30, min: 0, max: 300 },
    inactivityEnabled: { type: Boolean, default: true },
    screenPrivacyBlur: { type: Boolean, default: true },
    maskSensitiveData: { type: Boolean, default: true },
    maxSessionHours: { type: Number, default: 8, min: 1, max: 72 },
    showActivityBadge: { type: Boolean, default: true },
    updatedBy: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const SecuritySettings =
  mongoose.models.SecuritySettings ||
  mongoose.model<ISecuritySettings>("SecuritySettings", securitySettingsSchema);

export default SecuritySettings;

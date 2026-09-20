import mongoose from "mongoose";

export interface ILoginAuditLog {
  ip: string;
  username: string;
  status: "SUCCESS" | "FAILED" | "LOCKED" | "BLACKLISTED" | "PASSWORD_CHANGED";
  userAgent?: string;
  details?: string;
  timestamp: Date;
}

const loginAuditLogSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    username: { type: String, default: "" },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "LOCKED", "BLACKLISTED", "PASSWORD_CHANGED"],
      required: true,
    },
    userAgent: { type: String, default: "" },
    details: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

loginAuditLogSchema.index({ timestamp: -1 });

const LoginAuditLog =
  mongoose.models.LoginAuditLog ||
  mongoose.model<ILoginAuditLog>("LoginAuditLog", loginAuditLogSchema);

export default LoginAuditLog;

import mongoose from "mongoose";

export interface ILoginAttempt {
  ip: string;
  username?: string;
  consecutiveFailures: number;
  lockedUntil?: Date | null;
  lockTier: number; // 0: Normal, 1: 15m, 2: 2h, 3: 24h, 4: Blacklisted
  isBlacklisted: boolean;
  blacklistReason?: string;
  lastAttemptAt: Date;
  updatedAt?: Date;
  createdAt?: Date;
}

const loginAttemptSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true, index: true },
    username: { type: String, default: "" },
    consecutiveFailures: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lockTier: { type: Number, default: 0 },
    isBlacklisted: { type: Boolean, default: false, index: true },
    blacklistReason: { type: String, default: "" },
    lastAttemptAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

loginAttemptSchema.index({ ip: 1, isBlacklisted: 1 });

const LoginAttempt =
  mongoose.models.LoginAttempt ||
  mongoose.model<ILoginAttempt>("LoginAttempt", loginAttemptSchema);

export default LoginAttempt;

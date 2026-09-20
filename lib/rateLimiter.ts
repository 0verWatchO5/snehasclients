import connectMongoose from "@/lib/mongoose";
import LoginAttempt from "@/lib/models/LoginAttempt";
import LoginAuditLog from "@/lib/models/LoginAuditLog";

export function getClientIp(headers: Headers | Record<string, string | string[] | undefined> | null | undefined): string {
  if (!headers) return "127.0.0.1";

  let headerValue: string | null = null;
  if (headers instanceof Headers) {
    headerValue =
      headers.get("x-forwarded-for") ||
      headers.get("x-real-ip") ||
      headers.get("cf-connecting-ip") ||
      headers.get("x-client-ip");
  } else {
    const raw =
      headers["x-forwarded-for"] ||
      headers["x-real-ip"] ||
      headers["cf-connecting-ip"] ||
      headers["x-client-ip"];
    headerValue = Array.isArray(raw) ? raw[0] : (raw as string | null);
  }

  if (headerValue) {
    const firstIp = headerValue.split(",")[0].trim();
    if (firstIp === "::1") return "127.0.0.1";
    // Strip port if ipv4:port
    if (firstIp.includes(".") && firstIp.includes(":")) {
      return firstIp.split(":")[0];
    }
    return firstIp;
  }

  return "127.0.0.1";
}

export interface LockoutCheckResult {
  allowed: boolean;
  isBlacklisted: boolean;
  lockedUntil?: Date;
  remainingMinutes?: number;
  consecutiveFailures: number;
  lockTier: number;
  message?: string;
}

/**
 * Checks whether an IP or account is currently locked or blacklisted.
 */
export async function checkLoginLockout(ip: string): Promise<LockoutCheckResult> {
  await connectMongoose();

  const record = await LoginAttempt.findOne({ ip });
  if (!record) {
    return {
      allowed: true,
      isBlacklisted: false,
      consecutiveFailures: 0,
      lockTier: 0,
    };
  }

  if (record.isBlacklisted) {
    return {
      allowed: false,
      isBlacklisted: true,
      consecutiveFailures: record.consecutiveFailures,
      lockTier: 4,
      message: "This IP address has been permanently blacklisted due to multiple failed login attempts. Contact administrator.",
    };
  }

  const now = new Date();
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingMs = record.lockedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));

    let durationDesc = `${remainingMinutes} minute(s)`;
    if (remainingMinutes > 60) {
      const hours = Math.round(remainingMinutes / 60);
      durationDesc = `approximately ${hours} hour(s)`;
    }

    return {
      allowed: false,
      isBlacklisted: false,
      lockedUntil: record.lockedUntil,
      remainingMinutes,
      consecutiveFailures: record.consecutiveFailures,
      lockTier: record.lockTier,
      message: `Account is temporarily locked due to repeated failed attempts. Please try again in ${durationDesc}.`,
    };
  }

  return {
    allowed: true,
    isBlacklisted: false,
    consecutiveFailures: record.consecutiveFailures,
    lockTier: record.lockTier,
  };
}

/**
 * Records a failed attempt and calculates progressive lockout tiers:
 * Tier 1: 3 failures -> 15 min lock
 * Tier 2: 5 failures (3+2) -> 2 hour lock
 * Tier 3: 6 failures (5+1) -> 24 hour lock
 * Tier 4: 7 failures (6+1) -> Blacklist IP
 */
export async function recordFailedLogin(
  ip: string,
  username: string,
  userAgent: string = ""
): Promise<LockoutCheckResult> {
  await connectMongoose();

  let record = await LoginAttempt.findOne({ ip });
  if (!record) {
    record = new LoginAttempt({
      ip,
      username,
      consecutiveFailures: 0,
      lockTier: 0,
      isBlacklisted: false,
    });
  }

  // Increment failure count
  record.consecutiveFailures += 1;
  record.username = username || record.username;
  record.lastAttemptAt = new Date();

  const now = Date.now();
  let lockedUntil: Date | null = null;
  let lockTier = 0;
  let isBlacklisted = false;
  let message = "";
  let auditStatus: "FAILED" | "LOCKED" | "BLACKLISTED" = "FAILED";

  const count = record.consecutiveFailures;

  if (count >= 7) {
    // Tier 4: Blacklist
    lockTier = 4;
    isBlacklisted = true;
    record.isBlacklisted = true;
    record.blacklistReason = `Automated blacklist: Exceeded ${count} consecutive failed login attempts`;
    auditStatus = "BLACKLISTED";
    message = "Your IP address has been permanently blacklisted due to multiple failed login attempts.";
  } else if (count === 6) {
    // Tier 3: 24 hour lock
    lockTier = 3;
    lockedUntil = new Date(now + 24 * 60 * 60 * 1000);
    auditStatus = "LOCKED";
    message = "Login locked for 24 hours (1 day) after 6 failed attempts. Further failure will blacklist this IP.";
  } else if (count >= 5) {
    // Tier 2: 2 hour lock
    lockTier = 2;
    lockedUntil = new Date(now + 2 * 60 * 60 * 1000);
    auditStatus = "LOCKED";
    message = "Login locked for 2 hours after 5 failed attempts. Next failed attempt locks for 24 hours.";
  } else if (count >= 3) {
    // Tier 1: 15 min lock
    lockTier = 1;
    lockedUntil = new Date(now + 15 * 60 * 1000);
    auditStatus = "LOCKED";
    message = "Login locked for 15 minutes after 3 failed attempts.";
  } else {
    // Still within allowance (1 or 2 fails)
    const left = 3 - count;
    message = `Invalid credentials. ${left} attempt${left > 1 ? "s" : ""} remaining before a 15-minute lockout.`;
  }

  record.lockedUntil = lockedUntil;
  record.lockTier = lockTier;
  await record.save();

  // Log audit event
  await LoginAuditLog.create({
    ip,
    username,
    status: auditStatus,
    userAgent,
    details: message,
    timestamp: new Date(),
  });

  const remainingMinutes = lockedUntil
    ? Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / (60 * 1000)))
    : 0;

  return {
    allowed: !lockedUntil && !isBlacklisted,
    isBlacklisted,
    lockedUntil: lockedUntil || undefined,
    remainingMinutes,
    consecutiveFailures: count,
    lockTier,
    message,
  };
}

/**
 * Resets consecutive failure counter upon successful authentication.
 */
export async function recordSuccessfulLogin(
  ip: string,
  username: string,
  userAgent: string = ""
): Promise<void> {
  await connectMongoose();

  const record = await LoginAttempt.findOne({ ip });
  if (record && !record.isBlacklisted) {
    record.consecutiveFailures = 0;
    record.lockedUntil = null;
    record.lockTier = 0;
    record.lastAttemptAt = new Date();
    await record.save();
  }

  await LoginAuditLog.create({
    ip,
    username,
    status: "SUCCESS",
    userAgent,
    details: "Successful credential login",
    timestamp: new Date(),
  });
}

/**
 * Unblocks an IP address, resetting blacklist status and lockout state.
 */
export async function unblockIp(ip: string, adminUsername: string = "Admin"): Promise<void> {
  await connectMongoose();

  await LoginAttempt.findOneAndUpdate(
    { ip },
    {
      consecutiveFailures: 0,
      lockedUntil: null,
      lockTier: 0,
      isBlacklisted: false,
      blacklistReason: "",
      lastAttemptAt: new Date(),
    },
    { upsert: true }
  );

  await LoginAuditLog.create({
    ip,
    username: adminUsername,
    status: "SUCCESS",
    details: `IP ${ip} was unblocked by ${adminUsername}`,
    timestamp: new Date(),
  });
}

/**
 * Manually blacklists an IP address.
 */
export async function manualBlacklistIp(
  ip: string,
  reason: string,
  adminUsername: string = "Admin"
): Promise<void> {
  await connectMongoose();

  await LoginAttempt.findOneAndUpdate(
    { ip },
    {
      isBlacklisted: true,
      lockTier: 4,
      blacklistReason: reason || "Manually blacklisted by administrator",
      lastAttemptAt: new Date(),
    },
    { upsert: true }
  );

  await LoginAuditLog.create({
    ip,
    username: adminUsername,
    status: "BLACKLISTED",
    details: `IP ${ip} manually blacklisted by ${adminUsername}: ${reason}`,
    timestamp: new Date(),
  });
}

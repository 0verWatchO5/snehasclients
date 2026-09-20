import { checkLoginLockout, getClientIp } from "@/lib/rateLimiter";

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const lockout = await checkLoginLockout(ip);

    return Response.json(
      {
        ip,
        allowed: lockout.allowed,
        isBlacklisted: lockout.isBlacklisted,
        lockedUntil: lockout.lockedUntil,
        remainingMinutes: lockout.remainingMinutes || 0,
        consecutiveFailures: lockout.consecutiveFailures || 0,
        lockTier: lockout.lockTier || 0,
        message: lockout.message || "",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json(
      { message: err.message || "Failed to check status" },
      { status: 500 }
    );
  }
}

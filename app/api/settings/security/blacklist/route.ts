import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectMongoose from "@/lib/mongoose";
import LoginAttempt from "@/lib/models/LoginAttempt";
import { unblockIp, manualBlacklistIp } from "@/lib/rateLimiter";

// GET /api/settings/security/blacklist - Returns locked and blacklisted IP records
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongoose();
    const now = new Date();

    // Find all blacklisted or currently locked attempts
    const records = await LoginAttempt.find({
      $or: [
        { isBlacklisted: true },
        { lockedUntil: { $gt: now } },
        { consecutiveFailures: { $gt: 0 } },
      ],
    }).sort({ updatedAt: -1 });

    return Response.json(records, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json(
      { message: err.message || "Failed to load lockout records" },
      { status: 500 }
    );
  }
}

// POST /api/settings/security/blacklist - Unblocks or blacklists an IP
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, ip, reason } = body;

    if (!ip || typeof ip !== "string") {
      return Response.json({ message: "Valid IP address is required." }, { status: 400 });
    }

    const adminUser = session.user?.name || "Admin";

    if (action === "unblock") {
      await unblockIp(ip.trim(), adminUser);
      return Response.json(
        { message: `IP ${ip.trim()} has been unblocked and lockout reset.` },
        { status: 200 }
      );
    }

    if (action === "blacklist") {
      await manualBlacklistIp(ip.trim(), reason || "Manually blacklisted", adminUser);
      return Response.json(
        { message: `IP ${ip.trim()} has been blacklisted.` },
        { status: 200 }
      );
    }

    return Response.json({ message: "Invalid action. Use 'unblock' or 'blacklist'." }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json(
      { message: err.message || "Failed to update IP status." },
      { status: 500 }
    );
  }
}

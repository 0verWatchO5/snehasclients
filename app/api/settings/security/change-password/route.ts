import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import connectMongoose from "@/lib/mongoose";
import User from "@/lib/models/User";
import LoginAuditLog from "@/lib/models/LoginAuditLog";
import { getClientIp } from "@/lib/rateLimiter";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.name) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return Response.json(
        { message: "Current password and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return Response.json(
        { message: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Complexity check: at least 1 uppercase, 1 lowercase, 1 number
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasNumber) {
      return Response.json(
        {
          message:
            "Password must contain at least one uppercase letter, one lowercase letter, and one number.",
        },
        { status: 400 }
      );
    }

    await connectMongoose();
    const user = await User.findOne({ username: session.user.name, idp: "LOCAL" });
    if (!user) {
      return Response.json({ message: "User not found." }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return Response.json(
        { message: "Current password does not match." },
        { status: 400 }
      );
    }

    const sameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
    if (sameAsOld) {
      return Response.json(
        { message: "New password must be different from current password." },
        { status: 400 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    user.passwordHash = newHash;
    await user.save();

    const ip = getClientIp(request.headers);
    await LoginAuditLog.create({
      ip,
      username: session.user.name,
      status: "PASSWORD_CHANGED",
      details: "Admin password successfully changed",
      timestamp: new Date(),
    });

    return Response.json(
      { message: "Password updated successfully." },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json(
      { message: err.message || "Failed to change password." },
      { status: 500 }
    );
  }
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectMongoose from "@/lib/mongoose";
import SecuritySettings from "@/lib/models/SecuritySettings";

// GET /api/settings/security - Retrieves global security settings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongoose();
    let settings = await SecuritySettings.findOne({ key: "global" });
    if (!settings) {
      settings = await SecuritySettings.create({
        key: "global",
        inactivityTimeoutMinutes: 5,
        warningSeconds: 30,
        inactivityEnabled: true,
        screenPrivacyBlur: true,
        maskSensitiveData: true,
        maxSessionHours: 8,
        showActivityBadge: true,
      });
    }

    return Response.json(settings, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json({ message: err.message || "Failed to load security settings" }, { status: 500 });
  }
}

// PUT /api/settings/security - Updates global security settings
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    await connectMongoose();

    const updatePayload: Record<string, unknown> = {
      updatedBy: session.user?.name || "admin",
    };

    if (typeof body.inactivityTimeoutMinutes === "number") {
      updatePayload.inactivityTimeoutMinutes = Math.max(1, Math.min(1440, body.inactivityTimeoutMinutes));
    }
    if (typeof body.warningSeconds === "number") {
      updatePayload.warningSeconds = Math.max(0, Math.min(300, body.warningSeconds));
    }
    if (typeof body.inactivityEnabled === "boolean") {
      updatePayload.inactivityEnabled = body.inactivityEnabled;
    }
    if (typeof body.screenPrivacyBlur === "boolean") {
      updatePayload.screenPrivacyBlur = body.screenPrivacyBlur;
    }
    if (typeof body.maskSensitiveData === "boolean") {
      updatePayload.maskSensitiveData = body.maskSensitiveData;
    }
    if (typeof body.maxSessionHours === "number") {
      updatePayload.maxSessionHours = Math.max(1, Math.min(72, body.maxSessionHours));
    }
    if (typeof body.showActivityBadge === "boolean") {
      updatePayload.showActivityBadge = body.showActivityBadge;
    }

    const updated = await SecuritySettings.findOneAndUpdate(
      { key: "global" },
      { $set: updatePayload },
      { new: true, upsert: true }
    );

    return Response.json(updated, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json({ message: err.message || "Failed to update security settings" }, { status: 500 });
  }
}

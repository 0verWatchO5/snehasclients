import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectMongoose from "@/lib/mongoose";
import LoginAuditLog from "@/lib/models/LoginAuditLog";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongoose();
    const logs = await LoginAuditLog.find({})
      .sort({ timestamp: -1 })
      .limit(60);

    return Response.json(logs, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json(
      { message: err.message || "Failed to load audit logs" },
      { status: 500 }
    );
  }
}

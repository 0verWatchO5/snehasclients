import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectMongoose from "@/lib/mongoose";
import Customer from "@/lib/models/Customer";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongoose();
    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get("days") || "30";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const d15 = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
    const d30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    d15.setHours(23, 59, 59, 999);
    d30.setHours(23, 59, 59, 999);
    d60.setHours(23, 59, 59, 999);

    // Calculate system-wide renewal metrics
    const [countExpired, count15, count30, count60] = await Promise.all([
      Customer.countDocuments({ ed: { $lt: today } }),
      Customer.countDocuments({ ed: { $gte: today, $lte: d15 } }),
      Customer.countDocuments({ ed: { $gte: today, $lte: d30 } }),
      Customer.countDocuments({ ed: { $gte: today, $lte: d60 } }),
    ]);

    let query: Record<string, unknown> = {};

    if (filterType === "expired") {
      query = { ed: { $lt: today } };
    } else {
      const daysNum = Math.max(1, Math.min(365, Number(filterType) || 30));
      const targetDate = new Date(today.getTime() + daysNum * 24 * 60 * 60 * 1000);
      targetDate.setHours(23, 59, 59, 999);
      query = { ed: { $gte: today, $lte: targetDate } };
    }

    const customers = await Customer.find(query).sort({ ed: 1 });

    const now = new Date();
    const records = customers.map((c) => {
      const doc = c.toObject();
      const end = new Date(doc.endDate || doc.ed);
      const diffMs = end.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return {
        ...doc,
        daysRemaining,
      };
    });

    const totalPremiumDue = records.reduce(
      (sum, r) => sum + (Number(r.premiumAmount) || 0),
      0
    );

    return Response.json(
      {
        records,
        metrics: {
          expired: countExpired,
          due15: count15,
          due30: count30,
          due60: count60,
          totalPremiumDue,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json(
      { message: err.message || "Failed to load renewals" },
      { status: 500 }
    );
  }
}

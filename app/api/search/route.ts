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
    const surname = searchParams.get("surname");
    const policyNumber = searchParams.get("policyNumber");
    const mobileNumber = searchParams.get("mobileNumber");

    const filter: Record<string, string> = {};
    if (surname) filter["phn.surname"] = surname.trim();
    if (policyNumber) filter.pn = policyNumber.trim();
    if (mobileNumber) filter.mob = mobileNumber.trim();

    const customers = await Customer.find(filter);
    return Response.json(customers, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json({ message: err.message || "Search failed" }, { status: 500 });
  }
}

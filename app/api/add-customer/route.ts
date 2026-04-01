import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import connectMongoose from "@/lib/mongoose";
import Customer from "@/lib/models/Customer";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongoose();
    const body = await request.json();
    const customer = new Customer(body);
    await customer.save();

    return Response.json(customer, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 11000) {
      return Response.json({ message: "policyNumber must be unique" }, { status: 409 });
    }

    return Response.json({ message: err.message || "Invalid request" }, { status: 400 });
  }
}

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import connectMongoose from "@/lib/mongoose";
import Customer from "@/lib/models/Customer";

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongoose();
    const { id, ...body } = await request.json();

    if (!id) {
      return Response.json({ message: "Customer ID is required" }, { status: 400 });
    }

    const customer = await Customer.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
      translateAliases: true,
    });

    if (!customer) {
      return Response.json({ message: "Customer not found" }, { status: 404 });
    }

    return Response.json(customer, { status: 200 });
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 11000) {
      return Response.json({ message: "policyNumber must be unique" }, { status: 409 });
    }

    return Response.json({ message: err.message || "Update failed" }, { status: 400 });
  }
}

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import connectMongoose from "@/lib/mongoose";
import Customer from "@/lib/models/Customer";

function normalizeCustomerUpdatePayload(input: Record<string, unknown>) {
  const body = { ...input };

  // Keep alias-based fields expected by the frontend and drop compact DB keys.
  delete body.phn;
  delete body.a;
  delete body.mob;
  delete body.w;
  delete body.h;
  delete body.pn;
  delete body.sa;
  delete body.pa;
  delete body.pt;
  delete body.e;
  delete body.pr;
  delete body.dob;
  delete body.pm;
  delete body.cc;
  delete body.sd;
  delete body.ed;

  // Prevent immutable/system fields from being updated accidentally.
  delete body._id;
  delete body.id;
  delete body.createdAt;
  delete body.updatedAt;

  return body;
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongoose();
    const { id, ...rawBody } = await request.json();
    const body = normalizeCustomerUpdatePayload(rawBody as Record<string, unknown>);

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

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import connectMongoose from "@/lib/mongoose";
import Customer from "@/lib/models/Customer";

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongoose();
    const { id } = await request.json();

    if (!id) {
      return Response.json({ message: "Customer ID is required" }, { status: 400 });
    }

    const customer = await Customer.findByIdAndDelete(id);

    if (!customer) {
      return Response.json({ message: "Customer not found" }, { status: 404 });
    }

    return Response.json({ message: "Customer deleted successfully" }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json({ message: err.message || "Delete failed" }, { status: 400 });
  }
}

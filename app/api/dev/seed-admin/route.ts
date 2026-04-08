import bcrypt from "bcryptjs";

import connectMongoose from "@/lib/mongoose";
import User from "@/lib/models/User";

// Development-only utility to create an initial LOCAL admin user behind a shared secret.
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  const seedKey = process.env.SEED_ADMIN_KEY;
  if (!seedKey) {
    return Response.json(
      { message: "SEED_ADMIN_KEY is missing in environment" },
      { status: 500 }
    );
  }

  const providedKey = request.headers.get("x-seed-key");
  if (providedKey !== seedKey) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongoose();

    const body = (await request.json()) as {
      username?: string;
      password?: string;
      email?: string;
    };

    const username = (body.username || "admin").trim();
    const password = body.password || "admin123";
    const email = body.email?.trim().toLowerCase();

    if (!username || !password) {
      return Response.json(
        { message: "username and password are required" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ username, idp: "LOCAL" });
    if (existingUser) {
      return Response.json(
        { message: "User already exists", username },
        { status: 200 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({ username, idp: "LOCAL", email, passwordHash });

    return Response.json(
      { message: "Admin user created", username },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json({ message: err.message || "Seed failed" }, { status: 500 });
  }
}

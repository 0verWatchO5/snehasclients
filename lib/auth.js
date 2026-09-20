import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";

import connectMongoose from "@/lib/mongoose";
import clientPromise from "@/lib/mongodb";
import User from "@/lib/models/User";
import {
  getClientIp,
  checkLoginLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/lib/rateLimiter";

/** @type {import("next-auth").AuthOptions} */
// Central auth configuration used by NextAuth route handlers and server-session checks.
export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours maximum absolute lifetime
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // Validates local credentials, enforces progressive lockout protection, and returns identity.
      async authorize(credentials, req) {
        await connectMongoose();

        const ip = getClientIp(req?.headers);
        const userAgent =
          (req?.headers &&
            (typeof req.headers.get === "function"
              ? req.headers.get("user-agent")
              : req.headers["user-agent"])) ||
          "";

        const username = credentials?.username?.trim() || "";
        const password = credentials?.password || "";

        // 1. Check if IP is blacklisted or locked out
        const lockout = await checkLoginLockout(ip);
        if (!lockout.allowed) {
          throw new Error(lockout.message || "Account locked due to consecutive failed attempts.");
        }

        if (!username || !password) {
          throw new Error("Username and password are required.");
        }

        const user = await User.findOne({ username, idp: "LOCAL" });
        if (!user) {
          const failedResult = await recordFailedLogin(ip, username, userAgent);
          throw new Error(failedResult.message || "Invalid username or password.");
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          const failedResult = await recordFailedLogin(ip, username, userAgent);
          throw new Error(failedResult.message || "Invalid username or password.");
        }

        // 2. Successful login - reset counter and log audit
        await recordSuccessfulLogin(ip, username, userAgent);

        return {
          id: user._id.toString(),
          name: user.username,
          email: user.email || undefined,
          idp: user.idp,
        };
      },
    }),
  ],
  callbacks: {
    // Persists stable identity attributes into the JWT for subsequent requests.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.idp = user.idp;
      }
      return token;
    },
    // Projects token identity fields to session.user so UI and API layers can consume them.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id || token.sub;
        session.user.idp = token.idp;
      }
      return session;
    },
  },
};

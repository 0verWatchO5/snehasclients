import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";

import connectMongoose from "@/lib/mongoose";
import clientPromise from "@/lib/mongodb";
import User from "@/lib/models/User";

/** @type {import("next-auth").AuthOptions} */
// Central auth configuration used by NextAuth route handlers and server-session checks.
export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // Validates local credentials and returns the normalized identity payload for session creation.
      async authorize(credentials) {
        await connectMongoose();

        const username = credentials?.username?.trim();
        const password = credentials?.password;

        if (!username || !password) {
          return null;
        }

        const user = await User.findOne({ username, idp: "LOCAL" });
        if (!user) {
          return null;
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          return null;
        }

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

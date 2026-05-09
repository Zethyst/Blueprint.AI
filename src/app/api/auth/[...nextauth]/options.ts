import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/models/User";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import AppleProvider from "next-auth/providers/apple";
import FacebookProvider from "next-auth/providers/facebook";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID as string,
      clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID as string,
      clientSecret: process.env.APPLE_SECRET as string,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        identifier: {
          label: "Email or Username",
          type: "text",
          placeholder: "Enter email or username",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        // Validate credentials exist
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("Please provide email/username and password");
        }

        await dbConnect();

        try {
          // Find user by email or username
          const user = await UserModel.findOne({
            $or: [
              { username: credentials.identifier },
              { email: credentials.identifier },
            ],
          }) as any;

          if (!user) {
            throw new Error("No user found with this credential");
          }

          if (!user.isVerified) {
            throw new Error("Please verify your account before login");
          }

          // Verify password
          const isPasswordCorrect = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordCorrect) {
            throw new Error("Incorrect password");
          }

          // Return user object (will be passed to JWT callback)
          return {
            id: user._id.toString(),
            _id: user._id.toString(),
            email: user.email,
            username: user.username,
            isVerified: user.isVerified,
          };
        } catch (error: any) {
          // Re-throw the error message directly
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user._id = token._id;
        session.user.isVerified = token.isVerified;
        session.user.username = token.username;
        session.user.email = token.email;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // For OAuth providers (Google, GitHub, etc.)
        if (account && account.type !== "credentials") {
          await dbConnect();
          
          // Check if user already exists in MongoDB
          let existingUser = await UserModel.findOne({ email: user.email });

          if (!existingUser) {
            // Create new user for OAuth sign-in
            const username =
              user.name?.toLowerCase().replace(/\s+/g, "_") ||
              user.email?.split("@")[0] ||
              `user_${Date.now()}`;

            const newUser = new UserModel({
              username,
              email: user.email,
              isVerified: true,
              password: "", // OAuth users don't need password
            });
            existingUser = await newUser.save();
            console.log("[+] New OAuth user created:", existingUser._id);
          }

          // Update token with MongoDB user data
          token._id = existingUser._id?.toString();
          token.isVerified = existingUser.isVerified;
          token.username = existingUser.username;
          token.email = existingUser.email;
        } else {
          // For credentials login, user object already has MongoDB data
          token._id = user._id?.toString();
          token.isVerified = user.isVerified;
          token.username = user.username;
          token.email = user.email;
        }
      }
      return token;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
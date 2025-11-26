import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/models/User";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import AppleProvider from "next-auth/providers/apple";

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
        clientSecret: process.env.TWITTER_CLIENT_SECRET as string
      }),
      AppleProvider({
        clientId: process.env.APPLE_ID as string,
        clientSecret: process.env.APPLE_SECRET as string
      }),
    CredentialsProvider({
      id: "credentials",
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: "Credentials",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        identifier: { label: "Email", type: "email", placeholder: "jsmith@abc.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        await dbConnect();
        try {
          if (credentials) {
            
            const user = await UserModel.findOne({
              $or: [
                { username: credentials.identifier },
                { email: credentials.identifier },
              ],
            });
            if (!user) {
              throw new Error("No user found with this credential");
            }
            if (!user.isVerified) {
              throw new Error("Please verify your account before login");
            }
            
            const isPasswordCorrect = await bcrypt.compare(
              credentials.password,
              user.password
            );
            
            if (isPasswordCorrect) {
              return user;
            } else {
              throw new Error("Incorrect Password");
            }
          }
        } catch (error: any) {
          throw new Error(error);
        }
        const res = await fetch("/your/endpoint", {
          method: "POST",
          body: JSON.stringify(credentials),
          headers: { "Content-Type": "application/json" },
        });
        const user = await res.json();

        // If no error and we have user data, return it
        if (res.ok && user) {
          return user;
        }
        // Return null if user data could not be retrieved
        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, user, token }) {
      if (token) {
        session.user._id = token._id;
        session.user.isVerified = token.isVerified;
        session.user.username = token.username;
        session.user.email = token.email;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      await dbConnect();
      if (user) {
        // For OAuth providers (Google, GitHub, etc.)
        if (account && account.type !== "credentials") {
          // Check if user already exists in MongoDB
          let existingUser = await UserModel.findOne({ email: user.email });
          
          if (!existingUser) {
            // Create new user for OAuth sign-in
            const newUser = new UserModel({
              username: user.name?.toLowerCase().replace(/\s+/g, '_') || user.email?.split('@')[0],
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

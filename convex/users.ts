import { action, internalQuery, mutation, query } from "./_generated/server";
import {
  getAuthSessionId,
  getAuthUserId,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const getCurrentUserProfileInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const ensureUserProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) return existing._id;

    // First user ever → owner, rest → admin
    const allProfiles = await ctx.db.query("userProfiles").collect();
    const role = allProfiles.length === 0 ? "owner" : "admin";

    const user = await ctx.db.get(userId) as Doc<"users"> | null;
    const email = user?.email ?? "";
    const name = user?.name ?? email.split("@")[0];

    return ctx.db.insert("userProfiles", {
      userId,
      name,
      bio: "",
      email,
      role,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateCurrentUserProfile = mutation({
  args: {
    name: v.string(),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, { name, bio }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) {
      throw new Error("Profil pengguna belum tersedia.");
    }

    const trimmedName = name.trim();
    const trimmedBio = bio?.trim() ?? "";

    if (!trimmedName) {
      throw new Error("Nama wajib diisi.");
    }

    await ctx.db.patch(profile._id, {
      name: trimmedName,
      bio: trimmedBio,
    });

    await ctx.db.patch(userId, {
      name: trimmedName,
    });
  },
});

export const changeCurrentUserPassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const sessionId = await getAuthSessionId(ctx);
    const profile = await ctx.runQuery(internal.users.getCurrentUserProfileInternal, {});

    if (!profile) {
      throw new Error("Profil pengguna belum tersedia.");
    }

    if (!currentPassword) {
      throw new Error("Password saat ini wajib diisi.");
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error("Password baru minimal 8 karakter.");
    }

    if (currentPassword === newPassword) {
      throw new Error("Password baru harus berbeda.");
    }

    await retrieveAccount(ctx, {
      provider: "password",
      account: {
        id: profile.email,
        secret: currentPassword,
      },
    });

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: {
        id: profile.email,
        secret: newPassword,
      },
    });

    await invalidateSessions(ctx, {
      userId,
      except: sessionId ? [sessionId] : undefined,
    });
  },
});

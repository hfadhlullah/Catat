import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

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
      email,
      role,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { getAccessibleProfileIds } from "./profile";

export const listVendors = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    const accessibleIds = await getAccessibleProfileIds(ctx, profile._id as string);

    const all = await ctx.db
      .query("vendors")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return all.filter((v) => accessibleIds.includes(v.createdBy as string));
  },
});

export const createVendor = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    return await ctx.db.insert("vendors", {
      createdBy: profile._id,
      name: args.name,
      phone: args.phone,
      notes: args.notes,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

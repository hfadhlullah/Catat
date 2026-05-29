import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { getAccessibleProfileIds } from "./profile";

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    const accessibleIds = await getAccessibleProfileIds(ctx, profile._id);

    const all = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return all.filter((cat) => accessibleIds.includes(cat.createdBy as string));
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    const name = args.name.trim();
    if (!name) throw new ConvexError("Nama kategori wajib diisi");

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_created_by", (q) => q.eq("createdBy", profile._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (existing.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      throw new ConvexError("Kategori sudah ada");
    }

    return await ctx.db.insert("categories", {
      createdBy: profile._id,
      name,
      color: args.color,
      icon: args.icon,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

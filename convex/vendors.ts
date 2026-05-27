import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

export const listVendors = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("vendors")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
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

    return await ctx.db.insert("vendors", {
      name: args.name,
      phone: args.phone,
      notes: args.notes,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

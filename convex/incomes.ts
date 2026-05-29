import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { getCurrentProfile } from "./profile";

export const createIncome = mutation({
  args: {
    walletId: v.id("wallets"),
    amount: v.number(),
    description: v.string(),
    date: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    const wallet = await ctx.db.get(args.walletId);
    if (!wallet || wallet.createdBy !== profile._id || !wallet.isActive) {
      throw new ConvexError("Wallet tidak valid");
    }

    return await ctx.db.insert("incomes", {
      walletId: args.walletId,
      amount: Math.round(args.amount),
      description: args.description.trim(),
      date: args.date,
      notes: args.notes,
      receivedBy: profile._id,
      createdAt: Date.now(),
    });
  },
});

export const listRecentIncome = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getCurrentProfile(ctx);
    const incomes = await ctx.db
      .query("incomes")
      .withIndex("by_received_by", (q) => q.eq("receivedBy", profile._id))
      .order("desc")
      .take(10);

    return await Promise.all(
      incomes.map(async (income) => {
        const wallet = await ctx.db.get(income.walletId);
        return { ...income, wallet };
      })
    );
  },
});

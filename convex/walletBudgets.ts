import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { getCurrentProfile } from "./profile";

export const upsertWalletBudget = mutation({
  args: {
    walletId: v.id("wallets"),
    period: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    const wallet = await ctx.db.get(args.walletId);
    if (!wallet || wallet.createdBy !== profile._id || !wallet.isActive) {
      throw new ConvexError("Wallet tidak valid");
    }

    const existing = await ctx.db
      .query("walletBudgets")
      .withIndex("by_wallet_period", (q) => q.eq("walletId", args.walletId).eq("period", args.period))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        amount: Math.round(args.amount),
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("walletBudgets", {
      walletId: args.walletId,
      period: args.period,
      amount: Math.round(args.amount),
      createdBy: profile._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteWalletBudget = mutation({
  args: { id: v.id("walletBudgets") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    const budget = await ctx.db.get(args.id);
    if (!budget || budget.createdBy !== profile._id) {
      throw new ConvexError("Budget tidak valid");
    }

    await ctx.db.delete(args.id);
  },
});

export const listWalletBudgets = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    const budgets = await ctx.db
      .query("walletBudgets")
      .withIndex("by_created_by", (q) => q.eq("createdBy", profile._id))
      .filter((q) => q.eq(q.field("period"), args.period))
      .collect();

    return await Promise.all(
      budgets.map(async (budget) => {
        const wallet = await ctx.db.get(budget.walletId);
        return { ...budget, wallet };
      })
    );
  },
});

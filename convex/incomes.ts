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

    const now = Date.now();
    return await ctx.db.insert("transactions", {
      direction: "income",
      transactionType: "default",
      walletId: args.walletId,
      amount: Math.round(args.amount),
      description: args.description.trim(),
      date: args.date,
      notes: args.notes,
      submittedBy: profile._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listRecentIncome = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getCurrentProfile(ctx);
    const incomes = await ctx.db
      .query("transactions")
      .withIndex("by_submitted_by_direction", (q) => q.eq("submittedBy", profile._id).eq("direction", "income"))
      .order("desc")
      .take(10);

    return await Promise.all(
      incomes.map(async (income) => {
        const wallet = income.walletId ? await ctx.db.get(income.walletId) : null;
        return { ...income, wallet, receivedBy: income.submittedBy };
      })
    );
  },
});

export const listWalletIncomes = query({
  args: { walletId: v.id("wallets") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    const wallet = await ctx.db.get(args.walletId);
    if (!wallet || !wallet.isActive) {
      throw new ConvexError("Wallet tidak valid");
    }

    const isOwner = wallet.createdBy === profile._id;
    const isMember = await ctx.db
      .query("walletMembers")
      .withIndex("by_wallet_user", (q) => q.eq("walletId", args.walletId).eq("userId", profile._id))
      .unique();

    if (!isOwner && !isMember) {
      throw new ConvexError("Unauthorized");
    }

    const incomes = await ctx.db
      .query("transactions")
      .withIndex("by_wallet_direction", (q) => q.eq("walletId", args.walletId).eq("direction", "income"))
      .order("desc")
      .take(10);

    return await Promise.all(
      incomes.map(async (income) => {
        const receivedBy = await ctx.db.get(income.submittedBy);
        return { ...income, receivedBy: income.submittedBy, receivedByName: receivedBy?.name ?? "User" };
      })
    );
  },
});

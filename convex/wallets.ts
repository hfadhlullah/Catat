import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

import { getCurrentProfile } from "./profile";

function monthRange(period: string) {
  const [year, month] = period.split("-").map(Number);
  return {
    start: new Date(year, month - 1, 1).getTime(),
    end: new Date(year, month, 1).getTime(),
  };
}

async function getAccessibleWallets(ctx: QueryCtx | MutationCtx, profileId: Id<"userProfiles">) {
  const owned = await ctx.db
    .query("wallets")
    .withIndex("by_created_by", (q) => q.eq("createdBy", profileId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  const memberships = await ctx.db
    .query("walletMembers")
    .withIndex("by_user", (q) => q.eq("userId", profileId))
    .collect();

  const sharedWallets = await Promise.all(
    memberships.map(async (m) => {
      const w = await ctx.db.get(m.walletId);
      return w && w.isActive ? w : null;
    })
  );

  const walletMap = new Map<Id<"wallets">, Doc<"wallets">>();
  for (const w of owned) walletMap.set(w._id, w);
  for (const w of sharedWallets) if (w) walletMap.set(w._id, w);

  return Array.from(walletMap.values());
}

export const listOwnedWallets = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getCurrentProfile(ctx);

    return await ctx.db
      .query("wallets")
      .withIndex("by_created_by", (q) => q.eq("createdBy", profile._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const listWallets = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getCurrentProfile(ctx);
    return await getAccessibleWallets(ctx, profile._id);
  },
});

export const createWallet = mutation({
  args: {
    name: v.string(),
    label: v.optional(v.string()),
    logo: v.optional(v.string()),
    initialBalance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    const name = args.name.trim();
    if (!name) throw new ConvexError("Nama wallet wajib diisi");

    const existing = await ctx.db
      .query("wallets")
      .withIndex("by_created_by", (q) => q.eq("createdBy", profile._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (existing.some((wallet) => wallet.name.toLowerCase() === name.toLowerCase() && wallet.label === args.label)) {
      throw new ConvexError("Wallet sudah ada");
    }

    return await ctx.db.insert("wallets", {
      createdBy: profile._id,
      name,
      label: args.label?.trim(),
      logo: args.logo,
      initialBalance: Math.round(args.initialBalance ?? 0),
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const deleteWallet = mutation({
  args: { id: v.id("wallets") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    const wallet = await ctx.db.get(args.id);
    if (!wallet || wallet.createdBy !== profile._id || !wallet.isActive) {
      throw new ConvexError("Wallet tidak valid");
    }

    await ctx.db.patch(args.id, { isActive: false });
  },
});

export const updateWallet = mutation({
  args: {
    id: v.id("wallets"),
    name: v.string(),
    label: v.optional(v.string()),
    logo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    const wallet = await ctx.db.get(args.id);
    if (!wallet || wallet.createdBy !== profile._id || !wallet.isActive) {
      throw new ConvexError("Wallet tidak valid");
    }

    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      label: args.label?.trim(),
      logo: args.logo,
    });
  },
});

export const getWalletOverview = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    const wallets = await getAccessibleWallets(ctx, profile._id);

    const { start, end } = monthRange(args.period);

    const overview = await Promise.all(
      wallets.map(async (wallet) => {
        const transactions = await ctx.db
          .query("transactions")
          .withIndex("by_wallet", (q) => q.eq("walletId", wallet._id))
          .collect();
        const budget = await ctx.db
          .query("walletBudgets")
          .withIndex("by_wallet_period", (q) => q.eq("walletId", wallet._id).eq("period", args.period))
          .unique();

        const incomes = transactions.filter((item) => item.direction === "income");
        const expenses = transactions.filter((item) => item.direction === "expense");
        const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
        const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
        const monthIncome = incomes
          .filter((item) => item.date >= start && item.date < end)
          .reduce((sum, item) => sum + item.amount, 0);
        const monthExpense = expenses
          .filter((item) => item.date >= start && item.date < end)
          .reduce((sum, item) => sum + item.amount, 0);
        const balance = wallet.initialBalance + totalIncome - totalExpense;
        const budgetAmount = budget?.amount ?? 0;

        return {
          ...wallet,
          balance,
          monthIncome,
          monthExpense,
          budgetAmount,
          budgetId: budget?._id ?? null,
          budgetRemaining: budgetAmount > 0 ? budgetAmount - monthExpense : 0,
          budgetUsedPct: budgetAmount > 0 ? Math.min((monthExpense / budgetAmount) * 100, 100) : 0,
        };
      })
    );

    const totalBalance = overview.reduce((sum, wallet) => sum + wallet.balance, 0);
    const totalMonthIncome = overview.reduce((sum, wallet) => sum + wallet.monthIncome, 0);
    const totalMonthExpense = overview.reduce((sum, wallet) => sum + wallet.monthExpense, 0);

    return {
      wallets: overview,
      totalBalance,
      totalMonthIncome,
      totalMonthExpense,
    };
  },
});

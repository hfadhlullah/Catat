import { mutation, query, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";

import { getCurrentProfile, getAccessibleProfileIds } from "./profile";

async function hasWalletAccess(ctx: MutationCtx | any, profileId: Id<"userProfiles">, walletId: Id<"wallets">) {
  const wallet = await ctx.db.get(walletId);
  if (!wallet || !wallet.isActive) return false;
  if (wallet.createdBy === profileId) return true;

  const member = await ctx.db
    .query("walletMembers")
    .withIndex("by_wallet_user", (q: any) => q.eq("walletId", walletId).eq("userId", profileId))
    .unique();

  return !!member;
}

function getInstallmentSnapshot(expense: {
  amount: number;
  date: number;
  installmentCount?: number;
  installmentRate?: number;
}) {
  const installmentCount = expense.installmentCount ?? 1;
  const installmentRate = expense.installmentRate ?? 0;
  const totalWithInterest = Math.round(expense.amount * (1 + installmentRate / 100));
  const installmentAmount = installmentCount > 0 ? Math.round(totalWithInterest / installmentCount) : totalWithInterest;

  return {
    installmentCount,
    installmentRate,
    totalWithInterest,
    installmentAmount,
  };
}

function getInstallmentPosition(expenseDate: number, period: string, installmentCount: number) {
  const [year, month] = period.split("-").map(Number);
  const expenseMonth = new Date(expenseDate);
  const monthDiff =
    (year - expenseMonth.getFullYear()) * 12 +
    (month - 1 - expenseMonth.getMonth());

  const isActive = monthDiff >= 0 && monthDiff < installmentCount;
  return {
    monthDiff,
    isActive,
    installmentNumber: isActive ? monthDiff + 1 : null,
    remainingInstallments: isActive ? installmentCount - monthDiff - 1 : null,
  };
}

async function validateExpensePayload(
  ctx: MutationCtx,
  profileId: Id<"userProfiles">,
  args: {
    categoryId: Id<"categories">;
    walletId?: Id<"wallets">;
    vendorId?: Id<"vendors">;
    installmentCount?: number;
    installmentRate?: number;
  }
) {
  const accessibleIds = await getAccessibleProfileIds(ctx, profileId as string);

  const category = await ctx.db.get(args.categoryId);
  if (!category || !category.isActive || !accessibleIds.includes(category.createdBy as string)) {
    throw new ConvexError("Kategori tidak valid");
  }

  if (args.vendorId) {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor || !vendor.isActive || !accessibleIds.includes(vendor.createdBy as string)) {
      throw new ConvexError("Vendor tidak valid");
    }
  }

  if (args.walletId) {
    const hasAccess = await hasWalletAccess(ctx, profileId, args.walletId);
    if (!hasAccess) {
      throw new ConvexError("Wallet tidak valid");
    }
  }

  if (args.installmentCount !== undefined) {
    if (!Number.isInteger(args.installmentCount) || args.installmentCount < 1) {
      throw new ConvexError("Cicilan harus minimal 1x");
    }
  }

  if (args.installmentRate !== undefined && args.installmentRate < 0) {
    throw new ConvexError("Bunga cicilan tidak boleh negatif");
  }
}

async function validateReceiptOwnership(
  ctx: MutationCtx,
  profileId: Id<"userProfiles">,
  storageId: Id<"_storage"> | undefined,
  options?: {
    allowMissingForExistingExpenseId?: Id<"expenses">;
  }
) {
  if (!storageId) {
    return null;
  }

  const receipt = await ctx.db
    .query("uploadedReceipts")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .unique();

  if (receipt) {
    if (receipt.ownerProfileId !== profileId) {
      throw new ConvexError("Unauthorized receipt");
    }
    return receipt;
  }

  if (options?.allowMissingForExistingExpenseId) {
    const expense = await ctx.db.get(options.allowMissingForExistingExpenseId);
    if (expense?.submittedBy === profileId && expense.receiptStorageId === storageId) {
      return null;
    }
  }

  throw new ConvexError("Receipt tidak valid");
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const createExpense = mutation({
  args: {
    amount: v.number(),
    installmentCount: v.optional(v.number()),
    installmentRate: v.optional(v.number()),
    description: v.string(),
    date: v.number(),
    categoryId: v.id("categories"),
    walletId: v.optional(v.id("wallets")),
    vendorId: v.optional(v.id("vendors")),
    notes: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    await validateExpensePayload(ctx, profile._id, args);
    const receipt = await validateReceiptOwnership(ctx, profile._id, args.receiptStorageId);

    const now = Date.now();
    const expenseId = await ctx.db.insert("expenses", {
      amount: Math.round(args.amount),
      installmentCount: args.installmentCount ?? 1,
      installmentRate: args.installmentRate ? Math.round(args.installmentRate * 100) / 100 : 0,
      description: args.description,
      date: args.date,
      categoryId: args.categoryId,
      walletId: args.walletId,
      vendorId: args.vendorId,
      submittedBy: profile._id,
      receiptStorageId: args.receiptStorageId,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    if (receipt) {
      await ctx.db.patch(receipt._id, { attachedExpenseId: expenseId });
    }

    return expenseId;
  },
});

export const registerUploadedReceipt = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    const existing = await ctx.db
      .query("uploadedReceipts")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .unique();

    if (existing) {
      if (existing.ownerProfileId !== profile._id) {
        throw new ConvexError("Unauthorized receipt");
      }
      return existing._id;
    }

    return await ctx.db.insert("uploadedReceipts", {
      storageId: args.storageId,
      ownerProfileId: profile._id,
      createdAt: Date.now(),
    });
  },
});

export const getExpenseById = query({
  args: { id: v.id("expenses") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    const expense = await ctx.db.get(args.id);
    if (!expense) throw new ConvexError("Not found");

    const isOwner = expense.submittedBy === profile._id;
    let isShared = false;
    if (expense.walletId) {
      isShared = await hasWalletAccess(ctx, profile._id, expense.walletId);
    }

    if (!isOwner && !isShared) throw new ConvexError("Unauthorized");

    const category = await ctx.db.get(expense.categoryId);
    const vendor = expense.vendorId ? await ctx.db.get(expense.vendorId) : null;
    const wallet = expense.walletId ? await ctx.db.get(expense.walletId) : null;
    const receiptUrl = expense.receiptStorageId
      ? await ctx.storage.getUrl(expense.receiptStorageId)
      : null;

    return { ...expense, category, vendor, wallet, receiptUrl };
  },
});

export const updateExpense = mutation({
  args: {
    id: v.id("expenses"),
    amount: v.number(),
    installmentCount: v.optional(v.number()),
    installmentRate: v.optional(v.number()),
    description: v.string(),
    date: v.number(),
    categoryId: v.id("categories"),
    walletId: v.optional(v.id("wallets")),
    vendorId: v.optional(v.id("vendors")),
    notes: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    const expense = await ctx.db.get(args.id);
    if (!expense) throw new ConvexError("Not found");
    if (expense.submittedBy !== profile._id) throw new ConvexError("Unauthorized");

    await validateExpensePayload(ctx, profile._id, args);
    const receipt = await validateReceiptOwnership(ctx, profile._id, args.receiptStorageId, {
      allowMissingForExistingExpenseId: expense._id,
    });

    const previousReceiptStorageId = expense.receiptStorageId;

    await ctx.db.patch(args.id, {
      amount: Math.round(args.amount),
      installmentCount: args.installmentCount ?? 1,
      installmentRate: args.installmentRate ? Math.round(args.installmentRate * 100) / 100 : 0,
      description: args.description,
      date: args.date,
      categoryId: args.categoryId,
      walletId: args.walletId,
      vendorId: args.vendorId,
      notes: args.notes,
      receiptStorageId: args.receiptStorageId,
      updatedAt: Date.now(),
    });

    if (receipt) {
      await ctx.db.patch(receipt._id, { attachedExpenseId: args.id });
    }

    if (previousReceiptStorageId && previousReceiptStorageId !== args.receiptStorageId) {
      await ctx.storage.delete(previousReceiptStorageId);

      const previousReceipt = await ctx.db
        .query("uploadedReceipts")
        .withIndex("by_storage", (q) => q.eq("storageId", previousReceiptStorageId))
        .unique();

      if (previousReceipt) {
        await ctx.db.delete(previousReceipt._id);
      }
    }
  },
});

export const listExpenses = query({
  args: {
    paginationOpts: paginationOptsValidator,
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    walletId: v.optional(v.id("wallets")),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    let result;
    if (args.walletId) {
      const hasAccess = await hasWalletAccess(ctx, profile._id, args.walletId);
      if (!hasAccess) throw new ConvexError("Wallet tidak valid");

      let expensesQuery = ctx.db
        .query("expenses")
        .withIndex("by_wallet", (q) => q.eq("walletId", args.walletId))
        .order("desc");

      if (args.startDate !== undefined || args.endDate !== undefined) {
        expensesQuery = expensesQuery.filter((q) => {
          if (args.startDate !== undefined && args.endDate !== undefined) {
            return q.and(
              q.gte(q.field("date"), args.startDate),
              q.lte(q.field("date"), args.endDate)
            );
          }
          if (args.startDate !== undefined) {
            return q.gte(q.field("date"), args.startDate);
          }
          return q.lte(q.field("date"), args.endDate!);
        });
      }

      result = await expensesQuery.paginate(args.paginationOpts);
    } else {
      let expensesQuery = ctx.db
        .query("expenses")
        .withIndex("by_submitted_by", (q) => q.eq("submittedBy", profile._id))
        .order("desc");

      if (args.startDate !== undefined || args.endDate !== undefined) {
        expensesQuery = expensesQuery.filter((q) => {
          if (args.startDate !== undefined && args.endDate !== undefined) {
            return q.and(
              q.gte(q.field("date"), args.startDate),
              q.lte(q.field("date"), args.endDate)
            );
          }
          if (args.startDate !== undefined) {
            return q.gte(q.field("date"), args.startDate);
          }
          return q.lte(q.field("date"), args.endDate!);
        });
      }

      result = await expensesQuery.paginate(args.paginationOpts);
    }

    const page = await Promise.all(
      result.page.map(async (expense) => {
        const category = await ctx.db.get(expense.categoryId);
        const vendor = expense.vendorId ? await ctx.db.get(expense.vendorId) : null;
        const wallet = expense.walletId ? await ctx.db.get(expense.walletId) : null;
        const receiptUrl = expense.receiptStorageId
          ? await ctx.storage.getUrl(expense.receiptStorageId)
          : null;
        const submitter = await ctx.db.get(expense.submittedBy);
        return {
          ...expense,
          category,
          vendor,
          wallet,
          receiptUrl,
          submitterName: submitter?.name ?? "User",
          isOwn: expense.submittedBy === profile._id,
        };
      })
    );

    return { ...result, page };
  },
});

export const deleteExpense = mutation({
  args: { id: v.id("expenses") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    const expense = await ctx.db.get(args.id);
    if (!expense) throw new ConvexError("Not found");
    if (expense.submittedBy !== profile._id) throw new ConvexError("Unauthorized");

    await ctx.db.delete(args.id);
  },
});

export const getExpenseSummary = query({
  args: { period: v.string(), walletId: v.optional(v.id("wallets")) },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    // period = "YYYY-MM"
    const [year, month] = args.period.split("-").map(Number);
    const start = new Date(year, month - 1, 1).getTime();
    const end = new Date(year, month, 1).getTime();

    let expenses;
    if (args.walletId) {
      const hasAccess = await hasWalletAccess(ctx, profile._id, args.walletId);
      if (!hasAccess) throw new ConvexError("Wallet tidak valid");

      expenses = await ctx.db
        .query("expenses")
        .withIndex("by_wallet", (q) => q.eq("walletId", args.walletId))
        .filter((q) =>
          q.and(q.gte(q.field("date"), start), q.lt(q.field("date"), end))
        )
        .collect();
    } else {
      expenses = await ctx.db
        .query("expenses")
        .withIndex("by_submitted_by", (q) => q.eq("submittedBy", profile._id))
        .filter((q) =>
          q.and(q.gte(q.field("date"), start), q.lt(q.field("date"), end))
        )
        .collect();
    }

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const count = expenses.length;

    const byCategoryMap = new Map<string, number>();
    for (const e of expenses) {
      const key = e.categoryId;
      byCategoryMap.set(key, (byCategoryMap.get(key) ?? 0) + e.amount);
    }

    const byCategory = await Promise.all(
      Array.from(byCategoryMap.entries()).map(async ([catId, total]) => {
        const category = await ctx.db.get(catId as Id<"categories">) as { name: string; color?: string } | null;
        return { categoryId: catId, name: category?.name ?? "Unknown", total, color: category?.color };
      })
    );

    return { total, count, byCategory };
  },
});

export const getInstallmentOverview = query({
  args: { period: v.string(), walletId: v.optional(v.id("wallets")) },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    let expenses;
    if (args.walletId) {
      const hasAccess = await hasWalletAccess(ctx, profile._id, args.walletId);
      if (!hasAccess) throw new ConvexError("Wallet tidak valid");

      expenses = await ctx.db
        .query("expenses")
        .withIndex("by_wallet", (q) => q.eq("walletId", args.walletId))
        .order("desc")
        .collect();
    } else {
      expenses = await ctx.db
        .query("expenses")
        .withIndex("by_submitted_by", (q) => q.eq("submittedBy", profile._id))
        .order("desc")
        .collect();
    }

    const installmentExpenses = expenses.filter((expense) => (expense.installmentCount ?? 1) > 1);

    const activeInstallments = await Promise.all(
      installmentExpenses
        .map(async (expense) => {
          const snapshot = getInstallmentSnapshot(expense);
          const position = getInstallmentPosition(expense.date, args.period, snapshot.installmentCount);
          if (!position.isActive) return null;

          const category = await ctx.db.get(expense.categoryId);
          const vendor = expense.vendorId ? await ctx.db.get(expense.vendorId) : null;

          return {
            ...expense,
            category,
            vendor,
            ...snapshot,
            installmentNumber: position.installmentNumber,
            remainingInstallments: position.remainingInstallments,
          };
        })
    );

    const history = await Promise.all(
      installmentExpenses.slice(0, 10).map(async (expense) => {
        const category = await ctx.db.get(expense.categoryId);
        const vendor = expense.vendorId ? await ctx.db.get(expense.vendorId) : null;

        return {
          ...expense,
          category,
          vendor,
          ...getInstallmentSnapshot(expense),
        };
      })
    );

    const activeItems = activeInstallments.filter((item) => item !== null);
    const activeTotal = activeItems.reduce((sum, item) => sum + item.installmentAmount, 0);

    return {
      activeTotal,
      activeCount: activeItems.length,
      activeInstallments: activeItems,
      history,
    };
  },
});

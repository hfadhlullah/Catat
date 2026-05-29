import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";

async function getCurrentProfile(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Unauthenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (!profile) throw new ConvexError("Profile not found");
  return profile;
}

async function validateExpensePayload(
  ctx: MutationCtx,
  profileId: Id<"userProfiles">,
  args: {
    categoryId: Id<"categories">;
    vendorId?: Id<"vendors">;
  }
) {
  const category = await ctx.db.get(args.categoryId);
  if (!category || !category.isActive || category.createdBy !== profileId) {
    throw new ConvexError("Kategori tidak valid");
  }

  if (args.vendorId) {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor || !vendor.isActive || vendor.createdBy !== profileId) {
      throw new ConvexError("Vendor tidak valid");
    }
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
    description: v.string(),
    date: v.number(),
    categoryId: v.id("categories"),
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
      description: args.description,
      date: args.date,
      categoryId: args.categoryId,
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
    if (expense.submittedBy !== profile._id) throw new ConvexError("Unauthorized");

    const category = await ctx.db.get(expense.categoryId);
    const vendor = expense.vendorId ? await ctx.db.get(expense.vendorId) : null;
    const receiptUrl = expense.receiptStorageId
      ? await ctx.storage.getUrl(expense.receiptStorageId)
      : null;

    return { ...expense, category, vendor, receiptUrl };
  },
});

export const updateExpense = mutation({
  args: {
    id: v.id("expenses"),
    amount: v.number(),
    description: v.string(),
    date: v.number(),
    categoryId: v.id("categories"),
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
      description: args.description,
      date: args.date,
      categoryId: args.categoryId,
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
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

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

    const result = await expensesQuery.paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (expense) => {
        const category = await ctx.db.get(expense.categoryId);
        const vendor = expense.vendorId ? await ctx.db.get(expense.vendorId) : null;
        const receiptUrl = expense.receiptStorageId
          ? await ctx.storage.getUrl(expense.receiptStorageId)
          : null;
        return { ...expense, category, vendor, receiptUrl };
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
  args: { period: v.string() },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    // period = "YYYY-MM"
    const [year, month] = args.period.split("-").map(Number);
    const start = new Date(year, month - 1, 1).getTime();
    const end = new Date(year, month, 1).getTime();

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_submitted_by", (q) => q.eq("submittedBy", profile._id))
      .filter((q) =>
        q.and(q.gte(q.field("date"), start), q.lt(q.field("date"), end))
      )
      .collect();

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

import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";

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
    receiptStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    const now = Date.now();
    return await ctx.db.insert("expenses", {
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
  },
});

export const listExpenses = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("expenses")
      .withIndex("by_date")
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (expense) => {
        const category = await ctx.db.get(expense.categoryId);
        const vendor = expense.vendorId ? await ctx.db.get(expense.vendorId) : null;
        const receiptUrl = await ctx.storage.getUrl(expense.receiptStorageId);
        return { ...expense, category, vendor, receiptUrl };
      })
    );

    return { ...result, page };
  },
});

export const getExpenseSummary = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    // period = "YYYY-MM"
    const [year, month] = args.period.split("-").map(Number);
    const start = new Date(year, month - 1, 1).getTime();
    const end = new Date(year, month, 1).getTime();

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_date", (q) => q.gte("date", start).lt("date", end))
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
        const category = await ctx.db.get(catId as any) as { name: string; color?: string } | null;
        return { categoryId: catId, name: category?.name ?? "Unknown", total, color: category?.color };
      })
    );

    return { total, count, byCategory };
  },
});

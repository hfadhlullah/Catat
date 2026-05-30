import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const getWalletCategoryBackfillStatus = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    const customCategories = categories.filter((category) => !category.isDefault);
    const pendingCategories = customCategories.filter((category) => !category.walletId);

    return {
      customCategoryCount: customCategories.length,
      walletScopedCategoryCount: customCategories.filter((category) => !!category.walletId).length,
      pendingCategoryCount: pendingCategories.length,
    };
  },
});

export const getTransactionBackfillStatus = query({
  args: {},
  handler: async (ctx) => {
    const [expenseCount, incomeCount, transactionCount] = await Promise.all([
      ctx.db.query("expenses").collect(),
      ctx.db.query("incomes").collect(),
      ctx.db.query("transactions").collect(),
    ]);

    const migratedExpenseCount = transactionCount.filter((item) => item.legacyExpenseId !== undefined).length;
    const migratedIncomeCount = transactionCount.filter((item) => item.legacyIncomeId !== undefined).length;

    return {
      legacyExpenseCount: expenseCount.length,
      legacyIncomeCount: incomeCount.length,
      transactionCount: transactionCount.length,
      migratedExpenseCount,
      migratedIncomeCount,
      pendingExpenseCount: Math.max(expenseCount.length - migratedExpenseCount, 0),
      pendingIncomeCount: Math.max(incomeCount.length - migratedIncomeCount, 0),
    };
  },
});

export const runTransactionBackfill = mutation({
  args: {},
  handler: async (ctx) => {
    const expenses = await ctx.db.query("expenses").collect();
    const incomes = await ctx.db.query("incomes").collect();

    let migratedExpenses = 0;
    let migratedIncomes = 0;

    for (const expense of expenses) {
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_legacy_expense", (q) => q.eq("legacyExpenseId", expense._id))
        .unique();
      if (existing) continue;

      const transactionId = await ctx.db.insert("transactions", {
        direction: "expense",
        transactionType: "default",
        amount: expense.amount,
        installmentCount: expense.installmentCount ?? 1,
        installmentRate: expense.installmentRate ?? 0,
        description: expense.description,
        date: expense.date,
        categoryId: expense.categoryId,
        walletId: expense.walletId,
        vendorId: expense.vendorId,
        submittedBy: expense.submittedBy,
        receiptStorageId: expense.receiptStorageId,
        notes: expense.notes,
        legacyExpenseId: expense._id,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      });

      if (expense.receiptStorageId) {
        const receipt = await ctx.db
          .query("uploadedReceipts")
          .withIndex("by_storage", (q) => q.eq("storageId", expense.receiptStorageId!))
          .unique();
        if (receipt) {
          await ctx.db.patch(receipt._id, { attachedTransactionId: transactionId });
        }
      }

      migratedExpenses += 1;
    }

    for (const income of incomes) {
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_legacy_income", (q) => q.eq("legacyIncomeId", income._id))
        .unique();
      if (existing) continue;

      await ctx.db.insert("transactions", {
        direction: "income",
        transactionType: "default",
        amount: income.amount,
        description: income.description,
        date: income.date,
        walletId: income.walletId,
        submittedBy: income.receivedBy,
        notes: income.notes,
        legacyIncomeId: income._id,
        createdAt: income.createdAt,
        updatedAt: income.createdAt,
      });

      migratedIncomes += 1;
    }

    return {
      migratedExpenses,
      migratedIncomes,
      totalMigrated: migratedExpenses + migratedIncomes,
    };
  },
});

export const runWalletCategoryBackfill = mutation({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    const transactions = await ctx.db.query("transactions").collect();
    const expenses = await ctx.db.query("expenses").collect();

    const pendingCategories = categories.filter((category) => !category.isDefault && !category.walletId);
    const categoryById = new Map(categories.map((category) => [category._id, category]));
    const categoryWalletMap = new Map<string, Id<"categories">>();

    function collectWalletIds(categoryId: Id<"categories">) {
      const walletIds = new Set<Id<"wallets">>();
      for (const transaction of transactions) {
        if (transaction.categoryId === categoryId && transaction.walletId) {
          walletIds.add(transaction.walletId);
        }
      }
      for (const expense of expenses) {
        if (expense.categoryId === categoryId && expense.walletId) {
          walletIds.add(expense.walletId);
        }
      }
      return Array.from(walletIds);
    }

    async function ensureWalletScopedCategory(categoryId: Id<"categories">, walletId: Id<"wallets">) {
      const mapKey = `${categoryId}:${walletId}`;
      const cached = categoryWalletMap.get(mapKey);
      if (cached) return cached;

      const original = categoryById.get(categoryId);
      if (!original) return null;

      let resolvedParentId = original.parentId;
      if (original.parentId) {
        resolvedParentId = await ensureWalletScopedCategory(original.parentId, walletId) as typeof original.parentId;
      }

      const existingMatch = categories.find(
        (category) =>
          category.walletId === walletId &&
          category.createdBy === original.createdBy &&
          category.name.toLowerCase() === original.name.toLowerCase() &&
          category.parentId === resolvedParentId
      );

      if (existingMatch) {
        categoryWalletMap.set(mapKey, existingMatch._id);
        return existingMatch._id;
      }

      const createdId = await ctx.db.insert("categories", {
        createdBy: original.createdBy,
        walletId,
        name: original.name,
        color: original.color,
        icon: original.icon,
        directionScope: original.directionScope,
        isDefault: false,
        isActive: original.isActive,
        parentId: resolvedParentId,
        createdAt: original.createdAt,
      });

      categoryWalletMap.set(mapKey, createdId);
      return createdId;
    }

    let updatedTransactions = 0;
    let updatedExpenses = 0;
    let clonedCategories = 0;
    let archivedCategories = 0;

    const originalCategoryIds = new Set<Id<"categories">>(categories.map((category) => category._id));

    for (const category of pendingCategories) {
      const walletIds = collectWalletIds(category._id);

      if (walletIds.length === 1) {
        await ctx.db.patch(category._id, { walletId: walletIds[0] });
        categoryWalletMap.set(`${category._id}:${walletIds[0]}`, category._id);
        clonedCategories += 0;
        continue;
      }

      if (walletIds.length === 0) {
        continue;
      }

      for (const walletId of walletIds) {
        const scopedCategoryId = await ensureWalletScopedCategory(category._id, walletId);
        if (!scopedCategoryId) continue;

        if (originalCategoryIds.has(scopedCategoryId)) {
          continue;
        }
        clonedCategories += 1;
      }

      await ctx.db.patch(category._id, { isActive: false });
      archivedCategories += 1;
    }

    for (const transaction of transactions) {
      if (!transaction.categoryId || !transaction.walletId) continue;
      const category = categoryById.get(transaction.categoryId);
      if (!category || category.isDefault || category.walletId) continue;

      const scopedCategoryId = await ensureWalletScopedCategory(transaction.categoryId, transaction.walletId);
      if (!scopedCategoryId || scopedCategoryId === transaction.categoryId) continue;

      await ctx.db.patch(transaction._id, { categoryId: scopedCategoryId });
      updatedTransactions += 1;
    }

    for (const expense of expenses) {
      if (!expense.categoryId || !expense.walletId) continue;
      const category = categoryById.get(expense.categoryId);
      if (!category || category.isDefault || category.walletId) continue;

      const scopedCategoryId = await ensureWalletScopedCategory(expense.categoryId, expense.walletId);
      if (!scopedCategoryId || scopedCategoryId === expense.categoryId) continue;

      await ctx.db.patch(expense._id, { categoryId: scopedCategoryId });
      updatedExpenses += 1;
    }

    return {
      pendingCategoryCount: pendingCategories.length,
      clonedCategories,
      archivedCategories,
      updatedTransactions,
      updatedExpenses,
    };
  },
});

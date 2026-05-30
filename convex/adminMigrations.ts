import { mutation, query } from "./_generated/server";

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

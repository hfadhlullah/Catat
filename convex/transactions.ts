import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";

import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAccessibleProfileIds, getCurrentProfile } from "./profile";

const splitBillValidator = v.object({
  enabled: v.boolean(),
  mode: v.union(v.literal("equal"), v.literal("custom")),
  participants: v.array(v.object({
    userId: v.optional(v.id("userProfiles")),
    name: v.string(),
    amount: v.number(),
    isPaid: v.optional(v.boolean()),
    paidAt: v.optional(v.number()),
  })),
});

async function hasWalletAccess(ctx: QueryCtx | MutationCtx, profileId: Id<"userProfiles">, walletId: Id<"wallets">) {
  const wallet = await ctx.db.get(walletId);
  if (!wallet || !wallet.isActive) return false;
  if (wallet.createdBy === profileId) return true;

  const member = await ctx.db
    .query("walletMembers")
    .withIndex("by_wallet_user", (q) => q.eq("walletId", walletId).eq("userId", profileId))
    .unique();

  return !!member;
}

async function requireWalletAccess(ctx: QueryCtx | MutationCtx, profileId: Id<"userProfiles">, walletId: Id<"wallets">) {
  const hasAccess = await hasWalletAccess(ctx, profileId, walletId);
  if (!hasAccess) {
    throw new ConvexError("Wallet tidak valid");
  }
}

function isTransferTransaction(transaction: {
  transactionType: string;
  transferGroupId?: string;
  linkedTransactionId?: Id<"transactions">;
  transferPeerWalletId?: Id<"wallets">;
}) {
  return transaction.transactionType === "transfer" || !!transaction.transferGroupId || !!transaction.linkedTransactionId || !!transaction.transferPeerWalletId;
}

async function getLinkedTransferTransaction(ctx: QueryCtx | MutationCtx, transaction: {
  _id: Id<"transactions">;
  linkedTransactionId?: Id<"transactions">;
  transferGroupId?: string;
}) {
  if (transaction.linkedTransactionId) {
    return await ctx.db.get(transaction.linkedTransactionId);
  }

  if (!transaction.transferGroupId) {
    return null;
  }

  const linked = await ctx.db
    .query("transactions")
    .filter((q) => q.eq(q.field("transferGroupId"), transaction.transferGroupId))
    .collect();

  return linked.find((item) => item._id !== transaction._id) ?? null;
}

async function getWalletBalance(ctx: QueryCtx | MutationCtx, walletId: Id<"wallets">) {
  const wallet = await ctx.db.get(walletId);
  if (!wallet) {
    throw new ConvexError("Wallet tidak valid");
  }

  const transactions = await ctx.db
    .query("transactions")
    .withIndex("by_wallet", (q) => q.eq("walletId", walletId))
    .collect();

  const totalIncome = transactions
    .filter((item) => item.direction === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = transactions
    .filter((item) => item.direction === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  return wallet.initialBalance + totalIncome - totalExpense;
}

async function ensureWalletHasEnoughBalance(
  ctx: MutationCtx,
  walletId: Id<"wallets">,
  amount: number,
  currentSourceTransaction?: { walletId: Id<"wallets">; amount: number }
) {
  let availableBalance = await getWalletBalance(ctx, walletId);

  if (currentSourceTransaction?.walletId === walletId) {
    availableBalance += currentSourceTransaction.amount;
  }

  if (amount > availableBalance) {
    throw new ConvexError("Saldo wallet asal tidak cukup untuk transfer ini");
  }
}

function getInstallmentSnapshot(transaction: {
  amount: number;
  installmentCount?: number;
  installmentRate?: number;
}) {
  const installmentCount = transaction.installmentCount ?? 1;
  const installmentRate = transaction.installmentRate ?? 0;
  const totalWithInterest = Math.round(transaction.amount * (1 + installmentRate / 100));
  const installmentAmount = installmentCount > 0 ? Math.round(totalWithInterest / installmentCount) : totalWithInterest;

  return {
    installmentCount,
    installmentRate,
    totalWithInterest,
    installmentAmount,
  };
}

function getInstallmentPosition(transactionDate: number, period: string, installmentCount: number) {
  const [year, month] = period.split("-").map(Number);
  const transactionMonth = new Date(transactionDate);
  const monthDiff =
    (year - transactionMonth.getFullYear()) * 12 +
    (month - 1 - transactionMonth.getMonth());

  const isActive = monthDiff >= 0 && monthDiff < installmentCount;
  return {
    monthDiff,
    isActive,
    installmentNumber: isActive ? monthDiff + 1 : null,
    remainingInstallments: isActive ? installmentCount - monthDiff - 1 : null,
  };
}

async function validateReceiptOwnership(
  ctx: MutationCtx,
  profileId: Id<"userProfiles">,
  storageId: Id<"_storage"> | undefined,
  options?: {
    allowMissingForExistingTransactionId?: Id<"transactions">;
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

  if (options?.allowMissingForExistingTransactionId) {
    const transaction = await ctx.db.get(options.allowMissingForExistingTransactionId);
    if (transaction?.submittedBy === profileId && transaction.receiptStorageId === storageId) {
      return null;
    }
  }

  throw new ConvexError("Receipt tidak valid");
}

async function validateTransactionPayload(
  ctx: MutationCtx,
  profileId: Id<"userProfiles">,
  args: {
    direction: "expense" | "income";
    transactionType: string;
    amount: number;
    categoryId?: Id<"categories">;
    walletId: Id<"wallets">;
    vendorId?: Id<"vendors">;
    installmentCount?: number;
    installmentRate?: number;
    splitBill?: {
      enabled: boolean;
      mode: "equal" | "custom";
      participants: Array<{
        userId?: Id<"userProfiles">;
        name: string;
        amount: number;
        isPaid?: boolean;
        paidAt?: number;
      }>;
    };
  }
) {
  const accessibleIds = await getAccessibleProfileIds(ctx, profileId);

  if (!args.walletId) {
    throw new ConvexError("Wallet wajib dipilih");
  }
  await requireWalletAccess(ctx, profileId, args.walletId);

  const isTransfer = args.transactionType === "transfer";

  if (isTransfer) {
    if (args.categoryId) {
      throw new ConvexError("Transfer tidak memakai kategori");
    }
    if (args.vendorId) {
      throw new ConvexError("Transfer tidak memakai vendor");
    }
    if ((args.installmentCount ?? 1) > 1) {
      throw new ConvexError("Transfer tidak mendukung cicilan");
    }
    if ((args.installmentRate ?? 0) > 0) {
      throw new ConvexError("Transfer tidak mendukung bunga cicilan");
    }
    if (args.splitBill?.enabled) {
      throw new ConvexError("Transfer tidak mendukung split bill");
    }
    return;
  }

  if (args.direction === "expense") {
    if (!args.categoryId) {
      throw new ConvexError("Kategori wajib dipilih");
    }
  }

    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (
        !category ||
        !category.isActive ||
        (!category.isDefault && !accessibleIds.includes(category.createdBy as string))
      ) {
        throw new ConvexError("Kategori tidak valid");
      }

      if (!category.isDefault && category.walletId !== args.walletId) {
        throw new ConvexError("Kategori tidak sesuai wallet");
      }

      if (args.direction === "expense" && category.directionScope === "income") {
        throw new ConvexError("Kategori hanya untuk pemasukan");
    }

    if (args.direction === "income" && category.directionScope === "expense") {
      throw new ConvexError("Kategori hanya untuk pengeluaran");
    }
  }

  if (args.vendorId) {
    if (args.direction === "income") {
      throw new ConvexError("Pemasukan tidak memakai vendor");
    }
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor || !vendor.isActive || !accessibleIds.includes(vendor.createdBy as string)) {
      throw new ConvexError("Vendor tidak valid");
    }
  }

  if (args.direction === "expense") {
    if (args.installmentCount !== undefined) {
      if (!Number.isInteger(args.installmentCount) || args.installmentCount < 1) {
        throw new ConvexError("Cicilan harus minimal 1x");
      }
    }

    if (args.installmentRate !== undefined && args.installmentRate < 0) {
      throw new ConvexError("Bunga cicilan tidak boleh negatif");
    }

    if (args.splitBill?.enabled) {
      const seen = new Set<string>();
      const participants = args.splitBill.participants;

      if (participants.length < 2) {
        throw new ConvexError("Split bill minimal 2 peserta");
      }

      if (args.splitBill.mode === "equal" && Math.round(args.amount) < participants.length) {
        throw new ConvexError("Jumlah transaksi terlalu kecil untuk split rata");
      }

      let total = 0;
      for (const participant of participants) {
        const normalizedName = participant.name.trim().toLowerCase();
        const dedupeKey = participant.userId ? `user:${String(participant.userId)}` : `name:${normalizedName}`;

        if (seen.has(dedupeKey)) {
          throw new ConvexError("Peserta split bill duplikat");
        }
        seen.add(dedupeKey);

        if (!participant.userId && !normalizedName) {
          throw new ConvexError("Nama peserta split bill wajib diisi");
        }

        if (!Number.isInteger(participant.amount) || participant.amount < 1) {
          throw new ConvexError("Nominal split bill tidak valid");
        }

        if (participant.paidAt !== undefined && !participant.isPaid) {
          throw new ConvexError("Status bayar split bill tidak valid");
        }

        total += participant.amount;
      }

      if (total !== Math.round(args.amount)) {
        throw new ConvexError("Total split bill harus sama dengan jumlah transaksi");
      }
    }
  } else {
    if (args.installmentCount && args.installmentCount > 1) {
      throw new ConvexError("Pemasukan tidak mendukung cicilan");
    }
    if (args.installmentRate && args.installmentRate > 0) {
      throw new ConvexError("Pemasukan tidak mendukung bunga cicilan");
    }
    if (args.splitBill?.enabled) {
      throw new ConvexError("Split bill hanya untuk pengeluaran");
    }
  }
}

function normalizeSplitBill(
  amount: number,
  splitBill:
    | {
        enabled: boolean;
        mode: "equal" | "custom";
        participants: Array<{
          userId?: Id<"userProfiles">;
          name: string;
          amount: number;
          isPaid?: boolean;
          paidAt?: number;
        }>;
      }
    | undefined
) {
  if (!splitBill?.enabled) {
    return undefined;
  }

  const normalizedAmount = Math.round(amount);
  const participants = splitBill.participants.map((participant) => ({
    userId: participant.userId,
    name: participant.name.trim(),
    amount: Math.round(participant.amount),
    isPaid: participant.isPaid ? true : undefined,
    paidAt: participant.isPaid ? (participant.paidAt ?? Date.now()) : undefined,
  }));

  if (splitBill.mode === "equal") {
    const baseAmount = Math.floor(normalizedAmount / participants.length);
    let remainder = normalizedAmount - baseAmount * participants.length;

    return {
      enabled: true,
      mode: splitBill.mode,
      participants: participants.map((participant) => {
        const nextAmount = baseAmount + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        return {
          ...participant,
          amount: nextAmount,
        };
      }),
    };
  }

  return {
    enabled: true,
    mode: splitBill.mode,
    participants,
  };
}

function monthRange(period: string) {
  const [year, month] = period.split("-").map(Number);
  return {
    start: new Date(year, month - 1, 1).getTime(),
    end: new Date(year, month, 1).getTime(),
  };
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthenticated");
    return await ctx.storage.generateUploadUrl();
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

export const createTransaction = mutation({
  args: {
    direction: v.union(v.literal("expense"), v.literal("income")),
    transactionType: v.union(
      v.literal("default"),
      v.literal("upcoming"),
      v.literal("subscription"),
      v.literal("repetitive"),
      v.literal("lent"),
      v.literal("borrowed"),
      v.literal("transfer")
    ),
    amount: v.number(),
    installmentCount: v.optional(v.number()),
    installmentRate: v.optional(v.number()),
    description: v.string(),
    date: v.number(),
    categoryId: v.optional(v.id("categories")),
    walletId: v.id("wallets"),
    vendorId: v.optional(v.id("vendors")),
    notes: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
    splitBill: v.optional(splitBillValidator),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    if (args.transactionType === "transfer") {
      throw new ConvexError("Gunakan fitur transfer wallet");
    }
    const receipt = await validateReceiptOwnership(ctx, profile._id, args.receiptStorageId);
    const splitBill = normalizeSplitBill(args.amount, args.splitBill);
    await validateTransactionPayload(ctx, profile._id, { ...args, splitBill });

    const now = Date.now();
    const transactionId = await ctx.db.insert("transactions", {
      direction: args.direction,
      transactionType: args.transactionType,
      amount: Math.round(args.amount),
      installmentCount: args.direction === "expense" ? (args.installmentCount ?? 1) : undefined,
      installmentRate: args.direction === "expense" && args.installmentRate ? Math.round(args.installmentRate * 100) / 100 : 0,
      description: args.description.trim(),
      date: args.date,
      categoryId: args.categoryId,
      walletId: args.walletId,
      vendorId: args.direction === "expense" ? args.vendorId : undefined,
      submittedBy: profile._id,
      receiptStorageId: args.direction === "expense" ? args.receiptStorageId : undefined,
      notes: args.notes,
      splitBill,
      transferGroupId: undefined,
      transferPeerWalletId: undefined,
      linkedTransactionId: undefined,
      createdAt: now,
      updatedAt: now,
    });

    if (receipt) {
      await ctx.db.patch(receipt._id, { attachedTransactionId: transactionId });
    }

    return transactionId;
  },
});

export const getTransactionById = query({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    const transaction = await ctx.db.get(args.id);
    if (!transaction) return null;

    const isOwner = transaction.submittedBy === profile._id;
    let isShared = false;
    if (transaction.walletId) {
      isShared = await hasWalletAccess(ctx, profile._id, transaction.walletId);
    }
    if (!isOwner && !isShared) throw new ConvexError("Unauthorized");

    const category = transaction.categoryId ? await ctx.db.get(transaction.categoryId) : null;
    const vendor = transaction.vendorId ? await ctx.db.get(transaction.vendorId) : null;
    const wallet = transaction.walletId ? await ctx.db.get(transaction.walletId) : null;
    const receiptUrl = transaction.receiptStorageId ? await ctx.storage.getUrl(transaction.receiptStorageId) : null;
    const linkedTransfer = isTransferTransaction(transaction) ? await getLinkedTransferTransaction(ctx, transaction) : null;
    const transferPeerWallet = transaction.transferPeerWalletId ? await ctx.db.get(transaction.transferPeerWalletId) : null;

    return {
      ...transaction,
      category,
      vendor,
      wallet,
      receiptUrl,
      isOwner,
      transferPeerWallet,
      linkedTransfer: linkedTransfer
        ? {
            _id: linkedTransfer._id,
            walletId: linkedTransfer.walletId,
            transferPeerWalletId: linkedTransfer.transferPeerWalletId,
            amount: linkedTransfer.amount,
          }
        : null,
    };
  },
});

export const createWalletTransfer = mutation({
  args: {
    amount: v.number(),
    description: v.optional(v.string()),
    date: v.number(),
    fromWalletId: v.id("wallets"),
    toWalletId: v.id("wallets"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    if (Math.round(args.amount) < 1) {
      throw new ConvexError("Masukkan jumlah");
    }
    if (args.fromWalletId === args.toWalletId) {
      throw new ConvexError("Wallet asal dan tujuan harus berbeda");
    }

    await requireWalletAccess(ctx, profile._id, args.fromWalletId);
    await requireWalletAccess(ctx, profile._id, args.toWalletId);

    const fromWallet = await ctx.db.get(args.fromWalletId);
    const toWallet = await ctx.db.get(args.toWalletId);
    if (!fromWallet || !toWallet) {
      throw new ConvexError("Wallet tidak valid");
    }

    const now = Date.now();
    const transferGroupId = crypto.randomUUID();
    const amount = Math.round(args.amount);
    const description = args.description?.trim() || `Transfer ke ${toWallet.label || toWallet.name}`;
    const linkedDescription = args.description?.trim() || `Transfer dari ${fromWallet.label || fromWallet.name}`;

    await ensureWalletHasEnoughBalance(ctx, args.fromWalletId, amount);

    const fromTransactionId = await ctx.db.insert("transactions", {
      direction: "expense",
      transactionType: "transfer",
      amount,
      installmentCount: 1,
      installmentRate: 0,
      description,
      date: args.date,
      categoryId: undefined,
      walletId: args.fromWalletId,
      vendorId: undefined,
      submittedBy: profile._id,
      receiptStorageId: undefined,
      notes: args.notes,
      splitBill: undefined,
      transferGroupId,
      transferPeerWalletId: args.toWalletId,
      linkedTransactionId: undefined,
      createdAt: now,
      updatedAt: now,
    });

    const toTransactionId = await ctx.db.insert("transactions", {
      direction: "income",
      transactionType: "transfer",
      amount,
      installmentCount: undefined,
      installmentRate: 0,
      description: linkedDescription,
      date: args.date,
      categoryId: undefined,
      walletId: args.toWalletId,
      vendorId: undefined,
      submittedBy: profile._id,
      receiptStorageId: undefined,
      notes: args.notes,
      splitBill: undefined,
      transferGroupId,
      transferPeerWalletId: args.fromWalletId,
      linkedTransactionId: fromTransactionId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(fromTransactionId, { linkedTransactionId: toTransactionId });

    return fromTransactionId;
  },
});

export const updateTransaction = mutation({
  args: {
    id: v.id("transactions"),
    direction: v.union(v.literal("expense"), v.literal("income")),
    transactionType: v.union(
      v.literal("default"),
      v.literal("upcoming"),
      v.literal("subscription"),
      v.literal("repetitive"),
      v.literal("lent"),
      v.literal("borrowed"),
      v.literal("transfer")
    ),
    amount: v.number(),
    installmentCount: v.optional(v.number()),
    installmentRate: v.optional(v.number()),
    description: v.string(),
    date: v.number(),
    categoryId: v.optional(v.id("categories")),
    walletId: v.id("wallets"),
    vendorId: v.optional(v.id("vendors")),
    notes: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
    splitBill: v.optional(splitBillValidator),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    const transaction = await ctx.db.get(args.id);
    if (!transaction) throw new ConvexError("Not found");
    if (transaction.submittedBy !== profile._id) throw new ConvexError("Unauthorized");
    if (isTransferTransaction(transaction)) throw new ConvexError("Gunakan edit transfer");
    if (args.transactionType === "transfer") throw new ConvexError("Gunakan edit transfer");

    const splitBill = normalizeSplitBill(args.amount, args.splitBill);
    await validateTransactionPayload(ctx, profile._id, { ...args, splitBill });
    const receipt = await validateReceiptOwnership(ctx, profile._id, args.receiptStorageId, {
      allowMissingForExistingTransactionId: transaction._id,
    });

    const previousReceiptStorageId = transaction.receiptStorageId;

    await ctx.db.patch(args.id, {
      direction: args.direction,
      transactionType: args.transactionType,
      amount: Math.round(args.amount),
      installmentCount: args.direction === "expense" ? (args.installmentCount ?? 1) : undefined,
      installmentRate: args.direction === "expense" && args.installmentRate ? Math.round(args.installmentRate * 100) / 100 : 0,
      description: args.description.trim(),
      date: args.date,
      categoryId: args.categoryId,
      walletId: args.walletId,
      vendorId: args.direction === "expense" ? args.vendorId : undefined,
      notes: args.notes,
      receiptStorageId: args.direction === "expense" ? args.receiptStorageId : undefined,
      splitBill,
      updatedAt: Date.now(),
    });

    if (receipt) {
      await ctx.db.patch(receipt._id, { attachedTransactionId: args.id });
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

export const listTransactions = query({
  args: {
    paginationOpts: paginationOptsValidator,
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    walletId: v.optional(v.id("wallets")),
    direction: v.optional(v.union(v.literal("expense"), v.literal("income"))),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    let result;
    if (args.walletId) {
      const hasAccess = await hasWalletAccess(ctx, profile._id, args.walletId);
      if (!hasAccess) throw new ConvexError("Wallet tidak valid");

      let transactionsQuery = ctx.db
        .query("transactions")
        .withIndex("by_wallet", (q) => q.eq("walletId", args.walletId))
        .order("desc");

      if (args.startDate !== undefined || args.endDate !== undefined || args.direction !== undefined) {
        transactionsQuery = transactionsQuery.filter((q) => {
          const startAndEnd =
            args.startDate !== undefined && args.endDate !== undefined
              ? q.and(q.gte(q.field("date"), args.startDate), q.lte(q.field("date"), args.endDate))
              : args.startDate !== undefined
                ? q.gte(q.field("date"), args.startDate)
                : args.endDate !== undefined
                  ? q.lte(q.field("date"), args.endDate)
                  : undefined;

          if (args.direction !== undefined && startAndEnd) {
            return q.and(startAndEnd, q.eq(q.field("direction"), args.direction));
          }
          if (args.direction !== undefined) {
            return q.eq(q.field("direction"), args.direction);
          }
          return startAndEnd!;
        });
      }

      result = await transactionsQuery.paginate(args.paginationOpts);
    } else {
      let transactionsQuery = ctx.db
        .query("transactions")
        .withIndex("by_submitted_by", (q) => q.eq("submittedBy", profile._id))
        .order("desc");

      if (args.startDate !== undefined || args.endDate !== undefined || args.direction !== undefined) {
        transactionsQuery = transactionsQuery.filter((q) => {
          const startAndEnd =
            args.startDate !== undefined && args.endDate !== undefined
              ? q.and(q.gte(q.field("date"), args.startDate), q.lte(q.field("date"), args.endDate))
              : args.startDate !== undefined
                ? q.gte(q.field("date"), args.startDate)
                : args.endDate !== undefined
                  ? q.lte(q.field("date"), args.endDate)
                  : undefined;

          if (args.direction !== undefined && startAndEnd) {
            return q.and(startAndEnd, q.eq(q.field("direction"), args.direction));
          }
          if (args.direction !== undefined) {
            return q.eq(q.field("direction"), args.direction);
          }
          return startAndEnd!;
        });
      }

      result = await transactionsQuery.paginate(args.paginationOpts);
    }

    const page = await Promise.all(
      result.page.map(async (transaction) => {
        const category = transaction.categoryId ? await ctx.db.get(transaction.categoryId) : null;
        const vendor = transaction.vendorId ? await ctx.db.get(transaction.vendorId) : null;
        const wallet = transaction.walletId ? await ctx.db.get(transaction.walletId) : null;
        const receiptUrl = transaction.receiptStorageId ? await ctx.storage.getUrl(transaction.receiptStorageId) : null;
        const submitter = await ctx.db.get(transaction.submittedBy);
        const transferPeerWallet = transaction.transferPeerWalletId ? await ctx.db.get(transaction.transferPeerWalletId) : null;

        return {
          ...transaction,
          category,
          vendor,
          wallet,
          transferPeerWallet,
          receiptUrl,
          submitterName: submitter?.name ?? "User",
          isOwn: transaction.submittedBy === profile._id,
        };
      })
    );

    return { ...result, page };
  },
});

export const deleteTransaction = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    const transaction = await ctx.db.get(args.id);
    if (!transaction) throw new ConvexError("Not found");
    if (transaction.submittedBy !== profile._id) throw new ConvexError("Unauthorized");

    if (isTransferTransaction(transaction)) {
      const linked = await getLinkedTransferTransaction(ctx, transaction);
      if (linked && linked.submittedBy === profile._id) {
        await ctx.db.delete(linked._id);
      }
      await ctx.db.delete(args.id);
      return;
    }

    if (transaction.legacyExpenseId) {
      const legacyExpense = await ctx.db.get(transaction.legacyExpenseId);
      if (legacyExpense) {
        await ctx.db.delete(transaction.legacyExpenseId);
      }
    }

    if (transaction.legacyIncomeId) {
      const legacyIncome = await ctx.db.get(transaction.legacyIncomeId);
      if (legacyIncome) {
        await ctx.db.delete(transaction.legacyIncomeId);
      }
    }

    await ctx.db.delete(args.id);
  },
});

export const updateWalletTransfer = mutation({
  args: {
    id: v.id("transactions"),
    amount: v.number(),
    description: v.optional(v.string()),
    date: v.number(),
    fromWalletId: v.id("wallets"),
    toWalletId: v.id("wallets"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    const transaction = await ctx.db.get(args.id);
    if (!transaction) throw new ConvexError("Not found");
    if (transaction.submittedBy !== profile._id) throw new ConvexError("Unauthorized");
    if (!isTransferTransaction(transaction)) throw new ConvexError("Transaksi ini bukan transfer");

    const linked = await getLinkedTransferTransaction(ctx, transaction);
    if (!linked) throw new ConvexError("Transfer pasangan tidak ditemukan");

    if (Math.round(args.amount) < 1) {
      throw new ConvexError("Masukkan jumlah");
    }
    if (args.fromWalletId === args.toWalletId) {
      throw new ConvexError("Wallet asal dan tujuan harus berbeda");
    }

    await requireWalletAccess(ctx, profile._id, args.fromWalletId);
    await requireWalletAccess(ctx, profile._id, args.toWalletId);

    const fromWallet = await ctx.db.get(args.fromWalletId);
    const toWallet = await ctx.db.get(args.toWalletId);
    if (!fromWallet || !toWallet) {
      throw new ConvexError("Wallet tidak valid");
    }

    const amount = Math.round(args.amount);
    const baseDescription = args.description?.trim();
    const fromDescription = baseDescription || `Transfer ke ${toWallet.label || toWallet.name}`;
    const toDescription = baseDescription || `Transfer dari ${fromWallet.label || fromWallet.name}`;
    const now = Date.now();

    const sourceId = transaction.direction === "expense" ? transaction._id : linked._id;
    const targetId = transaction.direction === "income" ? transaction._id : linked._id;
    const groupId = transaction.transferGroupId ?? linked.transferGroupId ?? crypto.randomUUID();
    const sourceTransaction = transaction.direction === "expense" ? transaction : linked;

    if (!sourceTransaction.walletId) {
      throw new ConvexError("Wallet tidak valid");
    }

    await ensureWalletHasEnoughBalance(ctx, args.fromWalletId, amount, {
      walletId: sourceTransaction.walletId,
      amount: sourceTransaction.amount,
    });

    await ctx.db.patch(sourceId, {
      direction: "expense",
      transactionType: "transfer",
      amount,
      description: fromDescription,
      date: args.date,
      walletId: args.fromWalletId,
      notes: args.notes,
      categoryId: undefined,
      vendorId: undefined,
      receiptStorageId: undefined,
      splitBill: undefined,
      installmentCount: 1,
      installmentRate: 0,
      transferGroupId: groupId,
      transferPeerWalletId: args.toWalletId,
      linkedTransactionId: targetId,
      updatedAt: now,
    });

    await ctx.db.patch(targetId, {
      direction: "income",
      transactionType: "transfer",
      amount,
      description: toDescription,
      date: args.date,
      walletId: args.toWalletId,
      notes: args.notes,
      categoryId: undefined,
      vendorId: undefined,
      receiptStorageId: undefined,
      splitBill: undefined,
      installmentCount: undefined,
      installmentRate: 0,
      transferGroupId: groupId,
      transferPeerWalletId: args.fromWalletId,
      linkedTransactionId: sourceId,
      updatedAt: now,
    });
  },
});

export const getTransactionSummary = query({
  args: { period: v.string(), walletId: v.optional(v.id("wallets")) },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    const { start, end } = monthRange(args.period);

    let transactions;
    if (args.walletId) {
      const hasAccess = await hasWalletAccess(ctx, profile._id, args.walletId);
      if (!hasAccess) throw new ConvexError("Wallet tidak valid");
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_wallet", (q) => q.eq("walletId", args.walletId))
        .filter((q) => q.and(q.gte(q.field("date"), start), q.lt(q.field("date"), end)))
        .collect();
    } else {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_submitted_by", (q) => q.eq("submittedBy", profile._id))
        .filter((q) => q.and(q.gte(q.field("date"), start), q.lt(q.field("date"), end)))
        .collect();
    }

    const expenseTransactions = transactions.filter((item) => item.direction === "expense");
    const incomeTransactions = transactions.filter((item) => item.direction === "income");
    const expenseTotal = expenseTransactions.reduce((sum, item) => sum + item.amount, 0);
    const incomeTotal = incomeTransactions.reduce((sum, item) => sum + item.amount, 0);

    const byCategoryMap = new Map<string, number>();
    for (const transaction of expenseTransactions) {
      if (!transaction.categoryId) continue;
      byCategoryMap.set(transaction.categoryId, (byCategoryMap.get(transaction.categoryId) ?? 0) + transaction.amount);
    }

    const byIncomeCategoryMap = new Map<string, number>();
    for (const transaction of incomeTransactions) {
      if (!transaction.categoryId) continue;
      byIncomeCategoryMap.set(transaction.categoryId, (byIncomeCategoryMap.get(transaction.categoryId) ?? 0) + transaction.amount);
    }

    const byCategory = await Promise.all(
      Array.from(byCategoryMap.entries()).map(async ([categoryId, total]) => {
        const category = await ctx.db.get(categoryId as Id<"categories">);
        return {
          categoryId,
          name: category?.name ?? "Unknown",
          total,
          color: category?.color,
        };
      })
    );

    const byIncomeCategory = await Promise.all(
      Array.from(byIncomeCategoryMap.entries()).map(async ([categoryId, total]) => {
        const category = await ctx.db.get(categoryId as Id<"categories">);
        return {
          categoryId,
          name: category?.name ?? "Unknown",
          total,
          color: category?.color,
        };
      })
    );

    return {
      count: transactions.length,
      expenseCount: expenseTransactions.length,
      incomeCount: incomeTransactions.length,
      expenseTotal,
      incomeTotal,
      net: incomeTotal - expenseTotal,
      byCategory,
      byIncomeCategory,
    };
  },
});

export const getInstallmentOverview = query({
  args: { period: v.string(), walletId: v.optional(v.id("wallets")) },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    let transactions;
    if (args.walletId) {
      const hasAccess = await hasWalletAccess(ctx, profile._id, args.walletId);
      if (!hasAccess) throw new ConvexError("Wallet tidak valid");
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_wallet", (q) => q.eq("walletId", args.walletId))
        .order("desc")
        .collect();
    } else {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_submitted_by", (q) => q.eq("submittedBy", profile._id))
        .order("desc")
        .collect();
    }

    const installmentTransactions = transactions.filter(
      (transaction) => transaction.direction === "expense" && (transaction.installmentCount ?? 1) > 1
    );

    const activeInstallments = await Promise.all(
      installmentTransactions.map(async (transaction) => {
        const snapshot = getInstallmentSnapshot(transaction);
        const position = getInstallmentPosition(transaction.date, args.period, snapshot.installmentCount);
        if (!position.isActive) return null;

        const category = transaction.categoryId ? await ctx.db.get(transaction.categoryId) : null;
        const vendor = transaction.vendorId ? await ctx.db.get(transaction.vendorId) : null;

        return {
          ...transaction,
          category,
          vendor,
          ...snapshot,
          installmentNumber: position.installmentNumber,
          remainingInstallments: position.remainingInstallments,
        };
      })
    );

    const history = await Promise.all(
      installmentTransactions.slice(0, 10).map(async (transaction) => {
        const category = transaction.categoryId ? await ctx.db.get(transaction.categoryId) : null;
        const vendor = transaction.vendorId ? await ctx.db.get(transaction.vendorId) : null;
        return {
          ...transaction,
          category,
          vendor,
          ...getInstallmentSnapshot(transaction),
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

export const migrateLegacyData = mutation({
  args: {},
  handler: async (ctx) => {
    const profile = await getCurrentProfile(ctx);

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_submitted_by", (q) => q.eq("submittedBy", profile._id))
      .collect();
    const incomes = await ctx.db
      .query("incomes")
      .withIndex("by_received_by", (q) => q.eq("receivedBy", profile._id))
      .collect();

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
      totalTransactions: migratedExpenses + migratedIncomes,
    };
  },
});

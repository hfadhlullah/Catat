import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentProfile } from "./profile";

const CATEGORY_ICON_MAP: Record<string, string> = {
  "BANK IN/OUT": "🏦",
  RENOVASI: "🏗️",
  PERALATAN: "🛠️",
  OPERASIONAL: "📦",
  GAJI: "💼",
  LISTRIK: "⚡",
  THR: "🎁",
  "BIAYA PEKERJA HARIAN": "👷",
};

const incomeKeywords = ["bank in", "cash in", "investment", "initial investment", "setor", "modal"];
const expenseKeywords = ["bank out", "cash out", "transfer out", "withdraw", "bayar", "payment"];

const importRowValidator = v.object({
  rowNumber: v.number(),
  date: v.string(),
  category: v.string(),
  subCategory: v.string(),
  detail: v.string(),
  quantity: v.optional(v.string()),
  unit: v.optional(v.string()),
  debit: v.optional(v.string()),
  credit: v.optional(v.string()),
  raw: v.string(),
});

function normalizeText(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string | undefined) {
  return normalizeText(value).toLowerCase();
}

function parseMoney(raw: string | undefined) {
  const cleaned = (raw ?? "")
    .replace(/Rp/gi, "")
    .replace(/["'\s]/g, "")
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-." || cleaned === "0") {
    return null;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function buildImportFingerprint(row: {
  date: string;
  category: string;
  subCategory: string;
  detail: string;
  debit?: string;
  credit?: string;
}, walletId: Id<"wallets">, direction: "expense" | "income", amount: number) {
  return [
    "csv-v1",
    String(walletId),
    direction,
    row.date,
    String(amount),
    normalizeKey(row.category),
    normalizeKey(row.subCategory),
    normalizeKey(row.detail),
    String(parseMoney(row.debit) ?? ""),
    String(parseMoney(row.credit) ?? ""),
  ].join("|");
}

function parseDate(raw: string) {
  const value = normalizeText(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date.getTime();
}

function classifyDirection(row: {
  category: string;
  subCategory: string;
  detail: string;
  debit?: string;
  credit?: string;
}) {
  const category = normalizeText(row.category).toUpperCase();
  const combined = `${normalizeText(row.subCategory)} ${normalizeText(row.detail)}`.toLowerCase();
  const debit = parseMoney(row.debit);
  const credit = parseMoney(row.credit);

  const isIncomeText = incomeKeywords.some((keyword) => combined.includes(keyword));
  const isExpenseText = expenseKeywords.some((keyword) => combined.includes(keyword));

  if (isIncomeText && !isExpenseText) return "income" as const;
  if (isExpenseText && !isIncomeText) return "expense" as const;

  if (category === "BANK IN/OUT") {
    if (debit && !credit) return "income" as const;
    if (credit && !debit) return "expense" as const;
  }

  if (credit && !debit) return "expense" as const;
  if (debit && !credit) return "income" as const;
  return null;
}

export const importTransactionsFromCsv = mutation({
  args: {
    rows: v.array(importRowValidator),
    walletId: v.optional(v.id("wallets")),
    newWalletName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    let walletId = args.walletId;
    if (!walletId) {
      const walletName = normalizeText(args.newWalletName);
      if (!walletName) {
        throw new ConvexError("Pilih wallet atau isi nama wallet baru");
      }

      const existingOwned = await ctx.db
        .query("wallets")
        .withIndex("by_created_by", (q) => q.eq("createdBy", profile._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      const found = existingOwned.find((wallet) => wallet.name.toLowerCase() === walletName.toLowerCase());
      walletId = found
        ? found._id
        : await ctx.db.insert("wallets", {
            createdBy: profile._id,
            name: walletName,
            label: walletName,
            logo: undefined,
            initialBalance: 0,
            isActive: true,
            createdAt: Date.now(),
          });
    }

    const wallet = await ctx.db.get(walletId);
    if (!wallet || !wallet.isActive) {
      throw new ConvexError("Wallet tidak valid");
    }

    if (wallet.createdBy !== profile._id) {
      const member = await ctx.db
        .query("walletMembers")
        .withIndex("by_wallet_user", (q) => q.eq("walletId", walletId).eq("userId", profile._id))
        .unique();
      if (!member) {
        throw new ConvexError("Akses wallet tidak valid");
      }
    }

    const existingCategories = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const categoryCache = new Map<string, Id<"categories">>();
    const subCategoryCache = new Map<string, Id<"categories">>();

    for (const category of existingCategories) {
      if (category.isDefault || category.createdBy === profile._id) {
        const key = normalizeKey(category.name);
        if (!category.parentId) {
          categoryCache.set(key, category._id);
        } else {
          subCategoryCache.set(`${String(category.parentId)}::${key}`, category._id);
        }
      }
    }

    async function ensureCategory(categoryName: string) {
      const name = normalizeText(categoryName);
      if (!name) return null;
      const key = normalizeKey(name);
      const cached = categoryCache.get(key);
      if (cached) return cached;

      const categoryId = await ctx.db.insert("categories", {
        createdBy: profile._id,
        walletId,
        name,
        color: undefined,
        icon: CATEGORY_ICON_MAP[name.toUpperCase()] ?? "🧾",
        directionScope: "both",
        isDefault: false,
        isActive: true,
        createdAt: Date.now(),
      });
      categoryCache.set(key, categoryId);
      return categoryId;
    }

    async function ensureSubCategory(parentId: Id<"categories">, subCategoryName: string) {
      const name = normalizeText(subCategoryName);
      if (!name) return null;
      const key = `${String(parentId)}::${normalizeKey(name)}`;
      const cached = subCategoryCache.get(key);
      if (cached) return cached;

      const subCategoryId = await ctx.db.insert("categories", {
        createdBy: profile._id,
        walletId,
        name,
        color: undefined,
        icon: undefined,
        directionScope: "both",
        isDefault: false,
        isActive: true,
        parentId,
        createdAt: Date.now(),
      });
      subCategoryCache.set(key, subCategoryId);
      return subCategoryId;
    }

    let imported = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    const errors: Array<{ rowNumber: number; message: string }> = [];

    for (const row of args.rows) {
      try {
        const date = parseDate(row.date);
        if (!date) {
          throw new ConvexError("Tanggal tidak valid");
        }

        const direction = classifyDirection(row);
        if (!direction) {
          throw new ConvexError("Arah transaksi ambigu");
        }

        const amount = direction === "income" ? parseMoney(row.debit) : parseMoney(row.credit);
        if (!amount) {
          throw new ConvexError("Nominal tidak valid");
        }

        const parentCategoryId = await ensureCategory(row.category);
        const subCategoryId = parentCategoryId ? await ensureSubCategory(parentCategoryId, row.subCategory) : null;
        const categoryId = subCategoryId ?? parentCategoryId ?? undefined;
        if (direction === "expense" && !categoryId) {
          throw new ConvexError("Kategori expense tidak valid");
        }

        const description = normalizeText(row.detail) || `${normalizeText(row.category)} ${normalizeText(row.subCategory)}`.trim() || "Imported transaction";
        const importFingerprint = buildImportFingerprint(row, walletId, direction, amount);
        const existing = await ctx.db
          .query("transactions")
          .withIndex("by_import_fingerprint", (q) => q.eq("importFingerprint", importFingerprint))
          .unique();

        if (existing) {
          if (existing.submittedBy !== profile._id) {
            throw new ConvexError("Transaksi import milik user lain");
          }

          await ctx.db.patch(existing._id, {
            direction,
            transactionType: "default",
            amount,
            description,
            date,
            categoryId,
            walletId,
            submittedBy: profile._id,
            notes: row.raw,
            importSource: "csv",
            importFingerprint,
            updatedAt: Date.now(),
          });
        } else {
          await ctx.db.insert("transactions", {
            direction,
            transactionType: "default",
            amount,
            description,
            date,
            categoryId,
            walletId,
            submittedBy: profile._id,
            notes: row.raw,
            importSource: "csv",
            importFingerprint,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        imported += 1;
        if (direction === "income") incomeCount += 1;
        else expenseCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal mengimpor baris";
        errors.push({ rowNumber: row.rowNumber, message });
      }
    }

    return {
      imported,
      incomeCount,
      expenseCount,
      skippedCount: errors.length,
      errors: errors.slice(0, 50),
      walletId,
    };
  },
});

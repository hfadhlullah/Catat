import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { getAccessibleProfileIds } from "./profile";
import type { Id } from "./_generated/dataModel";

const DEFAULT_CATEGORIES = [
  { name: "Dining", icon: "🍽️", color: "#cbd5e1", directionScope: "expense" as const },
  { name: "Groceries", icon: "🛒", color: "#bbf7d0", directionScope: "expense" as const },
  { name: "Shopping", icon: "🛍️", color: "#f9a8d4", directionScope: "expense" as const },
  { name: "Transit", icon: "🚆", color: "#fde68a", directionScope: "expense" as const },
  { name: "Entertainment", icon: "🍿", color: "#93c5fd", directionScope: "expense" as const },
  { name: "Bills & Fees", icon: "💵", color: "#a7f3d0", directionScope: "expense" as const },
  { name: "Gifts", icon: "🎁", color: "#fca5a5", directionScope: "expense" as const },
  { name: "Beauty", icon: "🌼", color: "#d8b4fe", directionScope: "expense" as const },
  { name: "Work", icon: "💼", color: "#d6d3d1", directionScope: "expense" as const },
  { name: "Travel", icon: "✈️", color: "#bfdbfe", directionScope: "expense" as const },
  { name: "Income", icon: "👑", color: "#c4b5fd", directionScope: "income" as const },
];

async function ensureDefaultCategoriesInternal(ctx: MutationCtx) {
  const existing = await ctx.db
    .query("categories")
    .filter((q) => q.eq(q.field("isDefault"), true))
    .collect();

  const existingNames = new Set(existing.map((category: { name: string }) => category.name.toLowerCase()));

  for (const category of DEFAULT_CATEGORIES) {
    if (existingNames.has(category.name.toLowerCase())) continue;
    await ctx.db.insert("categories", {
      createdBy: undefined,
      walletId: undefined,
      name: category.name,
      color: category.color,
      icon: category.icon,
      directionScope: category.directionScope,
      isDefault: true,
      isActive: true,
      createdAt: Date.now(),
    });
  }
}

async function hasWalletAccess(ctx: MutationCtx | QueryCtx, profileId: Id<"userProfiles">, walletId: Id<"wallets">) {
  const wallet = await ctx.db.get(walletId);
  if (!wallet || !wallet.isActive) return false;
  if (wallet.createdBy === profileId) return true;

  const member = await ctx.db
    .query("walletMembers")
    .withIndex("by_wallet_user", (q) => q.eq("walletId", walletId).eq("userId", profileId))
    .unique();

  return !!member;
}

export const listCategories = query({
  args: { walletId: v.optional(v.id("wallets")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    if (args.walletId) {
      const canAccess = await hasWalletAccess(ctx, profile._id, args.walletId);
      if (!canAccess) throw new ConvexError("Wallet tidak valid");
    }

    const accessibleIds = await getAccessibleProfileIds(ctx, profile._id);

    const all = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return all.filter((cat) => {
      if (cat.isDefault) return true;
      if (!accessibleIds.includes(cat.createdBy as string)) return false;
      return cat.walletId === args.walletId;
    });
  },
});

export const ensureDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthenticated");
    await ensureDefaultCategoriesInternal(ctx);
    return true;
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    walletId: v.id("wallets"),
    parentId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    const canAccess = await hasWalletAccess(ctx, profile._id, args.walletId);
    if (!canAccess) throw new ConvexError("Wallet tidak valid");

    const name = args.name.trim();
    if (!name) throw new ConvexError("Nama kategori wajib diisi");

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || !parent.isActive || parent.walletId !== args.walletId) {
        throw new ConvexError("Kategori utama tidak ditemukan");
      }
    }

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_wallet", (q) => q.eq("walletId", args.walletId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (
      existing.some(
        (category) =>
          category.name.toLowerCase() === name.toLowerCase() &&
          category.parentId === args.parentId &&
          category.createdBy === profile._id
      )
    ) {
      throw new ConvexError("Kategori sudah ada");
    }

    return await ctx.db.insert("categories", {
      createdBy: profile._id,
      walletId: args.walletId,
      name,
      color: args.color,
      icon: args.icon,
      directionScope: "both",
      isDefault: false,
      isActive: true,
      parentId: args.parentId,
      createdAt: Date.now(),
    });
  },
});

export const listSubCategories = query({
  args: { parentId: v.id("categories"), walletId: v.optional(v.id("wallets")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    if (args.walletId) {
      const canAccess = await hasWalletAccess(ctx, profile._id, args.walletId);
      if (!canAccess) throw new ConvexError("Wallet tidak valid");
    }

    const accessibleIds = await getAccessibleProfileIds(ctx, profile._id);

    const all = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return all.filter((cat) => {
      if (cat.isDefault) return true;
      if (!accessibleIds.includes(cat.createdBy as string)) return false;
      return cat.walletId === args.walletId;
    });
  },
});

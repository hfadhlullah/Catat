import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  userProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    bio: v.optional(v.string()),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin")),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_email", ["email"]),

  categories: defineTable({
    createdBy: v.optional(v.id("userProfiles")),
    name: v.string(),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_created_by", ["createdBy"]),

  vendors: defineTable({
    createdBy: v.optional(v.id("userProfiles")),
    name: v.string(),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_created_by", ["createdBy"])
    .index("by_name", ["name"]),

  wallets: defineTable({
    createdBy: v.id("userProfiles"),
    name: v.string(),
    label: v.optional(v.string()),
    logo: v.optional(v.string()),
    initialBalance: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_created_by", ["createdBy"])
    .index("by_name", ["name"]),

  incomes: defineTable({
    walletId: v.id("wallets"),
    amount: v.number(),
    description: v.string(),
    date: v.number(),
    notes: v.optional(v.string()),
    receivedBy: v.id("userProfiles"),
    createdAt: v.number(),
  })
    .index("by_wallet", ["walletId"])
    .index("by_received_by", ["receivedBy"])
    .index("by_date", ["date"]),

  expenses: defineTable({
    amount: v.number(),
    installmentCount: v.optional(v.number()),
    installmentRate: v.optional(v.number()),
    description: v.string(),
    date: v.number(),
    categoryId: v.id("categories"),
    walletId: v.optional(v.id("wallets")),
    vendorId: v.optional(v.id("vendors")),
    submittedBy: v.id("userProfiles"),
    receiptStorageId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_category", ["categoryId"])
    .index("by_vendor", ["vendorId"])
    .index("by_submitted_by", ["submittedBy"])
    .index("by_wallet", ["walletId"]),

  uploadedReceipts: defineTable({
    storageId: v.id("_storage"),
    ownerProfileId: v.id("userProfiles"),
    attachedExpenseId: v.optional(v.id("expenses")),
    createdAt: v.number(),
  })
    .index("by_storage", ["storageId"])
    .index("by_owner", ["ownerProfileId"]),

  budgets: defineTable({
    categoryId: v.id("categories"),
    amount: v.number(),
    period: v.string(),
    createdBy: v.id("userProfiles"),
    createdAt: v.number(),
  })
    .index("by_period", ["period"])
    .index("by_category_period", ["categoryId", "period"]),

  walletBudgets: defineTable({
    walletId: v.id("wallets"),
    amount: v.number(),
    period: v.string(),
    createdBy: v.id("userProfiles"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_wallet_period", ["walletId", "period"])
    .index("by_created_by", ["createdBy"])
    .index("by_period", ["period"]),

  walletMembers: defineTable({
    walletId: v.id("wallets"),
    userId: v.id("userProfiles"),
    role: v.union(v.literal("owner"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_wallet", ["walletId"])
    .index("by_user", ["userId"])
    .index("by_wallet_user", ["walletId", "userId"]),

  walletInvites: defineTable({
    walletId: v.id("wallets"),
    fromUserId: v.id("userProfiles"),
    toUserId: v.id("userProfiles"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
    createdAt: v.number(),
  })
    .index("by_to_user", ["toUserId"])
    .index("by_wallet", ["walletId"])
    .index("by_to_user_status", ["toUserId", "status"])
    .index("by_wallet_to_user", ["walletId", "toUserId"]),
});

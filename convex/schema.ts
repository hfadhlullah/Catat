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
    name: v.string(),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  expenses: defineTable({
    amount: v.number(),
    description: v.string(),
    date: v.number(),
    categoryId: v.id("categories"),
    vendorId: v.optional(v.id("vendors")),
    submittedBy: v.id("userProfiles"),
    receiptStorageId: v.id("_storage"),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_category", ["categoryId"])
    .index("by_vendor", ["vendorId"])
    .index("by_submitted_by", ["submittedBy"]),

  budgets: defineTable({
    categoryId: v.id("categories"),
    amount: v.number(),
    period: v.string(),
    createdBy: v.id("userProfiles"),
    createdAt: v.number(),
  })
    .index("by_period", ["period"])
    .index("by_category_period", ["categoryId", "period"]),
});

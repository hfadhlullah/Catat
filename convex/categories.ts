import { mutation, query } from "./_generated/server";

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const seedDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("categories").collect();
    if (existing.length > 0) return;

    const defaults = [
      { name: "Material", color: "#3b82f6", icon: "🧱" },
      { name: "Upah", color: "#10b981", icon: "👷" },
      { name: "Sewa Alat", color: "#f59e0b", icon: "🔧" },
      { name: "Transportasi", color: "#8b5cf6", icon: "🚛" },
      { name: "Administrasi", color: "#6b7280", icon: "📋" },
      { name: "Lain-lain", color: "#ef4444", icon: "📦" },
    ];

    for (const cat of defaults) {
      await ctx.db.insert("categories", {
        ...cat,
        isActive: true,
        createdAt: Date.now(),
      });
    }
  },
});

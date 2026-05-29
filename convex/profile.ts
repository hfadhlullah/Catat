import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

import type { MutationCtx, QueryCtx } from "./_generated/server";

export async function getCurrentProfile(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Unauthenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (!profile) throw new ConvexError("Profile not found");
  return profile;
}

export async function getAccessibleProfileIds(ctx: QueryCtx | MutationCtx, profileId: Id<"userProfiles">) {
  const ids = new Set<string>([profileId]);

  // Members of wallets I own
  const ownedWallets = await ctx.db
    .query("wallets")
    .withIndex("by_created_by", (q) => q.eq("createdBy", profileId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  for (const wallet of ownedWallets) {
    const members = await ctx.db
      .query("walletMembers")
      .withIndex("by_wallet", (q) => q.eq("walletId", wallet._id))
      .collect();
    for (const member of members) {
      ids.add(member.userId);
    }
  }

  // Owners of wallets I joined
  const memberships = await ctx.db
    .query("walletMembers")
    .withIndex("by_user", (q) => q.eq("userId", profileId))
    .collect();

  for (const membership of memberships) {
    const wallet = await ctx.db.get(membership.walletId);
    if (wallet && wallet.isActive) {
      ids.add(wallet.createdBy);
    }
  }

  return Array.from(ids);
}

export const getCurrentProfileQuery = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentProfile(ctx);
  },
});

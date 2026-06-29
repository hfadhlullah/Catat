import { action, internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Scrypt } from "lucia";
import { internal } from "./_generated/api";

export const setPasswordHash = internalMutation({
  args: { email: v.string(), hash: v.string() },
  handler: async (ctx, { email, hash }): Promise<{ found: boolean }> => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .unique();

    if (!account) return { found: false };
    await ctx.db.patch(account._id, { secret: hash });
    return { found: true };
  },
});

export const updatePassword = action({
  args: { email: v.string(), newPassword: v.string() },
  handler: async (ctx, { email, newPassword }): Promise<{ found: boolean }> => {
    const hash = await new Scrypt().hash(newPassword);
    return await ctx.runMutation(internal.debugAuth.setPasswordHash, { email, hash });
  },
});

export const resetAuthForEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const users = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .collect();

    const directPasswordAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .collect();

    const userIds = new Set(users.map((user) => user._id));
    for (const account of directPasswordAccounts) {
      userIds.add(account.userId);
    }

    const deleted = {
      verificationCodes: 0,
      refreshTokens: 0,
      sessions: 0,
      accounts: 0,
      userProfiles: 0,
      users: 0,
    };

    for (const userId of userIds) {
      const profiles = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const profile of profiles) {
        await ctx.db.delete(profile._id);
        deleted.userProfiles += 1;
      }

      const sessions = await ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect();
      for (const session of sessions) {
        const refreshTokens = await ctx.db
          .query("authRefreshTokens")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
          .collect();
        for (const refreshToken of refreshTokens) {
          await ctx.db.delete(refreshToken._id);
          deleted.refreshTokens += 1;
        }
        await ctx.db.delete(session._id);
        deleted.sessions += 1;
      }

      const accounts = await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
        .collect();
      for (const account of accounts) {
        const verificationCodes = await ctx.db
          .query("authVerificationCodes")
          .withIndex("accountId", (q) => q.eq("accountId", account._id))
          .collect();
        for (const code of verificationCodes) {
          await ctx.db.delete(code._id);
          deleted.verificationCodes += 1;
        }
        await ctx.db.delete(account._id);
        deleted.accounts += 1;
      }

      const user = await ctx.db.get(userId);
      if (user !== null) {
        await ctx.db.delete(userId);
        deleted.users += 1;
      }
    }

    for (const account of directPasswordAccounts) {
      const verificationCodes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      for (const code of verificationCodes) {
        await ctx.db.delete(code._id);
        deleted.verificationCodes += 1;
      }
      const stillExists = await ctx.db.get(account._id);
      if (stillExists !== null) {
        await ctx.db.delete(account._id);
        deleted.accounts += 1;
      }
    }

    return deleted;
  },
});

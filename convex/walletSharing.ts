import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { getCurrentProfile } from "./profile";

export const inviteMember = mutation({
  args: {
    walletId: v.id("wallets"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    const wallet = await ctx.db.get(args.walletId);
    if (!wallet || !wallet.isActive) {
      throw new ConvexError("Wallet tidak valid");
    }
    if (wallet.createdBy !== profile._id) {
      throw new ConvexError("Hanya pemilik wallet yang dapat mengundang");
    }

    const email = args.email.trim().toLowerCase();
    if (!email) throw new ConvexError("Email wajib diisi");
    if (email === profile.email.toLowerCase()) {
      throw new ConvexError("Tidak dapat mengundang diri sendiri");
    }

    const invitee = await ctx.db
      .query("userProfiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!invitee) {
      throw new ConvexError("Pengguna dengan email tersebut tidak ditemukan");
    }

    const existingMember = await ctx.db
      .query("walletMembers")
      .withIndex("by_wallet_user", (q) => q.eq("walletId", args.walletId).eq("userId", invitee._id))
      .unique();

    if (existingMember) {
      throw new ConvexError("Pengguna sudah menjadi anggota wallet ini");
    }

    const existingInvite = await ctx.db
      .query("walletInvites")
      .withIndex("by_wallet_to_user", (q) => q.eq("walletId", args.walletId).eq("toUserId", invitee._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .unique();

    if (existingInvite) {
      throw new ConvexError("Undangan sudah dikirim sebelumnya");
    }

    return await ctx.db.insert("walletInvites", {
      walletId: args.walletId,
      fromUserId: profile._id,
      toUserId: invitee._id,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const acceptInvite = mutation({
  args: { inviteId: v.id("walletInvites") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.status !== "pending") {
      throw new ConvexError("Undangan tidak valid");
    }
    if (invite.toUserId !== profile._id) {
      throw new ConvexError("Unauthorized");
    }

    await ctx.db.patch(args.inviteId, { status: "accepted" });

    await ctx.db.insert("walletMembers", {
      walletId: invite.walletId,
      userId: profile._id,
      role: "member",
      joinedAt: Date.now(),
    });

    return invite.walletId;
  },
});

export const rejectInvite = mutation({
  args: { inviteId: v.id("walletInvites") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.status !== "pending") {
      throw new ConvexError("Undangan tidak valid");
    }
    if (invite.toUserId !== profile._id) {
      throw new ConvexError("Unauthorized");
    }

    await ctx.db.patch(args.inviteId, { status: "rejected" });
  },
});

export const listPendingInvites = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getCurrentProfile(ctx);

    const invites = await ctx.db
      .query("walletInvites")
      .withIndex("by_to_user_status", (q) => q.eq("toUserId", profile._id).eq("status", "pending"))
      .collect();

    return await Promise.all(
      invites.map(async (invite) => {
        const wallet = await ctx.db.get(invite.walletId);
        const fromUser = await ctx.db.get(invite.fromUserId);
        return {
          ...invite,
          wallet: wallet ? { _id: wallet._id, name: wallet.name, label: wallet.label, logo: wallet.logo } : null,
          fromUser: fromUser ? { _id: fromUser._id, name: fromUser.name, email: fromUser.email } : null,
        };
      })
    );
  },
});

export const listMembers = query({
  args: { walletId: v.id("wallets") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    const wallet = await ctx.db.get(args.walletId);
    if (!wallet || !wallet.isActive) {
      throw new ConvexError("Wallet tidak valid");
    }

    const isOwner = wallet.createdBy === profile._id;
    const isMember = await ctx.db
      .query("walletMembers")
      .withIndex("by_wallet_user", (q) => q.eq("walletId", args.walletId).eq("userId", profile._id))
      .unique();

    if (!isOwner && !isMember) {
      throw new ConvexError("Unauthorized");
    }

    const members = await ctx.db
      .query("walletMembers")
      .withIndex("by_wallet", (q) => q.eq("walletId", args.walletId))
      .collect();

    const ownerProfile = await ctx.db.get(wallet.createdBy);

    const result = [
      {
        userId: wallet.createdBy,
        role: "owner" as const,
        name: ownerProfile?.name ?? "Pemilik",
        email: ownerProfile?.email ?? "",
        joinedAt: wallet.createdAt,
      },
      ...(await Promise.all(
        members.map(async (member) => {
          const user = await ctx.db.get(member.userId);
          return {
            userId: member.userId,
            role: member.role,
            name: user?.name ?? "Anggota",
            email: user?.email ?? "",
            joinedAt: member.joinedAt,
          };
        })
      )),
    ];

    return result;
  },
});

export const listMyFamilyMembers = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getCurrentProfile(ctx);

    const familyMap = new Map<string, {
      userId: string;
      name: string;
      email: string;
      wallets: Array<{ _id: string; name: string; label?: string }>;
    }>();

    // People I invited (members of my wallets)
    const ownedWallets = await ctx.db
      .query("wallets")
      .withIndex("by_created_by", (q) => q.eq("createdBy", profile._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const wallet of ownedWallets) {
      const members = await ctx.db
        .query("walletMembers")
        .withIndex("by_wallet", (q) => q.eq("walletId", wallet._id))
        .collect();

      for (const member of members) {
        const user = await ctx.db.get(member.userId);
        if (!user) continue;

        const existing = familyMap.get(member.userId);
        if (existing) {
          existing.wallets.push({
            _id: wallet._id,
            name: wallet.name,
            label: wallet.label,
          });
        } else {
          familyMap.set(member.userId, {
            userId: member.userId,
            name: user.name,
            email: user.email,
            wallets: [{
              _id: wallet._id,
              name: wallet.name,
              label: wallet.label,
            }],
          });
        }
      }
    }

    // People who invited me (owners of wallets I joined)
    const myMemberships = await ctx.db
      .query("walletMembers")
      .withIndex("by_user", (q) => q.eq("userId", profile._id))
      .collect();

    for (const membership of myMemberships) {
      const wallet = await ctx.db.get(membership.walletId);
      if (!wallet || !wallet.isActive) continue;

      const owner = await ctx.db.get(wallet.createdBy);
      if (!owner) continue;
      if (owner._id === profile._id) continue;

      const existing = familyMap.get(owner._id);
      if (existing) {
        existing.wallets.push({
          _id: wallet._id,
          name: wallet.name,
          label: wallet.label,
        });
      } else {
        familyMap.set(owner._id, {
          userId: owner._id,
          name: owner.name,
          email: owner.email,
          wallets: [{
            _id: wallet._id,
            name: wallet.name,
            label: wallet.label,
          }],
        });
      }
    }

    return Array.from(familyMap.values());
  },
});

export const grantAccess = mutation({
  args: {
    walletId: v.id("wallets"),
    memberUserId: v.id("userProfiles"),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    const wallet = await ctx.db.get(args.walletId);
    if (!wallet || !wallet.isActive) {
      throw new ConvexError("Wallet tidak valid");
    }
    if (wallet.createdBy !== profile._id) {
      throw new ConvexError("Unauthorized");
    }
    if (args.memberUserId === profile._id) {
      throw new ConvexError("Tidak dapat memberikan akses ke diri sendiri");
    }

    const existing = await ctx.db
      .query("walletMembers")
      .withIndex("by_wallet_user", (q) => q.eq("walletId", args.walletId).eq("userId", args.memberUserId))
      .unique();

    if (existing) return;

    await ctx.db.insert("walletMembers", {
      walletId: args.walletId,
      userId: args.memberUserId,
      role: "member",
      joinedAt: Date.now(),
    });
  },
});

export const removeMember = mutation({
  args: {
    walletId: v.id("wallets"),
    memberUserId: v.id("userProfiles"),
  },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);

    const wallet = await ctx.db.get(args.walletId);
    if (!wallet || !wallet.isActive) {
      throw new ConvexError("Wallet tidak valid");
    }
    if (wallet.createdBy !== profile._id) {
      throw new ConvexError("Hanya pemilik wallet yang dapat mengeluarkan anggota");
    }
    if (args.memberUserId === profile._id) {
      throw new ConvexError("Tidak dapat mengeluarkan diri sendiri");
    }

    const member = await ctx.db
      .query("walletMembers")
      .withIndex("by_wallet_user", (q) => q.eq("walletId", args.walletId).eq("userId", args.memberUserId))
      .unique();

    if (!member) {
      throw new ConvexError("Anggota tidak ditemukan");
    }

    await ctx.db.delete(member._id);
  },
});

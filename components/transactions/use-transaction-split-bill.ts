import { useState } from "react";

import {
  getEqualSplitValues,
  type DisplaySplitParticipant,
  type SplitMode,
  type SplitParticipant,
} from "./transaction-helpers";

type WalletMember = {
  userId: string;
  name: string;
};

type CurrentProfile = {
  _id: string;
};

type InitialSplitBill = {
  enabled: boolean;
  mode: SplitMode;
  participants: Array<{
    userId?: string;
    name: string;
    amount: number;
    isPaid?: boolean;
    paidAt?: number;
  }>;
};

export function useTransactionSplitBill() {
  const [splitBillEnabled, setSplitBillEnabled] = useState(false);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [splitParticipants, setSplitParticipants] = useState<SplitParticipant[]>([]);
  const [customSplitName, setCustomSplitName] = useState("");

  function setInitialSplitBill(splitBill?: InitialSplitBill) {
    setSplitBillEnabled(splitBill?.enabled ?? false);
    setSplitMode(splitBill?.mode ?? "equal");
    setSplitParticipants(
      (splitBill?.participants ?? []).map((participant) => ({
        id: participant.userId ? `member:${participant.userId}` : `custom:${participant.name.trim().toLowerCase()}`,
        userId: participant.userId,
        name: participant.name,
        amount: participant.amount,
        isPaid: Boolean(participant.isPaid),
        paidAt: participant.paidAt,
      }))
    );
  }

  function clearWalletMembersFromSplit() {
    setSplitParticipants((current) => current.filter((participant) => !participant.userId));
  }

  function toggleSplitParticipant(member: WalletMember) {
    setSplitParticipants((current) => {
      const memberId = `member:${member.userId}`;
      const exists = current.some((participant) => participant.id === memberId);
      if (exists) {
        return current.filter((participant) => participant.id !== memberId);
      }
      return [...current, { id: memberId, userId: member.userId, name: member.name, amount: 0, isPaid: false }];
    });
  }

  function addCustomSplitParticipant() {
    const name = customSplitName.trim();
    if (!name) return;
    const id = `custom:${name.toLowerCase()}`;
    setSplitParticipants((current) => {
      if (current.some((participant) => participant.id === id)) return current;
      return [...current, { id, name, amount: 0, isPaid: false }];
    });
    setCustomSplitName("");
  }

  function updateSplitParticipant(id: string, updates: Partial<SplitParticipant>) {
    setSplitParticipants((current) =>
      current.map((participant) => {
        if (participant.id !== id) return participant;
        const nextIsPaid = updates.isPaid ?? participant.isPaid;
        return {
          ...participant,
          ...updates,
          isPaid: nextIsPaid,
          paidAt: nextIsPaid ? (updates.paidAt ?? participant.paidAt ?? Date.now()) : undefined,
        };
      })
    );
  }

  function removeSplitParticipant(id: string) {
    setSplitParticipants((current) => current.filter((participant) => participant.id !== id));
  }

  function ensureCurrentProfileParticipant(currentProfile: CurrentProfile | null | undefined, walletMembers: WalletMember[] | null | undefined) {
    setSplitBillEnabled((currentEnabled) => {
      const nextEnabled = !currentEnabled;
      if (nextEnabled && splitParticipants.length === 0 && currentProfile && walletMembers) {
        const self = walletMembers.find((member) => member.userId === currentProfile._id);
        if (self) {
          setSplitParticipants([{ id: `member:${self.userId}`, userId: self.userId, name: self.name, amount: 0, isPaid: false }]);
        }
      }
      return nextEnabled;
    });
  }

  function getDerivedValues(amountValue: number, splitMembers: WalletMember[]): {
    splitParticipantCount: number;
    equalPreviewBase: number;
    equalPreviewRemainder: number;
    customSplitRemaining: number;
    splitPaidCount: number;
    displaySplitParticipants: DisplaySplitParticipant[];
  } {
    const splitMemberNameMap = new Map(splitMembers.map((member) => [String(member.userId), member.name]));
    const splitParticipantCount = splitParticipants.length;
    const { base: equalPreviewBase, remainder: equalPreviewRemainder } = getEqualSplitValues(amountValue, splitParticipantCount);
    const customSplitTotal = splitParticipants.reduce((sum, participant) => sum + participant.amount, 0);
    const customSplitRemaining = amountValue - customSplitTotal;
    const splitPaidCount = splitParticipants.filter((participant) => participant.isPaid).length;
    const displaySplitParticipants = splitParticipants.map((participant) => ({
      ...participant,
      name: participant.userId ? (splitMemberNameMap.get(participant.userId) ?? participant.name) : participant.name,
    }));

    return {
      splitParticipantCount,
      equalPreviewBase,
      equalPreviewRemainder,
      customSplitRemaining,
      splitPaidCount,
      displaySplitParticipants,
    };
  }

  return {
    splitBillEnabled,
    setSplitBillEnabled,
    splitMode,
    setSplitMode,
    splitParticipants,
    customSplitName,
    setCustomSplitName,
    setInitialSplitBill,
    clearWalletMembersFromSplit,
    toggleSplitParticipant,
    addCustomSplitParticipant,
    updateSplitParticipant,
    removeSplitParticipant,
    ensureCurrentProfileParticipant,
    getDerivedValues,
  };
}

import {
  groups,
  groupMembers,
  transactions,
  transactionSplits,
  groupInvites,
  userProfiles,
  type Group,
  type InsertGroup,
  type Transaction,
  type InsertTransaction,
  type GroupMember,
  type InsertGroupMember,
  type TransactionSplit,
  type InsertTransactionSplit,
  type GroupInvite,
  type InsertGroupInvite,
  type UserProfile,
  type InsertUserProfile,
  type TransactionWithSplits,
  type GroupWithMembers,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, like, ilike, or, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // Group operations
  createGroup(group: InsertGroup): Promise<Group>;
  getAllGroups(): Promise<GroupWithMembers[]>;
  getGroupById(id: string): Promise<GroupWithMembers | undefined>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  removeGroupMember(groupId: string, memberName: string): Promise<void>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getAllTransactions(filters?: {
    groupId?: string;
    type?: 'expense' | 'income';
    category?: string;
    paidBy?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    onlyUser?: boolean;
    onlyGroupMembers?: boolean;
  }): Promise<TransactionWithSplits[]>;
  updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  
  // Transaction split operations
  createTransactionSplits(splits: InsertTransactionSplit[]): Promise<TransactionSplit[]>;
  updateTransactionSplit(id: string, updates: Partial<InsertTransactionSplit>): Promise<TransactionSplit>;
  
  // Statistics
  getMonthlyStats(year: number, month: number): Promise<{
    totalIncome: string;
    totalExpenses: string;
    netBalance: string;
  }>;
  
  getGroupBalances(groupId: string): Promise<{
    totalShared: string;
    balances: { [memberName: string]: string };
  }>;

  // Group invite operations
  createGroupInvite(invite: InsertGroupInvite): Promise<GroupInvite>;
  getGroupInvite(inviteCode: string): Promise<GroupInvite | undefined>;
  useGroupInvite(inviteCode: string, memberName: string, memberEmail?: string): Promise<{ group: GroupWithMembers; member: GroupMember } | null>;
  getGroupInvites(groupId: string): Promise<GroupInvite[]>;
  deactivateGroupInvite(inviteId: string): Promise<void>;

  // User profile operations
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  getUserProfile(id: string): Promise<UserProfile | undefined>;
  getUserProfileByName(publicName: string): Promise<UserProfile | undefined>;
  updateUserProfile(id: string, updates: Partial<InsertUserProfile>): Promise<UserProfile>;
  deleteUserProfile(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Group operations
  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    return newGroup;
  }

  async getAllGroups(): Promise<GroupWithMembers[]> {
    const result = await db
      .select({
        group: groups,
        memberCount: sql<number>`count(distinct ${groupMembers.id})`,
      })
      .from(groups)
      .leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .groupBy(groups.id)
      .orderBy(desc(groups.createdAt));

    const groupsWithMembers = await Promise.all(
      result.map(async ({ group, memberCount }) => {
        const members = await db
          .select()
          .from(groupMembers)
          .where(eq(groupMembers.groupId, group.id));

        return {
          ...group,
          members,
          memberCount: Number(memberCount) || 0,
        };
      })
    );

    return groupsWithMembers;
  }

  async getGroupById(id: string): Promise<GroupWithMembers | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    if (!group) return undefined;

    const members = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, id));

    return {
      ...group,
      members,
      memberCount: members.length,
    };
  }

  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const [newMember] = await db.insert(groupMembers).values(member).returning();
    return newMember;
  }

  async removeGroupMember(groupId: string, memberName: string): Promise<void> {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.name, memberName)));
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getAllTransactions(
    filters: {
      groupId?: string;
      type?: 'expense' | 'income';
      category?: string;
      paidBy?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      onlyUser?: boolean;
      onlyGroupMembers?: boolean;
    } = {}
  ): Promise<TransactionWithSplits[]> {
    const conditions = [];

    if (filters.groupId) {
      conditions.push(eq(transactions.groupId, filters.groupId));
    }

    if (filters.type) {
      conditions.push(eq(transactions.type, filters.type));
    }

    if (filters.category) {
      conditions.push(eq(transactions.category, filters.category));
    }

    if (filters.paidBy) {
      conditions.push(eq(transactions.paidBy, filters.paidBy));
    }

    if (filters.startDate) {
      conditions.push(gte(transactions.date, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(transactions.date, filters.endDate));
    }

    if (filters.search) {
      conditions.push(
        or(
          ilike(transactions.description, `%${filters.search}%`),
          ilike(transactions.paidBy, `%${filters.search}%`)
        )!
      );
    }

    // Note: onlyUser and onlyGroupMembers filtering handled at route level

    const query = conditions.length > 0 
      ? db.select().from(transactions).where(and(...conditions))
      : db.select().from(transactions);

    const result = await query.orderBy(desc(transactions.date));

    // Get splits for each transaction
    const transactionsWithSplits = await Promise.all(
      result.map(async (transaction) => {
        const splits = await db
          .select()
          .from(transactionSplits)
          .where(eq(transactionSplits.transactionId, transaction.id));

        return {
          ...transaction,
          splits,
        };
      })
    );

    return transactionsWithSplits;
  }

  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction> {
    const [updated] = await db
      .update(transactions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))
      .returning();
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  // Transaction split operations
  async createTransactionSplits(splits: InsertTransactionSplit[]): Promise<TransactionSplit[]> {
    const result = await db.insert(transactionSplits).values(splits).returning();
    return result;
  }

  async updateTransactionSplit(id: string, updates: Partial<InsertTransactionSplit>): Promise<TransactionSplit> {
    const [updated] = await db
      .update(transactionSplits)
      .set(updates)
      .where(eq(transactionSplits.id, id))
      .returning();
    return updated;
  }

  // Statistics
  async getMonthlyStats(year: number, month: number): Promise<{
    totalIncome: string;
    totalExpenses: string;
    netBalance: string;
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [incomeResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'income'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );

    const [expenseResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'expense'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );

    const totalIncome = incomeResult?.total || '0';
    const totalExpenses = expenseResult?.total || '0';
    const netBalance = (parseFloat(totalIncome) - parseFloat(totalExpenses)).toFixed(2);

    return {
      totalIncome,
      totalExpenses,
      netBalance,
    };
  }

  async getGroupBalances(groupId: string): Promise<{
    totalShared: string;
    balances: { [memberName: string]: string };
  }> {
    const [sharedResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.groupId, groupId),
          eq(transactions.isShared, true),
          eq(transactions.type, 'expense')
        )
      );

    const totalShared = sharedResult?.total || '0';

    // Get member balances from splits
    const splitResults = await db
      .select({
        memberName: transactionSplits.memberName,
        totalOwed: sql<string>`COALESCE(SUM(${transactionSplits.amount}), 0)`,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.groupId, groupId),
          eq(transactionSplits.isPaid, false)
        )
      )
      .groupBy(transactionSplits.memberName);

    const balances: { [memberName: string]: string } = {};
    splitResults.forEach(({ memberName, totalOwed }) => {
      balances[memberName] = totalOwed;
    });

    return {
      totalShared,
      balances,
    };
  }

  // Group invite operations
  async createGroupInvite(inviteData: InsertGroupInvite): Promise<GroupInvite> {
    const [invite] = await db.insert(groupInvites).values(inviteData).returning();
    return invite;
  }

  async getGroupInvite(inviteCode: string): Promise<GroupInvite | undefined> {
    const [invite] = await db
      .select()
      .from(groupInvites)
      .where(and(
        eq(groupInvites.inviteCode, inviteCode),
        eq(groupInvites.isActive, true)
      ));
    return invite;
  }

  async useGroupInvite(inviteCode: string, memberName: string, memberEmail?: string): Promise<{ group: GroupWithMembers; member: GroupMember } | null> {
    const invite = await this.getGroupInvite(inviteCode);
    
    if (!invite) {
      return null;
    }

    // Check if invite has expired
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return null;
    }

    // Check if invite has reached max uses
    if (invite.maxUses && (invite.currentUses || 0) >= invite.maxUses) {
      return null;
    }

    // Add member to group
    const member = await this.addGroupMember({
      groupId: invite.groupId,
      name: memberName,
      email: memberEmail || null,
    });

    // Increment current uses
    await db
      .update(groupInvites)
      .set({ currentUses: (invite.currentUses || 0) + 1 })
      .where(eq(groupInvites.id, invite.id));

    // Get group with members
    const group = await this.getGroupById(invite.groupId);
    
    return group ? { group, member } : null;
  }

  async getGroupInvites(groupId: string): Promise<GroupInvite[]> {
    return await db
      .select()
      .from(groupInvites)
      .where(eq(groupInvites.groupId, groupId))
      .orderBy(desc(groupInvites.createdAt));
  }

  async deactivateGroupInvite(inviteId: string): Promise<void> {
    await db
      .update(groupInvites)
      .set({ isActive: false })
      .where(eq(groupInvites.id, inviteId));
  }

  // User profile operations
  async createUserProfile(profileData: InsertUserProfile): Promise<UserProfile> {
    const [profile] = await db.insert(userProfiles).values(profileData).returning();
    return profile;
  }

  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, id));
    return profile;
  }

  async getUserProfileByName(publicName: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.publicName, publicName));
    return profile;
  }

  async updateUserProfile(id: string, updates: Partial<InsertUserProfile>): Promise<UserProfile> {
    const [updated] = await db
      .update(userProfiles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteUserProfile(id: string): Promise<void> {
    await db.delete(userProfiles).where(eq(userProfiles.id, id));
  }
}

export const storage = new DatabaseStorage();
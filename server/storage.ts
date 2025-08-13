import {
  users,
  groups,
  groupMembers,
  transactions,
  transactionSplits,
  type User,
  type UpsertUser,
  type Group,
  type InsertGroup,
  type Transaction,
  type InsertTransaction,
  type GroupMember,
  type InsertGroupMember,
  type TransactionSplit,
  type InsertTransactionSplit,
  type TransactionWithSplits,
  type GroupWithMembers,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, like, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Group operations
  createGroup(group: InsertGroup): Promise<Group>;
  getGroupsByUserId(userId: string): Promise<GroupWithMembers[]>;
  getGroupById(id: string): Promise<GroupWithMembers | undefined>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  removeGroupMember(groupId: string, userId: string): Promise<void>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUserId(userId: string, filters?: {
    groupId?: string;
    type?: 'expense' | 'income';
    category?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  }): Promise<TransactionWithSplits[]>;
  updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  
  // Transaction split operations
  createTransactionSplits(splits: InsertTransactionSplit[]): Promise<TransactionSplit[]>;
  updateTransactionSplit(id: string, updates: Partial<InsertTransactionSplit>): Promise<TransactionSplit>;
  
  // Statistics
  getUserMonthlyStats(userId: string, year: number, month: number): Promise<{
    totalIncome: string;
    totalExpenses: string;
    netBalance: string;
  }>;
  
  getGroupBalances(groupId: string, userId: string): Promise<{
    totalShared: string;
    youOwe: string;
    othersOwe: string;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Group operations
  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    
    // Add creator as member
    await this.addGroupMember({
      groupId: newGroup.id,
      userId: group.createdBy,
    });
    
    return newGroup;
  }

  async getGroupsByUserId(userId: string): Promise<GroupWithMembers[]> {
    const result = await db
      .select({
        group: groups,
        memberCount: sql<number>`count(distinct ${groupMembers.userId})`,
      })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId))
      .groupBy(groups.id)
      .orderBy(desc(groups.createdAt));

    const groupsWithStats = await Promise.all(
      result.map(async ({ group, memberCount }) => {
        const balances = await this.getGroupBalances(group.id, userId);
        return {
          ...group,
          memberCount,
          ...balances,
        };
      })
    );

    return groupsWithStats;
  }

  async getGroupById(id: string): Promise<GroupWithMembers | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    if (!group) return undefined;

    const members = await db
      .select({
        groupMember: groupMembers,
        user: users,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, id));

    return {
      ...group,
      members: members.map(({ groupMember, user }) => ({
        ...groupMember,
        user,
      })),
      memberCount: members.length,
    };
  }

  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const [newMember] = await db.insert(groupMembers).values(member).returning();
    return newMember;
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getTransactionsByUserId(
    userId: string,
    filters: {
      groupId?: string;
      type?: 'expense' | 'income';
      category?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
    } = {}
  ): Promise<TransactionWithSplits[]> {
    let query = db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId));

    const conditions = [eq(transactions.userId, userId)];

    if (filters.groupId) {
      conditions.push(eq(transactions.groupId, filters.groupId));
    }

    if (filters.type) {
      conditions.push(eq(transactions.type, filters.type));
    }

    if (filters.category) {
      conditions.push(eq(transactions.category, filters.category));
    }

    if (filters.startDate) {
      conditions.push(gte(transactions.date, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(transactions.date, filters.endDate));
    }

    if (filters.search) {
      conditions.push(like(transactions.description, `%${filters.search}%`));
    }

    const result = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date));

    // Get splits for each transaction
    const transactionsWithSplits = await Promise.all(
      result.map(async (transaction) => {
        if (transaction.isShared) {
          const splits = await db
            .select()
            .from(transactionSplits)
            .where(eq(transactionSplits.transactionId, transaction.id));
          return { ...transaction, splits };
        }
        return { ...transaction, splits: [] };
      })
    );

    return transactionsWithSplits;
  }

  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction> {
    const [updated] = await db
      .update(transactions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  // Transaction split operations
  async createTransactionSplits(splits: InsertTransactionSplit[]): Promise<TransactionSplit[]> {
    const newSplits = await db.insert(transactionSplits).values(splits).returning();
    return newSplits;
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
  async getUserMonthlyStats(userId: string, year: number, month: number): Promise<{
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
          eq(transactions.userId, userId),
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
          eq(transactions.userId, userId),
          eq(transactions.type, 'expense'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );

    const totalIncome = incomeResult.total || '0';
    const totalExpenses = expenseResult.total || '0';
    const netBalance = (parseFloat(totalIncome) - parseFloat(totalExpenses)).toString();

    return {
      totalIncome,
      totalExpenses,
      netBalance,
    };
  }

  async getGroupBalances(groupId: string, userId: string): Promise<{
    totalShared: string;
    youOwe: string;
    othersOwe: string;
  }> {
    // Get total shared expenses in group
    const [totalSharedResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.groupId, groupId),
          eq(transactions.type, 'expense'),
          eq(transactions.isShared, true)
        )
      );

    // Get amount user owes (splits where user is debtor but not paid)
    const [youOweResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactionSplits.amount}), 0)`,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.groupId, groupId),
          eq(transactionSplits.userId, userId),
          eq(transactionSplits.isPaid, false)
        )
      );

    // Get amount others owe user (splits where user paid but others haven't)
    const [othersOweResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactionSplits.amount}), 0)`,
      })
      .from(transactionSplits)
      .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.groupId, groupId),
          eq(transactions.userId, userId),
          eq(transactionSplits.isPaid, false)
        )
      );

    return {
      totalShared: totalSharedResult.total || '0',
      youOwe: youOweResult.total || '0',
      othersOwe: othersOweResult.total || '0',
    };
  }
}

export const storage = new DatabaseStorage();

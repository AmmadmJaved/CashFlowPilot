import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { db } from "./db";
import { userProfiles } from "@shared/schema";
import { insertTransactionSchema, insertGroupSchema, insertGroupMemberSchema, insertGroupInviteSchema, insertUserProfileSchema, type GroupInvite, type UserProfile } from "@shared/schema";
import { z } from "zod";
import jsPDF from "jspdf";
import ExcelJS from "exceljs";
import { setupAuth, isAuthenticated } from "./replitAuth";

// Store connected WebSocket clients
const connectedClients = new Set<WebSocket>();

// Broadcast function to send updates to all connected clients
function broadcastUpdate(event: string, data: any) {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    } else {
      // Remove closed connections
      connectedClients.delete(client);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Public routes (no authentication required)
  app.get('/api/invites/:inviteCode', async (req, res) => {
    try {
      const { inviteCode } = req.params;
      const invite = await storage.getGroupInvite(inviteCode);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // Get group info for the invite
      const group = await storage.getGroupById(invite.groupId);
      
      res.json({
        invite,
        group: group ? { id: group.id, name: group.name, description: group.description } : null,
      });
    } catch (error) {
      console.error("Error fetching invite info:", error);
      res.status(500).json({ message: "Failed to fetch invite info" });
    }
  });

  app.post('/api/invites/:inviteCode/join', async (req, res) => {
    try {
      const { inviteCode } = req.params;
      const { memberName, memberEmail } = req.body;
      
      if (!memberName) {
        return res.status(400).json({ message: "Member name is required" });
      }
      
      const result = await storage.useGroupInvite(inviteCode, memberName, memberEmail);
      
      if (!result) {
        return res.status(400).json({ message: "Invalid or expired invite" });
      }
      
      // Broadcast the member join
      broadcastUpdate('member-joined', { 
        group: result.group, 
        member: result.member,
        joinedViaInvite: true
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error joining group via invite:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });



  // Auth middleware (applies to routes below)
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      
      console.log('Fetching user with ID:', userId, 'Email:', userEmail);
      
      // Try to get user by ID first, then by email
      let user = await storage.getUser(userId);
      if (!user && userEmail) {
        // Try to find by email
        const userByEmail = await storage.getUserByEmail(userEmail);
        if (userByEmail) {
          // Update the user ID to match the Replit user ID
          user = await storage.updateUserId(userByEmail.id, userId);
        }
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get or create user profile
      let profile = await storage.getUserProfileByUserId(user.id);
      if (!profile) {
        // Create default profile for new user
        const displayName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email?.split('@')[0] || 'User';
        profile = await storage.createUserProfile({
          userId: user.id,
          publicName: displayName,
        });
      }
      
      res.json({ ...user, profile });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.post('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = {
        userId,
        ...req.body,
      };
      
      const profile = await storage.createUserProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getUserProfileByUserId(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Update profile route
  app.patch('/api/profile/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileId = req.params.id;
      const profileData = req.body;

      // Verify the profile belongs to the authenticated user
      const existingProfile = await storage.getUserProfileByUserId(userId);
      if (!existingProfile || existingProfile.id !== profileId) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const updatedProfile = await storage.updateUserProfile(profileId, profileData);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Admin middleware to check if user is admin or super_admin
  const isAdmin: RequestHandler = async (req, res, next) => {
    try {
      const userId = (req as any).user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      (req as any).adminUser = user;
      next();
    } catch (error) {
      res.status(403).json({ message: "Admin access required" });
    }
  };

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { page = 1, limit = 50, search, status, role } = req.query;
      const users = await storage.getUsers({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        status,
        role,
      });
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/users/:userId/suspend', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const adminUser = req.adminUser;
      
      await storage.updateUserStatus(userId, 'suspended');
      await storage.logAdminAction({
        adminId: adminUser.id,
        action: 'suspend_user',
        targetUserId: userId,
        details: reason || 'No reason provided',
        ipAddress: req.ip,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error suspending user:", error);
      res.status(500).json({ message: "Failed to suspend user" });
    }
  });

  app.post('/api/admin/users/:userId/activate', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const adminUser = req.adminUser;
      
      await storage.updateUserStatus(userId, 'active');
      await storage.logAdminAction({
        adminId: adminUser.id,
        action: 'activate_user',
        targetUserId: userId,
        details: 'User reactivated',
        ipAddress: req.ip,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error activating user:", error);
      res.status(500).json({ message: "Failed to activate user" });
    }
  });

  app.post('/api/admin/users/:userId/make-admin', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const adminUser = req.adminUser;
      
      // Only super_admin can create new admins
      if (adminUser.role !== 'super_admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }
      
      await storage.updateUserRole(userId, 'admin');
      await storage.logAdminAction({
        adminId: adminUser.id,
        action: 'create_admin',
        targetUserId: userId,
        details: 'User promoted to admin',
        ipAddress: req.ip,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error making user admin:", error);
      res.status(500).json({ message: "Failed to make user admin" });
    }
  });

  app.get('/api/admin/analytics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await storage.getAnalytics(startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get('/api/admin/logs', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const logs = await storage.getAdminLogs({
        page: parseInt(page),
        limit: parseInt(limit),
      });
      res.json(logs);
    } catch (error) {
      console.error("Error fetching admin logs:", error);
      res.status(500).json({ message: "Failed to fetch admin logs" });
    }
  });

  // Transaction routes
  app.get('/api/transactions', isAuthenticated, async (req, res) => {
    try {
      const { groupId, type, category, paidBy, startDate, endDate, search, onlyUser, onlyGroupMembers } = req.query;
      
      const filters: any = {};
      if (groupId) filters.groupId = groupId;
      if (type) filters.type = type;
      if (category) filters.category = category;
      if (paidBy) filters.paidBy = paidBy;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (search) filters.search = search;

      if (onlyUser === 'true') filters.onlyUser = true;
      if (onlyGroupMembers === 'true') filters.onlyGroupMembers = true;

      let transactions = await storage.getAllTransactions(filters);
      
      // Apply client-side filtering for onlyUser and onlyGroupMembers
      // since these require profile/group context not available in storage
      if (filters.onlyUser || filters.onlyGroupMembers) {
        const userId = (req as any).user?.claims?.sub;
        const profile = userId ? await storage.getUserProfileByUserId(userId) : null;
        const allGroups = await storage.getAllGroups();
        const groupMembers = new Set(allGroups.flatMap(g => g.members?.map(m => m.name) || []));
        
        transactions = transactions.filter(transaction => {
          if (filters.onlyUser && transaction.paidBy !== profile?.publicName) {
            return false;
          }
          if (filters.onlyGroupMembers && !groupMembers.has(transaction.paidBy)) {
            return false;
          }
          return true;
        });
      }

      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/transactions', isAuthenticated, async (req, res) => {
    try {
      const data = insertTransactionSchema.parse({
        ...req.body,
        date: new Date(req.body.date),
      });

      const transaction = await storage.createTransaction(data);

      // Broadcast the new transaction to all connected clients
      broadcastUpdate('transaction_created', transaction);

      // If it's a shared expense, create splits
      if (data.isShared && data.groupId) {
        const group = await storage.getGroupById(data.groupId);
        if (group && group.members) {
          const splitAmount = parseFloat(data.amount) / group.members.length;
          const splits = group.members.map(member => ({
            transactionId: transaction.id,
            memberName: member.name,
            amount: splitAmount.toString(),
            isPaid: member.name === data.paidBy, // Creator has already paid
          }));

          await storage.createTransactionSplits(splits);
        }
      }

      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  app.put('/api/transactions/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      if (updates.date) {
        updates.date = new Date(updates.date);
      }

      const transaction = await storage.updateTransaction(id, updates);
      res.json(transaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  app.delete('/api/transactions/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTransaction(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Export routes  
  app.post('/api/export/excel', isAuthenticated, async (req, res) => {
    try {
      const { transactions, filters, summary } = req.body;
      const ExcelJS = await import('exceljs');
      
      const workbook = new ExcelJS.default.Workbook();
      const worksheet = workbook.addWorksheet('Ledger Report');
      
      // Sort transactions by date for ledger format
      const sortedTransactions = transactions.sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Set up the header with styling
      worksheet.mergeCells('A1:F1');
      worksheet.getCell('A1').value = 'ExpenseShare - Ledger Report';
      worksheet.getCell('A1').font = { size: 18, bold: true, color: { argb: '2563EB' } };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
      
      // Add generation date
      worksheet.getCell('A2').value = `Generated: ${new Date().toLocaleDateString()}`;
      worksheet.getCell('A2').font = { italic: true };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };
      
      // Add period information if date filters applied
      let currentRow = 4;
      if (filters.startDate || filters.endDate) {
        worksheet.getCell(`A${currentRow}`).value = `Period: ${filters.startDate || 'Beginning'} to ${filters.endDate || 'Current'}`;
        worksheet.getCell(`A${currentRow}`).font = { bold: true };
        currentRow++;
      }
      
      currentRow += 2;
      
      // Create ledger headers
      const headers = ['Date', 'Description', 'Paid By', 'Income', 'Expense', 'Balance'];
      headers.forEach((header: string, index: number) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.font = { bold: true, size: 12 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E40AF' } };
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.border = {
          top: {style: 'thin'},
          left: {style: 'thin'},
          bottom: {style: 'thin'},
          right: {style: 'thin'}
        };
      });
      
      currentRow++;
      
      // Calculate running balance and add ledger entries
      let runningBalance = 0;
      
      sortedTransactions.forEach((transaction: any) => {
        const amount = parseFloat(transaction.amount);
        
        if (transaction.type === 'income') {
          runningBalance += amount;
        } else {
          runningBalance -= amount;
        }
        
        // Date
        worksheet.getCell(currentRow, 1).value = new Date(transaction.date).toLocaleDateString();
        
        // Description
        worksheet.getCell(currentRow, 2).value = transaction.description;
        
        // Paid By
        worksheet.getCell(currentRow, 3).value = transaction.paidBy;
        
        // Income (only if income transaction)
        if (transaction.type === 'income') {
          const incomeCell = worksheet.getCell(currentRow, 4);
          incomeCell.value = amount;
          incomeCell.font = { color: { argb: '059669' }, bold: true }; // Green
          incomeCell.numFmt = '#,##0.00';
        }
        
        // Expense (only if expense transaction)
        if (transaction.type === 'expense') {
          const expenseCell = worksheet.getCell(currentRow, 5);
          expenseCell.value = amount;
          expenseCell.font = { color: { argb: 'DC2626' }, bold: true }; // Red
          expenseCell.numFmt = '#,##0.00';
        }
        
        // Running Balance
        const balanceCell = worksheet.getCell(currentRow, 6);
        balanceCell.value = runningBalance;
        balanceCell.font = { 
          color: { argb: runningBalance >= 0 ? '059669' : 'DC2626' },
          bold: true
        };
        balanceCell.numFmt = '#,##0.00';
        
        // Add borders to all cells in this row
        for (let col = 1; col <= 6; col++) {
          const cell = worksheet.getCell(currentRow, col);
          cell.border = {
            top: {style: 'thin'},
            left: {style: 'thin'},
            bottom: {style: 'thin'},
            right: {style: 'thin'}
          };
        }
        
        currentRow++;
      });
      
      // Add totals row
      currentRow += 1;
      worksheet.getCell(currentRow, 2).value = 'TOTALS:';
      worksheet.getCell(currentRow, 2).font = { bold: true, size: 12 };
      
      worksheet.getCell(currentRow, 4).value = summary.totalIncome;
      worksheet.getCell(currentRow, 4).font = { color: { argb: '059669' }, bold: true };
      worksheet.getCell(currentRow, 4).numFmt = '#,##0.00';
      
      worksheet.getCell(currentRow, 5).value = summary.totalExpenses;
      worksheet.getCell(currentRow, 5).font = { color: { argb: 'DC2626' }, bold: true };
      worksheet.getCell(currentRow, 5).numFmt = '#,##0.00';
      
      worksheet.getCell(currentRow, 6).value = summary.totalIncome - summary.totalExpenses;
      worksheet.getCell(currentRow, 6).font = { 
        color: { argb: (summary.totalIncome - summary.totalExpenses) >= 0 ? '059669' : 'DC2626' },
        bold: true,
        size: 12
      };
      worksheet.getCell(currentRow, 6).numFmt = '#,##0.00';
      
      // Add borders to totals row
      for (let col = 2; col <= 6; col++) {
        const cell = worksheet.getCell(currentRow, col);
        cell.border = {
          top: {style: 'double'},
          left: {style: 'thin'},
          bottom: {style: 'double'},
          right: {style: 'thin'}
        };
      }
      
      // Auto-fit columns
      worksheet.columns.forEach((column: any) => {
        column.width = 15;
      });
      
      // Set response headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=expense-report-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      res.status(500).json({ message: "Failed to export to Excel" });
    }
  });

  // Group routes
  app.get('/api/groups', isAuthenticated, async (req, res) => {
    try {
      const groups = await storage.getAllGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.post('/api/groups', isAuthenticated, async (req, res) => {
    try {
      const data = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(data);
      
      // Broadcast the new group to all connected clients
      broadcastUpdate('group_created', group);
      
      res.json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.post('/api/groups/:id/members', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const memberData = insertGroupMemberSchema.parse({
        groupId: id,
        ...req.body,
      });

      const member = await storage.addGroupMember(memberData);
      
      // Broadcast the new group member to all connected clients
      broadcastUpdate('group_member_added', { groupId: id, member });
      
      res.json(member);
    } catch (error) {
      console.error("Error adding group member:", error);
      res.status(500).json({ message: "Failed to add group member" });
    }
  });

  // Statistics routes
  app.get('/api/stats/monthly', isAuthenticated, async (req, res) => {
    try {
      const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
      
      const stats = await storage.getMonthlyStats(parseInt(year as string), parseInt(month as string));
      res.json(stats);
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
      res.status(500).json({ message: "Failed to fetch monthly stats" });
    }
  });

  // Export routes
  app.post('/api/export/pdf', isAuthenticated, async (req, res) => {
    try {
      const { filters } = req.body;
      const transactions = await storage.getAllTransactions(filters);
      
      // Create a simple text-based report since jsPDF has import issues
      let report = 'EXPENSE REPORT\n';
      report += '===============\n\n';
      report += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
      
      let totalIncome = 0;
      let totalExpenses = 0;
      
      transactions.forEach((transaction) => {
        const sign = transaction.type === 'income' ? '+' : '-';
        const amount = parseFloat(transaction.amount);
        
        if (transaction.type === 'income') {
          totalIncome += amount;
        } else {
          totalExpenses += amount;
        }
        
        report += `${new Date(transaction.date).toLocaleDateString()} | ${transaction.description}\n`;
        report += `  Type: ${transaction.type} | Amount: ${sign}$${transaction.amount}\n`;
        report += `  Category: ${transaction.category || 'N/A'} | Paid by: ${transaction.paidBy}\n\n`;
      });
      
      report += '\n===============\n';
      report += `Total Income: +$${totalIncome.toFixed(2)}\n`;
      report += `Total Expenses: -$${totalExpenses.toFixed(2)}\n`;
      report += `Net Balance: $${(totalIncome - totalExpenses).toFixed(2)}\n`;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename=expense-report.txt');
      res.send(report);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  app.post('/api/export/excel', async (req, res) => {
    try {
      const { filters } = req.body;
      const transactions = await storage.getAllTransactions(filters);
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Expenses');

      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Type', key: 'type', width: 10 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Paid By', key: 'paidBy', width: 20 },
      ];

      transactions.forEach(transaction => {
        worksheet.addRow({
          date: transaction.date,
          description: transaction.description,
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category || '',
          paidBy: transaction.paidBy,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=expense-report.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error("Error generating Excel:", error);
      res.status(500).json({ message: "Failed to generate Excel file" });
    }
  });

  // Simple invite link generation
  app.post('/api/groups/:groupId/simple-invite', isAuthenticated, async (req, res) => {
    try {
      const { groupId } = req.params;
      
      // Validate group exists
      const group = await storage.getGroupById(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Generate simple invite code
      const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const inviteData = {
        groupId,
        inviteCode,
        invitedBy: "System",
        expiresAt: null, // No expiration
        maxUses: null, // Unlimited uses
      };
      
      const invite = await storage.createGroupInvite(inviteData);
      res.json(invite);
    } catch (error: any) {
      console.error("Error creating simple invite:", error);
      res.status(500).json({ message: "Failed to create invite link" });
    }
  });

  // Send email invitation
  app.post('/api/groups/:groupId/invite-email', isAuthenticated, async (req, res) => {
    try {
      const { groupId } = req.params;
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Validate group exists
      const group = await storage.getGroupById(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Generate invite code for this email
      const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const inviteData = {
        groupId,
        inviteCode,
        invitedBy: "Email System",
        expiresAt: null,
        maxUses: 1, // One-time use for email invites
      };
      
      const invite = await storage.createGroupInvite(inviteData);
      
      // Here you would integrate with your email service (SendGrid, etc.)
      // For now, we'll just return success
      console.log(`Would send email to ${email} with invite code: ${inviteCode}`);
      
      res.json({ 
        success: true, 
        message: "Email invitation sent",
        inviteCode: inviteCode 
      });
    } catch (error: any) {
      console.error("Error sending email invite:", error);
      res.status(500).json({ message: "Failed to send email invitation" });
    }
  });

  // Group invite routes with improved error handling (keeping original for backward compatibility)
  app.post('/api/groups/:groupId/invites', isAuthenticated, async (req, res) => {
    try {
      const { groupId } = req.params;
      const { invitedBy, expiresAt, maxUses } = req.body;
      
      console.log("🎯 Creating invite request received:", { 
        groupId, 
        invitedBy, 
        maxUses, 
        userId: (req.user as any)?.claims?.sub,
        userEmail: (req.user as any)?.claims?.email 
      });
      
      if (!invitedBy || !invitedBy.trim()) {
        console.log("❌ Invite creation failed: Missing invited by name");
        return res.status(400).json({ message: "Invited by name is required" });
      }
      
      // Validate group exists and user has access
      const group = await storage.getGroupById(groupId);
      if (!group) {
        console.log("❌ Invite creation failed: Group not found");
        return res.status(404).json({ message: "Group not found" });
      }
      
      console.log("✅ Group found:", group.name);
      
      // Generate unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      console.log("🔗 Generated invite code:", inviteCode);
      
      const inviteData = {
        groupId,
        inviteCode,
        invitedBy: invitedBy.trim(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses || null,
      };
      
      console.log("💾 Saving invite data:", inviteData);
      const invite = await storage.createGroupInvite(inviteData);
      console.log("✅ Invite created successfully in database:", invite);
      
      // Broadcast the invite creation
      broadcastUpdate('invite-created', { invite });
      console.log("📡 Broadcasted invite creation update");
      
      res.json(invite);
    } catch (error: any) {
      console.error("🔥 Error creating group invite:", error);
      res.status(500).json({ message: "Failed to create group invite", error: error?.message || "Unknown error" });
    }
  });

  app.get('/api/groups/:groupId/invites', isAuthenticated, async (req, res) => {
    try {
      const { groupId } = req.params;
      console.log("Fetching invites for group:", groupId);
      
      const invites = await storage.getGroupInvites(groupId);
      console.log("Found invites:", invites.length);
      
      res.json(invites);
    } catch (error: any) {
      console.error("Error fetching group invites:", error);
      res.status(500).json({ message: "Failed to fetch group invites", error: error?.message || "Unknown error" });
    }
  });

  app.post('/api/invites/:inviteCode/join', async (req, res) => {
    try {
      const { inviteCode } = req.params;
      const { memberName, memberEmail } = req.body;
      
      if (!memberName) {
        return res.status(400).json({ message: "Member name is required" });
      }
      
      const result = await storage.useGroupInvite(inviteCode, memberName, memberEmail);
      
      if (!result) {
        return res.status(400).json({ message: "Invalid or expired invite" });
      }
      
      // Broadcast the member join
      broadcastUpdate('member-joined', { 
        group: result.group, 
        member: result.member,
        joinedViaInvite: true
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error joining group via invite:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });

  app.patch('/api/invites/:inviteId/deactivate', isAuthenticated, async (req, res) => {
    try {
      const { inviteId } = req.params;
      await storage.deactivateGroupInvite(inviteId);
      
      // Broadcast the invite deactivation
      broadcastUpdate('invite-deactivated', { inviteId });
      
      res.json({ message: "Invite deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating invite:", error);
      res.status(500).json({ message: "Failed to deactivate invite" });
    }
  });

  // User profile routes
  app.post('/api/profile', async (req, res) => {
    try {
      const profileData = insertUserProfileSchema.parse(req.body);
      
      // Check if public name already exists
      const existingProfile = await storage.getUserProfileByName(profileData.publicName);
      if (existingProfile) {
        return res.status(400).json({ message: "Public name already taken" });
      }
      
      const profile = await storage.createUserProfile(profileData);
      
      // Broadcast profile creation
      broadcastUpdate('profile-created', { profile });
      
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.get('/api/profile', async (req, res) => {
    try {
      // For now, return the first profile (since we're not using authentication)
      // In a real app, this would use the authenticated user's ID
      const profiles = await db.select().from(userProfiles).limit(1);
      if (profiles.length > 0) {
        res.json(profiles[0]);
      } else {
        res.status(404).json({ message: "No profile found" });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.get('/api/profile/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const profile = await storage.getUserProfile(id);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch('/api/profile/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Check if updating public name and it's already taken by another profile
      if (updates.publicName) {
        const existingProfile = await storage.getUserProfileByName(updates.publicName);
        if (existingProfile && existingProfile.id !== id) {
          return res.status(400).json({ message: "Public name already taken" });
        }
      }
      
      const updatedProfile = await storage.updateUserProfile(id, updates);
      
      // Broadcast profile update
      broadcastUpdate('profile-updated', { profile: updatedProfile });
      
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    connectedClients.add(ws);
    
    // Send welcome message
    ws.send(JSON.stringify({ 
      event: 'connected', 
      data: { message: 'Connected to real-time updates' },
      timestamp: new Date().toISOString()
    }));
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      connectedClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });
  
  return httpServer;
}
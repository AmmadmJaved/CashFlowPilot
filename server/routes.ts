import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { db } from "./db";
import { userProfiles, groups } from "@shared/schema";
import { insertTransactionSchema, insertGroupSchema, insertGroupMemberSchema, insertGroupInviteSchema, insertUserProfileSchema, type GroupInvite, type UserProfile } from "@shared/schema";
import { eq } from 'drizzle-orm';
import ExcelJS from "exceljs";
import { verifyGoogleToken } from "./auth";


// Store connected WebSocket clients
const connectedClients = new Set<WebSocket>();

// In-memory profile cache to avoid DB hit on every /api/auth/user call
const profileCache = new Map<string, { data: any; expiresAt: number }>();
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedProfile(userId: string) {
  const entry = profileCache.get(userId);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  if (entry) profileCache.delete(userId);
  return null;
}

function setCachedProfile(userId: string, data: any) {
  profileCache.set(userId, { data, expiresAt: Date.now() + PROFILE_CACHE_TTL });
}

function invalidateProfileCache(userId: string) {
  profileCache.delete(userId);
}

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
      // broadcastUpdate('member-joined', { 
      //   group: result.group, 
      //   member: result.member,
      //   joinedViaInvite: true
      // });
      
      res.json(result);
    } catch (error) {
      console.error("Error joining group via invite:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });



  // Public token exchange endpoint for SPA code flow
  // This endpoint exchanges an authorization code for tokens using the server's client_secret,
  // allowing the browser SPA to use response_type=code without exposing the secret.
  app.post('/api/auth/exchange', async (req, res) => {
    try {
      const { code, redirect_uri, code_verifier } = req.body;
      if (!code || !redirect_uri) {
        return res.status(400).json({ message: "code and redirect_uri are required" });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return res.status(500).json({ message: "Server OAuth credentials not configured" });
      }

      const params: Record<string, string> = {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri,
        grant_type: "authorization_code",
      };
      // Include PKCE code_verifier if the client sent one
      if (code_verifier) {
        params.code_verifier = code_verifier;
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error("Token exchange failed:", tokenData);
        return res.status(400).json({ message: tokenData.error_description || "Token exchange failed" });
      }

      res.json(tokenData);
    } catch (error) {
      console.error("Error in token exchange:", error);
      res.status(500).json({ message: "Token exchange failed" });
    }
  });

  // Auth middleware (applies to routes below)
   // protect everything else
  app.use("/api", verifyGoogleToken);
  // Auth routes
  app.get('/api/auth/user',  async (req: any, res) => {
    try {
      const claims = req.user.claims;
      const userId = claims.sub;

      // Check in-memory cache first (avoids DB entirely for repeat calls)
      const cached = getCachedProfile(userId);
      if (cached) {
        return res.json(cached);
      }

      // Only fetch profile from DB (lightweight single query)
      let profile = await storage.getUserProfileByUserId(userId);
      if (!profile) {
        // Auto-create profile for new users using token claims
        const displayName = claims.given_name 
          ? `${claims.given_name} ${claims.family_name || ''}`.trim() 
          : claims.email?.split('@')[0] || 'User';
        profile = await storage.createUserProfile({
          userId,
          publicName: displayName,
        });
      }

      const response = {
        id: userId,
        email: claims.email || '',
        firstName: claims.given_name || '',
        lastName: claims.family_name || '',
        profileImageUrl: claims.picture || '',
        profile,
      };

      // Cache the response
      setCachedProfile(userId, response);

      res.json(response);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.post('/api/profile' , async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = {
        userId,
        ...req.body,
      };
      
      const profile = await storage.createUserProfile(profileData);
      invalidateProfileCache(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.get('/api/profile' , async (req: any, res) => {
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
  app.patch('/api/profile/:id' , async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileId = req.params.id;
      const profileData = req.body;
      console.log("Updating profile:", profileId, "with data:", profileData,"userId:", userId);
      // Verify the profile belongs to the authenticated user
      invalidateProfileCache(userId);
      const existingProfile = await storage.getUserProfileByUserId(userId);
      if (!existingProfile || existingProfile.id !== profileId) {
        return res.status(404).json({ message: "Profile not found" });
      }
      if (profileData.createdAt) {
          profileData.createdAt = new Date(profileData.createdAt);
      }
      if (profileData.updatedAt) {
         profileData.updatedAt = new Date(profileData.updatedAt);
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
  app.get('/api/admin/users' , isAdmin, async (req: any, res) => {
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

  app.post('/api/admin/users/:userId/suspend' , isAdmin, async (req: any, res) => {
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

  app.post('/api/admin/users/:userId/activate' , isAdmin, async (req: any, res) => {
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

  app.post('/api/admin/users/:userId/make-admin' , isAdmin, async (req: any, res) => {
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

  app.get('/api/admin/analytics' , isAdmin, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await storage.getAnalytics(startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get('/api/admin/logs' , isAdmin, async (req: any, res) => {
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
    app.get('/api/transactions', async (req, res) => {
      try {
        const { type, category, paidBy, startDate, endDate, search } = req.query;

        const userId = (req as any).user?.claims?.sub;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        // Build filters with userId to avoid fetching all users' data
        const filters: any = { userId };
        if (type) filters.type = type;
        if (category) filters.category = category;
        if (paidBy) filters.paidBy = paidBy;
        if (startDate) filters.startDate = new Date(startDate as string);
        if (endDate) filters.endDate = new Date(endDate as string);
        if (search) filters.search = search;

        const transactions = await storage.getAllTransactions(filters);

        // Only personal (non-group) transactions
        const result = transactions.filter(
          (tx: any) => tx.groupId === null || tx.groupId === undefined
        );

        res.json(result);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ message: "Failed to fetch transactions" });
      }
    });

    app.post('/api/transactions', async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized: User not logged in" });
      }

      const data = insertTransactionSchema.parse({
        ...req.body,
        userId, // attach creator
        date: new Date(req.body.date),
      });

      const transaction = await storage.createTransaction(data);

      // broadcastUpdate('transaction_created', transaction);

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
            userId: userId,       // userId not available in member object
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

  app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let updates = req.body;

    if (updates.date) {
      updates.date = new Date(updates.date);
    }

    // Normalize groupId
    if (updates.groupId === "" || updates.groupId === null) {
      updates.groupId = null;
    }

    const transaction = await storage.updateTransaction(id, updates);
    res.json(transaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ message: "Failed to update transaction" });
  }
});

  app.delete('/api/transactions/:id' , async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTransaction(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Account/Group transactions route
  app.get("/api/accounts/:groupId/transactions", async (req, res) => {
    try {
      const { groupId } = req.params;
      const { type, category, startDate, endDate, search,filterUser } = req.query;

      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userEmail = (req as any).user?.claims?.email;
      if (!userEmail) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // --- Filters ---
      const filters: any = { groupId };
      if (type) filters.type = type;
      if (category) filters.category = category;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (filterUser) filters.userId = filterUser;
      if (search) filters.search = search;

      // Fetch all account transactions based on filters
      let transactions = await storage.getAllTransactions(filters);

      // // Get user profile
      // const profile = await storage.getUserProfileByUserId(userId);

      // // Get all groups user belongs to
      // const allGroups = await storage.getAllGroups(userEmail);
      // const userGroups = allGroups.filter((g) =>
      //   g.members?.some((m) => m.id === userId || m.name === profile?.publicName)
      // );
      // const allowedGroupIds = new Set(userGroups.map((g) => g.id));

      // // Apply visibility rules:
      // // - User can always see their own transactions
      // // - User can see others' transactions only if group is shared
      // transactions = transactions.filter((tx) => {
      //   if (tx.userId === userId) return true;
      //   if (tx.groupId && allowedGroupIds.has(tx.groupId)) return true;
      //   return false;
      // });

      res.json(transactions);
    } catch (error) {
      console.error("Error fetching account transactions:", error);
      res.status(500).json({ message: "Failed to fetch account transactions" });
    }
  });

  // Export routes  
  app.post('/api/export/excel' , async (req, res) => {
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
      worksheet.getCell('A1').value = 'CashPilot - Ledger Report';
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
  app.get('/api/groups' , async (req, res) => {
    try {

      const userEmail = (req as any).user.claims.email;
      if (!userEmail) {
        return res.status(401).json({ message: "Unauthorized email not found" });
      }
      const groups = await storage.getAllGroups(userEmail);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });
// create group route
  app.post('/api/groups' , async (req, res) => {
    try {
      const userEmail = (req as any).user.claims.email;
      if (!userEmail) {
        return res.status(401).json({ message: "Unauthorized email not found" });
      }

       const username = (req as any).user.claims.name || "You";
      const data = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(data);
      await storage.addGroupMember({ groupId: group.id, name: username, email: userEmail });
      // Broadcast the new group to all connected clients
      // broadcastUpdate('group_created', group);
      
      res.json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  // update group member balance route
  app.put('/api/groups/:groupId/members/:memberId/balance', async (req, res) => {
    try {
      const { groupId, memberId } = req.params;

      // validate input
      const { openingBalance, closingBalance } = req.body;
      if (openingBalance === undefined && closingBalance === undefined) {
        return res.status(400).json({ message: "At least one balance value must be provided" });
      }

      // update member balances
      const updatedMember = await storage.updateGroupMemberBalance(memberId, {
        openingBalance,
        closingBalance,
      });

      if (!updatedMember) {
        return res.status(404).json({ message: "Group member not found" });
      }

      // 🔔 Broadcast update to clients
      // broadcastUpdate('group_member_balance_updated', {
      //   groupId,
      //   member: updatedMember,
      // });

      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating group member balance:", error);
      res.status(500).json({ message: "Failed to update group member balance" });
    }
  });

  // get group by Id route
  app.get('/api/groups/:id' , async (req, res) => {
    try {
      const { id } = req.params;
      console.error("Error fetching group:", id);
      const group = await storage.getGroupById(id);
      console.error("Error fetching group:", group);
      res.json(group);
    } catch (error) {
      console.error("Error fetching group:", error);
      res.status(500).json({ message: "Failed to fetch group" });
    }
  }); 

  // update group name (and optional description)
  app.put('/api/groups/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: 'Name is required' });
      }

      const [updated] = await db.update(groups).set({ name, ...(description !== undefined ? { description } : {}) }).where(eq(groups.id, id)).returning();
      if (!updated) return res.status(404).json({ message: 'Group not found' });

      // Broadcast group update to connected clients
      broadcastUpdate('group_updated', { id: updated.id, name: updated.name, description: updated.description });

      res.json(updated);
    } catch (error) {
      console.error('Error updating group:', error);
      res.status(500).json({ message: 'Failed to update group' });
    }
  });

  // add group member route
  app.post('/api/groups/:id/members' , async (req, res) => {
    try {
      const { id } = req.params;
       const { email } = req.body;

      // 1. Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      console.log("Adding member with email:", email);
       // 2. Check if user exists in the system
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found in the system" });
      }
      console.log("Found user:", user);
      // 3. Check if user is already a member of the group
      const existingMember = await storage.getGroupById(id).then(g => g?.members || []);
      if (existingMember.some(g => g.id === user.id || g.email === email)) {
        return res.status(400).json({ message: "User is already a member of this group" });
      } 
      console.log("User is not already a member, proceeding to add.");
      const memberData = insertGroupMemberSchema.parse({
        groupId: id,
        userId: user.id,
        email: user.email,
      ...req.body,
      });

      const member = await storage.addGroupMember(memberData);
      
      // Broadcast the new group member to all connected clients
      // broadcastUpdate('group_member_added', { groupId: id, member });
      
      res.json(member);
    } catch (error) {
      console.error("Error adding group member:", error);
      res.status(500).json({ message: "Failed to add group member" });
    }
  });

   // remove group member route
  app.delete('/api/groups/:groupId/members/:memberId' , async (req, res) => {
    try {
      const { groupId, memberId } = req.params;
      await storage.removeGroupMember(groupId, memberId);
      res.json({ message: "Group member removed successfully" });
    } catch (error) {
      console.error("Error removing group member:", error);
      res.status(500).json({ message: "Failed to remove group member" });
    }
  });

  // delete group route
  app.delete('/api/groups/:id' , async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGroup(id);
      res.json({ message: "Group deleted successfully" });
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({ message: "Failed to delete group" });
    }
  });
  
  // Statistics routes
    app.get('/api/stats/monthly', async (req, res) => {
      try {
        const userId = (req as any).user?.claims?.sub;
        if (!userId) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const { startDate, endDate, groupId, filterUser } = req.query;

        let profile = await storage.getUserProfileByUserId(userId);
        if (!profile) {
          const authClaims = (req as any).user?.claims || {};
          const displayName =
            authClaims.name ||
            [authClaims.given_name, authClaims.family_name].filter(Boolean).join(" ") ||
            (authClaims.email ? String(authClaims.email).split("@")[0] : "User");

          profile = await storage.createUserProfile({
            userId,
            publicName: displayName,
          });
        }

        // Determine whether this is personal stats or group stats
        const isGroupStats = !!groupId;

        const stats = await storage.getMonthlyStats({
          year: startDate ? new Date(startDate as string).getFullYear() : new Date().getFullYear(),
          month: startDate ? new Date(startDate as string).getMonth() + 1 : new Date().getMonth() + 1,
          startDate: startDate ? new Date(startDate as string) : null,
          endDate: endDate ? new Date(endDate as string) : undefined,

          // ✅ If groupId is provided → group stats
          // ✅ If groupId is not provided → only personal stats (force groupId null)
          userId: isGroupStats ? (filterUser as string | undefined) : userId,
          groupId: isGroupStats ? (groupId as string) : null,
        });

        // No-cache headers
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        res.json(stats);
      } catch (error) {
        console.error("Error fetching monthly stats:", error);
        res.status(500).json({ message: "Failed to fetch monthly stats" });
      }
    });


  // Export routes
  app.post('/api/export/pdf' , async (req, res) => {
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
      report += `Total Expenses: -$${totalExpenses.toFixed(2)}\n\n`;
      report += `Net Balance: $${(totalIncome - totalExpenses).toFixed(2)}\n`;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename=expense-report.txt');
      res.send(report);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Simple invite link generation
  app.post('/api/groups/:groupId/simple-invite' , async (req, res) => {
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
 app.post('/api/groups/:groupId/add-member', async (req, res) => {
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

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3. Check if user is already a member of the group
      const existingMember = await storage.getGroupById(groupId).then(g => g?.members || []);
      if (existingMember.some(g => g.id === user.id || g.email === email)) {
        return res.status(400).json({ message: "User is already a member of this group" });
      } 
      console.log("User is not already a member, proceeding to add.");

    // Add user as member
    const memberData = insertGroupMemberSchema.parse({
      groupId,
      userId: user.id,
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email?.split('@')[0] || 'User',
      email: user.email,
    });
    const member = await storage.addGroupMember(memberData);

    res.json({
      success: true,
      message: `User ${email} added to group successfully`,
      member,
    });
  } catch (error: any) {
    console.error("Error adding member to group:", error);
    res.status(500).json({ message: "Failed to add member to group" });
  }
});

  // Group invite routes with improved error handling (keeping original for backward compatibility)
  app.post('/api/groups/:groupId/invites' , async (req, res) => {
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
      // broadcastUpdate('invite-created', { invite });
      console.log("📡 Broadcasted invite creation update");
      
      res.json(invite);
    } catch (error: any) {
      console.error("🔥 Error creating group invite:", error);
      res.status(500).json({ message: "Failed to create group invite", error: error?.message || "Unknown error" });
    }
  });

  app.get('/api/groups/:groupId/invites' , async (req, res) => {
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

  app.post('/groups/:groupId/invites/:inviteCode/join', async (req, res) => {
    try {
      const { inviteCode, groupId } = req.params;
      const { memberName, memberEmail } = req.body;
      
      if (!memberName) {
        return res.status(400).json({ message: "Member name is required" });
      }
      
    // Find user by email
    const user = await storage.getUserByEmail(memberEmail);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3. Check if user is already a member of the group
      const existingMember = await storage.getGroupById(groupId).then(g => g?.members || []);
      if (existingMember.some(g => g.id === user.id || g.email === memberEmail)) {
        return res.status(400).json({ message: "User is already a member of this group" });
      } 
      console.log("User is not already a member, proceeding to add.");
      
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

  app.patch('/api/invites/:inviteId/deactivate' , async (req, res) => {
    try {
      const { inviteId } = req.params;
      await storage.deactivateGroupInvite(inviteId);
      
      // Broadcast the invite deactivation
      // broadcastUpdate('invite-deactivated', { inviteId });
      
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
      // broadcastUpdate('profile-created', { profile });
      
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
      // broadcastUpdate('profile-updated', { profile: updatedProfile });
      
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
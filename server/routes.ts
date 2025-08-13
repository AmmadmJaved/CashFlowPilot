import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { db } from "./db";
import { userProfiles } from "@shared/schema";
import { insertTransactionSchema, insertGroupSchema, insertGroupMemberSchema, insertGroupInviteSchema, insertUserProfileSchema, type GroupInvite, type UserProfile } from "@shared/schema";
import { z } from "zod";
import jsPDF from "jspdf";
import ExcelJS from "exceljs";

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
  // Transaction routes
  app.get('/api/transactions', async (req, res) => {
    try {
      const { groupId, type, category, startDate, endDate, search } = req.query;
      
      const filters: any = {};
      if (groupId) filters.groupId = groupId;
      if (type) filters.type = type;
      if (category) filters.category = category;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (search) filters.search = search;

      const transactions = await storage.getAllTransactions(filters);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/transactions', async (req, res) => {
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

  app.put('/api/transactions/:id', async (req, res) => {
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

  app.delete('/api/transactions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTransaction(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Group routes
  app.get('/api/groups', async (req, res) => {
    try {
      const groups = await storage.getAllGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.post('/api/groups', async (req, res) => {
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

  app.post('/api/groups/:id/members', async (req, res) => {
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
  app.get('/api/stats/monthly', async (req, res) => {
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
  app.post('/api/export/pdf', async (req, res) => {
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

  // Group invite routes
  app.post('/api/groups/:groupId/invites', async (req, res) => {
    try {
      const { groupId } = req.params;
      const { invitedBy, expiresAt, maxUses } = req.body;
      
      // Generate unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const inviteData = {
        groupId,
        inviteCode,
        invitedBy,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses || null,
      };
      
      const invite = await storage.createGroupInvite(inviteData);
      
      // Broadcast the invite creation
      broadcastUpdate('invite-created', { invite });
      
      res.json(invite);
    } catch (error) {
      console.error("Error creating group invite:", error);
      res.status(500).json({ message: "Failed to create group invite" });
    }
  });

  app.get('/api/groups/:groupId/invites', async (req, res) => {
    try {
      const { groupId } = req.params;
      const invites = await storage.getGroupInvites(groupId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching group invites:", error);
      res.status(500).json({ message: "Failed to fetch group invites" });
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

  app.patch('/api/invites/:inviteId/deactivate', async (req, res) => {
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
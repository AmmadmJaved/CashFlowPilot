import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTransactionSchema, insertGroupSchema } from "@shared/schema";
import { z } from "zod";
import jsPDF from "jspdf";
import ExcelJS from "exceljs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Transaction routes
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { groupId, type, category, startDate, endDate, search } = req.query;
      
      const filters: any = {};
      if (groupId) filters.groupId = groupId;
      if (type) filters.type = type;
      if (category) filters.category = category;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (search) filters.search = search;

      const transactions = await storage.getTransactionsByUserId(userId, filters);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertTransactionSchema.parse({
        ...req.body,
        userId,
        date: new Date(req.body.date),
      });

      const transaction = await storage.createTransaction(data);

      // If it's a shared expense, create splits
      if (data.isShared && data.groupId) {
        const group = await storage.getGroupById(data.groupId);
        if (group && group.members) {
          const splitAmount = parseFloat(data.amount) / group.members.length;
          const splits = group.members.map(member => ({
            transactionId: transaction.id,
            userId: member.user.id,
            amount: splitAmount.toString(),
            isPaid: member.user.id === userId, // Creator has already paid
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

  app.put('/api/transactions/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/transactions/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groups = await storage.getGroupsByUserId(userId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.post('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertGroupSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const group = await storage.createGroup(data);
      res.json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.post('/api/groups/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { userId: memberUserId } = req.body;

      const member = await storage.addGroupMember({
        groupId: id,
        userId: memberUserId,
      });

      res.json(member);
    } catch (error) {
      console.error("Error adding group member:", error);
      res.status(500).json({ message: "Failed to add group member" });
    }
  });

  // Statistics routes
  app.get('/api/stats/monthly', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
      
      const stats = await storage.getUserMonthlyStats(userId, parseInt(year), parseInt(month));
      res.json(stats);
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
      res.status(500).json({ message: "Failed to fetch monthly stats" });
    }
  });

  // Export routes
  app.post('/api/export/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { filters } = req.body;

      const transactions = await storage.getTransactionsByUserId(userId, filters);
      
      const doc = new jsPDF();
      doc.text('Expense Report', 20, 20);
      
      let yPosition = 40;
      transactions.forEach((transaction, index) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        const sign = transaction.type === 'income' ? '+' : '-';
        const text = `${transaction.description} - ${sign}$${transaction.amount}`;
        doc.text(text, 20, yPosition);
        yPosition += 10;
      });

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=expense-report.pdf');
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.post('/api/export/excel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { filters } = req.body;

      const transactions = await storage.getTransactionsByUserId(userId, filters);
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Expenses');

      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Type', key: 'type', width: 10 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Category', key: 'category', width: 20 },
      ];

      transactions.forEach(transaction => {
        worksheet.addRow({
          date: transaction.date,
          description: transaction.description,
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category || '',
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

  const httpServer = createServer(app);
  return httpServer;
}

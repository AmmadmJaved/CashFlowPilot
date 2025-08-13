// Vercel-specific configuration for serverless deployment
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutes } from './routes.js';

const app = express();

// Initialize routes
let server: any = null;

async function initializeServer() {
  if (!server) {
    server = await registerRoutes(app);
  }
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await initializeServer();
  
  // Handle the request
  return new Promise((resolve) => {
    app(req, res, resolve);
  });
}
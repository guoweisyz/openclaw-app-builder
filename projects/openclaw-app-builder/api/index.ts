import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { ComponentRegistry } from '../src/marketplace/registry/ComponentRegistry.js';
import { IntentEngine } from '../src/core/intent/IntentEngine.js';
import { AppManager } from '../src/core/AppManager.js';
import { AggregationManager } from '../src/marketplace/aggregation/AggregationManager.js';
import { GatewayDeploymentService } from '../src/gateway/GatewayDeploymentService.js';
import { createComponentRoutes } from '../src/api/routes/components.js';
import { createAppRoutes } from '../src/api/routes/apps.js';
import { createIntentRoutes } from '../src/api/routes/intent.js';
import { createSyncRoutes } from '../src/api/routes/sync.js';
import { createAggregationRoutes } from '../src/api/routes/aggregation.js';
import { createGatewayRoutes } from '../src/api/routes/gateway.js';

// Initialize database and services
let app: express.Application | null = null;

async function initializeApp() {
  if (app) return app;

  // Open SQLite database
  const db = await open({
    filename: './data/app-builder.db',
    driver: sqlite3.Database,
  });

  // Initialize services
  const registry = new ComponentRegistry(db);
  await registry.initialize();

  const intentEngine = new IntentEngine(registry);
  const appManager = new AppManager(db, registry);
  const aggregationManager = new AggregationManager();
  const gatewayDeploymentService = new GatewayDeploymentService(appManager);

  // Create Express app
  const expressApp = express();
  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: true }));

  // Health check
  expressApp.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });

  // API routes
  expressApp.use('/api/components', createComponentRoutes({ registry, intentEngine, appManager }));
  expressApp.use('/api/apps', createAppRoutes({ registry, intentEngine, appManager }));
  expressApp.use('/api/intent', createIntentRoutes({ registry, intentEngine, appManager }));
  expressApp.use('/api/sync', createSyncRoutes({ registry }));
  expressApp.use('/api/aggregation', createAggregationRoutes());
  expressApp.use('/api/gateway', createGatewayRoutes({ gatewayDeploymentService }));

  // Error handling
  expressApp.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  app = expressApp;
  return app;
}

// Vercel serverless handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const expressApp = await initializeApp();
    return expressApp(req, res);
  } catch (error) {
    console.error('Failed to initialize app:', error);
    res.status(500).json({ error: 'Failed to initialize application' });
  }
}

import express, { Router } from 'express';
import type { ComponentRegistry } from '../marketplace/registry/ComponentRegistry.js';
import type { IntentEngine } from '../core/intent/IntentEngine.js';
import type { AppManager } from '../core/AppManager.js';
import { createComponentRoutes } from './routes/components.js';
import { createAppRoutes } from './routes/apps.js';
import { createIntentRoutes } from './routes/intent.js';
import { createSyncRoutes } from './routes/sync.js';
import { createAggregationRoutes } from './routes/aggregation.js';
import { createGatewayRoutes } from './routes/gateway.js';
import { GatewayDeploymentService } from '../gateway/GatewayDeploymentService.js';

interface ServerDeps {
  registry: ComponentRegistry;
  intentEngine: IntentEngine;
  appManager: AppManager;
}

export function createServer(deps: ServerDeps): express.Application {
  const app = express();

  // 中间件
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 健康检查
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });

  // 初始化 Gateway 部署服务
  const gatewayDeploymentService = new GatewayDeploymentService(deps.appManager);

  // API 路由
  const apiRouter = Router();
  
  apiRouter.use('/components', createComponentRoutes(deps));
  apiRouter.use('/apps', createAppRoutes(deps));
  apiRouter.use('/intent', createIntentRoutes(deps));
  apiRouter.use('/sync', createSyncRoutes(deps));
  apiRouter.use('/aggregation', createAggregationRoutes());
  apiRouter.use('/gateway', createGatewayRoutes({ gatewayDeploymentService }));

  app.use('/api', apiRouter);

  // 错误处理
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  return app;
}

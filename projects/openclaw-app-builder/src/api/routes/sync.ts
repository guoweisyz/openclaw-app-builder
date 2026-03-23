import { Router } from 'express';
import type { ComponentRegistry } from '../../marketplace/registry/ComponentRegistry.js';

interface RouteDeps {
  registry: ComponentRegistry;
}

export function createSyncRoutes(deps: RouteDeps): Router {
  const router = Router();

  // 从 GitHub 同步
  router.post('/github', async (req, res) => {
    const { query, limit } = req.body;
    
    try {
      const count = await deps.registry.syncFromGitHub({ query, limit });
      res.json({ 
        success: true, 
        message: `从 GitHub 同步了 ${count} 个组件`,
        count,
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // 从 npm 同步
  router.post('/npm', async (req, res) => {
    const { query, limit } = req.body;
    
    try {
      const count = await deps.registry.syncFromNpm({ query, limit });
      res.json({ 
        success: true, 
        message: `从 npm 同步了 ${count} 个组件`,
        count,
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // 同步所有渠道
  router.post('/all', async (req, res) => {
    try {
      const githubCount = await deps.registry.syncFromGitHub({ limit: 30 });
      const npmCount = await deps.registry.syncFromNpm({ limit: 30 });
      
      res.json({ 
        success: true, 
        message: '同步完成',
        results: {
          github: githubCount,
          npm: npmCount,
          total: githubCount + npmCount,
        },
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}

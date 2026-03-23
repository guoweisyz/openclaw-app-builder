import { Router } from 'express';
import type { IntentEngine } from '../../core/intent/IntentEngine.js';

interface RouteDeps {
  intentEngine: IntentEngine;
}

export function createIntentRoutes(deps: RouteDeps): Router {
  const router = Router();

  // 解析用户意图
  router.post('/parse', async (req, res) => {
    const { description } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'description is required' });
    }
    
    const intent = await deps.intentEngine.parse(description);
    res.json(intent);
  });

  // 根据意图生成应用
  router.post('/generate', async (req, res) => {
    const { description, name } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'description is required' });
    }
    
    const result = await deps.intentEngine.generateApp(description, name);
    res.json(result);
  });

  return router;
}

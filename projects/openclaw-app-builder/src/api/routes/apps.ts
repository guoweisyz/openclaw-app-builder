import { Router } from 'express';
import type { AppManager } from '../../core/AppManager.js';

interface RouteDeps {
  appManager: AppManager;
}

export function createAppRoutes(deps: RouteDeps): Router {
  const router = Router();

  // 列出所有应用
  router.get('/', async (req, res) => {
    const apps = await deps.appManager.list();
    res.json({ apps });
  });

  // 创建应用
  router.post('/', async (req, res) => {
    const { name, description, workflow, trigger, config } = req.body;
    
    const app = await deps.appManager.create({
      name,
      description,
      workflow,
      trigger,
      config,
    });
    
    res.status(201).json(app);
  });

  // 获取应用详情
  router.get('/:id', async (req, res) => {
    const app = await deps.appManager.get(req.params.id);
    
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    res.json(app);
  });

  // 更新应用
  router.patch('/:id', async (req, res) => {
    const app = await deps.appManager.update(req.params.id, req.body);
    res.json(app);
  });

  // 删除应用
  router.delete('/:id', async (req, res) => {
    await deps.appManager.delete(req.params.id);
    res.status(204).send();
  });

  // 运行应用
  router.post('/:id/run', async (req, res) => {
    const result = await deps.appManager.run(req.params.id, req.body);
    res.json(result);
  });

  // 部署应用
  router.post('/:id/deploy', async (req, res) => {
    const result = await deps.appManager.deploy(req.params.id, req.body);
    res.json(result);
  });

  return router;
}

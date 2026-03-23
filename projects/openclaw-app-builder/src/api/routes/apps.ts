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

  // 停止应用
  router.post('/:id/stop', async (req, res) => {
    const result = await deps.appManager.stop(req.params.id);
    res.json(result);
  });

  // 获取调度状态
  router.get('/scheduler/status', async (req, res) => {
    const status = deps.appManager.getSchedulerStatus();
    res.json({ scheduled: status });
  });

  // 获取应用执行历史
  router.get('/:id/executions', async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const executions = await deps.appManager.getExecutionHistory(req.params.id, limit);
    res.json({ executions });
  });

  // 获取应用执行统计
  router.get('/:id/stats', async (req, res) => {
    const stats = await deps.appManager.getExecutionStats(req.params.id);
    res.json(stats);
  });

  // 导出应用
  router.get('/:id/export', async (req, res) => {
    const format = (req.query.format as 'json' | 'yaml') || 'json';
    const { content, filename } = await deps.appManager.exportApp(req.params.id, format);
    
    res.setHeader('Content-Type', format === 'yaml' ? 'text/yaml' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  });

  // 导入应用
  router.post('/import', async (req, res) => {
    const { content, name } = req.body;
    const app = await deps.appManager.importApp(content, name);
    res.status(201).json(app);
  });

  return router;
}

import { Router } from 'express';
import type { ComponentRegistry } from '../../marketplace/registry/ComponentRegistry.js';

interface RouteDeps {
  registry: ComponentRegistry;
}

export function createComponentRoutes(deps: RouteDeps): Router {
  const router = Router();

  // 搜索组件
  router.get('/', async (req, res) => {
    const { q, channel, type, limit = '20', offset = '0' } = req.query;
    
    const components = await deps.registry.search({
      query: q as string || '',
      channels: channel ? (channel as string).split(',') as any : undefined,
      types: type ? (type as string).split(',') as any : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
    
    res.json({ components, total: components.length });
  });

  // 获取单个组件
  router.get('/:id', async (req, res) => {
    const component = await deps.registry.get(req.params.id);
    
    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }
    
    res.json(component);
  });

  // 安装组件
  router.post('/:id/install', async (req, res) => {
    const result = await deps.registry.install(req.params.id, req.body);
    res.json(result);
  });

  // 获取组件分类/标签
  router.get('/meta/tags', async (req, res) => {
    const tags = await deps.registry.getTags();
    res.json({ tags });
  });

  return router;
}

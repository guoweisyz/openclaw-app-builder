import { Router } from 'express';
import { aggregationManager } from '../../marketplace/aggregation/AggregationManager.js';
import { GitHubAdapter } from '../../marketplace/aggregation/adapters/GitHubAdapter.js';
import { NpmAdapter } from '../../marketplace/aggregation/adapters/NpmAdapter.js';
import { LocalAdapter } from '../../marketplace/aggregation/adapters/LocalAdapter.js';
import { logger } from '../../utils/logger.js';

// 初始化聚合管理器
const githubAdapter = new GitHubAdapter(process.env.GITHUB_TOKEN);
const npmAdapter = new NpmAdapter();
const localAdapter = new LocalAdapter();

aggregationManager.registerAdapter(githubAdapter);
aggregationManager.registerAdapter(npmAdapter);
aggregationManager.registerAdapter(localAdapter);

logger.info('聚合管理器已初始化，注册了 3 个渠道适配器');

export function createAggregationRoutes(): Router {
  const router = Router();

  // 跨渠道搜索
  router.get('/search', async (req, res) => {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 30;
    const channels = (req.query.channels as string)?.split(',') || undefined;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
      const result = await aggregationManager.searchAll(query, { limit, channels });
      res.json(result);
    } catch (error) {
      logger.error('聚合搜索失败:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // 获取推荐/热门
  router.get('/featured', async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const channels = (req.query.channels as string)?.split(',') || undefined;

    try {
      const results = await aggregationManager.getFeatured({ limit, channels });
      res.json({ results });
    } catch (error) {
      logger.error('获取推荐失败:', error);
      res.status(500).json({ error: 'Failed to get featured servers' });
    }
  });

  // 获取渠道健康状态
  router.get('/health', async (req, res) => {
    try {
      const status = await aggregationManager.getHealthStatus();
      res.json({ channels: status });
    } catch (error) {
      logger.error('健康检查失败:', error);
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  // 获取可用渠道列表
  router.get('/channels', async (req, res) => {
    res.json({
      channels: [
        { id: 'github', name: 'GitHub', description: 'GitHub 上的 MCP Server 仓库' },
        { id: 'npm', name: 'npm Registry', description: 'npm 包管理器中的 MCP Server' },
        { id: 'local', name: '本地/Built-in', description: '内置的 MCP Servers' },
      ],
    });
  });

  return router;
}

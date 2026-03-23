import { Router } from 'express';
import { aggregationManager } from '../../marketplace/aggregation/AggregationManager.js';
import { AutoInstaller } from '../../marketplace/aggregation/AutoInstaller.js';
import { GitHubAdapter } from '../../marketplace/aggregation/adapters/GitHubAdapter.js';
import { NpmAdapter } from '../../marketplace/aggregation/adapters/NpmAdapter.js';
import { LocalAdapter } from '../../marketplace/aggregation/adapters/LocalAdapter.js';
import { ComponentRegistry } from '../../marketplace/registry/ComponentRegistry.js';
import { logger } from '../../utils/logger.js';

// 初始化聚合管理器
const githubAdapter = new GitHubAdapter(process.env.GITHUB_TOKEN);
const npmAdapter = new NpmAdapter();
const localAdapter = new LocalAdapter();

aggregationManager.registerAdapter(githubAdapter);
aggregationManager.registerAdapter(npmAdapter);
aggregationManager.registerAdapter(localAdapter);

logger.info('聚合管理器已初始化，注册了 3 个渠道适配器');

// 初始化自动安装器
const registry = new ComponentRegistry();
const autoInstaller = new AutoInstaller(registry);

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

  // 智能推荐并自动安装
  router.post('/auto-install', async (req, res) => {
    const { description, requirements } = req.body;

    try {
      // 如果提供了描述，先分析推荐
      let reqs = requirements;
      if (!reqs && description) {
        const recommendation = await autoInstaller.smartRecommend(description);
        reqs = recommendation.required;
      }

      if (!reqs || reqs.length === 0) {
        return res.status(400).json({ error: '请提供 requirements 或 description' });
      }

      // 执行自动安装
      const result = await autoInstaller.autoInstall(reqs);

      res.json({
        success: true,
        installed: result.installed,
        failed: result.failed,
        recommendations: result.recommendations,
      });
    } catch (error) {
      logger.error('自动安装失败:', error);
      res.status(500).json({ error: 'Auto-install failed' });
    }
  });

  // 智能推荐（不安装）
  router.post('/recommend', async (req, res) => {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    try {
      const result = await autoInstaller.smartRecommend(description);
      res.json(result);
    } catch (error) {
      logger.error('推荐失败:', error);
      res.status(500).json({ error: 'Recommendation failed' });
    }
  });

  // 获取已安装的 Servers
  router.get('/installed', async (req, res) => {
    try {
      const servers = await autoInstaller.getInstalledServers();
      res.json({ servers });
    } catch (error) {
      logger.error('获取已安装列表失败:', error);
      res.status(500).json({ error: 'Failed to get installed servers' });
    }
  });

  // 卸载 Server
  router.delete('/installed/:id', async (req, res) => {
    try {
      const success = await autoInstaller.uninstall(req.params.id);
      if (success) {
        res.json({ success: true, message: 'Uninstalled successfully' });
      } else {
        res.status(404).json({ error: 'Server not found' });
      }
    } catch (error) {
      logger.error('卸载失败:', error);
      res.status(500).json({ error: 'Uninstall failed' });
    }
  });

  return router;
}

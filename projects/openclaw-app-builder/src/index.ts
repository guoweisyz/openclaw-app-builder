import { ComponentRegistry } from './marketplace/registry/ComponentRegistry.js';
import { IntentEngine } from './core/intent/IntentEngine.js';
import { AppManager } from './core/AppManager.js';
import { createServer } from './api/server.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3000;

async function main() {
  logger.info('🚀 OpenClaw App Builder 启动中...');

  // 初始化组件注册表
  const registry = new ComponentRegistry();
  await registry.initialize();

  // 初始化意图理解引擎
  const intentEngine = new IntentEngine(registry);

  // 初始化应用管理器
  const appManager = new AppManager(registry);
  await appManager.initialize();

  // 创建 Express 服务
  const app = createServer({
    registry,
    intentEngine,
    appManager,
  });

  const server = app.listen(PORT, () => {
    logger.info(`✅ 服务已启动: http://localhost:${PORT}`);
    logger.info(`📖 API 文档: http://localhost:${PORT}/api/docs`);
    logger.info('');
    logger.info('可用端点:');
    logger.info(`  POST /api/intent/parse    - 解析用户意图`);
    logger.info(`  POST /api/intent/generate - 生成应用`);
    logger.info(`  GET  /api/components      - 搜索组件`);
    logger.info(`  POST /api/apps            - 创建应用`);
    logger.info(`  POST /api/apps/:id/run    - 运行应用`);
    logger.info(`  POST /api/apps/:id/deploy - 部署应用（启动定时任务）`);
    logger.info(`  POST /api/apps/:id/stop   - 停止应用（取消定时任务）`);
    logger.info(`  POST /api/sync/github     - 从 GitHub 同步`);
    logger.info(`  POST /api/sync/npm        - 从 npm 同步`);
  });

  // 优雅关闭
  process.on('SIGTERM', async () => {
    logger.info('收到 SIGTERM 信号，开始优雅关闭...');
    server.close(() => {
      logger.info('HTTP 服务器已关闭');
    });
    await appManager.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('收到 SIGINT 信号，开始优雅关闭...');
    server.close(() => {
      logger.info('HTTP 服务器已关闭');
    });
    await appManager.shutdown();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('启动失败:', error);
  process.exit(1);
});

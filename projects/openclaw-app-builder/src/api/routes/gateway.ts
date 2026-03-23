import { Router } from 'express';
import { GatewayDeploymentService } from '../../gateway/GatewayDeploymentService.js';
import { gatewayClient } from '../../gateway/GatewayClient.js';
import { logger } from '../../utils/logger.js';

interface RouteDeps {
  gatewayDeploymentService: GatewayDeploymentService;
}

export function createGatewayRoutes(deps: RouteDeps): Router {
  const router = Router();

  // 检查 Gateway 状态
  router.get('/status', async (req, res) => {
    const status = await deps.gatewayDeploymentService.checkGatewayAvailability();
    res.json(status);
  });

  // 部署应用到 Gateway
  router.post('/deploy/:appId', async (req, res) => {
    try {
      const result = await deps.gatewayDeploymentService.deployToGateway(req.params.appId);
      res.json(result);
    } catch (error) {
      logger.error('部署失败:', error);
      res.status(500).json({ success: false, message: 'Deployment failed' });
    }
  });

  // 从 Gateway 取消部署
  router.post('/undeploy/:appId', async (req, res) => {
    try {
      const result = await deps.gatewayDeploymentService.undeployFromGateway(req.params.appId);
      res.json(result);
    } catch (error) {
      logger.error('取消部署失败:', error);
      res.status(500).json({ success: false, message: 'Undeploy failed' });
    }
  });

  // 获取部署状态
  router.get('/status/:appId', async (req, res) => {
    try {
      const status = await deps.gatewayDeploymentService.getDeploymentStatus(req.params.appId);
      res.json(status);
    } catch (error) {
      logger.error('获取状态失败:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  });

  // 获取 Gateway 可用的 MCP Servers
  router.get('/mcp-servers', async (req, res) => {
    try {
      const servers = await deps.gatewayDeploymentService.getGatewayMcpServers();
      res.json({ servers });
    } catch (error) {
      logger.error('获取 MCP Servers 失败:', error);
      res.status(500).json({ error: 'Failed to get MCP servers' });
    }
  });

  // 调用 Gateway 的 MCP 工具
  router.post('/mcp/:serverId/call', async (req, res) => {
    const { tool, args } = req.body;
    
    try {
      const result = await gatewayClient.callMcpTool(req.params.serverId, tool, args);
      res.json(result);
    } catch (error) {
      logger.error('调用 MCP 工具失败:', error);
      res.status(500).json({ error: 'Failed to call MCP tool' });
    }
  });

  // 发送通知
  router.post('/notify', async (req, res) => {
    const { channel, recipient, message } = req.body;
    
    try {
      const result = await deps.gatewayDeploymentService.sendNotification('', {
        channel,
        recipient,
        message,
      });
      res.json(result);
    } catch (error) {
      logger.error('发送通知失败:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  return router;
}

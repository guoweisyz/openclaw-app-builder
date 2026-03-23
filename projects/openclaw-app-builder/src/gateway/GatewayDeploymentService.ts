import { AppManager } from '../core/AppManager.js';
import { gatewayClient } from './GatewayClient.js';
import { logger } from '../utils/logger.js';

/**
 * Gateway 部署服务
 * 将 App Builder 应用部署到 OpenClaw Gateway
 */
export class GatewayDeploymentService {
  private appManager: AppManager;
  private deployedApps: Map<string, { gatewayAppId: string; status: string }> = new Map();

  constructor(appManager: AppManager) {
    this.appManager = appManager;
  }

  /**
   * 检查 Gateway 是否可用
   */
  async checkGatewayAvailability(): Promise<{ available: boolean; message: string }> {
    const health = await gatewayClient.healthCheck();
    
    if (health.available) {
      return {
        available: true,
        message: `Gateway 可用 (版本: ${health.version})`,
      };
    }
    
    return {
      available: false,
      message: 'Gateway 不可用，将使用本地调度器',
    };
  }

  /**
   * 部署应用到 Gateway
   */
  async deployToGateway(appId: string): Promise<{
    success: boolean;
    gatewayAppId?: string;
    message: string;
  }> {
    try {
      // 1. 检查 Gateway 可用性
      const check = await this.checkGatewayAvailability();
      if (!check.available) {
        return { success: false, message: check.message };
      }

      // 2. 获取应用详情
      const app = await this.appManager.get(appId);
      if (!app) {
        return { success: false, message: '应用不存在' };
      }

      // 3. 注册到 Gateway
      const result = await gatewayClient.registerApp({
        id: app.id,
        name: app.name,
        description: app.description,
        trigger: app.trigger,
        workflow: app.workflow,
      });

      if (!result.success) {
        return { 
          success: false, 
          message: `注册失败: ${result.error}` 
        };
      }

      // 4. 保存部署状态
      this.deployedApps.set(appId, {
        gatewayAppId: result.gatewayAppId!,
        status: 'active',
      });

      // 5. 更新本地应用状态
      await this.appManager.update(appId, { 
        status: 'active',
        config: { 
          ...app.config, 
          gatewayAppId: result.gatewayAppId,
          deployedToGateway: true,
        },
      });

      logger.info(`应用已部署到 Gateway: ${app.name} (${result.gatewayAppId})`);

      return {
        success: true,
        gatewayAppId: result.gatewayAppId,
        message: `应用已成功部署到 Gateway，ID: ${result.gatewayAppId}`,
      };
    } catch (error) {
      logger.error('部署到 Gateway 失败:', error);
      return {
        success: false,
        message: `部署失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * 从 Gateway 取消部署
   */
  async undeployFromGateway(appId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const deployed = this.deployedApps.get(appId);
      if (!deployed) {
        return { success: false, message: '应用未部署到 Gateway' };
      }

      // 调用 Gateway API 删除应用
      const response = await fetch(
        `${process.env.OPENCLAW_GATEWAY_URL}/api/apps/${deployed.gatewayAppId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      this.deployedApps.delete(appId);

      // 更新本地状态
      const app = await this.appManager.get(appId);
      if (app) {
        await this.appManager.update(appId, {
          status: 'draft',
          config: {
            ...app.config,
            gatewayAppId: undefined,
            deployedToGateway: false,
          },
        });
      }

      return { success: true, message: '已从 Gateway 取消部署' };
    } catch (error) {
      logger.error('取消部署失败:', error);
      return {
        success: false,
        message: `取消部署失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * 获取部署状态
   */
  async getDeploymentStatus(appId: string): Promise<{
    deployed: boolean;
    gatewayAppId?: string;
    status?: string;
    gatewayStatus?: any;
  }> {
    const deployed = this.deployedApps.get(appId);
    
    if (!deployed) {
      // 检查本地记录
      const app = await this.appManager.get(appId);
      const gatewayAppId = app?.config?.gatewayAppId as string;
      
      if (gatewayAppId) {
        this.deployedApps.set(appId, { gatewayAppId, status: 'unknown' });
        return {
          deployed: true,
          gatewayAppId,
          status: 'unknown',
        };
      }
      
      return { deployed: false };
    }

    // 查询 Gateway 上的状态
    try {
      const response = await fetch(
        `${process.env.OPENCLAW_GATEWAY_URL}/api/apps/${deployed.gatewayAppId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY || ''}`,
          },
        }
      );

      if (response.ok) {
        const gatewayStatus = await response.json();
        return {
          deployed: true,
          gatewayAppId: deployed.gatewayAppId,
          status: gatewayStatus.status,
          gatewayStatus,
        };
      }
    } catch (error) {
      logger.warn('获取 Gateway 状态失败:', error);
    }

    return {
      deployed: true,
      gatewayAppId: deployed.gatewayAppId,
      status: deployed.status,
    };
  }

  /**
   * 同步执行状态
   */
  async syncExecutionStatus(appId: string): Promise<void> {
    const deployed = this.deployedApps.get(appId);
    if (!deployed) return;

    try {
      // 从 Gateway 获取执行历史
      const response = await fetch(
        `${process.env.OPENCLAW_GATEWAY_URL}/api/apps/${deployed.gatewayAppId}/executions`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY || ''}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // 同步到本地数据库
        for (const execution of data.executions || []) {
          // 保存执行记录到本地
          // TODO: 实现去重逻辑
        }
      }
    } catch (error) {
      logger.error('同步执行状态失败:', error);
    }
  }

  /**
   * 使用 Gateway 发送通知
   */
  async sendNotification(
    appId: string,
    options: {
      channel: 'wechat' | 'feishu' | 'email' | 'slack';
      recipient: string;
      message: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // 检查 Gateway 是否可用
    const check = await this.checkGatewayAvailability();
    if (!check.available) {
      return { success: false, error: 'Gateway 不可用' };
    }

    return gatewayClient.sendNotification(options);
  }

  /**
   * 获取 Gateway 可用的 MCP Servers
   */
  async getGatewayMcpServers(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    tools: string[];
  }>> {
    const check = await this.checkGatewayAvailability();
    if (!check.available) {
      return [];
    }

    return gatewayClient.getAvailableMcpServers();
  }
}

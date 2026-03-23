import { logger } from '../utils/logger.js';

/**
 * OpenClaw Gateway 客户端
 * 复用 Gateway 的基础设施能力
 */
export class GatewayClient {
  private gatewayUrl: string;
  private apiKey?: string;

  constructor(gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:8080', apiKey?: string) {
    this.gatewayUrl = gatewayUrl.replace(/\/$/, '');
    this.apiKey = apiKey || process.env.OPENCLAW_API_KEY;
  }

  /**
   * 检查 Gateway 是否可用
   */
  async healthCheck(): Promise<{ available: boolean; version?: string }> {
    try {
      const response = await fetch(`${this.gatewayUrl}/health`, {
        headers: this.getHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        return { available: true, version: data.version };
      }
      
      return { available: false };
    } catch (error) {
      logger.warn('Gateway 健康检查失败:', error);
      return { available: false };
    }
  }

  /**
   * 注册应用到 Gateway
   */
  async registerApp(app: {
    id: string;
    name: string;
    description: string;
    trigger: any;
    workflow: any[];
  }): Promise<{ success: boolean; gatewayAppId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/apps`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          externalId: app.id,
          name: app.name,
          description: app.description,
          trigger: this.convertTrigger(app.trigger),
          workflow: this.convertWorkflow(app.workflow),
          source: 'app-builder',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      logger.info(`应用已注册到 Gateway: ${app.name} (${data.id})`);
      
      return { success: true, gatewayAppId: data.id };
    } catch (error) {
      logger.error('注册应用到 Gateway 失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * 调度应用执行
   */
  async scheduleExecution(
    gatewayAppId: string,
    inputs?: Record<string, unknown>
  ): Promise<{ success: boolean; executionId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/apps/${gatewayAppId}/execute`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ inputs }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      return { success: true, executionId: data.executionId };
    } catch (error) {
      logger.error('调度执行失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * 获取执行状态
   */
  async getExecutionStatus(executionId: string): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed';
    outputs?: Record<string, unknown>;
    error?: string;
  } | null> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/executions/${executionId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      logger.error('获取执行状态失败:', error);
      return null;
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(options: {
    channel: 'wechat' | 'feishu' | 'email' | 'slack';
    recipient: string;
    message: string;
    attachments?: any[];
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/notify`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      return { success: true, messageId: data.messageId };
    } catch (error) {
      logger.error('发送通知失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * 调用 Gateway 的 MCP Server
   */
  async callMcpTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/mcp/${serverId}/call`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ tool: toolName, arguments: args }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      return { success: true, result: data.result };
    } catch (error) {
      logger.error('调用 MCP 工具失败:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * 获取 Gateway 可用的 MCP Servers
   */
  async getAvailableMcpServers(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    tools: string[];
  }>> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/mcp/servers`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.servers || [];
    } catch (error) {
      logger.error('获取 MCP Servers 失败:', error);
      return [];
    }
  }

  /**
   * 转换触发器格式
   */
  private convertTrigger(trigger: any): any {
    // 将 App Builder 的触发器格式转换为 Gateway 格式
    switch (trigger.type) {
      case 'schedule':
        return {
          type: 'cron',
          config: {
            cron: trigger.config?.cron,
            timezone: trigger.config?.timezone || 'Asia/Shanghai',
          },
        };
      case 'webhook':
        return {
          type: 'webhook',
          config: {
            path: trigger.config?.path || `/webhook/${Date.now()}`,
          },
        };
      case 'event':
        return {
          type: 'event',
          config: {
            eventType: trigger.config?.eventType,
          },
        };
      default:
        return { type: 'manual' };
    }
  }

  /**
   * 转换工作流格式
   */
  private convertWorkflow(workflow: any[]): any[] {
    // 将 App Builder 的工作流转换为 Gateway 格式
    return workflow.map((step, index) => ({
      id: step.id || `step_${index}`,
      name: step.name,
      type: 'mcp',
      config: {
        serverId: step.componentId,
        tool: step.action,
        inputs: step.inputs,
      },
      onError: step.onError || 'stop',
    }));
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }
}

export const gatewayClient = new GatewayClient();

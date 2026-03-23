import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Component } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * MCP 客户端
 * 连接并调用 MCP Servers
 */
export class MCPClient {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();

  /**
   * 连接到 MCP Server
   */
  async connect(componentId: string, config: Component['mcpConfig']): Promise<Client> {
    if (this.clients.has(componentId)) {
      return this.clients.get(componentId)!;
    }

    if (!config) {
      throw new Error(`组件缺少 MCP 配置: ${componentId}`);
    }

    logger.info(`连接 MCP Server: ${componentId}`);

    try {
      const transport = new StdioClientTransport({
        command: config.command || '',
        args: config.args || [],
        env: config.env as Record<string, string>,
      });

      const client = new Client(
        { name: 'openclaw-app-builder', version: '0.1.0' },
        { capabilities: {} }
      );

      await client.connect(transport);

      this.clients.set(componentId, client);
      this.transports.set(componentId, transport);

      logger.info(`✓ 已连接: ${componentId}`);
      return client;
    } catch (error) {
      logger.error(`连接失败 ${componentId}:`, error);
      throw error;
    }
  }

  /**
   * 获取可用工具列表
   */
  async listTools(componentId: string): Promise<any[]> {
    const client = this.clients.get(componentId);
    if (!client) {
      throw new Error(`未连接: ${componentId}`);
    }

    try {
      const result = await client.listTools();
      return result.tools || [];
    } catch (error) {
      logger.error(`获取工具列表失败 ${componentId}:`, error);
      return [];
    }
  }

  /**
   * 调用工具
   */
  async callTool(
    componentId: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    const client = this.clients.get(componentId);
    if (!client) {
      throw new Error(`未连接: ${componentId}`);
    }

    logger.info(`调用工具: ${componentId}/${toolName}`, args);

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      logger.info(`✓ 工具调用成功: ${toolName}`);
      return result;
    } catch (error) {
      logger.error(`工具调用失败 ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(componentId?: string): Promise<void> {
    if (componentId) {
      const client = this.clients.get(componentId);
      const transport = this.transports.get(componentId);

      if (client) {
        await client.close();
        this.clients.delete(componentId);
      }

      if (transport) {
        await transport.close();
        this.transports.delete(componentId);
      }

      logger.info(`已断开: ${componentId}`);
    } else {
      // 断开所有连接
      for (const [id, client] of this.clients) {
        await client.close();
        const transport = this.transports.get(id);
        if (transport) await transport.close();
      }
      this.clients.clear();
      this.transports.clear();
      logger.info('已断开所有连接');
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(componentId: string): boolean {
    return this.clients.has(componentId);
  }
}

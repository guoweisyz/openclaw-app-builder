import { ComponentRegistry } from '../registry/ComponentRegistry.js';
import { aggregationManager } from './AggregationManager.js';
import type { AggregatedServer } from './AggregationManager.js';
import type { Component } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * MCP Server 自动安装器
 * 根据用户需求自动发现、安装、配置 MCP Servers
 */
export class AutoInstaller {
  private registry: ComponentRegistry;
  private installedDir: string;

  constructor(registry: ComponentRegistry, installedDir = './data/installed-servers') {
    this.registry = registry;
    this.installedDir = installedDir;
  }

  /**
   * 分析用户需求，推荐并自动安装合适的 MCP Servers
   */
  async autoInstall(requirements: string[]): Promise<{
    installed: string[];
    failed: string[];
    recommendations: string[];
  }> {
    logger.info('开始自动安装 MCP Servers:', requirements);

    const result = {
      installed: [] as string[],
      failed: [] as string[],
      recommendations: [] as string[],
    };

    for (const requirement of requirements) {
      try {
        // 1. 搜索匹配的 Server
        const searchResult = await aggregationManager.searchAll(requirement, { limit: 5 });
        
        if (searchResult.results.length === 0) {
          logger.warn(`未找到匹配的 MCP Server: ${requirement}`);
          result.recommendations.push(`未找到: ${requirement}`);
          continue;
        }

        // 2. 选择最佳匹配（优先验证过的、星标高的）
        const bestMatch = this.selectBestMatch(searchResult.results);
        
        if (!bestMatch) {
          result.failed.push(requirement);
          continue;
        }

        // 3. 检查是否已安装
        const existing = await this.registry.getComponent(bestMatch.id);
        if (existing) {
          logger.info(`MCP Server 已存在: ${bestMatch.name}`);
          result.installed.push(`${bestMatch.name} (已存在)`);
          continue;
        }

        // 4. 自动安装
        const success = await this.installServer(bestMatch);
        
        if (success) {
          result.installed.push(bestMatch.name);
          logger.info(`✓ 自动安装成功: ${bestMatch.name}`);
        } else {
          result.failed.push(requirement);
          logger.error(`✗ 自动安装失败: ${bestMatch.name}`);
        }
      } catch (error) {
        logger.error(`自动安装出错 ${requirement}:`, error);
        result.failed.push(requirement);
      }
    }

    return result;
  }

  /**
   * 根据用户描述智能推荐 MCP Servers
   */
  async smartRecommend(description: string): Promise<{
    required: string[];
    recommended: string[];
    analysis: string;
  }> {
    // 分析用户描述，提取关键需求
    const keywords = this.extractKeywords(description);
    
    const required: string[] = [];
    const recommended: string[] = [];

    // 根据关键词匹配需求
    for (const keyword of keywords) {
      // 搜索相关 Servers
      const result = await aggregationManager.searchAll(keyword, { limit: 3 });
      
      for (const server of result.results.slice(0, 2)) {
        if (server.stats.stars && server.stats.stars > 50) {
          required.push(server.name);
        } else {
          recommended.push(server.name);
        }
      }
    }

    // 去重
    const uniqueRequired = [...new Set(required)];
    const uniqueRecommended = [...new Set(recommended)].filter(r => !uniqueRequired.includes(r));

    return {
      required: uniqueRequired,
      recommended: uniqueRecommended,
      analysis: `基于描述分析，建议安装 ${uniqueRequired.length} 个核心组件${uniqueRecommended.length > 0 ? `和 ${uniqueRecommended.length} 个可选组件` : ''}`,
    };
  }

  /**
   * 安装单个 MCP Server
   */
  private async installServer(server: AggregatedServer): Promise<boolean> {
    try {
      // 创建安装目录
      const installDir = path.join(this.installedDir, server.name);
      await fs.mkdir(installDir, { recursive: true });

      // 根据安装类型执行安装
      switch (server.install.type) {
        case 'npm':
          return await this.installNpmServer(server, installDir);
        case 'source':
          return await this.installSourceServer(server, installDir);
        case 'docker':
          return await this.installDockerServer(server, installDir);
        default:
          logger.warn(`不支持的安装类型: ${server.install.type}`);
          return false;
      }
    } catch (error) {
      logger.error(`安装失败 ${server.name}:`, error);
      return false;
    }
  }

  /**
   * 安装 npm 包类型的 Server
   */
  private async installNpmServer(server: AggregatedServer, installDir: string): Promise<boolean> {
    const packageName = server.install.package;
    if (!packageName) return false;

    logger.info(`安装 npm 包: ${packageName}`);

    try {
      // 安装到指定目录
      await execAsync(`npm install ${packageName}`, { cwd: installDir });

      // 转换为组件并注册
      const component = this.convertToComponent(server, installDir);
      await this.registry.saveComponent(component);

      return true;
    } catch (error) {
      logger.error(`npm 安装失败 ${packageName}:`, error);
      return false;
    }
  }

  /**
   * 安装源码类型的 Server
   */
  private async installSourceServer(server: AggregatedServer, installDir: string): Promise<boolean> {
    const url = server.source.url;
    
    logger.info(`克隆源码: ${url}`);

    try {
      // 克隆仓库
      await execAsync(`git clone ${url} .`, { cwd: installDir });

      // 安装依赖
      await execAsync('npm install', { cwd: installDir });

      // 构建（如果有 build 脚本）
      try {
        await execAsync('npm run build', { cwd: installDir });
      } catch {
        // 忽略构建错误，可能不需要构建
      }

      // 转换为组件并注册
      const component = this.convertToComponent(server, installDir);
      await this.registry.saveComponent(component);

      return true;
    } catch (error) {
      logger.error(`源码安装失败 ${server.name}:`, error);
      return false;
    }
  }

  /**
   * 安装 Docker 类型的 Server
   */
  private async installDockerServer(server: AggregatedServer, installDir: string): Promise<boolean> {
    const image = server.install.package;
    if (!image) return false;

    logger.info(`拉取 Docker 镜像: ${image}`);

    try {
      await execAsync(`docker pull ${image}`);

      // 转换为组件并注册
      const component = this.convertToComponent(server, installDir);
      await this.registry.saveComponent(component);

      return true;
    } catch (error) {
      logger.error(`Docker 安装失败 ${image}:`, error);
      return false;
    }
  }

  /**
   * 将 AggregatedServer 转换为 Component
   */
  private convertToComponent(server: AggregatedServer, installDir: string): Component {
    return {
      id: `installed:${server.name}`,
      name: server.name,
      displayName: server.displayName,
      description: server.description,
      version: server.version,
      source: {
        channel: 'installed',
        url: server.source.url,
        packageName: server.source.packageName,
      },
      type: 'mcp-server',
      install: {
        type: server.install.type,
        package: server.install.package,
        command: server.install.command,
      },
      mcpConfig: server.mcpConfig || {
        transport: 'stdio',
        command: 'node',
        args: ['index.js'],
      },
      capabilities: server.capabilities,
      tags: [...server.tags, 'auto-installed'],
      author: server.author,
      license: server.license,
      verified: server.verified,
      featured: server.featured,
    };
  }

  /**
   * 选择最佳匹配的 Server
   */
  private selectBestMatch(servers: AggregatedServer[]): AggregatedServer | null {
    // 排序：验证过的 > 星标高的 > 下载量高的
    const sorted = servers.sort((a, b) => {
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      const aScore = (a.stats.stars || 0) + (a.stats.downloads || 0) / 1000;
      const bScore = (b.stats.stars || 0) + (b.stats.downloads || 0) / 1000;
      return bScore - aScore;
    });

    return sorted[0] || null;
  }

  /**
   * 从描述中提取关键词
   */
  private extractKeywords(description: string): string[] {
    const keywords: string[] = [];
    const lower = description.toLowerCase();

    // 关键词映射
    const keywordMap: Record<string, string[]> = {
      'weather': ['weather', '天气', '温度'],
      'fetch': ['fetch', 'http', 'web', '网页', '请求'],
      'filesystem': ['file', 'filesystem', '文件', '存储'],
      'database': ['database', 'db', 'sql', '数据库', 'mysql', 'postgres'],
      'email': ['email', 'mail', '邮件', 'smtp'],
      'slack': ['slack', '消息'],
      'discord': ['discord'],
      'github': ['github', 'git', '代码'],
      'notion': ['notion', '笔记'],
    };

    for (const [key, aliases] of Object.entries(keywordMap)) {
      if (aliases.some(alias => lower.includes(alias))) {
        keywords.push(key);
      }
    }

    // 如果没有匹配到，返回描述中的名词
    if (keywords.length === 0) {
      const words = description.split(/\s+/).filter(w => w.length > 2);
      keywords.push(...words.slice(0, 3));
    }

    return keywords;
  }

  /**
   * 获取已安装的 Servers
   */
  async getInstalledServers(): Promise<Component[]> {
    return this.registry.search({ query: '', channels: ['installed'] });
  }

  /**
   * 卸载 Server
   */
  async uninstall(serverId: string): Promise<boolean> {
    try {
      const component = await this.registry.getComponent(serverId);
      if (!component) return false;

      // 删除安装目录
      const installDir = path.join(this.installedDir, component.name);
      await fs.rm(installDir, { recursive: true, force: true });

      // 从注册表移除
      // 注意：这里需要添加删除方法到 ComponentRegistry
      logger.info(`已卸载: ${component.name}`);
      return true;
    } catch (error) {
      logger.error(`卸载失败 ${serverId}:`, error);
      return false;
    }
  }
}

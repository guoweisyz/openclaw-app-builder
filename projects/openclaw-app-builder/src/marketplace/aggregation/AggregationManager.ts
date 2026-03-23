import type { Component } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * 聚合 MCP Server 信息
 */
export interface AggregatedServer {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  
  // 来源信息
  source: {
    channel: string;
    url: string;
    originalId: string;
    packageName?: string;
  };
  
  // 安装信息
  install: {
    type: 'npm' | 'pip' | 'docker' | 'source';
    command?: string;
    package?: string;
    registry?: string;
  };
  
  // MCP 配置
  mcpConfig?: {
    transport: 'stdio' | 'sse' | 'http';
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
  };
  
  // 元数据
  capabilities: string[];
  tags: string[];
  author?: string;
  license?: string;
  
  // 统计
  stats: {
    downloads?: number;
    stars?: number;
    rating?: number;
    lastUpdated?: string;
  };
  
  // 聚合特有
  aggregatedFrom: string[];  // 在哪些渠道发现过
  firstSeen: string;
  lastSynced: string;
  verified: boolean;
  featured: boolean;
}

/**
 * 渠道适配器接口
 */
export interface ChannelAdapter {
  name: string;
  displayName: string;
  
  /**
   * 搜索 Servers
   */
  search(query: string, options?: { limit?: number }): Promise<AggregatedServer[]>;
  
  /**
   * 获取单个 Server 详情
   */
  getDetails(id: string): Promise<AggregatedServer | null>;
  
  /**
   * 获取热门/推荐 Servers
   */
  getFeatured?(limit?: number): Promise<AggregatedServer[]>;
  
  /**
   * 检查渠道健康状态
   */
  healthCheck(): Promise<{ healthy: boolean; latency: number }>;
}

/**
 * 聚合管理器
 * 统一管理来自不同渠道的 MCP Servers
 */
export class AggregationManager {
  private adapters: Map<string, ChannelAdapter> = new Map();
  private cache: Map<string, { data: AggregatedServer[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 注册渠道适配器
   */
  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.name, adapter);
    logger.info(`注册渠道适配器: ${adapter.displayName}`);
  }

  /**
   * 从所有渠道搜索
   */
  async searchAll(query: string, options?: { limit?: number; channels?: string[] }): Promise<{
    results: AggregatedServer[];
    stats: {
      total: number;
      byChannel: Record<string, number>;
      timeMs: number;
    };
  }> {
    const startTime = Date.now();
    const channels = options?.channels || Array.from(this.adapters.keys());
    const limit = options?.limit || 30;
    
    logger.info(`跨渠道搜索: "${query}" (${channels.join(', ')})`);
    
    // 并行搜索所有渠道
    const searchPromises = channels.map(async (channelName) => {
      const adapter = this.adapters.get(channelName);
      if (!adapter) return [];
      
      try {
        const results = await adapter.search(query, { limit: Math.ceil(limit / channels.length) });
        return results.map(r => ({ ...r, aggregatedFrom: [channelName] }));
      } catch (error) {
        logger.error(`${channelName} 搜索失败:`, error);
        return [];
      }
    });
    
    const resultsArrays = await Promise.all(searchPromises);
    
    // 合并并去重
    const merged = this.mergeResults(resultsArrays.flat());
    
    // 排序（按评分、下载量等）
    const sorted = this.sortResults(merged);
    
    const timeMs = Date.now() - startTime;
    const byChannel: Record<string, number> = {};
    channels.forEach(c => byChannel[c] = 0);
    merged.forEach(r => {
      r.aggregatedFrom.forEach(c => {
        byChannel[c] = (byChannel[c] || 0) + 1;
      });
    });
    
    logger.info(`搜索完成: ${sorted.length} 个结果, 耗时 ${timeMs}ms`);
    
    return {
      results: sorted.slice(0, limit),
      stats: {
        total: sorted.length,
        byChannel,
        timeMs,
      },
    };
  }

  /**
   * 获取推荐/热门 Servers
   */
  async getFeatured(options?: { limit?: number; channels?: string[] }): Promise<AggregatedServer[]> {
    const channels = options?.channels || Array.from(this.adapters.keys());
    const limit = options?.limit || 20;
    
    const featuredPromises = channels.map(async (channelName) => {
      const adapter = this.adapters.get(channelName);
      if (!adapter?.getFeatured) return [];
      
      try {
        return await adapter.getFeatured(Math.ceil(limit / channels.length));
      } catch (error) {
        logger.error(`${channelName} 获取推荐失败:`, error);
        return [];
      }
    });
    
    const resultsArrays = await Promise.all(featuredPromises);
    const merged = this.mergeResults(resultsArrays.flat());
    return this.sortResults(merged).slice(0, limit);
  }

  /**
   * 获取渠道健康状态
   */
  async getHealthStatus(): Promise<Record<string, { healthy: boolean; latency: number }>> {
    const status: Record<string, { healthy: boolean; latency: number }> = {};
    
    for (const [name, adapter] of this.adapters) {
      try {
        status[name] = await adapter.healthCheck();
      } catch (error) {
        status[name] = { healthy: false, latency: -1 };
      }
    }
    
    return status;
  }

  /**
   * 合并结果（去重）
   */
  private mergeResults(servers: AggregatedServer[]): AggregatedServer[] {
    const map = new Map<string, AggregatedServer>();
    
    for (const server of servers) {
      const key = this.getServerKey(server);
      const existing = map.get(key);
      
      if (existing) {
        // 合并来源渠道
        existing.aggregatedFrom = [...new Set([...existing.aggregatedFrom, ...server.aggregatedFrom])];
        
        // 合并统计信息（取最大值）
        existing.stats.downloads = Math.max(existing.stats.downloads || 0, server.stats.downloads || 0);
        existing.stats.stars = Math.max(existing.stats.stars || 0, server.stats.stars || 0);
        
        // 选择最新的更新时间
        if (server.stats.lastUpdated && (!existing.stats.lastUpdated || server.stats.lastUpdated > existing.stats.lastUpdated)) {
          existing.stats.lastUpdated = server.stats.lastUpdated;
          existing.version = server.version;
        }
      } else {
        map.set(key, { ...server });
      }
    }
    
    return Array.from(map.values());
  }

  /**
   * 生成 Server 唯一标识
   */
  private getServerKey(server: AggregatedServer): string {
    // 优先使用包名，否则使用名称+作者
    return server.source.packageName || `${server.name}:${server.author || 'unknown'}`;
  }

  /**
   * 排序结果
   */
  private sortResults(servers: AggregatedServer[]): AggregatedServer[] {
    return servers.sort((a, b) => {
      // 优先显示验证过的
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      
      // 其次按评分/星标排序
      const aScore = (a.stats.stars || 0) + (a.stats.downloads || 0) / 1000;
      const bScore = (b.stats.stars || 0) + (b.stats.downloads || 0) / 1000;
      return bScore - aScore;
    });
  }
}

export const aggregationManager = new AggregationManager();

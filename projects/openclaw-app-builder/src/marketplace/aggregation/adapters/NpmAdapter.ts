import type { ChannelAdapter, AggregatedServer } from '../AggregationManager.js';
import { logger } from '../../../utils/logger.js';

/**
 * npm 渠道适配器
 */
export class NpmAdapter implements ChannelAdapter {
  name = 'npm';
  displayName = 'npm Registry';
  private registryURL = 'https://registry.npmjs.org';

  async search(query: string, options?: { limit?: number }): Promise<AggregatedServer[]> {
    const limit = options?.limit || 30;
    
    logger.info(`[npm] 搜索: ${query}`);
    
    try {
      // npm 搜索 API
      const searchQuery = query 
        ? `${query} mcp-server`
        : 'mcp-server';
      
      const response = await fetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(searchQuery)}&size=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`npm API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const servers = await Promise.all(
        data.objects.map((obj: any) => this.parsePackage(obj.package))
      );
      
      return servers.filter(Boolean) as AggregatedServer[];
    } catch (error) {
      logger.error('[npm] 搜索失败:', error);
      return [];
    }
  }

  async getDetails(id: string): Promise<AggregatedServer | null> {
    try {
      const response = await fetch(`${this.registryURL}/${id}`);
      
      if (!response.ok) return null;
      
      const pkg = await response.json();
      return this.parsePackage(pkg);
    } catch (error) {
      logger.error('[npm] 获取详情失败:', error);
      return null;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.registryURL}/-/ping`);
      return { healthy: response.ok, latency: Date.now() - start };
    } catch {
      return { healthy: false, latency: Date.now() - start };
    }
  }

  private async parsePackage(pkg: any): Promise<AggregatedServer | null> {
    try {
      // 检测是否为 MCP Server
      const isMcpServer = this.detectMcpServer(pkg);
      if (!isMcpServer) return null;
      
      const latest = pkg.versions?.[pkg['dist-tags']?.latest] || {};
      
      return {
        id: `npm:${pkg.name}`,
        name: pkg.name.replace(/^@[^/]+\//, ''),
        displayName: pkg.name,
        description: pkg.description || '',
        version: pkg['dist-tags']?.latest || '0.0.0',
        
        source: {
          channel: 'npm',
          url: `https://www.npmjs.com/package/${pkg.name}`,
          originalId: pkg.name,
          packageName: pkg.name,
        },
        
        install: {
          type: 'npm',
          package: pkg.name,
          command: `npx -y ${pkg.name}`,
          registry: this.registryURL,
        },
        
        mcpConfig: {
          transport: 'stdio',
          command: 'npx',
          args: ['-y', pkg.name],
        },
        
        capabilities: ['tools'],
        tags: [...(pkg.keywords || []), 'npm', 'mcp-server'],
        author: pkg.author?.name || pkg.author,
        license: pkg.license,
        
        stats: {
          downloads: pkg.downloads?.['last-month'],
          lastUpdated: pkg.time?.modified,
        },
        
        aggregatedFrom: ['npm'],
        firstSeen: new Date().toISOString(),
        lastSynced: new Date().toISOString(),
        verified: false,
        featured: (pkg.downloads?.['last-month'] || 0) > 1000,
      };
    } catch (error) {
      logger.error(`[npm] 解析包失败 ${pkg.name}:`, error);
      return null;
    }
  }

  private detectMcpServer(pkg: any): boolean {
    // 检查关键词
    if (pkg.keywords?.some((k: string) => k.includes('mcp'))) return true;
    
    // 检查名称
    if (pkg.name.includes('mcp')) return true;
    
    // 检查依赖
    const latest = pkg.versions?.[pkg['dist-tags']?.latest];
    if (latest?.dependencies?.['@modelcontextprotocol/sdk']) return true;
    
    return false;
  }
}

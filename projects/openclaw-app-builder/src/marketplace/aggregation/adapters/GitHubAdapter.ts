import type { ChannelAdapter, AggregatedServer } from '../AggregationManager.js';
import { logger } from '../../../utils/logger.js';

/**
 * GitHub 渠道适配器
 */
export class GitHubAdapter implements ChannelAdapter {
  name = 'github';
  displayName = 'GitHub';
  private baseURL = 'https://api.github.com';
  private token?: string;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN;
  }

  async search(query: string, options?: { limit?: number }): Promise<AggregatedServer[]> {
    const limit = options?.limit || 30;
    
    logger.info(`[GitHub] 搜索: ${query}`);
    
    try {
      // 搜索 topic:mcp-server 的仓库
      const searchQuery = query 
        ? `${query} topic:mcp-server`
        : 'topic:mcp-server';
      
      const response = await fetch(
        `${this.baseURL}/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=${limit}`,
        {
          headers: this.token ? { Authorization: `token ${this.token}` } : {},
        }
      );
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 并行获取详细信息
      const servers = await Promise.all(
        data.items.map((repo: any) => this.parseRepository(repo))
      );
      
      return servers.filter(Boolean) as AggregatedServer[];
    } catch (error) {
      logger.error('[GitHub] 搜索失败:', error);
      return [];
    }
  }

  async getDetails(id: string): Promise<AggregatedServer | null> {
    try {
      const response = await fetch(`${this.baseURL}/repos/${id}`, {
        headers: this.token ? { Authorization: `token ${this.token}` } : {},
      });
      
      if (!response.ok) return null;
      
      const repo = await response.json();
      return this.parseRepository(repo);
    } catch (error) {
      logger.error('[GitHub] 获取详情失败:', error);
      return null;
    }
  }

  async getFeatured(limit = 20): Promise<AggregatedServer[]> {
    // 获取星标最多的 MCP Servers
    return this.search('', { limit });
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseURL}/rate_limit`, {
        headers: this.token ? { Authorization: `token ${this.token}` } : {},
      });
      return { healthy: response.ok, latency: Date.now() - start };
    } catch {
      return { healthy: false, latency: Date.now() - start };
    }
  }

  private async parseRepository(repo: any): Promise<AggregatedServer | null> {
    try {
      // 尝试获取 package.json
      const packageJson = await this.fetchPackageJson(repo.full_name);
      
      // 检测是否为 MCP Server
      const isMcpServer = this.detectMcpServer(repo, packageJson);
      if (!isMcpServer) return null;
      
      const name = packageJson?.name || repo.name;
      
      return {
        id: `github:${repo.full_name}`,
        name: name.replace(/^@[^/]+\//, ''),
        displayName: repo.name,
        description: repo.description || packageJson?.description || '',
        version: packageJson?.version || '0.0.0',
        
        source: {
          channel: 'github',
          url: repo.html_url,
          originalId: repo.full_name,
          packageName: name,
        },
        
        install: {
          type: 'npm',
          package: name,
          command: `npx -y ${name}`,
        },
        
        mcpConfig: {
          transport: 'stdio',
          command: 'npx',
          args: ['-y', name],
        },
        
        capabilities: ['tools'],
        tags: [...(repo.topics || []), 'github', 'mcp-server'],
        author: repo.owner.login,
        license: repo.license?.spdx_id,
        
        stats: {
          stars: repo.stargazers_count,
          lastUpdated: repo.updated_at,
        },
        
        aggregatedFrom: ['github'],
        firstSeen: new Date().toISOString(),
        lastSynced: new Date().toISOString(),
        verified: false,
        featured: repo.stargazers_count > 100,
      };
    } catch (error) {
      logger.error(`[GitHub] 解析仓库失败 ${repo.full_name}:`, error);
      return null;
    }
  }

  private async fetchPackageJson(repoFullName: string): Promise<any | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/repos/${repoFullName}/contents/package.json`,
        { headers: this.token ? { Authorization: `token ${this.token}` } : {} }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const content = Buffer.from(data.content, 'base64').toString();
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private detectMcpServer(repo: any, packageJson: any): boolean {
    // 检查 topics
    if (repo.topics?.includes('mcp-server')) return true;
    
    // 检查 package.json 依赖
    if (packageJson) {
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      if (deps['@modelcontextprotocol/sdk']) return true;
    }
    
    // 检查名称
    if (repo.name.includes('mcp') || repo.name.includes('mcp-server')) return true;
    
    return false;
  }
}

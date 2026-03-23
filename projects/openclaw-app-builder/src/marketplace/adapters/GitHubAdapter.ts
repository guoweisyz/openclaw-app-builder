import axios from 'axios';
import type { Component } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * GitHub 适配器
 * 抓取 topic:mcp-server 的仓库
 */
export class GitHubAdapter {
  private baseURL = 'https://api.github.com';
  private token?: string;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN;
  }

  /**
   * 搜索 MCP Servers
   */
  async searchMcpServers(options: {
    query?: string;
    language?: string;
    limit?: number;
  } = {}): Promise<Component[]> {
    const { query = '', language, limit = 30 } = options;
    
    // 构建搜索查询
    let searchQuery = 'topic:mcp-server';
    if (query) searchQuery += ` ${query}`;
    if (language) searchQuery += ` language:${language}`;
    
    logger.info(`搜索 GitHub: ${searchQuery}`);
    
    try {
      const response = await axios.get(`${this.baseURL}/search/repositories`, {
        headers: this.token ? { Authorization: `token ${this.token}` } : {},
        params: {
          q: searchQuery,
          sort: 'stars',
          order: 'desc',
          per_page: limit,
        },
      });

      const repos = response.data.items || [];
      logger.info(`找到 ${repos.length} 个仓库`);

      // 并行获取每个仓库的详细信息
      const components = await Promise.all(
        repos.map((repo: any) => this.parseRepository(repo))
      );

      return components.filter(Boolean) as Component[];
    } catch (error) {
      logger.error('GitHub 搜索失败:', error);
      return [];
    }
  }

  /**
   * 解析仓库信息为组件
   */
  private async parseRepository(repo: any): Promise<Component | null> {
    try {
      // 获取 package.json（如果存在）
      const packageJson = await this.fetchPackageJson(repo.full_name);
      
      // 获取 README 内容
      const readme = await this.fetchReadme(repo.full_name);
      
      // 判断是否为 MCP Server
      const isMcpServer = this.detectMcpServer(packageJson, readme);
      
      if (!isMcpServer) {
        return null;
      }

      // 提取安装信息
      const installInfo = this.extractInstallInfo(repo, packageJson);

      return {
        id: `github:${repo.full_name}`,
        name: packageJson?.name || repo.name,
        displayName: this.extractDisplayName(packageJson, repo),
        description: repo.description || packageJson?.description || '',
        version: packageJson?.version || '0.0.0',
        
        source: {
          channel: 'github',
          url: repo.html_url,
          packageName: packageJson?.name,
        },
        
        type: 'mcp-server',
        install: installInfo,
        
        mcpConfig: this.buildMcpConfig(installInfo),
        
        capabilities: this.detectCapabilities(readme, packageJson),
        tags: this.extractTags(repo, readme),
        
        stats: {
          stars: repo.stargazers_count,
          lastUpdated: repo.updated_at,
        },
        
        author: repo.owner.login,
        license: repo.license?.spdx_id,
        verified: false,
      };
    } catch (error) {
      logger.error(`解析仓库失败 ${repo.full_name}:`, error);
      return null;
    }
  }

  /**
   * 获取 package.json
   */
  private async fetchPackageJson(repoFullName: string): Promise<any | null> {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${repoFullName}/contents/package.json`,
        { headers: this.token ? { Authorization: `token ${this.token}` } : {} }
      );
      
      const content = Buffer.from(response.data.content, 'base64').toString();
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * 获取 README
   */
  private async fetchReadme(repoFullName: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${repoFullName}/readme`,
        { headers: this.token ? { Authorization: `token ${this.token}` } : {} }
      );
      
      return Buffer.from(response.data.content, 'base64').toString();
    } catch {
      return '';
    }
  }

  /**
   * 检测是否为 MCP Server
   */
  private detectMcpServer(packageJson: any, readme: string): boolean {
    // 检查 package.json 依赖
    if (packageJson) {
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      
      if (deps['@modelcontextprotocol/sdk'] || deps['@anthropic-ai/mcp']) {
        return true;
      }
    }
    
    // 检查 README 关键词
    const keywords = ['mcp', 'model context protocol', 'mcp-server'];
    const readmeLower = readme.toLowerCase();
    
    return keywords.some(k => readmeLower.includes(k));
  }

  /**
   * 提取显示名称
   */
  private extractDisplayName(packageJson: any, repo: any): string {
    if (packageJson?.displayName) return packageJson.displayName;
    if (packageJson?.name) {
      // 移除 @scope/ 前缀
      return packageJson.name.replace(/^@[^/]+\//, '');
    }
    return repo.name;
  }

  /**
   * 提取安装信息
   */
  private extractInstallInfo(repo: any, packageJson: any): Component['install'] {
    // 如果有 package.json，使用 npm 安装
    if (packageJson?.name) {
      return {
        type: 'npm',
        package: packageJson.name,
        command: `npx -y ${packageJson.name}`,
      };
    }
    
    // 否则使用源码安装
    return {
      type: 'source',
      command: `git clone ${repo.clone_url} && cd ${repo.name} && npm install && npm run build`,
    };
  }

  /**
   * 构建 MCP 配置
   */
  private buildMcpConfig(install: Component['install']): Component['mcpConfig'] {
    if (install.type === 'npm' && install.package) {
      return {
        transport: 'stdio',
        command: 'npx',
        args: ['-y', install.package],
      };
    }
    
    return {
      transport: 'stdio',
      command: 'node',
      args: ['index.js'],
    };
  }

  /**
   * 检测能力
   */
  private detectCapabilities(readme: string, packageJson: any): string[] {
    const capabilities: string[] = [];
    const text = (readme + JSON.stringify(packageJson)).toLowerCase();
    
    if (text.includes('tool')) capabilities.push('tools');
    if (text.includes('resource')) capabilities.push('resources');
    if (text.includes('prompt')) capabilities.push('prompts');
    
    return capabilities.length > 0 ? capabilities : ['tools'];
  }

  /**
   * 提取标签
   */
  private extractTags(repo: any, readme: string): string[] {
    const tags = new Set<string>(['mcp', 'mcp-server']);
    
    // 从仓库 topics 提取
    if (repo.topics) {
      repo.topics.forEach((t: string) => tags.add(t.toLowerCase()));
    }
    
    // 从语言提取
    if (repo.language) {
      tags.add(repo.language.toLowerCase());
    }
    
    // 从 README 提取关键词
    const keywords = [
      'weather', 'file', 'database', 'api', 'web', 'search',
      'slack', 'discord', 'notion', 'github', 'git',
      'browser', 'puppeteer', 'playwright',
    ];
    
    const text = readme.toLowerCase();
    keywords.forEach(k => {
      if (text.includes(k)) tags.add(k);
    });
    
    return Array.from(tags);
  }
}

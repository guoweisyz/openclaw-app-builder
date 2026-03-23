import axios from 'axios';
import type { Component } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * npm 适配器
 * 搜索 @modelcontextprotocol 相关的包
 */
export class NpmAdapter {
  private registryURL = 'https://registry.npmjs.org';
  private searchURL = 'https://api.npms.io/v2/search';

  /**
   * 搜索 MCP 相关的包
   */
  async searchMcpPackages(options: {
    query?: string;
    limit?: number;
  } = {}): Promise<Component[]> {
    const { query = '', limit = 30 } = options;
    
    // 构建搜索查询
    const searchQuery = query 
      ? `@modelcontextprotocol ${query}`
      : '@modelcontextprotocol';
    
    logger.info(`搜索 npm: ${searchQuery}`);
    
    try {
      const response = await axios.get(this.searchURL, {
        params: {
          q: searchQuery,
          size: limit,
        },
      });

      const packages = response.data.results || [];
      logger.info(`找到 ${packages.length} 个包`);

      const components = await Promise.all(
        packages.map((pkg: any) => this.parsePackage(pkg))
      );

      return components.filter(Boolean) as Component[];
    } catch (error) {
      logger.error('npm 搜索失败:', error);
      return [];
    }
  }

  /**
   * 获取包的详细信息
   */
  async getPackageDetails(packageName: string): Promise<Component | null> {
    try {
      const response = await axios.get(`${this.registryURL}/${packageName}`);
      const data = response.data;
      
      const latest = data['dist-tags']?.latest;
      if (!latest) return null;
      
      const versionData = data.versions[latest];
      
      return this.buildComponent(packageName, versionData, data);
    } catch (error) {
      logger.error(`获取包详情失败 ${packageName}:`, error);
      return null;
    }
  }

  /**
   * 解析搜索结果中的包
   */
  private async parsePackage(result: any): Promise<Component | null> {
    const packageName = result.package?.name;
    if (!packageName) return null;

    try {
      // 获取详细信息
      const details = await this.getPackageDetails(packageName);
      
      if (details) {
        // 合并搜索结果的统计信息
        details.stats = {
          ...details.stats,
          downloads: result.score?.detail?.popularity || 0,
        };
      }
      
      return details;
    } catch (error) {
      logger.error(`解析包失败 ${packageName}:`, error);
      return null;
    }
  }

  /**
   * 构建组件对象
   */
  private buildComponent(
    packageName: string, 
    versionData: any, 
    registryData: any
  ): Component {
    const description = versionData.description || registryData.description || '';
    
    return {
      id: `npm:${packageName}`,
      name: packageName,
      displayName: this.extractDisplayName(packageName),
      description,
      version: versionData.version || '0.0.0',
      
      source: {
        channel: 'npm',
        url: `https://www.npmjs.com/package/${packageName}`,
        packageName,
      },
      
      type: 'mcp-server',
      install: {
        type: 'npm',
        package: packageName,
        command: `npx -y ${packageName}`,
      },
      
      mcpConfig: {
        transport: 'stdio',
        command: 'npx',
        args: ['-y', packageName],
      },
      
      capabilities: this.detectCapabilities(versionData),
      tags: this.extractTags(packageName, description, versionData),
      
      stats: {
        lastUpdated: registryData.time?.modified,
      },
      
      author: this.extractAuthor(versionData),
      license: versionData.license,
      verified: packageName.startsWith('@modelcontextprotocol/'),
    };
  }

  /**
   * 提取显示名称
   */
  private extractDisplayName(packageName: string): string {
    // 移除 @scope/ 前缀和 mcp- 前缀
    return packageName
      .replace(/^@[^/]+\//, '')
      .replace(/^mcp-/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * 检测能力
   */
  private detectCapabilities(versionData: any): string[] {
    const capabilities: string[] = [];
    
    // 检查依赖
    const deps = {
      ...versionData.dependencies,
      ...versionData.devDependencies,
    };
    
    if (deps['@modelcontextprotocol/sdk']) {
      capabilities.push('tools');
    }
    
    // 检查 keywords
    const keywords = versionData.keywords || [];
    if (keywords.includes('tools')) capabilities.push('tools');
    if (keywords.includes('resources')) capabilities.push('resources');
    if (keywords.includes('prompts')) capabilities.push('prompts');
    
    return capabilities.length > 0 ? capabilities : ['tools'];
  }

  /**
   * 提取标签
   */
  private extractTags(packageName: string, description: string, versionData: any): string[] {
    const tags = new Set<string>(['npm', 'mcp']);
    
    // 从包名提取
    const parts = packageName.split(/[-/]/);
    parts.forEach(p => {
      if (p && p !== 'mcp' && p !== 'server' && !p.startsWith('@')) {
        tags.add(p.toLowerCase());
      }
    });
    
    // 从 keywords 提取
    const keywords = versionData.keywords || [];
    keywords.forEach((k: string) => tags.add(k.toLowerCase()));
    
    // 从描述提取常见关键词
    const commonKeywords = [
      'weather', 'file', 'database', 'api', 'web', 'search',
      'slack', 'discord', 'notion', 'github', 'git',
      'filesystem', 'fetch', 'browser',
    ];
    
    const descLower = description.toLowerCase();
    commonKeywords.forEach(k => {
      if (descLower.includes(k)) tags.add(k);
    });
    
    return Array.from(tags);
  }

  /**
   * 提取作者信息
   */
  private extractAuthor(versionData: any): string | undefined {
    if (typeof versionData.author === 'string') {
      return versionData.author;
    }
    if (versionData.author?.name) {
      return versionData.author.name;
    }
    return undefined;
  }
}

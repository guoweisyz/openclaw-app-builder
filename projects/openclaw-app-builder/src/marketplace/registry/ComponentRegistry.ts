import type { Component, SearchParams, InstallResult } from '../../types/index.js';
import { DatabaseManager } from '../../utils/DatabaseManager.js';
import { GitHubAdapter } from '../adapters/GitHubAdapter.js';
import { NpmAdapter } from '../adapters/NpmAdapter.js';
import { logger } from '../../utils/logger.js';

/**
 * 组件注册表
 * 管理所有可用的 Skills 和 MCP Servers
 */
export class ComponentRegistry {
  private db: DatabaseManager;
  private githubAdapter: GitHubAdapter;
  private npmAdapter: NpmAdapter;
  private initialized = false;

  constructor() {
    this.db = new DatabaseManager();
    this.githubAdapter = new GitHubAdapter();
    this.npmAdapter = new NpmAdapter();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    logger.info('初始化组件注册表...');
    
    // 初始化数据库
    await this.db.initialize();
    
    // 检查是否有缓存的组件
    const cached = await this.db.searchComponents({ limit: 1 });
    
    if (cached.length === 0) {
      logger.info('数据库为空，加载示例组件...');
      await this.loadMockComponents();
    }
    
    this.initialized = true;
    logger.info('组件注册表初始化完成');
  }

  /**
   * 搜索组件
   */
  async search(params: SearchParams): Promise<Component[]> {
    return this.db.searchComponents({
      query: params.query,
      channels: params.channels,
      types: params.types,
      tags: params.tags,
      verifiedOnly: params.verifiedOnly,
      limit: params.limit,
      offset: params.offset,
    });
  }

  /**
   * 获取单个组件
   */
  async get(id: string): Promise<Component | null> {
    return this.db.getComponent(id);
  }

  /**
   * 安装组件
   */
  async install(id: string, config?: Record<string, unknown>): Promise<InstallResult> {
    const component = await this.get(id);
    
    if (!component) {
      return {
        success: false,
        componentId: id,
        message: 'Component not found',
      };
    }

    logger.info(`安装组件: ${component.name}`);
    
    // TODO: 根据 install.type 执行实际安装
    // - npm: 执行 npm install
    // - pip: 执行 pip install
    // - docker: 拉取镜像
    // - source: git clone + build
    // - clawhub: 调用 clawhub CLI
    
    return {
      success: true,
      componentId: id,
      message: `Component ${component.name} installed successfully`,
      config: config,
    };
  }

  /**
   * 从 GitHub 同步组件
   */
  async syncFromGitHub(options: { query?: string; limit?: number } = {}): Promise<number> {
    logger.info('从 GitHub 同步组件...');
    
    const components = await this.githubAdapter.searchMcpServers({
      query: options.query,
      limit: options.limit || 30,
    });
    
    await this.db.saveComponents(components);
    
    logger.info(`从 GitHub 同步了 ${components.length} 个组件`);
    return components.length;
  }

  /**
   * 从 npm 同步组件
   */
  async syncFromNpm(options: { query?: string; limit?: number } = {}): Promise<number> {
    logger.info('从 npm 同步组件...');
    
    const components = await this.npmAdapter.searchMcpPackages({
      query: options.query,
      limit: options.limit || 30,
    });
    
    await this.db.saveComponents(components);
    
    logger.info(`从 npm 同步了 ${components.length} 个组件`);
    return components.length;
  }

  /**
   * 获取所有标签
   */
  async getTags(): Promise<string[]> {
    // 从数据库获取所有标签
    const components = await this.db.searchComponents({ limit: 1000 });
    const tags = new Set<string>();
    
    for (const c of components) {
      c.tags.forEach(t => tags.add(t));
    }
    
    return Array.from(tags).sort();
  }

  /**
   * 加载示例组件
   */
  private async loadMockComponents(): Promise<void> {
    const mockComponents: Component[] = [
      {
        id: 'clawhub:weather',
        name: 'weather',
        displayName: '天气查询',
        description: '查询全球城市天气信息',
        version: '1.0.0',
        source: { channel: 'clawhub', url: 'https://clawhub.com/skills/weather' },
        type: 'skill',
        install: { type: 'clawhub', package: 'weather' },
        capabilities: ['tools'],
        tags: ['weather', 'utility', 'daily'],
        verified: true,
        featured: true,
      },
      {
        id: 'clawhub:cron',
        name: 'cron',
        displayName: '定时任务',
        description: '定时触发工作流',
        version: '1.0.0',
        source: { channel: 'clawhub', url: 'https://clawhub.com/skills/cron' },
        type: 'skill',
        install: { type: 'clawhub', package: 'cron' },
        capabilities: ['triggers'],
        tags: ['schedule', 'automation', 'trigger'],
        verified: true,
      },
      {
        id: 'clawhub:notion',
        name: 'notion',
        displayName: 'Notion 集成',
        description: '读写 Notion 数据库和页面',
        version: '1.0.0',
        source: { channel: 'clawhub', url: 'https://clawhub.com/skills/notion' },
        type: 'skill',
        install: { type: 'clawhub', package: 'notion' },
        capabilities: ['tools', 'resources'],
        tags: ['notion', 'database', 'productivity'],
        verified: true,
      },
      {
        id: 'clawhub:wechat',
        name: 'wechat',
        displayName: '微信集成',
        description: '发送消息到微信',
        version: '1.0.0',
        source: { channel: 'clawhub', url: 'https://clawhub.com/skills/wechat' },
        type: 'skill',
        install: { type: 'clawhub', package: 'wechat' },
        capabilities: ['tools'],
        tags: ['wechat', 'messaging', 'notification'],
        verified: true,
      },
      {
        id: 'clawhub:feishu',
        name: 'feishu',
        displayName: '飞书集成',
        description: '发送消息到飞书',
        version: '1.0.0',
        source: { channel: 'clawhub', url: 'https://clawhub.com/skills/feishu' },
        type: 'skill',
        install: { type: 'clawhub', package: 'feishu' },
        capabilities: ['tools'],
        tags: ['feishu', 'lark', 'messaging', 'notification'],
        verified: true,
      },
      {
        id: 'github:fetch',
        name: '@modelcontextprotocol/server-fetch',
        displayName: 'Fetch MCP Server',
        description: '获取网页内容',
        version: '1.0.0',
        source: { 
          channel: 'github', 
          url: 'https://github.com/modelcontextprotocol/servers',
          packageName: '@modelcontextprotocol/server-fetch'
        },
        type: 'mcp-server',
        install: { 
          type: 'npm', 
          package: '@modelcontextprotocol/server-fetch',
          command: 'npx -y @modelcontextprotocol/server-fetch'
        },
        mcpConfig: {
          transport: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-fetch'],
        },
        capabilities: ['tools'],
        tags: ['fetch', 'http', 'web'],
        verified: true,
        stats: { stars: 1200, downloads: 50000 },
      },
      {
        id: 'github:filesystem',
        name: '@modelcontextprotocol/server-filesystem',
        displayName: '文件系统 MCP',
        description: '安全的文件读写操作',
        version: '1.0.0',
        source: { 
          channel: 'github', 
          url: 'https://github.com/modelcontextprotocol/servers',
          packageName: '@modelcontextprotocol/server-filesystem'
        },
        type: 'mcp-server',
        install: { 
          type: 'npm', 
          package: '@modelcontextprotocol/server-filesystem',
          command: 'npx -y @modelcontextprotocol/server-filesystem'
        },
        mcpConfig: {
          transport: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem'],
        },
        capabilities: ['tools', 'resources'],
        tags: ['filesystem', 'local', 'utility'],
        verified: true,
        stats: { stars: 800, downloads: 30000 },
      },
    ];

    await this.db.saveComponents(mockComponents);
    logger.info(`加载了 ${mockComponents.length} 个示例组件`);
  }
}

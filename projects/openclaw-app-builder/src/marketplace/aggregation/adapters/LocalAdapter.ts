import type { ChannelAdapter, AggregatedServer } from '../AggregationManager.js';
import { logger } from '../../../utils/logger.js';

/**
 * 本地/内置 MCP Server 适配器
 * 聚合项目内置的 MCP Servers
 */
export class LocalAdapter implements ChannelAdapter {
  name = 'local';
  displayName = '本地/Built-in';

  private localServers: AggregatedServer[] = [
    {
      id: 'local:fetch',
      name: 'fetch-server',
      displayName: 'HTTP Fetch',
      description: '获取网页内容，支持 GET/POST/PUT/DELETE',
      version: '1.0.0',
      source: {
        channel: 'local',
        url: 'https://clawhub.com/skills/fetch',
        originalId: 'fetch',
      },
      install: { type: 'source', command: 'tsx src/mcp-servers/fetch-server.ts' },
      mcpConfig: { transport: 'stdio', command: 'npx', args: ['tsx', 'src/mcp-servers/fetch-server.ts'] },
      capabilities: ['tools'],
      tags: ['fetch', 'http', 'web', 'builtin'],
      stats: {},
      aggregatedFrom: ['local'],
      firstSeen: new Date().toISOString(),
      lastSynced: new Date().toISOString(),
      verified: true,
      featured: true,
    },
    {
      id: 'local:weather',
      name: 'weather-server',
      displayName: '天气查询',
      description: '查询全球城市天气（使用 wttr.in）',
      version: '1.0.0',
      source: {
        channel: 'local',
        url: 'https://clawhub.com/skills/weather',
        originalId: 'weather',
      },
      install: { type: 'source', command: 'tsx src/mcp-servers/weather-server.ts' },
      mcpConfig: { transport: 'stdio', command: 'npx', args: ['tsx', 'src/mcp-servers/weather-server.ts'] },
      capabilities: ['tools'],
      tags: ['weather', 'api', 'utility', 'builtin'],
      stats: {},
      aggregatedFrom: ['local'],
      firstSeen: new Date().toISOString(),
      lastSynced: new Date().toISOString(),
      verified: true,
      featured: true,
    },
    {
      id: 'local:filesystem',
      name: 'filesystem-server',
      displayName: '文件系统',
      description: '安全的文件读写操作',
      version: '1.0.0',
      source: {
        channel: 'local',
        url: 'https://clawhub.com/skills/filesystem',
        originalId: 'filesystem',
      },
      install: { type: 'source', command: 'tsx src/mcp-servers/filesystem-server.ts' },
      mcpConfig: { 
        transport: 'stdio', 
        command: 'npx', 
        args: ['tsx', 'src/mcp-servers/filesystem-server.ts'],
        env: { FILESYSTEM_WORK_DIR: './data/files' }
      },
      capabilities: ['tools'],
      tags: ['filesystem', 'file', 'storage', 'builtin'],
      stats: {},
      aggregatedFrom: ['local'],
      firstSeen: new Date().toISOString(),
      lastSynced: new Date().toISOString(),
      verified: true,
      featured: true,
    },
    {
      id: 'local:time',
      name: 'time-server',
      displayName: '时间日期',
      description: '时间查询、日期计算',
      version: '1.0.0',
      source: {
        channel: 'local',
        url: 'https://clawhub.com/skills/time',
        originalId: 'time',
      },
      install: { type: 'source', command: 'tsx src/mcp-servers/time-server.ts' },
      mcpConfig: { transport: 'stdio', command: 'npx', args: ['tsx', 'src/mcp-servers/time-server.ts'] },
      capabilities: ['tools'],
      tags: ['time', 'date', 'utility', 'builtin'],
      stats: {},
      aggregatedFrom: ['local'],
      firstSeen: new Date().toISOString(),
      lastSynced: new Date().toISOString(),
      verified: true,
      featured: false,
    },
    {
      id: 'local:calculator',
      name: 'calculator-server',
      displayName: '计算器',
      description: '数学计算、单位转换',
      version: '1.0.0',
      source: {
        channel: 'local',
        url: 'https://clawhub.com/skills/calculator',
        originalId: 'calculator',
      },
      install: { type: 'source', command: 'tsx src/mcp-servers/calculator-server.ts' },
      mcpConfig: { transport: 'stdio', command: 'npx', args: ['tsx', 'src/mcp-servers/calculator-server.ts'] },
      capabilities: ['tools'],
      tags: ['math', 'calculator', 'utility', 'builtin'],
      stats: {},
      aggregatedFrom: ['local'],
      firstSeen: new Date().toISOString(),
      lastSynced: new Date().toISOString(),
      verified: true,
      featured: false,
    },
    {
      id: 'local:json',
      name: 'json-server',
      displayName: 'JSON 处理',
      description: 'JSON 解析、转换、查询',
      version: '1.0.0',
      source: {
        channel: 'local',
        url: 'https://clawhub.com/skills/json',
        originalId: 'json',
      },
      install: { type: 'source', command: 'tsx src/mcp-servers/json-server.ts' },
      mcpConfig: { transport: 'stdio', command: 'npx', args: ['tsx', 'src/mcp-servers/json-server.ts'] },
      capabilities: ['tools'],
      tags: ['json', 'data', 'transform', 'builtin'],
      stats: {},
      aggregatedFrom: ['local'],
      firstSeen: new Date().toISOString(),
      lastSynced: new Date().toISOString(),
      verified: true,
      featured: false,
    },
  ];

  async search(query: string): Promise<AggregatedServer[]> {
    const lowerQuery = query.toLowerCase();
    return this.localServers.filter(server => 
      server.name.toLowerCase().includes(lowerQuery) ||
      server.displayName.toLowerCase().includes(lowerQuery) ||
      server.description.toLowerCase().includes(lowerQuery) ||
      server.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  async getDetails(id: string): Promise<AggregatedServer | null> {
    return this.localServers.find(s => s.id === id) || null;
  }

  async getFeatured(): Promise<AggregatedServer[]> {
    return this.localServers.filter(s => s.featured);
  }

  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    return { healthy: true, latency: 0 };
  }
}

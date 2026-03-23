/**
 * 核心类型定义
 */

// 组件来源渠道
export type ComponentChannel = 
  | 'clawhub'      // OpenClaw 官方 Skills
  | 'github'       // GitHub MCP Servers
  | 'npm'          // npm 包
  | 'qianfan'      // 百度千帆
  | 'bailian'      // 阿里百炼
  | 'docker'       // Docker Hub
  | 'private';     // 私有源

// 组件类型
export type ComponentType = 'skill' | 'mcp-server';

// 安装方式
export type InstallType = 'npm' | 'pip' | 'docker' | 'source' | 'clawhub';

// 传输协议
export type TransportType = 'stdio' | 'sse' | 'http';

/**
 * 组件定义（Skill 或 MCP Server）
 */
export interface Component {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  
  source: {
    channel: ComponentChannel;
    url: string;
    packageName?: string;
  };
  
  type: ComponentType;
  
  install: {
    type: InstallType;
    command?: string;
    package?: string;
    configTemplate?: Record<string, unknown>;
  };
  
  // MCP Server 特有
  mcpConfig?: {
    transport: TransportType;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
  };
  
  // 能力标签
  capabilities: string[];
  tags: string[];
  
  // 统计信息
  stats?: {
    downloads?: number;
    stars?: number;
    lastUpdated?: string;
  };
  
  // 元数据
  author?: string;
  license?: string;
  verified: boolean;
  featured?: boolean;
}

/**
 * 应用定义
 */
export interface App {
  id: string;
  name: string;
  description: string;
  
  // 触发方式
  trigger: {
    type: 'manual' | 'schedule' | 'webhook' | 'event';
    config?: {
      cron?: string;           // 定时触发
      timezone?: string;       // 时区
      webhookUrl?: string;     // Webhook 触发
      eventType?: string;      // 事件触发
    };
  };
  
  // 执行链
  workflow: WorkflowStep[];
  
  // 使用的组件
  components: string[];  // component IDs
  
  // 配置
  config: Record<string, unknown>;
  
  status: 'draft' | 'active' | 'inactive' | 'paused' | 'error';
  createdAt: string;
  updatedAt: string;
}

/**
 * 工作流步骤
 */
export interface WorkflowStep {
  id: string;
  name: string;
  componentId: string;
  action: string;
  
  // 输入参数
  inputs: Record<string, InputMapping>;
  
  // 输出映射
  outputs: Record<string, string>;
  
  // 条件执行
  condition?: string;
  
  // 错误处理
  onError?: 'stop' | 'skip' | 'retry';
  retryCount?: number;
}

/**
 * 输入映射
 */
export interface InputMapping {
  type: 'static' | 'fromPrevious' | 'fromConfig' | 'fromUser';
  value?: unknown;
  stepId?: string;
  outputKey?: string;
  configKey?: string;
}

/**
 * 用户需求
 */
export interface UserIntent {
  rawDescription: string;
  
  // 解析结果
  parsed: {
    goal: string;                    // 目标
    actions: string[];               // 需要的动作
    dataSources: string[];           // 数据来源
    destinations: string[];          // 数据目的地
    schedule?: string;               // 定时要求
    conditions?: string[];           // 触发条件
  };
  
  // 匹配到的组件
  suggestedComponents: Component[];
  
  // 置信度
  confidence: number;
}

/**
 * 搜索参数
 */
export interface SearchParams {
  query: string;
  channels?: ComponentChannel[];
  types?: ComponentType[];
  tags?: string[];
  verifiedOnly?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 安装结果
 */
export interface InstallResult {
  success: boolean;
  componentId: string;
  message: string;
  config?: Record<string, unknown>;
  error?: string;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  success: boolean;
  appId: string;
  runId: string;
  startedAt: string;
  endedAt: string;
  
  stepResults: StepResult[];
  
  outputs: Record<string, unknown>;
  error?: string;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  startedAt: string;
  endedAt: string;
  outputs?: Record<string, unknown>;
  error?: string;
}

import { ComponentRegistry } from '../../marketplace/registry/ComponentRegistry.js';
import type { UserIntent, App, Component, WorkflowStep, InputMapping } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * LLM 意图理解引擎
 * 使用 LLM 进行更准确的意图解析
 */
export class LLMIntentEngine {
  private apiKey?: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  /**
   * 解析用户意图
   */
  async parse(description: string): Promise<UserIntent> {
    logger.info('使用 LLM 解析意图:', description);

    // 如果有 API Key，使用 LLM
    if (this.apiKey) {
      return this.parseWithLLM(description);
    }

    // 否则使用规则引擎
    return this.parseWithRules(description);
  }

  /**
   * 使用 LLM 解析
   */
  private async parseWithLLM(description: string): Promise<UserIntent> {
    const prompt = this.buildPrompt(description);
    
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: '你是一个应用需求分析助手。请分析用户的需求，提取关键信息。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      });

      const data: any = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      
      return {
        rawDescription: description,
        parsed: {
          goal: result.goal || description,
          actions: result.actions || [],
          dataSources: result.dataSources || [],
          destinations: result.destinations || [],
          schedule: result.schedule,
          conditions: result.conditions || [],
        },
        suggestedComponents: [], // 后续填充
        confidence: result.confidence || 0.8,
      };
    } catch (error) {
      logger.error('LLM 解析失败，回退到规则引擎:', error);
      return this.parseWithRules(description);
    }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(description: string): string {
    return `分析以下应用需求，提取关键信息：

需求描述："${description}"

请提取以下信息并返回 JSON 格式：
{
  "goal": "用户的核心目标",
  "actions": ["需要的动作，如 fetch, send, save, analyze"],
  "dataSources": ["数据来源，如 weather, web, zhihu, api"],
  "destinations": ["数据目的地，如 wechat, notion, email, file"],
  "schedule": "定时要求，如 daily, weekly, hourly 或 null",
  "conditions": ["触发条件"],
  "confidence": 0.9
}

注意：
- 数据来源和目的地使用英文关键词
- schedule 只能是 daily, weekly, hourly 或 null
- confidence 是 0-1 之间的置信度`;
  }

  /**
   * 使用规则引擎解析（备用方案）
   */
  private parseWithRules(description: string): UserIntent {
    const lower = description.toLowerCase();
    
    // 提取目标
    const goal = description;
    
    // 提取动作
    const actions: string[] = [];
    if (lower.includes('查') || lower.includes('获取') || lower.includes('抓取') || lower.includes('fetch')) {
      actions.push('fetch');
    }
    if (lower.includes('发送') || lower.includes('推送') || lower.includes('通知') || lower.includes('send')) {
      actions.push('send');
    }
    if (lower.includes('保存') || lower.includes('写入') || lower.includes('存储') || lower.includes('save')) {
      actions.push('save');
    }
    if (lower.includes('分析') || lower.includes('处理') || lower.includes('analyze')) {
      actions.push('analyze');
    }
    
    // 提取数据来源
    const dataSources: string[] = [];
    if (lower.includes('天气') || lower.includes('weather')) dataSources.push('weather');
    if (lower.includes('网页') || lower.includes('网站') || lower.includes('url') || lower.includes('web')) {
      dataSources.push('web');
    }
    if (lower.includes('知乎') || lower.includes('zhihu')) dataSources.push('zhihu');
    if (lower.includes('热榜') || lower.includes('热搜') || lower.includes('trending')) {
      dataSources.push('trending');
    }
    if (lower.includes('新闻') || lower.includes('news')) dataSources.push('news');
    if (lower.includes('股票') || lower.includes('stock')) dataSources.push('stock');
    
    // 提取目的地
    const destinations: string[] = [];
    if (lower.includes('微信') || lower.includes('wechat')) destinations.push('wechat');
    if (lower.includes('notion')) destinations.push('notion');
    if (lower.includes('邮件') || lower.includes('email') || lower.includes('mail')) {
      destinations.push('email');
    }
    if (lower.includes('文件') || lower.includes('file') || lower.includes('本地')) {
      destinations.push('file');
    }
    if (lower.includes('slack')) destinations.push('slack');
    if (lower.includes('飞书') || lower.includes('feishu') || lower.includes('lark')) {
      destinations.push('feishu');
    }
    
    // 提取定时要求
    let schedule: string | undefined;
    if (lower.includes('每天') || lower.includes('每日') || lower.includes('daily')) {
      schedule = 'daily';
    } else if (lower.includes('每周') || lower.includes('weekly')) {
      schedule = 'weekly';
    } else if (lower.includes('每小时') || lower.includes('hourly')) {
      schedule = 'hourly';
    }
    
    // 提取时间
    let time: string | undefined;
    const timeMatch = description.match(/(\d{1,2})[:点](\d{0,2})?/);
    if (timeMatch && timeMatch[1]) {
      const hour = timeMatch[1].padStart(2, '0');
      const minute = (timeMatch[2] || '00').padStart(2, '0');
      time = `${hour}:${minute}`;
    }
    
    return {
      rawDescription: description,
      parsed: {
        goal,
        actions,
        dataSources,
        destinations,
        schedule,
        conditions: time ? [`at ${time}`] : [],
      },
      suggestedComponents: [],
      confidence: this.calculateConfidence(actions, dataSources, destinations),
    };
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(actions: string[], dataSources: string[], destinations: string[]): number {
    let score = 0;
    
    if (actions.length > 0) score += 0.3;
    if (dataSources.length > 0) score += 0.3;
    if (destinations.length > 0) score += 0.2;
    if (dataSources.length > 0 && destinations.length > 0) score += 0.2;
    
    return Math.min(score, 1);
  }
}

/**
 * 意图理解引擎（主类）
 */
export class IntentEngine {
  private llmEngine: LLMIntentEngine;

  constructor(private registry: ComponentRegistry) {
    this.llmEngine = new LLMIntentEngine();
  }

  /**
   * 解析用户意图
   */
  async parse(description: string): Promise<UserIntent> {
    // 使用 LLM 解析意图
    const intent = await this.llmEngine.parse(description);
    
    // 根据解析结果搜索匹配组件
    intent.suggestedComponents = await this.findMatchingComponents(intent.parsed);
    
    return intent;
  }

  /**
   * 根据意图生成应用
   */
  async generateApp(description: string, name?: string): Promise<{ app: App; intent: UserIntent }> {
    const intent = await this.parse(description);
    
    if (intent.confidence < 0.5) {
      throw new Error('意图理解置信度太低，请更详细地描述你的需求');
    }

    const app = await this.buildApp(intent, name);
    
    return { app, intent };
  }

  /**
   * 查找匹配的组件
   */
  private async findMatchingComponents(parsed: UserIntent['parsed']): Promise<Component[]> {
    const keywords = [
      ...parsed.dataSources,
      ...parsed.destinations,
      ...parsed.actions,
    ];
    
    const components: Component[] = [];
    
    for (const keyword of keywords) {
      const results = await this.registry.search({ query: keyword, limit: 5 });
      components.push(...results);
    }
    
    // 如果有定时需求，添加 cron
    if (parsed.schedule) {
      const cron = await this.registry.search({ query: 'cron schedule', limit: 1 });
      components.push(...cron);
    }
    
    // 去重
    const unique = new Map<string, Component>();
    for (const c of components) {
      unique.set(c.id, c);
    }
    
    return Array.from(unique.values());
  }

  /**
   * 构建应用
   */
  private async buildApp(intent: UserIntent, name?: string): Promise<App> {
    const { parsed, suggestedComponents } = intent;
    
    // 生成应用名称
    const appName = name || this.generateAppName(parsed);
    
    // 构建工作流步骤
    const workflow = this.buildWorkflow(parsed, suggestedComponents);
    
    // 确定触发方式
    const trigger = this.determineTrigger(parsed);
    
    return {
      id: `app_${Date.now()}`,
      name: appName,
      description: parsed.goal,
      trigger,
      workflow,
      components: suggestedComponents.map((c: Component) => c.id),
      config: {},
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 生成应用名称
   */
  private generateAppName(parsed: UserIntent['parsed']): string {
    const parts: string[] = [];
    
    if (parsed.dataSources.length > 0) {
      const source = parsed.dataSources[0];
      if (source) {
        const nameMap: Record<string, string> = {
          weather: '天气',
          web: '网页',
          zhihu: '知乎',
          trending: '热榜',
          news: '新闻',
          stock: '股票',
        };
        parts.push(nameMap[source] || source);
      }
    }

    if (parsed.destinations.length > 0) {
      const dest = parsed.destinations[0];
      if (dest) {
        const nameMap: Record<string, string> = {
          wechat: '微信推送',
          notion: 'Notion同步',
          email: '邮件发送',
          file: '文件保存',
          slack: 'Slack通知',
          feishu: '飞书通知',
        };
        parts.push(nameMap[dest] || dest);
      }
    }
    
    if (parsed.schedule) {
      parts.push('定时');
    }
    
    return parts.join('') + '助手';
  }

  /**
   * 构建工作流
   */
  private buildWorkflow(parsed: UserIntent['parsed'], components: Component[]): WorkflowStep[] {
    const steps: WorkflowStep[] = [];
    let stepIndex = 0;
    
    // 1. 数据获取步骤
    for (const source of parsed.dataSources) {
      const component = this.findBestComponent(components, source);
      
      if (component) {
        steps.push({
          id: `step_${stepIndex++}`,
          name: `获取${this.translateKeyword(source)}数据`,
          componentId: component.id,
          action: 'fetch',
          inputs: this.buildInputsForSource(source),
          outputs: { result: `${source}_data` },
        });
      }
    }
    
    // 2. 数据处理步骤（可选）
    if (parsed.actions.includes('analyze')) {
      steps.push({
        id: `step_${stepIndex++}`,
        name: '分析数据',
        componentId: 'llm:analyze',
        action: 'analyze',
        inputs: {
          data: {
            type: 'fromPrevious',
            stepId: steps[steps.length - 1]?.id,
            outputKey: 'result',
          },
        },
        outputs: { result: 'analyzed_data' },
      });
    }
    
    // 3. 数据发送/保存步骤
    for (const dest of parsed.destinations) {
      const component = this.findBestComponent(components, dest);
      
      if (component) {
        const prevStep = steps[steps.length - 1];
        steps.push({
          id: `step_${stepIndex++}`,
          name: `发送到${this.translateKeyword(dest)}`,
          componentId: component.id,
          action: 'send',
          inputs: {
            data: {
              type: 'fromPrevious',
              stepId: prevStep?.id,
              outputKey: prevStep?.outputs ? Object.keys(prevStep.outputs)[0] : 'result',
            },
          },
          outputs: {},
        });
      }
    }
    
    return steps;
  }

  /**
   * 查找最佳匹配的组件
   */
  private findBestComponent(components: Component[], keyword: string): Component | undefined {
    // 优先匹配标签
    const byTag = components.find(c => c.tags.includes(keyword));
    if (byTag) return byTag;
    
    // 其次匹配名称
    const byName = components.find(c => 
      c.name.toLowerCase().includes(keyword.toLowerCase())
    );
    if (byName) return byName;
    
    // 最后匹配描述
    return components.find(c => 
      c.description.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * 为数据源构建输入
   */
  private buildInputsForSource(source: string): Record<string, InputMapping> {
    const inputs: Record<string, InputMapping> = {};
    
    switch (source) {
      case 'weather':
        inputs.location = { type: 'fromConfig', configKey: 'location' };
        break;
      case 'web':
        inputs.url = { type: 'fromConfig', configKey: 'url' };
        break;
      case 'zhihu':
        inputs.type = { type: 'static', value: 'hot' };
        break;
      case 'trending':
        inputs.platform = { type: 'fromConfig', configKey: 'platform' };
        break;
    }
    
    return inputs;
  }

  /**
   * 确定触发方式
   */
  private determineTrigger(parsed: UserIntent['parsed']): App['trigger'] {
    if (parsed.schedule) {
      return {
        type: 'schedule',
        config: {
          cron: this.scheduleToCron(parsed.schedule, parsed.conditions),
        },
      };
    }
    
    return { type: 'manual' };
  }

  /**
   * 将自然语言定时转换为 cron
   */
  private scheduleToCron(schedule: string, conditions?: string[]): string {
    // 提取时间
    let hour = '8';
    let minute = '0';
    
    if (conditions) {
      for (const condition of conditions) {
        const match = condition.match(/at (\d{2}):(\d{2})/);
        if (match && match[1] && match[2]) {
          hour = match[1];
          minute = match[2];
        }
      }
    }
    
    switch (schedule) {
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        return `${minute} ${hour} * * 1`;
      case 'hourly':
        return `${minute} * * * *`;
      default:
        return `0 8 * * *`;
    }
  }

  /**
   * 翻译关键词为中文
   */
  private translateKeyword(keyword: string): string {
    const map: Record<string, string> = {
      weather: '天气',
      web: '网页',
      zhihu: '知乎',
      trending: '热榜',
      news: '新闻',
      stock: '股票',
      wechat: '微信',
      notion: 'Notion',
      email: '邮件',
      file: '文件',
      slack: 'Slack',
      feishu: '飞书',
    };
    return map[keyword] || keyword;
  }
}

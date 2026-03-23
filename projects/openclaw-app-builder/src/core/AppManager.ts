import { ComponentRegistry } from '../marketplace/registry/ComponentRegistry.js';
import { DatabaseManager } from '../utils/DatabaseManager.js';
import type { App, ExecutionResult } from '../types/index.js';
import { WorkflowEngine } from '../runtime/executor/WorkflowEngine.js';
import { logger } from '../utils/logger.js';

/**
 * 应用管理器
 */
export class AppManager {
  private db: DatabaseManager;
  private workflowEngine: WorkflowEngine;

  constructor(private registry: ComponentRegistry) {
    this.db = new DatabaseManager();
    this.workflowEngine = new WorkflowEngine(registry);
  }

  async initialize(): Promise<void> {
    await this.db.initialize();
  }

  /**
   * 列出所有应用
   */
  async list(): Promise<App[]> {
    return this.db.getApps();
  }

  /**
   * 获取应用
   */
  async get(id: string): Promise<App | null> {
    return this.db.getApp(id);
  }

  /**
   * 创建应用
   */
  async create(data: Partial<App>): Promise<App> {
    const app: App = {
      id: `app_${Date.now()}`,
      name: data.name || '未命名应用',
      description: data.description || '',
      trigger: data.trigger || { type: 'manual' },
      workflow: data.workflow || [],
      components: data.components || [],
      config: data.config || {},
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.db.saveApp(app);
    logger.info('创建应用:', app.name);
    
    return app;
  }

  /**
   * 更新应用
   */
  async update(id: string, data: Partial<App>): Promise<App> {
    const app = await this.db.getApp(id);
    
    if (!app) {
      throw new Error(`App not found: ${id}`);
    }

    const updated: App = {
      ...app,
      ...data,
      id: app.id,
      updatedAt: new Date().toISOString(),
    };

    await this.db.saveApp(updated);
    return updated;
  }

  /**
   * 删除应用
   */
  async delete(id: string): Promise<void> {
    await this.db.deleteApp(id);
    logger.info('删除应用:', id);
  }

  /**
   * 运行应用
   */
  async run(id: string, inputs?: Record<string, unknown>): Promise<ExecutionResult> {
    const app = await this.db.getApp(id);
    
    if (!app) {
      throw new Error(`App not found: ${id}`);
    }

    logger.info('运行应用:', app.name);
    
    // 使用工作流引擎执行
    const result = await this.workflowEngine.execute(app, inputs);
    
    return result;
  }

  /**
   * 部署应用
   */
  async deploy(id: string, options?: Record<string, unknown>): Promise<{ success: boolean; url?: string }> {
    const app = await this.db.getApp(id);
    
    if (!app) {
      throw new Error(`App not found: ${id}`);
    }

    logger.info('部署应用:', app.name);

    // TODO: 根据 trigger.type 部署
    // - manual: 本地保存配置
    // - schedule: 注册到 Cron 系统
    // - webhook: 创建 webhook 端点
    // - event: 注册事件监听器

    await this.update(id, { status: 'active' });

    return {
      success: true,
      url: `http://localhost:3000/api/apps/${id}`,
    };
  }
}

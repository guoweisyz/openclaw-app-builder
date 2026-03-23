import { ComponentRegistry } from '../marketplace/registry/ComponentRegistry.js';
import { DatabaseManager } from '../utils/DatabaseManager.js';
import { appExporter } from '../utils/AppExporter.js';
import type { App, ExecutionResult } from '../types/index.js';
import { WorkflowEngine } from '../runtime/executor/WorkflowEngine.js';
import { Scheduler } from '../runtime/Scheduler.js';
import { logger } from '../utils/logger.js';

/**
 * 应用管理器
 */
export class AppManager {
  private db: DatabaseManager;
  private workflowEngine: WorkflowEngine;
  private scheduler: Scheduler;

  constructor(private registry: ComponentRegistry) {
    this.db = new DatabaseManager();
    this.workflowEngine = new WorkflowEngine(registry);
    this.scheduler = new Scheduler(registry);
  }

  async initialize(): Promise<void> {
    await this.db.initialize();
    
    // 启动时加载所有活跃的定时任务
    const apps = await this.list();
    await this.scheduler.startAll(apps);
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
    
    // 如果应用是活跃状态且触发方式改变，重新调度
    if (updated.status === 'active' && updated.trigger.type === 'schedule') {
      this.scheduler.schedule(updated);
    } else if (updated.status !== 'active') {
      this.scheduler.unschedule(id);
    }
    
    return updated;
  }

  /**
   * 删除应用
   */
  async delete(id: string): Promise<void> {
    // 取消调度
    this.scheduler.unschedule(id);
    
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
   * 部署应用（激活定时任务）
   */
  async deploy(id: string, options?: Record<string, unknown>): Promise<{ success: boolean; url?: string; message?: string }> {
    const app = await this.db.getApp(id);
    
    if (!app) {
      throw new Error(`App not found: ${id}`);
    }

    logger.info('部署应用:', app.name);

    // 更新状态为活跃
    await this.update(id, { status: 'active' });

    // 如果是定时触发，添加到调度器
    if (app.trigger.type === 'schedule' && app.trigger.config?.cron) {
      const scheduled = this.scheduler.schedule(app);
      if (scheduled) {
        return {
          success: true,
          url: `http://localhost:3000/api/apps/${id}`,
          message: `应用已部署，将按照 ${app.trigger.config.cron} 定时执行`,
        };
      } else {
        return {
          success: false,
          message: '部署失败：无效的 cron 表达式',
        };
      }
    }

    return {
      success: true,
      url: `http://localhost:3000/api/apps/${id}`,
      message: '应用已部署',
    };
  }

  /**
   * 停止应用（取消定时任务）
   */
  async stop(id: string): Promise<{ success: boolean; message?: string }> {
    const app = await this.db.getApp(id);
    
    if (!app) {
      throw new Error(`App not found: ${id}`);
    }

    logger.info('停止应用:', app.name);

    // 取消调度
    this.scheduler.unschedule(id);
    
    // 更新状态
    await this.update(id, { status: 'inactive' });

    return {
      success: true,
      message: '应用已停止',
    };
  }

  /**
   * 获取调度状态
   */
  getSchedulerStatus(): { appId: string; running: boolean }[] {
    return this.scheduler.getStatus();
  }

  /**
   * 获取应用执行历史
   */
  async getExecutionHistory(appId: string, limit = 50): Promise<any[]> {
    return this.db.getExecutions(appId, limit);
  }

  /**
   * 获取应用执行统计
   */
  async getExecutionStats(appId: string): Promise<{
    total: number;
    success: number;
    failed: number;
    lastRun?: string;
  }> {
    return this.db.getExecutionStats(appId);
  }

  /**
   * 导出应用
   */
  async exportApp(appId: string, format: 'json' | 'yaml' = 'json'): Promise<{ content: string; filename: string }> {
    const app = await this.db.getApp(appId);
    if (!app) {
      throw new Error(`App not found: ${appId}`);
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${app.name.replace(/\s+/g, '_')}_${timestamp}.${format}`;

    const content = format === 'yaml' 
      ? appExporter.toYAML(app, { exportedBy: 'openclaw-app-builder' })
      : appExporter.toJSON(app, { exportedBy: 'openclaw-app-builder' });

    return { content, filename };
  }

  /**
   * 导入应用
   */
  async importApp(json: string, name?: string): Promise<App> {
    const imported = appExporter.fromJSON(json);
    
    // 如果提供了新名称，使用新名称
    if (name) {
      imported.name = name;
    }

    // 确保名称唯一
    const existing = await this.list();
    const baseName = imported.name || 'Imported App';
    let finalName = baseName;
    let counter = 1;
    
    while (existing.find(a => a.name === finalName)) {
      finalName = `${baseName} (${counter})`;
      counter++;
    }
    imported.name = finalName;

    // 创建应用
    return this.create(imported);
  }

  /**
   * 关闭管理器
   */
  async shutdown(): Promise<void> {
    logger.info('关闭应用管理器...');
    this.scheduler.stopAll();
  }
}

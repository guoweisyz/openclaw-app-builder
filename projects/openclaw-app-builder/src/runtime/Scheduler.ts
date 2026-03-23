import cron from 'node-cron';
import type { App } from '../types/index.js';
import { ComponentRegistry } from '../marketplace/registry/ComponentRegistry.js';
import { WorkflowEngine } from './executor/WorkflowEngine.js';
import { logger } from '../utils/logger.js';

/**
 * 调度管理器
 * 管理定时任务的注册、执行和取消
 */
export class Scheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private workflowEngine: WorkflowEngine;

  constructor(private registry: ComponentRegistry) {
    this.workflowEngine = new WorkflowEngine(registry);
  }

  /**
   * 调度应用
   */
  schedule(app: App): boolean {
    // 取消现有任务
    this.unschedule(app.id);

    if (app.trigger.type !== 'schedule' || !app.trigger.config?.cron) {
      logger.warn(`应用 ${app.id} 不是定时触发，跳过调度`);
      return false;
    }

    const cronExpression = app.trigger.config.cron;

    // 验证 cron 表达式
    if (!cron.validate(cronExpression)) {
      logger.error(`无效的 cron 表达式: ${cronExpression}`);
      return false;
    }

    logger.info(`调度应用: ${app.name} (${cronExpression})`);

    // 创建定时任务
    const task = cron.schedule(
      cronExpression,
      async () => {
        logger.info(`[定时任务] 执行应用: ${app.name}`);
        try {
          const result = await this.workflowEngine.execute(app);
          if (result.success) {
            logger.info(`[定时任务] 执行成功: ${app.name}`);
          } else {
            logger.error(`[定时任务] 执行失败: ${app.name}`, result.error);
          }
        } catch (error) {
          logger.error(`[定时任务] 执行异常: ${app.name}`, error);
        }
      },
      {
        scheduled: true,
        timezone: app.trigger.config.timezone || 'Asia/Shanghai',
      }
    );

    this.tasks.set(app.id, task);
    return true;
  }

  /**
   * 取消调度
   */
  unschedule(appId: string): void {
    const task = this.tasks.get(appId);
    if (task) {
      task.stop();
      this.tasks.delete(appId);
      logger.info(`取消调度: ${appId}`);
    }
  }

  /**
   * 启动所有定时任务
   */
  async startAll(apps: App[]): Promise<void> {
    logger.info(`启动 ${apps.length} 个定时任务...`);
    let scheduled = 0;

    for (const app of apps) {
      if (app.status === 'active' && app.trigger.type === 'schedule') {
        if (this.schedule(app)) {
          scheduled++;
        }
      }
    }

    logger.info(`成功调度 ${scheduled} 个应用`);
  }

  /**
   * 停止所有定时任务
   */
  stopAll(): void {
    logger.info(`停止 ${this.tasks.size} 个定时任务...`);
    for (const [appId, task] of this.tasks) {
      task.stop();
      logger.debug(`停止任务: ${appId}`);
    }
    this.tasks.clear();
    logger.info('所有定时任务已停止');
  }

  /**
   * 获取调度状态
   */
  getStatus(): { appId: string; running: boolean }[] {
    return Array.from(this.tasks.entries()).map(([appId, task]) => ({
      appId,
      running: true, // node-cron 没有直接提供运行状态，这里简化处理
    }));
  }

  /**
   * 检查应用是否已调度
   */
  isScheduled(appId: string): boolean {
    return this.tasks.has(appId);
  }
}

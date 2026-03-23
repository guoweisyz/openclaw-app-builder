import type { Component, App, WorkflowStep, ExecutionResult, StepResult } from '../../types/index.js';
import { ComponentRegistry } from '../../marketplace/registry/ComponentRegistry.js';
import { DatabaseManager } from '../../utils/DatabaseManager.js';
import { MCPClient } from './MCPClient.js';
import { logger } from '../../utils/logger.js';

/**
 * 工作流执行引擎
 */
export class WorkflowEngine {
  private mcpClient: MCPClient;
  private registry: ComponentRegistry;
  private db: DatabaseManager;

  constructor(registry: ComponentRegistry) {
    this.mcpClient = new MCPClient();
    this.registry = registry;
    this.db = new DatabaseManager();
  }

  /**
   * 执行应用
   */
  async execute(app: App, inputs?: Record<string, unknown>): Promise<ExecutionResult> {
    const runId = `run_${Date.now()}`;
    const startedAt = new Date().toISOString();

    logger.info(`开始执行应用: ${app.name} (run: ${runId})`);

    // 初始化数据库
    await this.db.initialize();

    // 保存执行记录（开始）
    await this.db.saveExecution({
      id: runId,
      appId: app.id,
      status: 'running',
      startedAt,
    });

    const stepResults: StepResult[] = [];
    const context: Record<string, unknown> = { ...inputs };

    try {
      for (const step of app.workflow) {
        const stepResult = await this.executeStep(step, context, app);
        stepResults.push(stepResult);

        if (!stepResult.success) {
          logger.error(`步骤失败: ${step.name}`);

          if (step.onError === 'stop' || !step.onError) {
            throw new Error(`步骤 ${step.name} 执行失败: ${stepResult.error}`);
          }
        }

        // 将步骤输出添加到上下文
        if (stepResult.outputs) {
          Object.entries(stepResult.outputs).forEach(([key, value]) => {
            context[`${step.id}.${key}`] = value;
          });
        }
      }

      const result: ExecutionResult = {
        success: true,
        appId: app.id,
        runId,
        startedAt,
        endedAt: new Date().toISOString(),
        stepResults,
        outputs: context,
      };

      // 更新执行记录（成功）
      await this.db.updateExecution(runId, {
        status: 'success',
        endedAt: result.endedAt,
        outputs: context,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const result: ExecutionResult = {
        success: false,
        appId: app.id,
        runId,
        startedAt,
        endedAt: new Date().toISOString(),
        stepResults,
        outputs: context,
        error: errorMessage,
      };

      // 更新执行记录（失败）
      await this.db.updateExecution(runId, {
        status: 'failed',
        endedAt: result.endedAt,
        error: errorMessage,
      });

      return result;
    } finally {
      // 清理 MCP 连接
      await this.mcpClient.disconnect();
    }
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(
    step: WorkflowStep,
    context: Record<string, unknown>,
    app: App
  ): Promise<StepResult> {
    const startedAt = new Date().toISOString();

    logger.info(`执行步骤: ${step.name} (${step.componentId})`);

    try {
      // 解析输入
      const inputs = this.resolveInputs(step.inputs, context);
      logger.debug(`步骤输入:`, inputs);

      // 根据组件类型执行
      let outputs: Record<string, unknown> = {};

      if (step.componentId.startsWith('github:') || step.componentId.startsWith('npm:')) {
        // MCP Server 执行
        outputs = await this.executeMcpStep(step, inputs);
      } else if (step.componentId.startsWith('clawhub:')) {
        // ClawHub Skill 执行
        outputs = await this.executeSkillStep(step, inputs);
      } else {
        // 内置步骤
        outputs = await this.executeBuiltinStep(step, inputs);
      }

      return {
        stepId: step.id,
        success: true,
        startedAt,
        endedAt: new Date().toISOString(),
        outputs,
      };
    } catch (error) {
      logger.error(`步骤执行失败 ${step.name}:`, error);
      return {
        stepId: step.id,
        success: false,
        startedAt,
        endedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 解析输入参数
   */
  private resolveInputs(
    inputs: Record<string, any>,
    context: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, mapping] of Object.entries(inputs)) {
      if (!mapping) continue;

      switch (mapping.type) {
        case 'static':
          resolved[key] = mapping.value;
          break;
        case 'fromPrevious':
          if (mapping.stepId && mapping.outputKey) {
            const value = context[`${mapping.stepId}.${mapping.outputKey}`];
            resolved[key] = value;
            logger.debug(`从上下文获取 ${key}: ${mapping.stepId}.${mapping.outputKey} = ${value}`);
          }
          break;
        case 'fromConfig':
          // 从应用配置获取
          resolved[key] = mapping.configKey;
          break;
        case 'fromUser':
          // 从用户输入获取（已在 context 中）
          resolved[key] = context[key];
          break;
        default:
          // 直接值
          resolved[key] = mapping;
      }
    }

    return resolved;
  }

  /**
   * 执行 MCP Server 步骤
   */
  private async executeMcpStep(
    step: WorkflowStep,
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // 从注册表获取组件配置
    const component = await this.registry.getComponent(step.componentId);

    if (!component) {
      throw new Error(`组件未找到: ${step.componentId}`);
    }

    if (!component.mcpConfig) {
      throw new Error(`组件缺少 MCP 配置: ${step.componentId}`);
    }

    // 连接到 MCP Server
    const client = await this.mcpClient.connect(step.componentId, component.mcpConfig);

    // 获取可用工具列表
    const tools = await this.mcpClient.listTools(step.componentId);
    logger.debug(`可用工具:`, tools.map(t => t.name));

    // 找到匹配的工具
    const tool = tools.find(t =>
      t.name === step.action ||
      t.name.includes(step.action) ||
      step.action.includes(t.name)
    );

    if (!tool) {
      throw new Error(`工具未找到: ${step.action} (可用: ${tools.map(t => t.name).join(', ')})`);
    }

    logger.info(`调用工具: ${tool.name}`);

    // 调用工具
    const result = await this.mcpClient.callTool(step.componentId, tool.name, inputs);

    // 解析结果
    let output: any = result;
    if (result.content && Array.isArray(result.content)) {
      // MCP 标准格式
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent) {
        try {
          output = JSON.parse(textContent.text);
        } catch {
          output = textContent.text;
        }
      }
    }

    return {
      result: output,
      tool: tool.name,
    };
  }

  /**
   * 执行 ClawHub Skill 步骤
   */
  private async executeSkillStep(
    step: WorkflowStep,
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // 从注册表获取组件
    const component = await this.registry.getComponent(step.componentId);

    if (!component) {
      throw new Error(`Skill 未找到: ${step.componentId}`);
    }

    logger.info(`执行 Skill: ${component.name}`);

    // TODO: 调用 OpenClaw Skill 系统
    // 目前使用模拟实现

    // 模拟天气查询
    if (step.componentId.includes('weather')) {
      return {
        temperature: '25°C',
        condition: '晴朗',
        location: inputs.location || '北京',
        humidity: '45%',
        wind: '3级',
      };
    }

    // 模拟飞书发送
    if (step.componentId.includes('feishu') || step.componentId.includes('lark')) {
      return {
        messageId: `msg_${Date.now()}`,
        status: 'sent',
        recipient: inputs.chatId || 'default',
      };
    }

    // 模拟微信发送
    if (step.componentId.includes('wechat')) {
      return {
        messageId: `wx_${Date.now()}`,
        status: 'sent',
      };
    }

    return {
      result: `Skill ${step.componentId} executed`,
      inputs,
    };
  }

  /**
   * 执行内置步骤
   */
  private async executeBuiltinStep(
    step: WorkflowStep,
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    switch (step.action) {
      case 'delay':
        const ms = parseInt(inputs.duration as string) || 1000;
        await new Promise(resolve => setTimeout(resolve, ms));
        return { result: `Delayed ${ms}ms` };

      case 'transform':
        // 数据转换
        return { result: inputs.data };

      case 'condition':
        // 条件判断
        const condition = inputs.condition as string;
        return { result: true, condition };

      case 'format':
        // 格式化输出
        const template = inputs.template as string;
        const data = inputs.data as Record<string, any>;
        let formatted = template;
        for (const [key, value] of Object.entries(data)) {
          formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        }
        return { result: formatted };

      default:
        return { result: `Builtin action ${step.action} executed` };
    }
  }
}

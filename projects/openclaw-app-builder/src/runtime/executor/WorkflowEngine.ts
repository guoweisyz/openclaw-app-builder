import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Component, App, WorkflowStep, ExecutionResult, StepResult } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * 工作流执行引擎
 */
export class WorkflowEngine {
  private clients: Map<string, Client> = new Map();

  /**
   * 执行应用
   */
  async execute(app: App, inputs?: Record<string, unknown>): Promise<ExecutionResult> {
    const runId = `run_${Date.now()}`;
    const startedAt = new Date().toISOString();
    
    logger.info(`开始执行应用: ${app.name} (run: ${runId})`);

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

      return {
        success: true,
        appId: app.id,
        runId,
        startedAt,
        endedAt: new Date().toISOString(),
        stepResults,
        outputs: context,
      };
    } catch (error) {
      return {
        success: false,
        appId: app.id,
        runId,
        startedAt,
        endedAt: new Date().toISOString(),
        stepResults,
        outputs: context,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // 清理客户端连接
      await this.cleanup();
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
    
    logger.info(`执行步骤: ${step.name}`);

    try {
      // 解析输入
      const inputs = this.resolveInputs(step.inputs, context);
      
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
      switch (mapping.type) {
        case 'static':
          resolved[key] = mapping.value;
          break;
        case 'fromPrevious':
          if (mapping.stepId && mapping.outputKey) {
            resolved[key] = context[`${mapping.stepId}.${mapping.outputKey}`];
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
    // 获取或创建 MCP 客户端
    let client = this.clients.get(step.componentId);
    
    if (!client) {
      client = await this.createMcpClient(step.componentId);
      this.clients.set(step.componentId, client);
    }

    // 列出可用工具
    const tools = await client.listTools();
    
    // 找到匹配的工具
    const tool = tools.tools.find(t => t.name === step.action || t.name.includes(step.action));
    
    if (!tool) {
      throw new Error(`工具未找到: ${step.action}`);
    }

    // 调用工具
    const result = await client.callTool({
      name: tool.name,
      arguments: inputs,
    });

    return {
      result: result.content,
    };
  }

  /**
   * 创建 MCP 客户端
   */
  private async createMcpClient(componentId: string): Promise<Client> {
    // TODO: 从注册表获取组件配置
    // 这里使用模拟配置
    const client = new Client(
      { name: 'openclaw-app-builder', version: '0.1.0' },
      { capabilities: {} }
    );

    // 创建 stdio 传输
    const transport = new StdioClientTransport({
      command: 'echo',  // 模拟命令
      args: ['mock'],
    });

    await client.connect(transport);
    return client;
  }

  /**
   * 执行 ClawHub Skill 步骤
   */
  private async executeSkillStep(
    step: WorkflowStep, 
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // TODO: 调用 OpenClaw Skill 系统
    logger.info(`执行 Skill: ${step.componentId}`);
    
    // 模拟执行
    return {
      result: `Skill ${step.componentId} executed with inputs: ${JSON.stringify(inputs)}`,
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
        // 简化版：直接返回 true
        return { result: true, condition };
        
      default:
        return { result: `Builtin action ${step.action} executed` };
    }
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    for (const [id, client] of this.clients) {
      try {
        await client.close();
        logger.debug(`关闭 MCP 客户端: ${id}`);
      } catch (error) {
        logger.error(`关闭客户端失败 ${id}:`, error);
      }
    }
    this.clients.clear();
  }
}

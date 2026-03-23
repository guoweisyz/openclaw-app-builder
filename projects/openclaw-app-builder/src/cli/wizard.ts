import inquirer from 'inquirer';
import chalk from 'chalk';
import type { ComponentRegistry } from '../marketplace/registry/ComponentRegistry.js';
import type { IntentEngine } from '../core/intent/IntentEngine.js';
import type { AppManager } from '../core/AppManager.js';
import type { App, UserIntent } from '../types/index.js';

/**
 * 检查是否在交互式终端
 */
function isInteractive(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY;
}

/**
 * 交互式应用创建向导
 * 5步创建流程，借鉴 Clawith
 */
export async function interactiveCreateWizard(
  registry: ComponentRegistry,
  intentEngine: IntentEngine,
  appManager: AppManager
): Promise<void> {
  // 检查是否在交互式环境
  if (!isInteractive()) {
    console.log(chalk.yellow('⚠️  非交互式环境，使用快速创建模式'));
    console.log(chalk.gray('提示: 在终端中运行以获得完整交互体验\n'));
    await quickCreateMode(registry, intentEngine, appManager);
    return;
  }

  console.log(chalk.blue.bold('\n🚀 OpenClaw App Builder - 交互式创建向导\n'));
  console.log(chalk.gray('让我们通过5个简单步骤创建你的AI应用\n'));

  // ========== 步骤1: 基础信息 ==========
  console.log(chalk.cyan.bold('步骤 1/5: 基础信息'));
  
  const basicInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: '请描述你想创建的应用:',
      default: '每天早上8点推送天气到飞书',
      validate: (input: string) => {
        if (input.trim().length < 5) {
          return '描述至少需要5个字符';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'name',
      message: '应用名称 (可选，留空自动生成):',
      default: '',
    },
  ]);

  // 分析意图
  console.log(chalk.gray('\n正在分析你的需求...'));
  const intent = await intentEngine.parseIntent(basicInfo.description);
  
  console.log(chalk.green('\n✓ 意图分析完成'));
  console.log(`  目标: ${intent.parsed.goal}`);
  console.log(`  动作: ${intent.parsed.actions.join(', ')}`);
  console.log(`  数据源: ${intent.parsed.dataSources.join(', ') || '无'}`);
  console.log(`  目的地: ${intent.parsed.destinations.join(', ') || '无'}`);
  console.log(`  定时: ${intent.parsed.schedule || '无'}`);

  // ========== 步骤2: 意图确认与细化 ==========
  console.log(chalk.cyan.bold('\n步骤 2/5: 确认意图'));
  
  const intentConfirm = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'correct',
      message: '以上分析是否正确?',
      default: true,
    },
  ]);

  if (!intentConfirm.correct) {
    // 手动调整
    const manualAdjust = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'actions',
        message: '选择需要的动作:',
        choices: ['fetch', 'send', 'save', 'analyze', 'transform'],
        default: intent.parsed.actions,
      },
      {
        type: 'checkbox',
        name: 'dataSources',
        message: '选择数据来源:',
        choices: ['weather', 'web', 'zhihu', 'news', 'stock', 'api'],
        default: intent.parsed.dataSources,
      },
      {
        type: 'checkbox',
        name: 'destinations',
        message: '选择数据目的地:',
        choices: ['wechat', 'feishu', 'notion', 'email', 'file', 'slack'],
        default: intent.parsed.destinations,
      },
    ]);

    intent.parsed.actions = manualAdjust.actions;
    intent.parsed.dataSources = manualAdjust.dataSources;
    intent.parsed.destinations = manualAdjust.destinations;
  }

  // ========== 步骤3: 组件选择 ==========
  console.log(chalk.cyan.bold('\n步骤 3/5: 组件配置'));
  
  // 搜索推荐组件
  const suggestedComponents = await registry.search({
    query: intent.parsed.dataSources[0] || intent.parsed.destinations[0] || '',
    limit: 10,
  });

  const componentChoices = suggestedComponents.map(c => ({
    name: `${c.displayName} (${c.source.channel}) - ${c.description.slice(0, 40)}...`,
    value: c.id,
    checked: intent.suggestedComponents.some(sc => sc.id === c.id),
  }));

  const componentSelect = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'components',
      message: '选择需要的组件 (已根据意图预选):',
      choices: componentChoices,
    },
  ]);

  // ========== 步骤4: 触发方式与权限 ==========
  console.log(chalk.cyan.bold('\n步骤 4/5: 触发方式与权限'));
  
  const triggerConfig = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: '选择触发方式:',
      choices: [
        { name: '⏰ 定时触发 (Cron)', value: 'schedule' },
        { name: '👆 手动触发', value: 'manual' },
        { name: '🔗 Webhook 触发', value: 'webhook' },
        { name: '📨 事件触发', value: 'event' },
      ],
      default: intent.parsed.schedule ? 'schedule' : 'manual',
    },
    {
      type: 'input',
      name: 'cron',
      message: 'Cron 表达式 (例如 "0 8 * * *" 表示每天8点):',
      default: intent.parsed.schedule === 'daily' ? '0 8 * * *' : 
               intent.parsed.schedule === 'hourly' ? '0 * * * *' : '0 8 * * *',
      when: (answers: any) => answers.type === 'schedule',
    },
    {
      type: 'list',
      name: 'autonomy',
      message: '选择执行权限级别 (借鉴 Clawith):',
      choices: [
        { name: '🟢 自动执行 - 无需确认直接运行', value: 'auto' },
        { name: '🟡 执行前通知 - 运行前发送通知', value: 'notify' },
        { name: '🔴 执行前审批 - 需要人工确认', value: 'approve' },
      ],
      default: 'auto',
    },
  ]);

  // ========== 步骤5: 确认与创建 ==========
  console.log(chalk.cyan.bold('\n步骤 5/5: 确认与创建'));

  // 生成应用预览
  const appPreview: Partial<App> = {
    name: basicInfo.name || intentEngine.generateAppName(intent.parsed),
    description: basicInfo.description,
    trigger: {
      type: triggerConfig.type,
      config: triggerConfig.cron ? { cron: triggerConfig.cron } : {},
    },
    workflow: intentEngine.buildWorkflow(intent.parsed),
    components: componentSelect.components,
    config: {
      autonomy: triggerConfig.autonomy,
    },
  };

  console.log(chalk.blue('\n应用预览:'));
  console.log(`  名称: ${chalk.bold(appPreview.name)}`);
  console.log(`  描述: ${appPreview.description}`);
  console.log(`  触发: ${triggerConfig.type}${triggerConfig.cron ? ` (${triggerConfig.cron})` : ''}`);
  console.log(`  权限: ${triggerConfig.autonomy}`);
  console.log(`  组件: ${componentSelect.components.join(', ')}`);
  console.log(`  步骤: ${appPreview.workflow?.length} 个`);

  const confirm = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'create',
      message: '确认创建应用?',
      default: true,
    },
  ]);

  if (!confirm.create) {
    console.log(chalk.yellow('\n已取消创建'));
    return;
  }

  // 创建应用
  console.log(chalk.gray('\n正在创建应用...'));
  
  try {
    const app = await appManager.create(appPreview);
    
    console.log(chalk.green('\n✓ 应用创建成功!\n'));
    console.log(`${chalk.bold('应用ID:')} ${chalk.cyan(app.id)}`);
    console.log(`${chalk.bold('名称:')} ${app.name}`);
    console.log(`${chalk.bold('状态:')} ${app.status}`);
    
    console.log(chalk.bold('\n下一步操作:'));
    console.log(`  运行应用: ${chalk.gray(`npm run cli -- run ${app.id}`)}`);
    console.log(`  查看详情: ${chalk.gray(`npm run cli -- info ${app.id}`)}`);
    console.log(`  列出所有: ${chalk.gray(`npm run cli -- list`)}`);
    
    if (triggerConfig.autonomy === 'auto') {
      const runNow = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'run',
          message: '是否立即运行一次测试?',
          default: true,
        },
      ]);
      
      if (runNow.run) {
        console.log(chalk.gray('\n正在运行应用...'));
        const result = await appManager.run(app.id);
        
        if (result.success) {
          console.log(chalk.green('\n✓ 运行成功!'));
          console.log(`  耗时: ${new Date(result.endedAt).getTime() - new Date(result.startedAt).getTime()}ms`);
          if (Object.keys(result.outputs).length > 0) {
            console.log(chalk.bold('\n输出:'));
            console.log(JSON.stringify(result.outputs, null, 2));
          }
        } else {
          console.log(chalk.red('\n✗ 运行失败'));
          console.log(`  错误: ${result.error}`);
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('\n创建失败:'), error instanceof Error ? error.message : error);
  }
}

/**
 * 快速创建模式（非交互式环境）
 */
async function quickCreateMode(
  registry: ComponentRegistry,
  intentEngine: IntentEngine,
  appManager: AppManager
): Promise<void> {
  const defaultDescription = '每天早上8点推送天气到飞书';

  console.log(chalk.blue('使用默认示例创建应用...'));
  console.log(chalk.gray(`描述: ${defaultDescription}\n`));

  try {
    const intent = await intentEngine.parseIntent(defaultDescription);
    const appName = intentEngine.generateAppName(intent.parsed);
    const workflow = intentEngine.buildWorkflow(intent.parsed, intent.suggestedComponents);

    const appPreview: Partial<App> = {
      name: appName,
      description: defaultDescription,
      trigger: {
        type: 'schedule',
        config: { cron: '0 8 * * *' },
      },
      workflow,
      components: intent.suggestedComponents.map(c => c.id),
      config: { autonomy: 'auto' },
    };

    const app = await appManager.create(appPreview);

    console.log(chalk.green('\n✓ 应用创建成功!\n'));
    console.log(`${chalk.bold('应用ID:')} ${chalk.cyan(app.id)}`);
    console.log(`${chalk.bold('名称:')} ${app.name}`);
    console.log(`${chalk.bold('触发:')} 每天 8:00`);
    console.log(`${chalk.bold('步骤:')} ${app.workflow.length} 个`);

    console.log(chalk.bold('\n下一步:'));
    console.log(`  运行: ${chalk.gray(`npm run cli -- run ${app.id}`)}`);
    console.log(`  列表: ${chalk.gray(`npm run cli -- list`)}`);

    // 自动运行一次
    console.log(chalk.gray('\n正在运行测试...'));
    const result = await appManager.run(app.id);

    if (result.success) {
      console.log(chalk.green('✓ 运行成功!'));
    } else {
      console.log(chalk.red('✗ 运行失败'), result.error);
    }
  } catch (error) {
    console.error(chalk.red('创建失败:'), error instanceof Error ? error.message : error);
  }
}

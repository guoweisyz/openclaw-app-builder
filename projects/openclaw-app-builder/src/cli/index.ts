#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { ComponentRegistry } from '../marketplace/registry/ComponentRegistry.js';
import { IntentEngine } from '../core/intent/IntentEngine.js';
import { AppManager } from '../core/AppManager.js';
import { interactiveCreateWizard } from './wizard.js';

const program = new Command();

program
  .name('openclaw-app-builder')
  .description('OpenClaw App Builder CLI')
  .version('0.1.0');

// 初始化注册表
async function initRegistry() {
  const registry = new ComponentRegistry();
  await registry.initialize();
  return registry;
}

// 搜索组件
program
  .command('search <query>')
  .description('搜索组件')
  .option('-c, --channel <channel>', '指定渠道 (github/npm/clawhub)')
  .option('-t, --type <type>', '指定类型 (skill/mcp-server)')
  .option('-l, --limit <number>', '限制结果数量', '10')
  .action(async (query, options) => {
    const registry = await initRegistry();
    
    const components = await registry.search({
      query,
      channels: options.channel ? [options.channel] : undefined,
      types: options.type ? [options.type] : undefined,
      limit: parseInt(options.limit),
    });

    console.log(chalk.blue(`\n找到 ${components.length} 个组件:\n`));
    
    for (const c of components) {
      const verifiedBadge = c.verified ? chalk.green('✓') : chalk.gray('○');
      const typeBadge = c.type === 'skill' 
        ? chalk.cyan('[Skill]') 
        : chalk.magenta('[MCP]');
      
      console.log(`${verifiedBadge} ${chalk.bold(c.displayName)} ${typeBadge}`);
      console.log(`   ${chalk.gray(c.name)} | ${c.description}`);
      console.log(`   渠道: ${c.source.channel} | 标签: ${c.tags.slice(0, 5).join(', ')}`);
      
      if (c.stats?.stars) {
        process.stdout.write(`   ⭐ ${c.stats.stars}`);
      }
      if (c.stats?.downloads) {
        process.stdout.write(` | 📥 ${c.stats.downloads}`);
      }
      console.log('\n');
    }
  });

// 创建应用
program
  .command('create <description>')
  .description('根据描述创建应用')
  .option('-n, --name <name>', '应用名称')
  .option('-s, --save', '保存到数据库')
  .action(async (description, options) => {
    const registry = await initRegistry();
    const intentEngine = new IntentEngine(registry);
    
    console.log(chalk.blue('正在分析需求...'));
    
    try {
      const { app, intent } = await intentEngine.generateApp(description, options.name);
      
      console.log(chalk.green('\n✓ 应用创建成功!\n'));
      console.log(`${chalk.bold('名称:')} ${app.name}`);
      console.log(`${chalk.bold('描述:')} ${app.description}`);
      console.log(`${chalk.bold('触发方式:')} ${app.trigger.type}`);
      
      if (app.trigger.config?.cron) {
        console.log(`${chalk.bold('定时规则:')} ${app.trigger.config.cron}`);
      }
      
      console.log(chalk.bold(`\n工作流 (${app.workflow.length} 个步骤):`));
      for (const step of app.workflow) {
        console.log(`  ${chalk.cyan(step.id)}: ${step.name}`);
        console.log(`     组件: ${step.componentId} | 动作: ${step.action}`);
      }
      
      console.log(chalk.bold(`\n建议组件 (${intent.suggestedComponents.length} 个):`));
      for (const c of intent.suggestedComponents) {
        const typeBadge = c.type === 'skill' ? chalk.cyan('[S]') : chalk.magenta('[M]');
        console.log(`  ${typeBadge} ${c.displayName} (${c.source.channel})`);
      }
      
      const confidenceColor = intent.confidence >= 0.8 ? chalk.green 
        : intent.confidence >= 0.5 ? chalk.yellow 
        : chalk.red;
      console.log(chalk.bold(`\n置信度: ${confidenceColor((intent.confidence * 100).toFixed(0) + '%')}`));
      
      if (intent.confidence < 0.7) {
        console.log(chalk.yellow('\n提示: 置信度较低，建议更详细地描述需求'));
      }

      // 保存到数据库
      if (options.save) {
        const appManager = new AppManager(registry);
        await appManager.initialize();
        await appManager.create(app);
        console.log(chalk.green('\n✓ 已保存到数据库'));
      }
    } catch (error) {
      console.error(chalk.red('\n创建失败:'), error instanceof Error ? error.message : error);
    }
  });

// 交互式创建向导（借鉴 Clawith）
program
  .command('wizard')
  .description('交互式应用创建向导（5步流程）')
  .action(async () => {
    const registry = await initRegistry();
    const intentEngine = new IntentEngine(registry);
    const appManager = new AppManager(registry);
    await appManager.initialize();
    
    try {
      await interactiveCreateWizard(registry, intentEngine, appManager);
    } catch (error) {
      console.error(chalk.red('\n向导执行失败:'), error instanceof Error ? error.message : error);
    }
  });

// 列出应用
program
  .command('list')
  .description('列出所有应用')
  .action(async () => {
    const registry = await initRegistry();
    const appManager = new AppManager(registry);
    await appManager.initialize();
    
    const apps = await appManager.list();
    
    if (apps.length === 0) {
      console.log(chalk.yellow('暂无应用，使用 `create` 命令创建'));
      return;
    }
    
    console.log(chalk.blue(`\n共有 ${apps.length} 个应用:\n`));
    
    for (const app of apps) {
      const statusColor = app.status === 'active' ? chalk.green 
        : app.status === 'draft' ? chalk.yellow 
        : chalk.gray;
      const statusBadge = statusColor(`[${app.status.toUpperCase()}]`);
      
      console.log(`${chalk.bold(app.name)} ${statusBadge}`);
      console.log(`   ID: ${chalk.gray(app.id)}`);
      console.log(`   ${app.description}`);
      console.log(`   触发: ${app.trigger.type} | 步骤: ${app.workflow.length}`);
      console.log();
    }
  });

// 运行应用
program
  .command('run <id>')
  .description('运行应用')
  .option('-i, --input <json>', '输入参数 (JSON 格式)')
  .action(async (id, options) => {
    const registry = await initRegistry();
    const appManager = new AppManager(registry);
    await appManager.initialize();
    
    console.log(chalk.blue('运行应用...'));
    
    try {
      const inputs = options.input ? JSON.parse(options.input) : {};
      const result = await appManager.run(id, inputs);
      
      if (result.success) {
        console.log(chalk.green('\n✓ 运行成功!'));
        console.log(`运行ID: ${chalk.gray(result.runId)}`);
        console.log(`耗时: ${new Date(result.endedAt).getTime() - new Date(result.startedAt).getTime()}ms`);
        
        if (Object.keys(result.outputs).length > 0) {
          console.log(chalk.bold('\n输出:'));
          console.log(JSON.stringify(result.outputs, null, 2));
        }
      } else {
        console.log(chalk.red('\n✗ 运行失败'));
        console.log(`错误: ${result.error}`);
      }
    } catch (error) {
      console.error(chalk.red('运行失败:'), error instanceof Error ? error.message : error);
    }
  });

// 同步组件
program
  .command('sync')
  .description('从远程同步组件')
  .option('-s, --source <source>', '数据源 (github/npm/all)', 'all')
  .option('-q, --query <query>', '搜索关键词')
  .option('-l, --limit <number>', '限制数量', '30')
  .action(async (options) => {
    const registry = await initRegistry();
    
    console.log(chalk.blue('开始同步组件...'));
    
    try {
      if (options.source === 'github' || options.source === 'all') {
        const count = await registry.syncFromGitHub({ 
          query: options.query, 
          limit: parseInt(options.limit),
        });
        console.log(chalk.green(`✓ 从 GitHub 同步了 ${count} 个组件`));
      }
      
      if (options.source === 'npm' || options.source === 'all') {
        const count = await registry.syncFromNpm({ 
          query: options.query, 
          limit: parseInt(options.limit),
        });
        console.log(chalk.green(`✓ 从 npm 同步了 ${count} 个组件`));
      }
      
      console.log(chalk.green('\n同步完成!'));
    } catch (error) {
      console.error(chalk.red('同步失败:'), error instanceof Error ? error.message : error);
    }
  });

// 获取组件详情
program
  .command('info <id>')
  .description('查看组件详情')
  .action(async (id) => {
    const registry = await initRegistry();
    
    const component = await registry.get(id);
    
    if (!component) {
      console.log(chalk.red('组件未找到'));
      return;
    }
    
    console.log(chalk.blue(`\n${component.displayName}\n`));
    console.log(`${chalk.bold('ID:')} ${component.id}`);
    console.log(`${chalk.bold('名称:')} ${component.name}`);
    console.log(`${chalk.bold('描述:')} ${component.description}`);
    console.log(`${chalk.bold('版本:')} ${component.version}`);
    console.log(`${chalk.bold('类型:')} ${component.type}`);
    console.log(`${chalk.bold('来源:')} ${component.source.channel} (${component.source.url})`);
    
    if (component.stats) {
      console.log(chalk.bold('\n统计:'));
      if (component.stats.stars) console.log(`  ⭐ Stars: ${component.stats.stars}`);
      if (component.stats.downloads) console.log(`  📥 Downloads: ${component.stats.downloads}`);
      if (component.stats.lastUpdated) console.log(`  🕐 Updated: ${component.stats.lastUpdated}`);
    }
    
    console.log(chalk.bold('\n标签:'));
    console.log(`  ${component.tags.join(', ')}`);
    
    console.log(chalk.bold('\n安装:'));
    console.log(`  方式: ${component.install.type}`);
    if (component.install.package) console.log(`  包名: ${component.install.package}`);
    if (component.install.command) console.log(`  命令: ${component.install.command}`);
  });

// 导出应用
program
  .command('export <id>')
  .description('导出应用配置')
  .option('-f, --format <format>', '导出格式 (json/yaml)', 'json')
  .option('-o, --output <path>', '输出文件路径')
  .action(async (id, options) => {
    const registry = await initRegistry();
    const appManager = new AppManager(registry);
    await appManager.initialize();
    
    try {
      const { content, filename } = await appManager.exportApp(id, options.format);
      
      if (options.output) {
        const fs = await import('fs');
        fs.writeFileSync(options.output, content);
        console.log(chalk.green(`✓ 已导出到: ${options.output}`));
      } else {
        console.log(chalk.blue(`\n${filename}\n`));
        console.log(content);
      }
    } catch (error) {
      console.error(chalk.red('导出失败:'), error instanceof Error ? error.message : error);
    }
  });

// 导入应用
program
  .command('import <file>')
  .description('从文件导入应用')
  .option('-n, --name <name>', '新应用名称（可选）')
  .action(async (file, options) => {
    const registry = await initRegistry();
    const appManager = new AppManager(registry);
    await appManager.initialize();
    
    try {
      const fs = await import('fs');
      const content = fs.readFileSync(file, 'utf-8');
      
      const app = await appManager.importApp(content, options.name);
      console.log(chalk.green('\n✓ 应用导入成功!'));
      console.log(`  ID: ${app.id}`);
      console.log(`  名称: ${app.name}`);
    } catch (error) {
      console.error(chalk.red('导入失败:'), error instanceof Error ? error.message : error);
    }
  });

program.parse();

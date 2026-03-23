import type { App } from '../types/index.js';

/**
 * 应用导出格式
 */
export interface ExportedApp {
  version: string;
  exportedAt: string;
  app: {
    name: string;
    description: string;
    trigger: App['trigger'];
    workflow: App['workflow'];
    components: string[];
    config: Record<string, unknown>;
  };
  metadata: {
    exportedBy?: string;
    sourceUrl?: string;
    tags?: string[];
    category?: string;
  };
}

/**
 * 应用导出器
 */
export class AppExporter {
  private version = '1.0.0';

  /**
   * 导出应用为 JSON
   */
  toJSON(app: App, metadata?: ExportedApp['metadata']): string {
    const exported: ExportedApp = {
      version: this.version,
      exportedAt: new Date().toISOString(),
      app: {
        name: app.name,
        description: app.description,
        trigger: app.trigger,
        workflow: app.workflow,
        components: app.components,
        config: app.config,
      },
      metadata: metadata || {},
    };

    return JSON.stringify(exported, null, 2);
  }

  /**
   * 导出应用为 YAML
   */
  toYAML(app: App, metadata?: ExportedApp['metadata']): string {
    const exported: ExportedApp = {
      version: this.version,
      exportedAt: new Date().toISOString(),
      app: {
        name: app.name,
        description: app.description,
        trigger: app.trigger,
        workflow: app.workflow,
        components: app.components,
        config: app.config,
      },
      metadata: metadata || {},
    };

    return this.convertToYAML(exported);
  }

  /**
   * 从 JSON 导入应用
   */
  fromJSON(json: string): Partial<App> {
    const exported: ExportedApp = JSON.parse(json);
    
    if (exported.version !== this.version) {
      console.warn(`版本不匹配: 导出版本 ${exported.version}, 当前版本 ${this.version}`);
    }

    return {
      name: exported.app.name,
      description: exported.app.description,
      trigger: exported.app.trigger,
      workflow: exported.app.workflow,
      components: exported.app.components,
      config: exported.app.config,
    };
  }

  /**
   * 简单的 JSON 转 YAML
   */
  private convertToYAML(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        yaml += `${spaces}${key}: null\n`;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        yaml += this.convertToYAML(value, indent + 1);
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}-\n`;
            yaml += this.convertToYAML(item, indent + 1).replace(/^/gm, '  ');
          } else {
            yaml += `${spaces}- ${item}\n`;
          }
        }
      } else if (typeof value === 'string') {
        // 处理多行字符串
        if (value.includes('\n') || value.includes(':') || value.includes('#')) {
          yaml += `${spaces}${key}: |\n`;
          yaml += value.split('\n').map(line => `${spaces}  ${line}`).join('\n') + '\n';
        } else {
          yaml += `${spaces}${key}: ${value}\n`;
        }
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }

  /**
   * 生成分享链接（简化版）
   */
  generateShareLink(app: App): string {
    const data = this.toJSON(app);
    // 使用 base64 编码
    const encoded = Buffer.from(data).toString('base64');
    return `https://app-builder.openclaw.ai/share/${encoded.slice(0, 16)}`;
  }
}

export const appExporter = new AppExporter();

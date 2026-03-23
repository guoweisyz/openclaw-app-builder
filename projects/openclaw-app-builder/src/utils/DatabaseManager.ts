import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import type { Component, App } from '../types/index.js';
import { logger } from './logger.js';

/**
 * SQLite 数据库管理
 */
export class DatabaseManager {
  private db: any;
  private dbPath: string;

  constructor(dbPath = './data/app-builder.db') {
    this.dbPath = dbPath;
  }

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    logger.info('初始化数据库...');
    
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
    });

    await this.createTables();
    logger.info('数据库初始化完成');
  }

  /**
   * 创建表结构
   */
  private async createTables(): Promise<void> {
    // 组件表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS components (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        version TEXT,
        source_channel TEXT,
        source_url TEXT,
        package_name TEXT,
        type TEXT,
        install_type TEXT,
        install_package TEXT,
        install_command TEXT,
        mcp_transport TEXT,
        mcp_command TEXT,
        mcp_args TEXT,
        capabilities TEXT,
        tags TEXT,
        stats_stars INTEGER,
        stats_downloads INTEGER,
        stats_last_updated TEXT,
        author TEXT,
        license TEXT,
        verified INTEGER DEFAULT 0,
        featured INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 应用表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS apps (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        trigger_type TEXT,
        trigger_config TEXT,
        workflow TEXT,
        components TEXT,
        config TEXT,
        status TEXT DEFAULT 'draft',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 执行记录表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS executions (
        id TEXT PRIMARY KEY,
        app_id TEXT,
        status TEXT,
        started_at TEXT,
        ended_at TEXT,
        result TEXT,
        error TEXT,
        FOREIGN KEY (app_id) REFERENCES apps(id)
      )
    `);

    // 创建索引
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_components_channel ON components(source_channel);
      CREATE INDEX IF NOT EXISTS idx_components_type ON components(type);
      CREATE INDEX IF NOT EXISTS idx_components_verified ON components(verified);
      CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
      CREATE INDEX IF NOT EXISTS idx_executions_app ON executions(app_id);
    `);
  }

  /**
   * 保存组件
   */
  async saveComponent(component: Component): Promise<void> {
    const stmt = await this.db.prepare(`
      INSERT OR REPLACE INTO components (
        id, name, display_name, description, version,
        source_channel, source_url, package_name,
        type, install_type, install_package, install_command,
        mcp_transport, mcp_command, mcp_args,
        capabilities, tags,
        stats_stars, stats_downloads, stats_last_updated,
        author, license, verified, featured,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.run(
      component.id,
      component.name,
      component.displayName,
      component.description,
      component.version,
      component.source.channel,
      component.source.url,
      component.source.packageName,
      component.type,
      component.install.type,
      component.install.package,
      component.install.command,
      component.mcpConfig?.transport,
      component.mcpConfig?.command,
      JSON.stringify(component.mcpConfig?.args || []),
      JSON.stringify(component.capabilities),
      JSON.stringify(component.tags),
      component.stats?.stars,
      component.stats?.downloads,
      component.stats?.lastUpdated,
      component.author,
      component.license,
      component.verified ? 1 : 0,
      component.featured ? 1 : 0,
      new Date().toISOString()
    );

    await stmt.finalize();
  }

  /**
   * 批量保存组件
   */
  async saveComponents(components: Component[]): Promise<void> {
    for (const component of components) {
      await this.saveComponent(component);
    }
    logger.info(`保存了 ${components.length} 个组件`);
  }

  /**
   * 搜索组件
   */
  async searchComponents(params: {
    query?: string;
    channels?: string[];
    types?: string[];
    tags?: string[];
    verifiedOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Component[]> {
    const { query, channels, types, tags, verifiedOnly, limit = 20, offset = 0 } = params;
    
    let sql = 'SELECT * FROM components WHERE 1=1';
    const params_array: any[] = [];

    if (query) {
      sql += ` AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)`;
      const likeQuery = `%${query}%`;
      params_array.push(likeQuery, likeQuery, likeQuery);
    }

    if (channels?.length) {
      sql += ` AND source_channel IN (${channels.map(() => '?').join(',')})`;
      params_array.push(...channels);
    }

    if (types?.length) {
      sql += ` AND type IN (${types.map(() => '?').join(',')})`;
      params_array.push(...types);
    }

    if (verifiedOnly) {
      sql += ` AND verified = 1`;
    }

    sql += ` ORDER BY stats_stars DESC, stats_downloads DESC`;
    sql += ` LIMIT ? OFFSET ?`;
    params_array.push(limit, offset);

    const rows: any[] = await this.db.all(sql, params_array);
    return rows.map((row: any) => this.rowToComponent(row));
  }

  /**
   * 获取单个组件
   */
  async getComponent(id: string): Promise<Component | null> {
    const row = await this.db.get('SELECT * FROM components WHERE id = ?', id);
    return row ? this.rowToComponent(row) : null;
  }

  /**
   * 保存应用
   */
  async saveApp(app: App): Promise<void> {
    const stmt = await this.db.prepare(`
      INSERT OR REPLACE INTO apps (
        id, name, description,
        trigger_type, trigger_config,
        workflow, components, config,
        status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.run(
      app.id,
      app.name,
      app.description,
      app.trigger.type,
      JSON.stringify(app.trigger.config || {}),
      JSON.stringify(app.workflow),
      JSON.stringify(app.components),
      JSON.stringify(app.config),
      app.status,
      new Date().toISOString()
    );

    await stmt.finalize();
  }

  /**
   * 获取所有应用
   */
  async getApps(): Promise<App[]> {
    const rows: any[] = await this.db.all('SELECT * FROM apps ORDER BY updated_at DESC');
    return rows.map((row: any) => this.rowToApp(row));
  }

  /**
   * 获取单个应用
   */
  async getApp(id: string): Promise<App | null> {
    const row = await this.db.get('SELECT * FROM apps WHERE id = ?', id);
    return row ? this.rowToApp(row) : null;
  }

  /**
   * 删除应用
   */
  async deleteApp(id: string): Promise<void> {
    await this.db.run('DELETE FROM apps WHERE id = ?', id);
  }

  /**
   * 行转组件对象
   */
  private rowToComponent(row: any): Component {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      version: row.version,
      source: {
        channel: row.source_channel,
        url: row.source_url,
        packageName: row.package_name,
      },
      type: row.type,
      install: {
        type: row.install_type,
        package: row.install_package,
        command: row.install_command,
      },
      mcpConfig: row.mcp_transport ? {
        transport: row.mcp_transport,
        command: row.mcp_command,
        args: JSON.parse(row.mcp_args || '[]'),
      } : undefined,
      capabilities: JSON.parse(row.capabilities || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      stats: {
        stars: row.stats_stars,
        downloads: row.stats_downloads,
        lastUpdated: row.stats_last_updated,
      },
      author: row.author,
      license: row.license,
      verified: !!row.verified,
      featured: !!row.featured,
    };
  }

  /**
   * 行转应用对象
   */
  private rowToApp(row: any): App {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      trigger: {
        type: row.trigger_type,
        config: JSON.parse(row.trigger_config || '{}'),
      },
      workflow: JSON.parse(row.workflow || '[]'),
      components: JSON.parse(row.components || '[]'),
      config: JSON.parse(row.config || '{}'),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    await this.db.close();
  }
}

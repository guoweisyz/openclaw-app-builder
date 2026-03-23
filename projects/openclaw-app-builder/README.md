# OpenClaw App Builder

让产品经理通过 OpenClaw 用自然语言快速构建 AI 应用。

## 核心功能

- **意图理解**：将"每天推送天气到微信"解析为结构化需求
- **组件聚合**：自动从 GitHub、npm、ClawHub 发现 MCP Servers 和 Skills
- **应用生成**：自动组装工作流，生成可运行的应用配置
- **工作流执行**：实际运行应用，支持定时触发

## 快速开始

### 1. 安装依赖

```bash
cd projects/openclaw-app-builder
npm install
```

### 2. 配置环境变量（可选）

```bash
cp .env.example .env
# 编辑 .env 添加 OPENAI_API_KEY 以启用 LLM 意图理解
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

服务启动后访问: http://localhost:3000

## CLI 使用

### 搜索组件

```bash
# 搜索天气相关组件
npm run cli -- search 天气

# 仅搜索 GitHub 上的 MCP Servers
npm run cli -- search file --channel github

# 搜索并限制数量
npm run cli -- search fetch --limit 5
```

### 创建应用

```bash
# 创建天气推送应用
npm run cli -- create "每天推送天气到微信"

# 指定名称并保存
npm run cli -- create "每天早上9点抓取知乎热榜保存到 Notion" \
  --name "知乎热榜同步" \
  --save
```

### 管理应用

```bash
# 列出所有应用
npm run cli -- list

# 运行应用
npm run cli -- run app_1234567890

# 查看应用详情
npm run cli -- info github:modelcontextprotocol/servers
```

### 同步组件

```bash
# 从 GitHub 同步 MCP Servers
npm run cli -- sync --source github

# 从 npm 同步
npm run cli -- sync --source npm

# 同步所有渠道
npm run cli -- sync

# 搜索特定关键词同步
npm run cli -- sync --query weather --limit 20
```

## API 文档

### 意图解析

```bash
POST /api/intent/parse
{
  "description": "每天推送天气到微信"
}

Response:
{
  "rawDescription": "每天推送天气到微信",
  "parsed": {
    "goal": "每天推送天气到微信",
    "actions": ["fetch", "send"],
    "dataSources": ["weather"],
    "destinations": ["wechat"],
    "schedule": "daily"
  },
  "suggestedComponents": [...],
  "confidence": 0.95
}
```

### 生成应用

```bash
POST /api/intent/generate
{
  "description": "每天推送天气到微信",
  "name": "天气推送助手"
}

Response:
{
  "app": {
    "id": "app_1234567890",
    "name": "天气推送助手",
    "trigger": { "type": "schedule", "config": { "cron": "0 8 * * *" } },
    "workflow": [...]
  },
  "intent": { ... }
}
```

### 搜索组件

```bash
GET /api/components?q=天气&channel=github&limit=10
```

### 同步组件

```bash
POST /api/sync/github
{ "query": "weather", "limit": 30 }

POST /api/sync/npm
{ "query": "fetch", "limit": 30 }

POST /api/sync/all
```

### 应用管理

```bash
# 创建应用
POST /api/apps
{
  "name": "天气推送助手",
  "description": "每天推送天气到微信",
  "trigger": { "type": "schedule", "config": { "cron": "0 8 * * *" } },
  "workflow": [...]
}

# 运行应用
POST /api/apps/{id}/run

# 部署应用
POST /api/apps/{id}/deploy
```

## 架构

```
openclaw-app-builder/
├── src/
│   ├── api/              # HTTP API 服务
│   ├── core/             # 核心引擎
│   │   ├── intent/       # 意图理解引擎 (LLM + 规则)
│   │   └── AppManager.ts # 应用管理
│   ├── marketplace/      # 组件市场
│   │   ├── adapters/     # 渠道适配器
│   │   │   ├── GitHubAdapter.ts
│   │   │   └── NpmAdapter.ts
│   │   └── registry/     # 组件注册表
│   ├── runtime/          # 运行时
│   │   └── executor/     # 工作流执行引擎
│   ├── cli/              # 命令行工具
│   ├── types/            # 类型定义
│   └── utils/            # 工具函数
│       └── DatabaseManager.ts  # SQLite 数据库
```

## 开发计划

- [x] 项目骨架
- [x] 核心类型定义
- [x] API 路由
- [x] CLI 工具
- [x] SQLite 持久化
- [x] GitHub 适配器
- [x] npm 适配器
- [x] LLM 意图理解
- [x] 工作流执行引擎
- [ ] 前端界面
- [ ] OpenClaw Gateway 集成
- [ ] 百度千帆/阿里百炼适配器
- [ ] 应用分享/导出

## 环境变量

| 变量 | 说明 | 必需 |
|------|------|------|
| `PORT` | 服务端口号 | 否 (默认 3000) |
| `OPENAI_API_KEY` | OpenAI API Key (用于意图理解) | 否 |
| `OPENAI_BASE_URL` | OpenAI API 基础 URL | 否 |
| `GITHUB_TOKEN` | GitHub Token (提高 API 限制) | 否 |
| `DATA_DIR` | 数据存储目录 | 否 (默认 ./data) |

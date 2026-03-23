# OpenClaw App Builder

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

让产品经理通过 OpenClaw 用自然语言快速构建 AI 应用。

> 💡 **核心理念**: 用一句话描述需求，自动生成可运行的 AI 应用。

## ✨ 核心功能

- **🧠 意图理解**: 将"每天推送天气到微信"解析为结构化需求
- **📦 组件聚合**: 自动从 GitHub、npm、ClawHub 发现 MCP Servers 和 Skills
- **🚀 应用生成**: 自动组装工作流，生成可运行的应用配置
- **⚡ 工作流执行**: 实际运行应用，支持定时触发

## 🚀 快速开始

### 安装

```bash
git clone https://github.com/guoweisyz/openclaw-app-builder.git
cd openclaw-app-builder
npm install
```

### 配置环境变量（可选）

```bash
cp .env.example .env
# 编辑 .env 添加 OPENAI_API_KEY 以启用 LLM 意图理解
```

### 启动服务

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm run build
npm start
```

服务启动后访问: http://localhost:3000

## 📖 使用示例

### 示例 1: 天气推送应用

```bash
npm run cli -- create "每天早上8点推送天气到飞书" --save
```

**输出**:
```
✓ 应用创建成功!
名称: 天气飞书通知定时助手
触发方式: schedule (00 08 * * *)
工作流 (2 个步骤):
  step_0: 获取天气数据
     组件: clawhub:weather | 动作: fetch
  step_1: 发送到飞书
     组件: clawhub:feishu | 动作: send
置信度: 100%
```

### 示例 2: 知乎热榜同步

```bash
npm run cli -- create "每小时抓取知乎热榜并发送到微信" --save
```

### 示例 3: 通过 API 创建

```bash
curl -X POST http://localhost:3000/api/intent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "每天早上9点抓取知乎热榜保存到 Notion",
    "name": "知乎热榜同步"
  }'
```

### 示例 4: 交互式向导（推荐）

```bash
npm run cli -- wizard
```

**5步交互式流程**（借鉴 Clawith）:
1. **基础信息** - 输入应用描述
2. **意图确认** - 确认AI分析结果或手动调整
3. **组件配置** - 选择需要的组件
4. **触发方式与权限** - 设置定时/手动/Webhook，选择执行权限级别
5. **确认与创建** - 预览并创建应用

## 🛠️ CLI 命令

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
# 方式1: 交互式向导（推荐）
npm run cli -- wizard

# 方式2: 快速创建
npm run cli -- create "每天推送天气到微信"

# 方式3: 指定名称并保存
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

# 查看组件详情
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

## 🔌 API 文档

### 意图解析

```bash
POST /api/intent/parse
Content-Type: application/json

{
  "description": "每天推送天气到微信"
}
```

**响应**:
```json
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
Content-Type: application/json

{
  "description": "每天推送天气到微信",
  "name": "天气推送助手"
}
```

**响应**:
```json
{
  "app": {
    "id": "app_1234567890",
    "name": "天气推送助手",
    "trigger": { 
      "type": "schedule", 
      "config": { "cron": "0 8 * * *" } 
    },
    "workflow": [...]
  },
  "intent": { ... }
}
```

### 其他 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/components?q={query}` | GET | 搜索组件 |
| `/api/sync/github` | POST | 从 GitHub 同步 |
| `/api/sync/npm` | POST | 从 npm 同步 |
| `/api/apps` | POST | 创建应用 |
| `/api/apps/{id}/run` | POST | 运行应用 |

## 🏗️ 架构

```
openclaw-app-builder/
├── src/
│   ├── api/              # HTTP API 服务 (Express)
│   ├── core/             # 核心引擎
│   │   ├── intent/       # 意图理解引擎 (LLM + 规则)
│   │   └── AppManager.ts # 应用管理
│   ├── marketplace/      # 组件市场
│   │   ├── adapters/     # 渠道适配器
│   │   │   ├── GitHubAdapter.ts    # GitHub MCP Servers
│   │   │   └── NpmAdapter.ts       # npm 包
│   │   └── registry/     # 组件注册表
│   ├── runtime/          # 运行时
│   │   └── executor/     # 工作流执行引擎
│   ├── cli/              # 命令行工具 (Commander.js)
│   ├── types/            # 类型定义
│   └── utils/            # 工具函数
│       └── DatabaseManager.ts  # SQLite 数据库
├── data/                 # SQLite 数据库文件
└── dist/                 # 编译输出
```

## 🗺️ 开发路线图

- [x] 项目骨架 (TypeScript + Express)
- [x] 核心类型定义
- [x] API 路由
- [x] CLI 工具
- [x] SQLite 持久化
- [x] GitHub 适配器
- [x] npm 适配器
- [x] LLM 意图理解 (OpenAI)
- [x] 工作流执行引擎
- [ ] 前端界面 (Web UI)
- [ ] OpenClaw Gateway 集成
- [ ] 百度千帆/阿里百炼适配器
- [ ] 应用分享/导出功能
- [ ] Docker 部署支持

## ⚙️ 环境变量

| 变量 | 说明 | 必需 | 默认值 |
|------|------|------|--------|
| `PORT` | 服务端口号 | 否 | 3000 |
| `OPENAI_API_KEY` | OpenAI API Key | 否 | - |
| `OPENAI_BASE_URL` | OpenAI API 基础 URL | 否 | https://api.openai.com |
| `GITHUB_TOKEN` | GitHub Token (提高 API 限制) | 否 | - |
| `DATA_DIR` | 数据存储目录 | 否 | ./data |

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可证

[MIT](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/guoweisyz">Clawton</a>
</p>

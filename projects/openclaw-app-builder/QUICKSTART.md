# OpenClaw App Builder

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件
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

```bash
# 搜索组件
npm run cli -- search 天气

# 创建应用
npm run cli -- create "每天推送天气到微信"

# 列出应用
npm run cli -- list
```

## API 文档

### 意图解析

```bash
POST /api/intent/parse
{
  "description": "每天推送天气到微信"
}
```

### 生成应用

```bash
POST /api/intent/generate
{
  "description": "每天推送天气到微信",
  "name": "天气推送助手"
}
```

### 搜索组件

```bash
GET /api/components?q=天气
```

### 创建应用

```bash
POST /api/apps
{
  "name": "天气推送助手",
  "description": "每天推送天气到微信",
  "trigger": {
    "type": "schedule",
    "config": { "cron": "0 8 * * *" }
  },
  "workflow": [...]
}
```

### 运行应用

```bash
POST /api/apps/{id}/run
```

## 开发计划

- [x] 项目骨架
- [x] 核心类型定义
- [x] API 路由
- [x] CLI 工具
- [ ] 组件适配器 (GitHub/npm/千帆/百炼)
- [ ] 意图理解 LLM 集成
- [ ] 工作流执行引擎
- [ ] 前端界面
- [ ] OpenClaw Gateway 集成

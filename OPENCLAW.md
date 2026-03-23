# OpenClaw 资源参考

当我需要自动化功能或工具时，请参考以下资源：

1. **Skills 合集**：https://github.com/VoltAgent/awesome-openclaw-skills
   - 可安装的技能插件（5,490+ 个社区技能）

2. **Use Cases 合集**：https://github.com/hesamsheikh/awesome-openclaw-usecases
   - 使用案例和教程（40+ 个实际案例）

3. **Agent Reach**：https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md

---

## 使用指南

请主动从以上资源中推荐合适的 skill 或 use case 来帮我完成任务。

---

## Skills 合集分类（5,490+ 技能）

| 分类 | 数量 | 说明 |
|------|------|------|
| **Coding Agents & IDEs** | 1,222 | 编程代理和IDE工具 |
| **Web & Frontend Development** | 938 | Web和前端开发 |
| **DevOps & Cloud** | 409 | DevOps和云服务 |
| **Search & Research** | 352 | 搜索和研究 |
| **Browser & Automation** | 335 | 浏览器自动化 |
| **Git & GitHub** | 170 | Git和GitHub操作 |
| **Image & Video Generation** | 169 | 图像和视频生成 |
| **Communication** | 149 | 通讯工具 |
| **Productivity & Tasks** | 206 | 生产力和任务管理 |
| **AI & LLMs** | 197 | AI和LLM相关 |
| **CLI Utilities** | 186 | 命令行工具 |
| **PDF & Documents** | 111 | PDF和文档处理 |
| **Media & Streaming** | 85 | 媒体和流媒体 |
| **Health & Fitness** | 88 | 健康和健身 |
| **Apple Apps & Services** | 44 | 苹果应用和服务 |

### 常用技能推荐

**浏览器自动化：**
- `agent-browser` - Rust 编写的 headless 浏览器自动化
- `actionbook` - 浏览器自动化、网页抓取、截图、表单填写

**搜索和研究：**
- `academic-research` - 学术论文搜索（OpenAlex API，免费）
- `agent-deep-research` - Google Gemini 驱动的深度研究

**GitHub 操作：**
- `azure-devops` - Azure DevOps 集成
- `bitbucket-automation` - Bitbucket 自动化

**文件处理：**
- `bat-cat` - 带语法高亮的 cat 克隆版
- `fzf-fuzzy-finder` - 命令行模糊查找器

**通讯工具：**
- `slack` - Slack 集成
- `discord` - Discord 集成

### 安装方式

1. **通过 ClawHub 安装：**
   ```
   clawhub install <skill-slug>
   ```

2. **复制到技能目录：**
   - 全局：`~/.openclaw/skills/`
   - 工作区：`<project>/skills/`

3. **直接粘贴 GitHub 链接给我**，我会自动处理安装

---

## Use Cases 合集（40+ 案例）

### 📱 社交媒体 (Social Media)
| 案例 | 说明 |
|------|------|
| **Daily Reddit Digest** | 根据偏好总结你关注的 subreddit 内容 |
| **Daily YouTube Digest** | 获取关注频道的每日视频摘要 |
| **X Account Analysis** | X 账号定性分析 |
| **Multi-Source Tech News Digest** | 从 109+ 来源聚合科技新闻（RSS、Twitter/X、GitHub、网页搜索） |
| **X/Twitter Automation** | 发推、回复、点赞、转发、关注、私信、搜索、数据提取、抽奖、账号监控 |

### 🎨 内容创作 (Content Creation)
| 案例 | 说明 |
|------|------|
| **Goal-Driven Autonomous Tasks** | 目标驱动的自主任务，包括夜间自动构建迷你应用 |
| **YouTube Content Pipeline** | YouTube 频道的视频创意、研究和跟踪自动化 |
| **Multi-Agent Content Factory** | Discord 中的多代理内容管道（研究、写作、缩略图代理） |
| **Autonomous Game Dev Pipeline** | 教育游戏开发的完整生命周期管理 |
| **Podcast Production Pipeline** | 播客全流程自动化（嘉宾研究、大纲、节目笔记、社媒推广） |

### ⚙️ DevOps
| 案例 | 说明 |
|------|------|
| **n8n Workflow Orchestration** | 通过 webhook 将 API 调用委托给 n8n 工作流 |
| **Self-Healing Home Server** | 具有 SSH 访问、自动 cron 作业和自愈能力的家庭服务器 |

### 🚀 生产力 (Productivity)
| 案例 | 说明 |
|------|------|
| **Autonomous Project Management** | 使用 STATE.yaml 模式协调多代理项目 |
| **Multi-Channel AI Customer Service** | 统一 WhatsApp、Instagram、邮件和 Google 评论的 AI 客服 |
| **Phone-Based Personal Assistant** | 通过电话/SMS 访问 AI 助手 |
| **Inbox De-clutter** | 总结新闻邮件并发送摘要 |
| **Personal CRM** | 从邮件和日历自动发现、跟踪联系人 |
| **Health & Symptom Tracker** | 跟踪饮食和症状以识别诱因 |
| **Multi-Channel Personal Assistant** | 从单一 AI 助手路由任务到多个渠道 |
| **Project State Management** | 事件驱动的项目跟踪，自动捕获上下文 |
| **Dynamic Dashboard** | 实时仪表板，并行获取多源数据 |
| **Todoist Task Manager** | 将推理和进度日志同步到 Todoist |
| **Family Calendar & Household Assistant** | 聚合家庭日历、监控消息、管理家庭库存 |
| **Multi-Agent Specialized Team** | 运行多个专业代理（策略、开发、营销、业务）作为协调团队 |
| **OpenClaw as Desktop Cowork** | 将 OpenClaw 用作桌面协作应用 |
| **Custom Morning Brief** | 完全定制的每日简报（新闻、任务、内容草稿） |
| **Automated Meeting Notes & Action Items** | 将会议记录转为结构化摘要并自动创建任务 |
| **Habit Tracker & Accountability Coach** | 通过 Telegram/SMS 进行习惯跟踪和问责 |
| **Second Brain** | 文本记忆和自定义 Next.js 仪表板搜索 |
| **Event Guest Confirmation** | 自动电话确认活动嘉宾出席 |
| **Phone Call Notifications** | 将代理警报转为真实电话呼叫 |
| **Local CRM Framework** | 将 OpenClaw 转为本地 CRM 和销售自动化平台 |

### 📚 研究学习 (Research & Learning)
| 案例 | 说明 |
|------|------|
| **Personal Knowledge Base (RAG)** | 通过拖放 URL、推文和文章构建可搜索知识库 |
| **Market Research & Product Factory** | 挖掘 Reddit 和 X 的真实痛点，构建 MVP |
| **Pre-Build Idea Validator** | 构建前扫描 GitHub、HN、npm、PyPI、Product Hunt |
| **Semantic Memory Search** | 为 markdown 记忆文件添加向量语义搜索 |
| **arXiv Paper Reader** | 对话式阅读和分析 arXiv 论文 |
| **LaTeX Paper Writing** | 对话式编写和编译 LaTeX 论文 |

### 💰 金融 (Finance)
| 案例 | 说明 |
|------|------|
| **AI Earnings Tracker** | 跟踪科技/AI 财报，自动预览、警报和详细摘要 |
| **Polymarket Autopilot** | 预测市场的自动模拟交易 |

---

## Agent Reach 状态

**当前状态：7/15 渠道可用**

### ✅ 已可用：
- **V2EX** - 节点、主题与回复
- **RSS/Atom** - 订阅源读取
- **任意网页** - 通过 Jina Reader
- **Reddit** - 帖子和评论
- **微信公众号** - 搜索 + 阅读文章
- **全网语义搜索** - Exa 搜索（免费）
- **微博动态与热搜** - 热搜、搜索、用户动态、评论

### mcporter 已配置：
- Exa 搜索
- 微博 MCP

---

*保存时间：2026-03-20*

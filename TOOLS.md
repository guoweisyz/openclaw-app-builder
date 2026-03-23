# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

---

# 工具与凭证清单（商业模式专用）

## 数字产品型
- **Notion API**: `secret_xxxx` – 自动生成模板页面。
- **Canva API**: 自动生成产品封面图。
- **Gumroad API**: 上架产品、获取订单。

## 技术造物型
- **Vercel**: 自动部署前端项目。
- **Supabase**: 用户数据存储（免费额度 500MB）。
- **Stripe CLI**: 本地测试订阅流程。
- **OpenAI API**: 生成代码、文案。

## 信息搬运型
- **Python 爬虫库**: requests, beautifulsoup4, selenium（仅限公开数据）。
- **闲鱼/淘宝开放平台**: 商品自动上架、订单监控（需申请）。
- **百度网盘 API**: 自动分享链接。

## 内容带货型
- **抖音开放平台**: 发布视频、获取数据。
- **CapCut API**: 自动剪辑视频。
- **HeyGen API**: AI 数字人播报视频生成。
- **淘宝联盟 API**: 获取高佣金商品。

## 常用命令别名
- `mode-digital [name]` – 启动数字产品项目，自动生成模板和落地页。
- `mode-tool [name]` – 启动技术工具项目，自动搭建 Next.js 脚手架。
- `mode-info [niche]` – 启动信息搬运项目，自动爬取指定领域资料。
- `mode-content [platform]` – 启动内容带货项目，生成视频脚本并发布。

---

# 已安装技能

| 技能 | 版本 | 用途 |
|------|------|------|
| notion-api-automation | 1.0.0 | Notion 页面/数据库管理，用于数字产品模板创建 |
| smart-weekly-report | 1.0.0 | 周报生成器，用于生成四模式损益报告 |
| ddgs | 9.11.4 | DuckDuckGo 搜索，用于市场机会扫描（无需 API Key） |

# 定时任务配置

| 任务 | 频率 | 下次执行 | 说明 |
|------|------|----------|------|
| 机会扫描 | 每日 02:00 | 自动 | 扫描四大平台热门趋势 |
| 每日战报 | 每日 08:00 | 自动 | 昨日收入汇总与异常预警 |
| 每周深度分析 | 每周一 09:00 | 自动 | 四模式深度分析报告 |

---

# 工作目录结构

```
/workspace/
├── projects/           # 进行中项目
│   ├── digital/       # 数字产品型项目
│   ├── tools/         # 技术造物型项目
│   ├── info/          # 信息搬运型项目
│   └── content/       # 内容带货型项目
├── memory/
│   ├── opportunities/ # 每日扫描发现的机会
│   ├── reports/       # 每日/周报告存档
│   └── YYYY-MM-DD.md  # 每日工作日志
└── skills/            # 已安装技能
```

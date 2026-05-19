<!-- language-selector: start -->
🌐 语言：**简体中文** | [English](README.en.md)
<!-- language-selector: end -->

# AI Reader

> 基于 Electron 的 AI 驱动桌面文档阅读器 — 不只是阅读，而是递进式知识探索。

<p align="center">
  <img src="https://img.shields.io/badge/Electron-47848F?style=flat&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat" />
</p>

## 概述

AI Reader 是一款桌面阅读应用，将传统文档阅读与 AI 深度问答相结合。导入 TXT 或 PDF 文档后，你可以在阅读过程中选中任意文本向 AI 提问。每次提问和回答会形成一棵**知识树**，支持追问、分支探索和 Markdown 导出，帮助你系统性地深入理解文档内容。

## 功能

- **📚 文档管理** — 导入 TXT/PDF 文档，书架式管理，阅读进度追踪
- **📖 智能阅读器** — 文本/PDF 双模式渲染，章节导航，字体缩放，深浅/护眼主题
- **🌳 知识树** — AI 驱动的递进式问答，以树形结构组织 Q&A，支持追问和分支探索
- **🤖 多 AI 服务** — 支持 OpenAI、Anthropic、Ollama（本地），可自定义 API 端点和模型
- **📝 Markdown 导出** — 将知识树导出为 Markdown 格式，复制到剪贴板
- **🔒 本地存储** — API Key 仅存储在本地 SQLite 数据库，不上传任何服务器

## 截图

_启动应用后，导入文档即可体验完整功能。_

## 技术栈

| 层 | 技术 |
|---|------|
| 桌面框架 | Electron 33 |
| 前端 | React 18 + TypeScript 5 |
| 样式 | Tailwind CSS 3 |
| 状态管理 | Zustand 5 |
| 数据库 | sql.js (SQLite/WASM) |
| AI SDK | OpenAI SDK + Anthropic SDK |
| Markdown | react-markdown + remark-gfm |
| 构建 | electron-vite + electron-builder |

## 项目结构

```
├── electron/              # Electron 主进程
│   ├── main/              # BrowserWindow 创建、协议注册
│   ├── preload/           # contextBridge 暴露 API
│   ├── ipc/               # IPC 处理器 (documents, ai, settings, knowledge-tree)
│   └── services/          # 数据库、LLM 提供者、文档解析器
├── src/renderer/          # React 渲染进程
│   ├── components/        # UI 组件
│   │   ├── layout/        # 主布局 + 侧边栏
│   │   ├── library/       # 书架视图
│   │   ├── reader/        # 阅读器视图 + PDF 查看器
│   │   ├── knowledge-tree/# 知识树面板 + 独立视图
│   │   └── settings/      # 设置视图
│   ├── stores/            # Zustand 状态 (settings, documents, knowledge-tree, theme)
│   ├── styles/            # 全局样式 + Tailwind
│   └── types/             # TypeScript 类型定义
├── electron.vite.config.ts
├── electron-builder.yml
└── tailwind.config.js
```

## 快速开始

### 前提条件

- Node.js 18+
- npm 或 pnpm

### 安装

```bash
git clone https://github.com/pxxfrank/Vibe-AI-Reader.git
cd Vibe-AI-Reader
npm install
```

### 开发

```bash
npm run dev
```

### 构建

```bash
npm run build    # 仅构建
npm run dist     # 构建并打包为安装程序
```

## 使用指南

1. **配置 AI 服务** — 进入「设置」页面，选择 AI 服务（OpenAI / Anthropic / Ollama），填写 API Key 和模型
2. **导入文档** — 在「书架」点击「导入文档」，选择 TXT 或 PDF 文件
3. **开始阅读** — 点击文档进入阅读器，使用章节导航切换内容
4. **AI 提问** — 选中文本后点击「AI 提问」，AI 将基于上下文回答问题
5. **递进探索** — 在知识树面板中继续追问，构建深度理解的知识脉络
6. **导出笔记** — 将知识树导出为 Markdown 保存

### 快捷键

| 操作 | 快捷键 |
|------|--------|
| 增大字号 | `Ctrl + =` |
| 减小字号 | `Ctrl + -` |
| AI 提问 | 选中文本后回车 |

## 主题

支持三种主题模式，适合不同阅读环境：

- **浅色** — 白底黑字，适合日间光线充足环境
- **深色** — 暗色背景，适合夜间低光环境
- **护眼** — 仿纸张暖色调，减少蓝光，适合长时间阅读

## License

MIT

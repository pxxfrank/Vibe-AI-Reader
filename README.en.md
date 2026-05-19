<!-- language-selector: start -->
🌐 Language: [简体中文](README.md) | **English**
<!-- language-selector: end -->

# AI Reader

> An AI-powered desktop document reader built with Electron — progressive knowledge exploration through Q&A branching.

<p align="center">
  <img src="https://img.shields.io/badge/Electron-47848F?style=flat&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat" />
</p>

## Overview

AI Reader is a desktop reading application that combines traditional document reading with AI-powered deep Q&A. After importing TXT or PDF documents, you can select any text while reading and ask AI questions. Each Q&A pair forms a **knowledge tree**, supporting follow-up questions, branching exploration, and Markdown export — helping you systematically deepen your understanding.

## Features

- **📚 Document Management** — Import TXT/PDF documents, bookshelf-style management, reading progress tracking
- **📖 Smart Reader** — Dual text/PDF rendering, chapter navigation, font scaling, light/dark/sepia themes
- **🌳 Knowledge Tree** — AI-driven progressive Q&A, organized as a tree structure, supports follow-up and branching
- **🤖 Multi AI Provider** — OpenAI, Anthropic, Ollama (local), customizable API endpoints and models
- **📝 Markdown Export** — Export knowledge trees as Markdown, copy to clipboard
- **🔒 Local-First** — API keys stored only in local SQLite database, never uploaded

## Screenshots

_Launch the app and import a document to experience the full functionality._

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron 33 |
| Frontend | React 18 + TypeScript 5 |
| Styling | Tailwind CSS 3 |
| State Management | Zustand 5 |
| Database | sql.js (SQLite/WASM) |
| AI SDK | OpenAI SDK + Anthropic SDK |
| Markdown | react-markdown + remark-gfm |
| Build Tools | electron-vite + electron-builder |

## Project Structure

```
├── electron/              # Electron main process
│   ├── main/              # BrowserWindow creation, protocol registration
│   ├── preload/           # contextBridge API exposure
│   ├── ipc/               # IPC handlers (documents, ai, settings, knowledge-tree)
│   └── services/          # Database, LLM providers, document parsers
├── src/renderer/          # React renderer process
│   ├── components/        # UI components
│   │   ├── layout/        # Main layout + sidebar
│   │   ├── library/       # Library view
│   │   ├── reader/        # Reader view + PDF viewer
│   │   ├── knowledge-tree/# Knowledge tree panel + standalone view
│   │   └── settings/      # Settings view
│   ├── stores/            # Zustand stores (settings, documents, knowledge-tree, theme)
│   ├── styles/            # Global styles + Tailwind
│   └── types/             # TypeScript type definitions
├── electron.vite.config.ts
├── electron-builder.yml
└── tailwind.config.js
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
git clone https://github.com/pxxfrank/Vibe-AI-Reader.git
cd Vibe-AI-Reader
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build    # Build only
npm run dist     # Build and package into installer
```

## Usage

1. **Configure AI** — Go to Settings, choose an AI provider (OpenAI / Anthropic / Ollama), enter your API Key and model
2. **Import Documents** — In Library, click "Import Document" and choose TXT or PDF files
3. **Start Reading** — Click a document to open the reader, use chapter navigation to switch content
4. **Ask AI** — Select text and click "AI Ask", AI will answer based on context
5. **Deep Exploration** — Continue asking follow-up questions in the knowledge tree panel
6. **Export Notes** — Export the knowledge tree as Markdown

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Increase font size | `Ctrl + =` |
| Decrease font size | `Ctrl + -` |
| AI Ask | Enter after selecting text |

## Themes

Three theme modes for different reading environments:

- **Light** — White background, ideal for well-lit daytime environments
- **Dark** — Dark background, ideal for low-light nighttime environments
- **Sepia** — Warm paper-like tone, reduces blue light, ideal for extended reading

## License

MIT

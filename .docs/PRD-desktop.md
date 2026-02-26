# NiceNote Desktop — 产品需求说明书 (PRD)

> **版本**: v1.0.0-draft
> **日期**: 2026-02-25
> **作者**: Product Team
> **状态**: Draft

---

## 1. 产品概述

### 1.1 产品定位

NiceNote Desktop 是一款基于 **React Native** 的跨平台本地 Markdown 笔记应用。所有数据完全存储在用户本地设备上，**不支持任何网络同步功能**，确保用户数据的完全私密性和离线可用性。

### 1.2 目标用户

| 用户画像              | 描述                                             |
| --------------------- | ------------------------------------------------ |
| **开发者/技术写作者** | 习惯用 Markdown 记录技术笔记、代码片段、学习心得 |
| **隐私敏感用户**      | 不信任云服务，要求数据完全本地化                 |
| **轻量级笔记用户**    | 需要快速启动、即开即用的本地笔记工具             |
| **跨平台用户**        | 在 macOS、Windows、Linux 间切换，需要一致的体验  |

### 1.3 核心价值主张

- **纯本地存储** — 零网络依赖，数据永远在你手中
- **所见即所得 + 源码双模式** — Tiptap v3 富文本编辑器，一键切换 Markdown 源码
- **跨平台一致体验** — macOS / Windows / Linux 原生窗口，统一设计语言
- **轻量极速** — 纯本地 JSI SQLite 绑定，毫秒级启动和查询
- **复用成熟组件** — 基于 NiceNote Web 版已验证的编辑器、UI 组件库和设计系统

### 1.4 技术选型概要

| 层级     | 技术                     | 说明                                     |
| -------- | ------------------------ | ---------------------------------------- |
| 桌面框架 | React Native             | 跨平台原生桌面引擎（Mac & Windows）      |
| 业务框架 | React 19                 | 共享现有 Web 前端组件                    |
| 数据库   | op-sqlite + Drizzle ORM  | JSI 原生 SQLite 绑定，直接操作无需网络层 |
| 编辑器   | Tiptap v3                | Web 端打包通过 React Native WebView 嵌入 |
| UI 组件  | NativeWind v4 + 专属组件 | 使用原生兼容包重构基础 UI                |
| 状态管理 | Zustand v5 + Immer       | 极简全局状态管理                         |
| 跨端桥接 | Custom Native Modules    | 系统托盘、全局快捷键等原生功能桥接       |
| 构建工具 | Metro + React Native CLI | TypeScript 原生构建体系                  |

---

## 2. 功能需求

### 2.1 功能优先级矩阵

| 优先级            | 功能模块                                               | 版本 |
| ----------------- | ------------------------------------------------------ | ---- |
| P0 (Must Have)    | 笔记 CRUD、Markdown 编辑器、本地 SQLite 存储、笔记列表 | v1.0 |
| P0 (Must Have)    | 搜索（标题 + 全文）、深色/浅色主题                     | v1.0 |
| P1 (Should Have)  | 系统托盘、快捷键体系、文件夹/标签分类                  | v1.0 |
| P1 (Should Have)  | Markdown 文件导入/导出、多窗口编辑                     | v1.0 |
| P2 (Nice to Have) | 快速笔记（全局热键）、自动备份与恢复                   | v1.1 |
| P2 (Nice to Have) | 国际化（中/英）、编辑器插件扩展                        | v1.1 |
| P3 (Future)       | 本地文件夹监听（双向 .md 同步）、Mermaid 图表渲染      | v2.0 |

---

### 2.2 P0 — 核心功能（v1.0 Must Have）

#### 2.2.1 笔记 CRUD

**创建笔记**

- 用户点击「新建笔记」按钮或使用快捷键 `Cmd/Ctrl + N` 创建新笔记
- 新笔记默认标题为 `"Untitled"`（复用 `DEFAULT_NOTE_TITLE` 常量）
- 创建后自动聚焦到编辑器，光标定位在标题区域
- 笔记 ID 使用 nanoid 生成（复用 shared 包逻辑）

**读取笔记**

- 笔记列表页展示所有笔记，按 `updatedAt` 降序排列
- 列表项显示：标题、摘要（复用 `generateSummary()`）、更新时间
- 单击列表项在编辑区打开对应笔记
- 支持游标分页加载（复用 `noteListQuerySchema`）

**更新笔记**

- 内容变更后自动保存，使用 1 秒防抖（复用 `debounce` 工具函数）
- 标题在失焦时保存
- 更新时自动刷新 `updatedAt` 时间戳和 `summary` 字段
- 内容写入前执行安全过滤（复用 `sanitizeContent()`）

**删除笔记**

- 支持单条删除，需二次确认（原生对话框）
- 删除后自动选中相邻笔记
- 回收站机制（软删除）：标记 `deletedAt`，30 天后自动永久清除

**数据校验**

- 标题最大 500 字符
- 内容最大 100,000 字符
- 所有输入/输出通过 Zod schema 校验（复用 shared 包全部 schema）

#### 2.2.2 Markdown 编辑器

**WYSIWYG 模式**（复用 `@nicenote/editor` 组件）

- 支持格式：标题（H1-H3）、粗体、斜体、删除线、行内代码
- 支持结构：无序列表、有序列表、引用块
- 支持链接：Popover 方式输入链接地址，自动检测 URL（复用链接校验逻辑）
- 支持 Typography 扩展（自动排版优化）
- 支持 Placeholder 提示文案

**Markdown 源码模式**

- 快捷键 `Cmd/Ctrl + Shift + M` 切换
- 等宽字体展示原始 Markdown
- 实时双向同步（编辑后切换模式内容保持一致）

**工具栏**（复用 `@nicenote/ui` Toolbar 组件）

- 浮动工具栏：撤销/重做、格式化按钮、标题/列表下拉菜单
- 键盘导航支持（方向键、Home/End）
- 按钮激活状态实时反映光标位置的格式信息（复用 `NoteEditorStateSnapshot`）

**编辑器行为**

- 延迟渲染（`immediatelyRender: false`）
- 默认 WYSIWYG 模式
- Markdown 序列化存储

#### 2.2.3 本地 SQLite 存储

**数据库架构**

```sql
-- notes 表（复用现有 schema 设计，增加桌面端字段）
CREATE TABLE notes (
  id          TEXT PRIMARY KEY,       -- nanoid
  title       TEXT NOT NULL DEFAULT 'Untitled',
  content     TEXT,                   -- Markdown 格式
  summary     TEXT,                   -- 纯文本摘要（预计算）
  is_pinned   INTEGER DEFAULT 0,     -- 置顶标记
  deleted_at  TEXT,                   -- 软删除时间戳
  created_at  TEXT NOT NULL,          -- ISO 8601
  updated_at  TEXT NOT NULL           -- ISO 8601
);

CREATE INDEX idx_notes_updated ON notes(updated_at, id);
CREATE INDEX idx_notes_deleted ON notes(deleted_at);

-- folders 表（P1 功能预留）
CREATE TABLE folders (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  parent_id   TEXT REFERENCES folders(id),
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- tags 表（P1 功能预留）
CREATE TABLE tags (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  color       TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE note_tags (
  note_id     TEXT REFERENCES notes(id) ON DELETE CASCADE,
  tag_id      TEXT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
```

**数据库管理**

- 数据库文件位置：`~/.nicenote/data/nicenote.db`
- 应用启动时自动运行迁移
- WAL 模式启用（Write-Ahead Logging），提升并发读写性能

#### 2.2.4 笔记列表

**列表视图**

- 左侧边栏展示笔记列表，右侧为编辑区域（经典双栏布局）
- 列表项内容：标题（单行截断）、摘要（最多 2 行）、相对时间
- 当前选中笔记高亮显示
- 空状态引导：展示「创建你的第一篇笔记」提示

**排序**

- 默认按更新时间降序
- 置顶笔记始终排在最前

**性能**

- 虚拟滚动（仅渲染可视区域列表项）
- 游标分页，每次加载 50 条

#### 2.2.5 搜索

**搜索功能**

- 全局搜索快捷键：`Cmd/Ctrl + P` 或 `Cmd/Ctrl + K`
- 搜索范围：标题 + 内容全文
- 搜索方式：SQLite FTS5 全文检索
- 结果即时展示，输入防抖 300ms
- 搜索结果高亮匹配关键词
- 按相关性排序，无结果时友好提示

**搜索 SQL 支撑**

```sql
-- FTS5 虚拟表
CREATE VIRTUAL TABLE notes_fts USING fts5(
  title, content,
  content='notes',
  content_rowid='rowid'
);

-- 触发器保持 FTS 索引同步
CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;
CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
END;
CREATE TRIGGER notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
  INSERT INTO notes_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;
```

#### 2.2.6 主题系统

**深色/浅色模式**（复用 `@nicenote/tokens` 设计系统）

- 跟随系统主题（默认）
- 手动切换：浅色 / 深色 / 跟随系统
- 主题偏好持久化到本地存储（复用 `THEME_STORAGE_KEY`）
- CSS 变量驱动，class 策略切换（与 Web 版一致）
- 窗口无闪烁加载（启动时立即应用主题）

**设计令牌**（完整复用 `@nicenote/tokens`）

- 语义化颜色系统（Primary/Secondary/Background/Text/Border/Status）
- 间距系统（2px ~ 160px）
- 排版系统（DM Sans + JetBrains Mono，10px ~ 24px）
- 阴影系统（sm/md/lg，含暗色模式变体）
- 圆角系统（4px ~ 24px）
- 动画系统（120ms/200ms，标准缓动）

---

### 2.3 P1 — 重要功能（v1.0 Should Have）

#### 2.3.1 系统托盘

- 应用最小化到系统托盘而非完全退出
- 托盘菜单：显示主窗口、新建笔记、切换主题、退出应用
- macOS 支持 Template Icon（自动适应深色/浅色菜单栏）
- 托盘图标点击：单击显示主窗口，右键显示菜单

#### 2.3.2 快捷键体系

| 快捷键                          | 功能                               |
| ------------------------------- | ---------------------------------- |
| `Cmd/Ctrl + N`                  | 新建笔记                           |
| `Cmd/Ctrl + P` / `Cmd/Ctrl + K` | 全局搜索                           |
| `Cmd/Ctrl + Shift + M`          | 切换编辑器模式（WYSIWYG ↔ 源码）   |
| `Cmd/Ctrl + S`                  | 手动保存（触发立即保存，跳过防抖） |
| `Cmd/Ctrl + Backspace`          | 删除当前笔记                       |
| `Cmd/Ctrl + D`                  | 置顶/取消置顶                      |
| `Cmd/Ctrl + ,`                  | 打开设置                           |
| `Cmd/Ctrl + W`                  | 关闭当前窗口                       |
| `Cmd/Ctrl + Q`                  | 退出应用                           |
| `Cmd/Ctrl + B`                  | 粗体（编辑器内）                   |
| `Cmd/Ctrl + I`                  | 斜体（编辑器内）                   |
| `Cmd/Ctrl + Z`                  | 撤销                               |
| `Cmd/Ctrl + Shift + Z`          | 重做                               |

#### 2.3.3 文件夹与标签分类

**文件夹**

- 树形目录结构，支持无限嵌套
- 拖拽移动笔记到指定文件夹
- 拖拽调整文件夹排序
- 「全部笔记」虚拟视图（不区分文件夹展示所有笔记）
- 「未分类」视图（展示未归入任何文件夹的笔记）
- 「回收站」视图（展示软删除的笔记，支持恢复或永久删除）

**标签**

- 笔记可打多个标签
- 标签支持自定义颜色
- 按标签筛选笔记列表
- 标签管理：创建、重命名、删除、合并

#### 2.3.4 Markdown 文件导入/导出

**导入**

- 支持导入单个 `.md` 文件
- 支持批量导入（选择文件夹，递归扫描 `.md` 文件）
- 导入时文件名自动作为笔记标题
- 导入后内容经过 `sanitizeContent()` 安全过滤

**导出**

- 导出为 `.md` 文件（单篇）
- 批量导出为文件夹结构（按 NiceNote 文件夹结构映射）
- 导出文件名：`{title}.md`（特殊字符替换为 `-`）
- 通过系统原生文件对话框选择保存路径

#### 2.3.5 多窗口编辑

- 支持将笔记在新窗口中打开（`Cmd/Ctrl + Shift + Enter`）
- 每个窗口独立编辑区域，共享数据库
- 同一笔记在多窗口编辑时：最后保存者生效，不做冲突合并
- 窗口尺寸和位置记忆（下次打开时恢复）
- 利用 React Native 桌面端相关原生多窗口能力定制

---

### 2.4 P2 — 增强功能（v1.1 Nice to Have）

#### 2.4.1 快速笔记（全局热键）

- 全局热键（如 `Cmd/Ctrl + Shift + N`），在任何应用上方弹出迷你编辑窗口
- 快速输入内容，`Enter` 保存并关闭
- 快速笔记默认归入「快速笔记」文件夹
- 窗口置顶（Always on Top）

#### 2.4.2 自动备份与恢复

- 每日自动备份数据库到 `~/.nicenote/backups/`
- 保留最近 30 天的备份（可配置）
- 命名格式：`nicenote-backup-{YYYY-MM-DD-HHmmss}.db`
- 设置面板中提供手动备份和恢复入口
- 恢复前展示备份信息（笔记数量、备份时间）

#### 2.4.3 国际化

- 支持语言：简体中文、English
- 语言偏好持久化（复用 `LANG_STORAGE_KEY`）
- 跟随系统语言（默认）或手动切换
- 编辑器标签国际化（复用 `EditorLabels` 接口）

#### 2.4.4 编辑器增强

- 代码块语法高亮（基于 Shiki / Prism）
- 图片插入支持（本地文件引用，存储在 `~/.nicenote/assets/`）
- 任务列表（Checkbox）
- 表格支持
- 数学公式（KaTeX）

---

### 2.5 P3 — 远期功能（v2.0 Future）

#### 2.5.1 本地文件夹监听

- 用户指定一个本地文件夹路径
- 监听文件夹变更，自动将 `.md` 文件同步至 NiceNote 数据库
- 在 NiceNote 中编辑后自动写回 `.md` 文件
- 双向同步，冲突时以最后修改时间为准

#### 2.5.2 Mermaid 图表

- 在 WYSIWYG 模式下渲染 Mermaid 代码块为图表
- 支持点击图表进入编辑模式

---

## 3. 非功能需求

### 3.1 性能指标

| 指标                          | 目标值                 |
| ----------------------------- | ---------------------- |
| 冷启动时间                    | < 1.5 秒               |
| 笔记列表加载（1000 条）       | < 200ms                |
| 全文搜索响应（10,000 条笔记） | < 300ms                |
| 编辑器首次渲染                | < 500ms                |
| 自动保存延迟                  | 1 秒防抖后 < 50ms 写入 |
| 内存占用（空闲）              | < 150MB                |
| 安装包体积                    | < 30MB                 |

### 3.2 可靠性

- 数据库使用 WAL 模式，防止写入中断导致数据损坏
- 自动保存失败时在 UI 显示警告，不静默丢失数据
- 应用异常退出后重启自动恢复 WAL 日志
- 数据库 PRAGMA integrity_check 定期校验（每次启动时）

### 3.3 安全性

- 内容写入前执行 `sanitizeContent()` 过滤危险链接（javascript:, vbscript:）
- 链接校验使用 `getLinkValidationError()` 限制协议（http/https/mailto/tel）
- 数据库文件权限设置为用户只读（600）
- 不收集任何用户数据，无遥测、无分析

### 3.4 平台兼容性

| 平台    | 最低版本                                |
| ------- | --------------------------------------- |
| macOS   | 11 (Big Sur)                            |
| Windows | 10 (10.0.19041+) (React Native Windows) |

### 3.5 无障碍（Accessibility）

- 所有交互元素支持键盘操作
- 工具栏 `role="toolbar"`，支持方向键导航（复用 `@nicenote/ui` Toolbar）
- 按钮包含 `aria-label`
- 对比度符合 WCAG 2.1 AA 标准
- 支持系统级字体缩放

---

## 4. 架构设计

### 4.1 整体架构

```text
┌────────────────────────────────────────────────────────┐
│                   React Native App                     │
│  ┌──────────────────┐           ┌───────────────────┐  │
│  │   JS Thread      │◄──Bridge──►│    Native UI      │  │
│  │                  │           │     WebView       │  │
│  │ • Zustand Store  │           │ • @nicenote/editor│  │
│  │ • Shared Logic   │           └─────────┬─────────┘  │
│  │ • Shared Tokens  │                     │            │
│  └────────┬─────────┘                     │            │
│       JSI │ Synchronous             Native OS APIs     │
│  ┌────────▼─────────┐           (File I/O, App Tray)   │
│  │ op-sqlite Plugin │                                  │
│  └────────┬─────────┘                                  │
│           │                                            │
│  ┌────────▼─────────┐                                  │
│  │ SQLite DB        │  ~/.nicenote/data/nicenote.db    │
│  └──────────────────┘                                  │
└────────────────────────────────────────────────────────┘
```

### 4.2 Monorepo 目录职责

```text
nicenote/
├── apps/
│   └── desktop/                      # 统一的桌面端 React Native 工程
│       ├── macos/                    # React Native Mac 原生工程
│       ├── windows/                  # React Native Windows 原生工程
│       ├── src/                      # JS/TS 业务代码（共享）
│       │   ├── app/                  # 导航与入口
│       │   ├── screens/              # 页面
│       │   ├── components/           # 桌面特有组件
│       │   └── native/               # 桥接方法声明
│       └── metro.config.js
├── packages/
│   ├── shared/                       # 工具函数、类型、Zod Schema (多端复用)
│   ├── tokens/                       # 设计变量 (多端复用)
│   ├── editor/                       # Tiptap 编辑器 (多端复用)
│   ├── database/                     # 基于 op-sqlite 的 Drizzle 抽象层 (桌面专属)
│   ├── store/                        # Zustand 状态管理 (前端共享)
│   ├── ui-native/                    # RN 专属公共组件类库 (桌面/移动端复用)
│   └── editor-bridge/                # WebView 通信协议层及打包 (桌面专属)
```

### 4.3 App 与 Editor 通信机制

编辑器通过 `react-native-webview` 呈现。通信主要通过自定义 Bridge 方案：

1. **渲染端**：`@nicenote/editor-bridge` 产出一份含 HTML 的静默前端代码，将其放到原生 Assets。
2. **App -> WebView**：注入初始文本内容，下发夜间/日间模式主题事件。
3. **WebView -> App**：通过 `window.ReactNativeWebView.postMessage` 将文本内容变更（Debounce）、当前选区字数、焦点等状态同步给 ReactNative 外层。

外层 React Native 接收到文本后，直接通过 JSI `op-sqlite` 实时写入本地数据库。

### 4.4 前端状态管理

```typescript
// store/useNoteStore.ts — 扩展自现有 Web 版 store
interface NoteStore {
  // 列表状态
  notes: NoteListItem[]
  isLoading: boolean
  hasMore: boolean
  nextCursor: string | null
  nextCursorId: string | null

  // 选中状态
  selectedNoteId: string | null

  // 搜索状态
  searchQuery: string
  searchResults: NoteListItem[]
  isSearching: boolean

  // Actions（通过本地 JSI op-sqlite 实现数据持久化）
  loadNotes: () => Promise<void>
  loadMore: () => Promise<void>
  selectNote: (id: string | null) => void
  createNote: () => Promise<string> // 返回新笔记 ID
  updateNote: (id: string, data: Partial<NoteUpdateInput>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  search: (query: string) => Promise<void>
}
```

### 4.5 共享包复用策略

| 现有包               | 复用方式     | 复用内容                                                          |
| -------------------- | ------------ | ----------------------------------------------------------------- |
| `@nicenote/shared`   | **完整复用** | 所有 schema、类型、工具函数、常量、校验器                         |
| `@nicenote/editor`   | **完整复用** | `NicenoteEditor` 组件、全部编辑器逻辑                             |
| `@nicenote/ui`       | **完整复用** | Button、Toolbar、Popover、DropdownMenu、Tooltip、Input、Separator |
| `@nicenote/ui` hooks | **完整复用** | useIsBreakpoint、useThrottledCallback、useComposedRef             |
| `@nicenote/tokens`   | **完整复用** | 全部设计令牌（颜色/间距/排版/阴影/圆角/动画）                     |
| `apps/web` store     | **参考改造** | Zustand 模式参考，数据源改为本地 op-sqlite                        |
| `apps/api` schema    | **不复用**   | 桌面端完全离线，前端通过 shared 包的 Zod schema 校验              |

### 4.6 数据流

```
用户输入 → Editor onChange(markdown)
         → debounce(1000ms)
         → sanitizeContent(markdown)
         → Zustand action: updateNote()
         → op-sqlite (Drizzle): db.update(notes).set({ content: ?, summary: ?, updated_at: ? })
         → SQLite: 同步落库
         → 返回 updated Note
         → Zustand: 更新列表中对应项的 summary / updatedAt
         → UI: 列表项实时更新
```

---

## 5. UI/UX 设计规范

### 5.1 整体布局

```
┌──────────────────────────────────────────────────────────┐
│  Sidebar (240px)         │  Main Content                  │
│ ┌──────────────────────┐ │ ┌──────────────────────────┐  │
│ │ 🔍 Search...         │ │ │  Title (editable)        │  │
│ ├──────────────────────┤ │ ├──────────────────────────┤  │
│ │ 📁 All Notes         │ │ │  ┌──────────────────┐   │  │
│ │ 📁 Folder 1          │ │ │  │ Floating Toolbar  │   │  │
│ │   └─ Subfolder       │ │ │  └──────────────────┘   │  │
│ │ 📁 Folder 2          │ │ │                          │  │
│ │ 🏷️ Tags              │ │ │  Editor Content Area     │  │
│ │ 🗑️ Trash             │ │ │                          │  │
│ ├──────────────────────┤ │ │  (WYSIWYG / Source)      │  │
│ │ Note List            │ │ │                          │  │
│ │ ┌────────────────┐   │ │ │                          │  │
│ │ │ Note Title     │   │ │ │                          │  │
│ │ │ Summary...     │   │ │ │                          │  │
│ │ │ 2 min ago      │   │ │ │                          │  │
│ │ ├────────────────┤   │ │ │                          │  │
│ │ │ Note Title     │   │ │ │                          │  │
│ │ │ Summary...     │   │ │ │                          │  │
│ │ │ 1 hour ago     │   │ │ │                          │  │
│ │ └────────────────┘   │ │ │                          │  │
│ └──────────────────────┘ │ └──────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 5.2 窗口规格

| 属性       | 值                                  |
| ---------- | ----------------------------------- |
| 默认尺寸   | 1200 x 800 px                       |
| 最小尺寸   | 800 x 600 px                        |
| 侧边栏宽度 | 240px（可拖拽调整，范围 180-400px） |
| 标题栏     | 使用原生窗口标题栏                  |

### 5.3 视觉风格

- 简洁克制，以内容为核心
- 大量留白，降低视觉噪音
- 字体：正文 DM Sans 16px，编辑器等宽 JetBrains Mono 14px
- 圆角统一使用 8px（组件级）和 12px（面板级）
- 过渡动画：200ms 标准缓动曲线

### 5.4 关键交互

**笔记切换**

- 点击列表项即切换，无需额外确认
- 切换前自动保存当前笔记（如有未保存更改）
- 切换动画：编辑区内容淡入（120ms）

**搜索交互**

- `Cmd/Ctrl + P` 弹出搜索面板（覆盖在主界面上方，类似 VS Code Command Palette）
- 输入即搜，300ms 防抖
- `↑/↓` 键导航结果，`Enter` 打开选中笔记，`Esc` 关闭
- 结果中关键词高亮

**删除确认**

- 使用 React Native 原生 Alert 对话框或自定义 UI 组件
- 标题：「删除笔记」
- 内容：「确定要将 "{note_title}" 移至回收站吗？」
- 按钮：「取消」「移至回收站」

---

## 6. 数据存储

### 6.1 文件系统结构

```
~/.nicenote/
├── data/
│   └── nicenote.db            # 主数据库
├── backups/                   # 自动备份（P2）
│   ├── nicenote-backup-2026-02-25-120000.db
│   └── ...
├── assets/                    # 本地图片资源（P2）
│   └── {nanoid}.{ext}
└── config.json                # 用户偏好设置
```

### 6.2 用户偏好配置

```json
{
  "theme": "system", // "light" | "dark" | "system"
  "language": "system", // "en" | "zh" | "system"
  "editor": {
    "defaultMode": "wysiwyg", // "wysiwyg" | "source"
    "fontSize": 16,
    "lineHeight": 1.6
  },
  "sidebar": {
    "width": 240,
    "collapsed": false
  },
  "window": {
    "width": 1200,
    "height": 800,
    "x": null,
    "y": null,
    "maximized": false
  },
  "backup": {
    "enabled": true,
    "retentionDays": 30
  }
}
```

---

## 7. 发布与分发

### 7.1 构建产物

| 平台    | 格式                     | 说明                               |
| ------- | ------------------------ | ---------------------------------- |
| macOS   | `.dmg` + `.app`          | Universal Binary (通过 Xcode 构建) |
| Windows | `.msix` (Appx) 或 `.exe` | x64/ARM64 (通过 MSBuild 构建)      |

### 7.2 自动更新（v1.1+）

- 使用 GitHub Releases 作为更新源
- 启动时检查更新，提示用户手动下载新版本
- 不做静默自动更新（尊重用户控制权）

### 7.3 版本计划

| 版本   | 里程碑      | 预计功能范围                          |
| ------ | ----------- | ------------------------------------- |
| v0.1.0 | Alpha       | 基础 CRUD + 编辑器 + 本地存储         |
| v0.5.0 | Beta        | 搜索 + 主题 + 系统托盘 + 快捷键       |
| v1.0.0 | Release     | 文件夹/标签 + 导入导出 + 多窗口       |
| v1.1.0 | Enhancement | 快速笔记 + 备份 + 国际化 + 编辑器增强 |
| v2.0.0 | Advanced    | 文件夹监听 + Mermaid + 更多编辑器扩展 |

---

## 8. 成功指标

由于是纯本地应用且无遥测，成功指标以用户反馈和社区表现为主：

| 指标                   | 目标                       |
| ---------------------- | -------------------------- |
| GitHub Stars           | v1.0 发布 3 个月内 > 500   |
| 安装包下载量           | v1.0 发布 3 个月内 > 2,000 |
| GitHub Issues 响应时间 | < 48 小时                  |
| 崩溃率（用户报告）     | < 0.1%                     |
| 启动时间               | 持续 < 1.5 秒              |

---

## 9. 风险与缓解

| 风险点                            | 概率/影响      | 应对方案                                                                                          |
| --------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| react-native-windows C++ 依赖     | 高 / 高        | 确保开发构建机器的 MSVC、Windows SDK 版本绝对对齐官方文档。建议使用固定版本镜像打包。             |
| WebView 编辑器键盘/输入法遮挡问题 | 中 / 高        | 桌面端无软键盘遮挡，但中文输入法的“候选词框”可能偏移。需关闭 WebView 原生滚动，交由 Tiptap 处理。 |
| SQLite FTS5 全文搜索默认缺失      | 中 / 中        | op-sqlite 若不含 FTS5，修改 CMakeList / Podspec 强制注入 `-DSQLITE_ENABLE_FTS5` 全局宏重新编译。  |
| 前端包体积过大                    | 安装包超标     | Tree-shaking + 按需加载 + Vite 构建优化                                                           |
| 多窗口数据一致性                  | 编辑冲突       | 基于 Zustand 的单一 store + 事件广播                                                              |
| 跨平台文件路径差异                | 数据库路径错误 | 使用 Go `os.UserConfigDir()` + 平台检测封装                                                       |

---

## 10. 开放问题

| #   | 问题                                                                     | 待定方案                                                            |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 1   | SQLite 同步与异步的选择：op-sqlite 支持 JSI 同步调用，是否默认全局开启？ | 建议除大型查询外，常规 CRUD 均使用同步调用以降低中间状态维护成本    |
| 2   | 原生托盘模块（System Tray）缺少官方支持，如何实现？                      | 考虑为 Mac/Windows 分别手写精简版 Native Module，仅实现基础菜单响应 |
| 3   | 图片存储策略：直接存 DB（BLOB）还是文件系统 + 引用路径？                 | 文件系统方案更灵活，但需处理引用完整性                              |
| 4   | 是否需要加密数据库（SQLCipher）？                                        | 增加复杂度，但对隐私敏感用户有价值                                  |

---

## 附录 A：共享包 API 速查

### @nicenote/shared

```typescript
// 常量
DEFAULT_NOTE_TITLE    // "Untitled"
THEME_STORAGE_KEY     // "nicenote-theme"
LANG_STORAGE_KEY      // "nicenote-lang"

// 工具函数
debounce(fn, wait)                      // 防抖，带 .cancel()
throttle(fn, wait, options?)            // 节流，带 .cancel()
sanitizeContent(content)                // 过滤危险 Markdown 链接
generateSummary(content, maxLength=200) // 生成纯文本摘要
getLinkValidationError(href)            // 链接格式校验
toKebabCase(str)                        // 驼峰转短横线

// Schema（Zod v4）
noteSelectSchema      // 完整笔记
noteListItemSchema    // 列表项（含 summary，不含 content）
noteCreateSchema      // 创建输入
noteUpdateSchema      // 更新输入
noteIdParamSchema     // ID 参数
noteListQuerySchema   // 列表查询（游标分页）

// 类型
NoteSelect, NoteListItem, NoteInsert
NoteCreateInput, NoteUpdateInput
NoteListQuery, NoteListResult
NoteContractService   // CRUD 服务契约
```

### @nicenote/editor

```typescript
// 组件
<NicenoteEditor
  value={markdown}
  onChange={fn}
  isSourceMode={bool}
  onSourceModeChange={fn}
  labels={EditorLabels}
  isMobile={bool}
/>

// 命令
runNoteCommand(editor, commandId)   // 格式化命令
setLinkHref(editor, href)          // 设置链接
clearLink(editor)                   // 移除链接

// 状态
NoteEditorStateSnapshot             // 编辑器状态快照
```

### @nicenote/ui

```typescript
// 组件
Button, Input, Separator
Toolbar, ToolbarGroup
Popover, PopoverTrigger, PopoverContent
DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
Tooltip, TooltipTrigger, TooltipContent

// 工具
cn(...classes)                      // Tailwind class 合并

// Hooks
useIsBreakpoint(mode?, breakpoint?) // 响应式断点检测
useThrottledCallback(fn, wait)      // 节流回调
useComposedRef(libRef, userRef)     // Ref 合并
```

### @nicenote/tokens

```typescript
// 所有设计令牌
colors / darkColors // 语义颜色（含暗色模式）
spacing // 间距系统
fontSize / fontWeight // 排版系统
FONT_SANS_STACK / FONT_MONO_STACK // 字体栈
shadowWeb / darkShadowWeb // 阴影系统
borderRadius // 圆角系统
duration / easing // 动画系统
zIndex // 层级系统
```

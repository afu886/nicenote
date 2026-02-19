# Nicenote 优化计划 v2

状态标记：⬜ 待处理 | 🔧 进行中 | ✅ 已完成

---

## P0 — 严重（功能缺陷 & 安全）

### 0.2 ✅ 前端分页 — 只加载了第一页笔记

**现状**：API 已实现游标分页（默认 50 条），但 `useNoteStore.fetchNotes()` 传空查询，仅获取第一页。超过 50 条笔记后旧笔记静默丢失。

**方案**：

- `useNoteStore` 新增 `hasMore`、`nextCursor`、`nextCursorId` 状态
- `fetchNotes` 存储分页游标
- 新增 `fetchMoreNotes()` action 用游标请求下一页
- `NotesSidebar` 添加无限滚动（`IntersectionObserver` 检测列表底部）

**涉及文件**：

- `apps/web/src/store/useNoteStore.ts`
- `apps/web/src/components/NotesSidebar.tsx`

**影响**：中，不涉及 API 改动

---

## P1 — 高（数据一致性 & 安全加固）

### 1.1 ✅ 乐观更新失败不回滚

**现状**：`saveNote` 失败后本地状态保留了"已更新"的数据，与服务端不一致。用户无感知。

**方案**：

- `saveNote` 调用前快照当前 note 状态
- 失败时回滚到快照，并通过 toast 告知用户
- 可选：失败后标记该笔记为"未同步"，在 UI 上显示同步状态图标

**涉及文件**：

- `apps/web/src/store/useNoteStore.ts`
- `apps/web/src/hooks/useDebouncedNoteSave.ts`

---

### 1.2 ✅ 删除撤销后笔记位置错误

**现状**：`handleDeleteWithUndo` 撤销后 `setState` 直接 push 到数组末尾，不按 `updatedAt` 排序。

**方案**：

- 撤销时记录笔记原始位置（index）或按 `updatedAt` 重新排序插入
- 将删除/撤销逻辑从 `NotesSidebar.tsx` 抽取到 store action

**涉及文件**：

- `apps/web/src/store/useNoteStore.ts` — 新增 `softDeleteNote` / `undoDelete` action
- `apps/web/src/components/NotesSidebar.tsx` — 移除内联业务逻辑

---

### 1.3 ✅ selectNote 快速切换请求堆积

**现状**：`selectNoteSeq` 防止了过时响应被使用，但旧请求未取消（无 `AbortController`），网络资源浪费。

**方案**：

- 维护一个 `AbortController` 实例，`selectNote` 每次调用时 abort 前一个
- 在 `hc` 客户端 fetch 选项中传入 `signal`

**涉及文件**：

- `apps/web/src/store/useNoteStore.ts`
- `apps/web/src/lib/api.ts` — 支持传入 abort signal

---

### 1.4 ✅ 添加 Content-Security-Policy

**现状**：前端 `_headers` 文件缺少 CSP，应用渲染用户内容（富文本编辑器），存在 XSS 风险。

**方案**：

- 在 `apps/web/public/_headers` 添加合理的 CSP
- `default-src 'self'; script-src 'self' 'unsafe-inline'`（inline script 用于主题防闪烁）
- `style-src 'self' 'unsafe-inline'`（Tiptap 行内样式）
- 测试确保编辑器功能不受影响

**涉及文件**：

- `apps/web/public/_headers`

---

### 1.5 ✅ API 端链接/内容安全校验

**现状**：链接校验 (`getLinkValidationError`) 仅在客户端执行。通过 API 直接写入的 Markdown 内容可包含 `javascript:` 链接等 XSS 向量。

**方案**：

- API 写入时（POST/PATCH）对 content 做基本安全清洗
- 过滤 `javascript:` / `data:` / `vbscript:` 协议链接
- 可在 `note-service.ts` 的 create/update 方法中调用共享的 sanitize 函数

**涉及文件**：

- `packages/shared/src/` — 新增 `sanitizeMarkdown` 工具函数
- `apps/api/src/services/note-service.ts`

---

## P2 — 中（性能 & 架构）

### 2.1 ✅ Summary 物化为 DB 列

**现状**：`generateSummary` 在 API list 接口中对每条笔记实时计算（正则处理），浪费请求时间。

**方案**：

- DB schema 新增 `summary` 列（已有字段定义，确认已在 migration 中）
- 在 `create` 和 `update` 时计算并存储 summary
- `list` 接口直接读取存储的 summary，不再实时计算
- 前端乐观更新时仍本地计算用于即时显示

**涉及文件**：

- `apps/api/src/db/schema.ts`
- `apps/api/src/services/note-service.ts`
- 新增 DB migration

---

### 2.2 ✅ 游标分页复合索引

**现状**：分页查询条件 `(updatedAt, id)` 只有 `updatedAt` 单列索引，SQLite 无法高效处理组合条件。

**方案**：

- 新增 migration：`CREATE INDEX idx_notes_cursor ON notes(updated_at DESC, id DESC)`
- 移除旧的 `idx_notes_updated_at` 单列索引（新索引覆盖其用途）

**涉及文件**：

- `apps/api/src/db/schema.ts`
- 新增 DB migration 文件

---

### 2.3 ✅ NotesSidebar 直接操作 store state → 抽取到 store action

**现状**：`NotesSidebar.tsx` 直接调用 `useNoteStore.setState()` 进行删除/撤销，绕过 store 封装。

**方案**：

- store 新增 `removeNoteOptimistic(id)` 和 `restoreNote(note)` action
- `restoreNote` 按 `updatedAt` 排序插入
- sidebar 只调用 store action，不直接操作 state

**涉及文件**：

- `apps/web/src/store/useNoteStore.ts`
- `apps/web/src/components/NotesSidebar.tsx`

---

### 2.4 ✅ normalizeNote / normalizeListItem 改用 Zod schema

**现状**：手写的 `normalizeNote` 和 `normalizeListItem` 函数做运行时类型检查，与已有 Zod schema 功能重复且可能不一致。

**方案**：

- 替换为 `noteSelectSchema.safeParse()` / `noteListItemSchema.safeParse()`
- 解析失败时打印 warning 并返回合理默认值
- 删除手写 normalize 函数

**涉及文件**：

- `apps/web/src/store/useNoteStore.ts`

---

### 2.5 ✅ 消除重复常量 & 硬编码

| 项目                  | 位置                                    | 方案                                          |
| --------------------- | --------------------------------------- | --------------------------------------------- |
| `LANG_STORAGE_KEY`    | `i18n/index.ts` + `useLanguageStore.ts` | 统一到 `shared` 或 `web/src/lib/constants.ts` |
| `'Untitled'` 默认标题 | schema, service, store, i18n            | 定义 `DEFAULT_NOTE_TITLE` 常量在 shared 中    |
| `EditorErrorBoundary` | `App.tsx` 内联                          | 合并到 `ErrorBoundary.tsx` 统一导出           |

**涉及文件**：

- `packages/shared/src/constants.ts` — 新增共享常量
- 各引用处统一替换

---

### 2.6 ✅ useMinuteTicker 优化 — 避免全列表重渲染

**现状**：`NoteListItem` 接收 `_tick` prop 触发 memo 比较，导致每分钟所有可见项重渲染。

**方案**：

- 将 `formatDistanceToNow` 放到 `NoteListItem` 内部调用 `useMinuteTicker`
- 移除从父组件传入的 `tick` prop
- 每个 item 独立订阅 ticker，只在自身时间文本变化时重渲染

**涉及文件**：

- `apps/web/src/components/NotesSidebar.tsx`
- `apps/web/src/components/NoteListItem.tsx`（如果是独立文件）

---

## P3 — 低（测试 & DX & 可访问性）

### 3.1 ✅ 补充 packages/shared 测试

**目标覆盖**：

- `debounce.ts` — leading/trailing、cancel、flush 边界
- `throttle.ts` — 节流窗口、leading false 首次调用行为
- `generateSummary.ts` — 各种 Markdown 格式、空内容、超长内容
- `getLinkValidationError.ts` — 合法/非法 URL、`javascript:` 协议
- `toKebabCase.ts` — 常见转换场景

**涉及文件**：

- `packages/shared/vitest.config.ts` — 新增
- `packages/shared/src/__tests__/` — 新增测试文件
- `vitest.workspace.ts` — 添加 shared 到工作区

---

### 3.2 ✅ 补充前端关键路径测试

**优先测试**：

- `useDebouncedNoteSave` — 防抖、重试逻辑、卸载时保存
- `NotesSidebar` — 搜索过滤、删除撤销流程
- `NoteEditorPane` — 加载/错误/空状态

**涉及文件**：

- `apps/web/src/hooks/useDebouncedNoteSave.test.ts`
- `apps/web/src/store/useNoteStore.test.ts`

---

### 3.3 ✅ API 测试补全

**缺失覆盖**：

- 游标分页的各种路径（有 cursor + cursorId、仅 cursor、无 cursor）
- `hasMore` 判断逻辑
- rate limiter 行为
- update 部分字段（只改 title / 只改 content / 都改）

**涉及文件**：

- `apps/api/src/services/note-service.test.ts`
- `apps/api/src/index.test.ts`

---

### 3.4 ✅ Turborepo 配置优化

**现状**：无 `turbo.json`，Turborepo 使用默认配置，构建任务无法最优并行。

**方案**：

- 创建 `turbo.json`，定义 `build`、`lint`、`test` 任务依赖关系
- `tokens#build` → `web#generate:css` → `web#build` 显式声明

**涉及文件**：

- `turbo.json` — 新增

---

### 3.5 ✅ 可访问性改善

| 项目                           | 方案                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- |
| Toolbar `aria-label="toolbar"` | 改为 `aria-label="Formatting toolbar"`                                     |
| Toolbar `Separator`            | `role="presentation"` → `role="separator"` + `aria-orientation="vertical"` |
| `<title>` 不更新               | 选中笔记时 `document.title = noteTitle + ' - Nicenote'`                    |
| 错误边界无焦点管理             | `componentDidUpdate` 后 `ref.current?.focus()`                             |
| 搜索框无可见 label             | 添加 `aria-label` 属性                                                     |

---

### 3.6 ✅ 侧边栏 isOpen 状态持久化

**现状**：`useSidebarStore` 只持久化宽度，`isOpen` 每次刷新重置为 `true`。

**方案**：

- 在 localStorage `nicenote-sidebar-width` 存储中增加 `isOpen` 字段
- 或新增 `nicenote-sidebar-open` key

**涉及文件**：

- `apps/web/src/store/useSidebarStore.ts`

---

### 3.7 ✅ 添加 robots.txt 和 SEO 基础标签

**方案**：

- `apps/web/public/robots.txt` — `Disallow: /`（私人应用不需要索引）
- `index.html` 添加 `<meta name="description">`

**涉及文件**：

- `apps/web/public/robots.txt`
- `apps/web/index.html`

---

## 执行建议

| 阶段        | 内容                                                  | 预计范围        |
| ----------- | ----------------------------------------------------- | --------------- |
| **Phase 1** | P0.2 分页 + P0.3 rate limiter + P1.1~1.2 乐观更新修复 | 功能正确性      |
| **Phase 2** | P0.1 认证（需要设计讨论）                             | 安全基础        |
| **Phase 3** | P1.4~1.5 CSP + 内容安全 + P2.1~2.2 性能               | 安全加固 + 性能 |
| **Phase 4** | P2.3~2.6 架构清理                                     | 代码质量        |
| **Phase 5** | P3.1~3.3 测试补全                                     | 质量保障        |
| **Phase 6** | P3.4~3.7 DX + 可访问性 + SEO                          | 锦上添花        |

> 注：P0.1（认证）影响面最大，建议先确定认证方案（Cloudflare Access / JWT / OAuth）再动手。其余项目可并行推进。

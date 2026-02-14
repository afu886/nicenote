# Editor 下一步执行计划

## 1. 锁定结论

1. `packages/editor` 是唯一对外依赖。
2. `packages/editor` 内部目录分层固定为：
   - `src/core`：`commands`、`state`、`serialization`
   - `src/preset-note`：当前 notes 产品编排
   - `src/web`：Tiptap + React 视图
   - `src/styles`：统一 CSS/tokens
   - `src/webview-bridge`：RN WebView 与宿主通信协议
3. `apps/web` 只做壳层和数据接入，不拥有编辑器样式与编排。

## 2. 目标目录结构

```txt
packages/editor/
  src/
    core/
      commands.ts
      state.ts
      serialization.ts
    preset-note/
      minimal-extensions.ts
      toolbar-config.ts
      shortcuts.ts
      behavior-policy.ts
    web/
      nicenote-editor-content.tsx
      minimal-toolbar.tsx
      editor-shell.tsx
    styles/
      editor.css
      tokens.css
    webview-bridge/
      protocol.ts
      host-adapter.ts
    index.ts
```

## 3. 边界约束

1. `packages/editor/src/styles/*` 只能由 `packages/editor` 维护，`apps/web` 不定义编辑器样式来源。
2. `packages/editor/src/preset-note/*` 只能由 `packages/editor` 维护，`apps/web` 不再维护 editor 产品编排。
3. `apps/web` 只允许：
   - 路由与页面壳层
   - API 请求与状态管理
   - 持久化、权限、埋点
4. `apps/web` 禁止新增：
   - editor toolbar 配置
   - editor 扩展组合
   - editor 主题 token 与样式规则

## 4. 执行步骤（可直接落地）

### 步骤 A：目录与入口重排

1. 在 `packages/editor/src` 创建 `core/preset-note/web/styles/webview-bridge`。
2. 重写 `packages/editor/src/index.ts`，仅导出对外 API。
3. 将现有实现按职责迁移到上述目录。

### 步骤 B：核心能力归位（`src/core`）

1. 抽取 `commands` 到 `src/core/commands.ts`。
2. 抽取 `state` 选择逻辑到 `src/core/state.ts`。
3. 抽取 `markdown/json` 序列化到 `src/core/serialization.ts`。

### 步骤 C：产品编排归位（`src/preset-note`）

1. 迁移扩展组合到 `src/preset-note/minimal-extensions.ts`。
2. 迁移工具栏项定义到 `src/preset-note/toolbar-config.ts`。
3. 迁移快捷键映射到 `src/preset-note/shortcuts.ts`。
4. 迁移默认行为策略到 `src/preset-note/behavior-policy.ts`。

### 步骤 D：渲染与样式归位（`src/web` + `src/styles`）

1. 迁移 Tiptap + React 视图到 `src/web/*`。
2. 迁移编辑器 CSS 与 token 映射到 `src/styles/*`。
3. `apps/web` 改为仅消费 `packages/editor` 导出的视图与样式。

### 步骤 E：桥接归位（`src/webview-bridge`）

1. 定义 RN WebView 协议到 `protocol.ts`。
2. 实现宿主适配到 `host-adapter.ts`。

### 步骤 F：apps/web 去编排化

1. 删除 `apps/web` 内 editor 样式与编排代码。
2. 保留壳层和数据接入代码。
3. 确认 `apps/web` 仅调用 `packages/editor` 对外接口。

## 5. 文件级任务清单

### 新增

1. `packages/editor/src/core/commands.ts`
2. `packages/editor/src/core/state.ts`
3. `packages/editor/src/core/serialization.ts`
4. `packages/editor/src/preset-note/minimal-extensions.ts`
5. `packages/editor/src/preset-note/toolbar-config.ts`
6. `packages/editor/src/preset-note/shortcuts.ts`
7. `packages/editor/src/preset-note/behavior-policy.ts`
8. `packages/editor/src/web/nicenote-editor-content.tsx`
9. `packages/editor/src/web/minimal-toolbar.tsx`
10. `packages/editor/src/web/editor-shell.tsx`
11. `packages/editor/src/styles/editor.css`
12. `packages/editor/src/styles/tokens.css`
13. `packages/editor/src/webview-bridge/protocol.ts`
14. `packages/editor/src/webview-bridge/host-adapter.ts`

### 更新

1. `packages/editor/src/index.ts`
2. `packages/editor/package.json`
3. `apps/web/src/App.tsx`（只保留壳层与数据接入）

### 删除（按迁移结果）

1. `apps/web` 中 editor 样式文件
2. `apps/web` 中 editor 扩展组合/toolbar 编排文件

## 6. 验收标准（DoD）

1. `packages/editor` 成为唯一 editor 对外依赖入口。
2. `packages/editor/src` 目录结构与本计划完全一致。
3. `apps/web` 不再包含 editor 样式与编排代码。
4. `pnpm --filter @nicenote/editor build` 通过。
5. `pnpm --filter @nicenote/editor lint` 通过。
6. `apps/web` 编辑闭环可用（加载、编辑、保存、刷新恢复）。

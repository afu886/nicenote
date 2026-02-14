# 架构与实现优化参考报告（已按 WebView 多端方案修订）

对比对象：`nicenote`（当前） vs `./noveleditor`（参考）

## 0. 结论先行

1. 你选择 `react native + WebView` 路线后，不应把编辑器样式和产品编排继续放在 `apps/web`。
2. 现阶段不需要拆成 3 个独立依赖包，采用 `单包（packages/editor）内部强分层` 是更稳妥的工程策略。
3. 参考 `noveleditor` 的价值仍是分层思想：`core/extension/plugin` 解耦，而不是直接照搬其 UI 实现细节。
4. 结合硬切文档，推荐维持破坏性重构策略：`Headless-only`、`Markdown-only`、无兼容层、一次性切换。

## 1. 核心架构与骨架分析

### 1.1 架构模式

1. `noveleditor` 的有效模式：
   - Provider 注入与渲染载体分离（`EditorRoot`/`EditorContent`）。
   - 扩展与插件分层，App 负责组合。
   - 命令面板独立于编辑器主渲染树。
2. `nicenote` 的当前问题：
   - `Editor` 聚合了 runtime、toolbar、source mode、ToC、样式入口等职责。
   - 包边界过厚，影响跨端复用与演进速度。

### 1.2 目录结构哲学（修订后目标）

1. 采用单包分层，不拆多个 workspace 包：
   - `packages/editor/src/core`：平台无关能力（commands/state/serialization）。
   - `packages/editor/src/preset-note`：Notes 产品编排（功能白名单、toolbar 配置、默认行为）。
   - `packages/editor/src/web`：Tiptap + React 视图实现（Web/Tauri/RN WebView 共用）。
   - `packages/editor/src/styles`：编辑器样式与 tokens 映射。
   - `packages/editor/src/webview-bridge`：宿主通信协议（RN <-> WebView）。
2. `apps/*` 只保留壳层职责：路由、数据请求、权限、埋点、平台容器。

### 1.3 多端数据流向

1. `apps/web`：直接渲染 `packages/editor/src/web`。
2. `apps/tauri`：复用同一 Web 编辑器（同样式、同功能）。
3. `apps/react-native`：通过 WebView 承载同一 Web 编辑器，并通过 bridge 同步内容与命令。
4. 统一内容契约：`Markdown-only`，由 editor runtime 向外回传 markdown 字符串。

## 2. 性能优化与可见策略

### 2.1 可复用的性能策略

1. `immediatelyRender: false` 保留。
2. 扩展工厂 `useMemo` 保留。
3. 测量逻辑继续走 `ResizeObserver + throttle`。
4. Store 维持 optimistic update + debounce persist。

### 2.2 关键问题（优先修复）

1. `debouncedSave` 写法失效（每次调用创建新实例），需改为稳定实例 + unmount cancel。
2. ToC 在 `update + selectionUpdate` 双监听高频 setState，需降频或条件更新。
3. `useScrolling` 依赖项导致监听器重绑，需收敛 effect 依赖。
4. RN WebView 端需限制高频 `postMessage` 体积与频率，避免输入卡顿。

## 3. 代码美学与开发者体验

### 3.1 风格与抽象

1. 当前 `nicenote` 的按钮 hooks 抽象（如 `useMark`）质量较好，可保留到 `preset-note` 层。
2. 需要减少包根导出噪音，避免 UI shared 从 editor 包对外泄漏。
3. 目标是“功能语义在 core，产品编排在 preset，渲染在 web”，而不是“每个按钮一个对外模块”。

### 3.2 类型安全

1. 现有 Zod 边界校验（内容与上传）是资产，硬切后应按 `Markdown-only` 决策精简，而不是全部删除。
2. 前端 `Note` 时间字段建议收紧为 `string`，对齐后端 D1 返回契约。
3. Bridge 消息需定义显式 discriminated union，避免 `any` 漏出到宿主层。

## 4. 批判性结论

### 4.1 Pros（建议引入）

1. 借鉴 `noveleditor` 的分层方法，不借鉴其 demo 交互。
2. 将样式和产品编排从 `apps/web` 回收进 `packages/editor`，实现三端同源。
3. 单包分层先行，减少早期包治理成本。
4. 严格执行硬切决策，避免兼容层长期负担。

### 4.2 Cons（建议避坑）

1. 避免把 WebView 路线误解为“所有逻辑都放 app 壳层”。
2. 避免过早拆分成多个依赖包，造成版本联动成本。
3. 避免保留 legacy 导出并行太久，导致迁移不收敛。
4. 避免 DOM 全局事件桥接成为核心命令路径。

## 5. 建议优先级（修订）

1. P0：修复保存防抖失效。
2. P0：在 `packages/editor` 内完成单包分层骨架（core/preset-note/web/styles/webview-bridge）。
3. P1：按硬切策略删除 legacy UI 导出路径与旧目录。
4. P1：建立 WebView bridge 协议并在 RN 端做最小闭环验证。
5. P2：ToC/selection 更新链路降频，补齐性能回归测试。

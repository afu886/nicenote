# NiceNote Desktop — 实施方案 (React Native Mac & Windows)

---

## 1. 架构总览与核心策略

我们将基于 React Native 的能力，通过 Native Module 和 JSI 直接调用底层系统能力，实现与原生桌面应用一致的体验。

### 1.1 核心技术选型

| 领域           | 选型                                               | 说明                                                                          |
| -------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| **基础框架**   | **React Native** (Bare Workflow)                   | 抛弃 Expo，完全掌控原生工程以实现深度定制。                                   |
| **桌面平台**   | **react-native-macos**<br>**react-native-windows** | 微软与社区官方维护的桌面渲染引擎。                                            |
| **持久化存储** | **op-sqlite** + **Drizzle ORM**                    | 极致性能的 JSI SQLite 绑定。在 JS 线程同步调用底层的原生 SQLite。             |
| **编辑器**     | **Tiptap v3** + **WebView**                        | 通过 `react-native-webview` 嵌入现有 Web 编辑器包，并通过自定义 Bridge 通信。 |
| **状态管理**   | **Zustand v5** + **Immer**                         | 全局笔记状态、UI 状态的极简管理。                                             |
| **样式与组件** | **NativeWind v4**                                  | 将 Tailwind 引入 RN。重构基础 UI 为原生兼容包。                               |

---

## 2. 工程结构设计 (Monorepo)

虽然原生侧（iOS/Android/Mac/Windows）存在差异，但在桌面端，macOS 与 Windows 拥有几乎完全一致的交互逻辑（左侧边栏 + 右侧大屏编辑器、快捷键支持、文件级拖拽等）。

为了平衡“分别维护特性”与“最大化代码复用”，推荐如下结构：

```text
nicenote/
├── apps/
│   ├── desktop/                      # 统一的桌面端 React Native 工程
│   │   ├── macos/                    # React Native Mac 原生工程夹
│   │   ├── windows/                  # React Native Windows 原生工程夹
│   │   ├── src/                      # JS/TS 业务代码（Mac/Win 共享）
│   │   │   ├── app/                  # 导航与入口
│   │   │   ├── screens/              # 页面 (MainScreen, SettingsScreen)
│   │   │   ├── components/           # 桌面特有组件 (Sidebar, EditorBridge)
│   │   │   ├── native/               # 桥接方法声明 (SystemTray, Shortcuts)
│   │   │   └── index.tsx             # RN 注册入口
│   │   ├── metro.config.js
│   │   └── package.json
│   ├── web/                          # 现有 Web 端
│   └── api/                          # 现有 Web API 端
├── packages/
│   ├── shared/                       # [复用] 工具函数、类型、Zod Schema
│   ├── tokens/                       # [复用] 设计变量 (需适配 NativeWind 格式)
│   ├── editor/                       # [复用] Tiptap 编辑器 (WebView 承载)
│   ├── database/                     # [新增] 基于 op-sqlite 的 Drizzle 抽象层
│   ├── store/                        # [新增] Zustand 状态管理
│   ├── ui-native/                    # [新增] RN 专属公共组件类库 (Button, Input)
│   └── editor-bridge/                # [新增] WebView 通信协议层
```

> **为何合并在一个 `apps/desktop` 里？**
> macOS 和 Windows 的 React UI 逻辑完全一致。我们将 `macos` 和 `windows` 两个原生工程文件夹放在同一个 package 下，通过不同的启动命令 (`npx react-native run-macos` / `run-windows`) 驱动不同平台的编译，而业务代码 100% 共享。这符合“独立维护原生工程，合并维护业务代码”的最佳实践。

---

## 3. 关键业务实现方案

### 3.1 跨平台本地数据库 (op-sqlite)

PRD 规定必须纯本地离线。我们将使用 `op-sqlite` 替代原本的 Go-SQLite：

- **初始化路径**：使用如 `react-native-fs` 获取 `DocumentDirectoryPath`，将 `nicenote.db` 存放在用户目录。
- **建表体系**：使用 `@nicenote/database` 包，通过 Drizzle ORM 管理 Schema（复用 `notes`, `folders`, `tags` 表结构定义的 TypeScript 格式），并在应用每次冷启动时检查执行 migration。
- **性能优化**：通过 PRAGMA 开启 `WAL` (Write-Ahead Logging) 模式，并启用同步写入（JSI 特性，无需 `await` 桥接延迟）。

### 3.2 Tiptap 编辑器 WebView 集成

这是从 Web 移植到 Native 的**最大难点**。

1. **结构包装**：在 `@nicenote/editor-bridge` 创建一个轻量的 Vite HTML 模板，打包出包含 Tiptap 及相关依赖的单页单 JS 文件（`editor.html`）。
2. **加载方式**：将打包好的 `editor.html` 放入 macOS 和 Windows 工程的本地 Assets 资源目录，通过 `react-native-webview` 加载本地文件路径（`file://...`）实现零网络加载。
3. **通信机制 (postMessage)**：
   - **RN -> WebView**：注入初始的 Markdown 文本；触发外部快捷键对应的加粗/斜体命令；接收系统级主题变化并通知 WebView 切换夜间 CSS。
   - **WebView -> RN**：每 1000ms 触发 debounce 回传最新的 Markdown 源码以存入 SQLite；抛出焦点状态以调整 RN 层 UI；抛出编辑器内容统计字数等。

### 3.3 桌面专属原生交互适配

部分桌面特性无法用纯 React Native 替代，需要自行实现简单的 Native Module 进行桥接，或寻找社区库：

- **系统托盘 (System Tray)**：默认 RN 没有。Mac 可通过编写简单的 Objective-C/Swift 模块调用 `NSStatusBar`，Win 可调用 `Shell_NotifyIcon` 并在不同平台注入 `.macos.ts` 或 `.windows.ts` 文件。
- **全局快捷键注册**：当应用在后台时，通过特定的 C++/Objective-C 原生包注册唤起小窗（对应快速笔记功能）。当前可视窗口的快捷键使用 RN 自带的键盘事件即可。
- **自定义标题栏**：Windows 支持 `TitleBar` API 透明化；Mac 支持 `titleBarStyle: 'hidden'` 隐藏默认标题栏，之后完全由 RN 构建具有拖拽区（`app-region: drag` 的对等逻辑）的统一样式标题栏。

---

## 4. 实施阶段拆解 (Roadmap)

我们建议分 4 个阶段进行开发推进：

### Phase 1: 基础设施筑造 (基建期)

1. **初始化 RN 工程**：在 `apps/desktop` 生成 `react-native` 工程，并分别引入 `react-native-macos` 和 `react-native-windows` 扩展构建环境。
2. **共享包提取**：创建 `@nicenote/database` 和 `@nicenote/store`，完成 op-sqlite 的接入跑通，能在 Mac 和 Win 下执行基本的 SELECT/INSERT。

### Phase 2: 编辑器与核心链路 (核心期)

1. 构建 `@nicenote/editor-bridge` 模块，将 Web 端编辑器打包并在 RN WebView 渲染。
2. 实现 `App -> WebView` 和 `WebView -> App` 的双向即时数据流（防抖保存至 DB）。
3. 补全基于 NativeWind v4 和 FlashList 的笔记列表页布局。
4. **验证节点**：能够在 Mac 和 Windows 平台独立创建笔记、编辑笔记（富文本和 MD 双模）、自动保存，并在下次启动时恢复。

### Phase 3: 桌面特性注入 (体验期)

1. 适配深浅双色主题（打通系统层面主题监控 + 传递至 WebView）。
2. 完成窗口客制化（无边框透明标题栏控制）。
3. 构建基于 FTS5 的全库快速搜索弹窗 (`Cmd+K` / `Ctrl+K`)。
4. 添加系统原生的右后键菜单、导出 MD 文件时的系统 Dialog 交互。

### Phase 4: 构建发版与稳定性保障 (发布期)

1. 配置 GitHub Actions 针对 Mac 和 Windows 机器进行多核/跨平台本地编译缓存。
2. 处理应用数字签名（Apple Developer ID, Windows Authenticode）。
3. 性能评测工具介入（监控 WebView 内存占比，优化冷启动速度至 PRD 要求的 < 1.5s）。

---

## 5. 潜在风险与应对措施

| 风险点                                     | 概率/影响 | 应对方案                                                                                                                                 |
| ------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **`react-native-windows` 的 C++ 依赖炼狱** | 高 / 高   | 确保开发构建机器（或 CI）的 MSVC、Windows SDK 版本绝对对齐官方文档。建议使用固定版本镜像打包。                                           |
| **WebView 编辑器键盘/输入法遮挡问题**      | 中 / 高   | 桌面端无软键盘遮挡，但中文输入法的“候选词框”有时无法正确定位。需要关闭 WebView 层的一些原生滚动，交由内部 Tiptap 绝对处理。              |
| **SQLite FTS5 全文搜索默认缺失**           | 中 / 中   | `op-sqlite` 默认已编译大部分特征，如果不包含 FTS5，可考虑修改 CMakeList / Podspec 强制注入 `-DSQLITE_ENABLE_FTS5` 全局宏重新编译本地包。 |

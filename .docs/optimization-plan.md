# Nicenote 优化计划

> 更新于 2026-02-20，基于全量代码扫描。所有项目已完成。

状态标记：⬜ 待处理 | 🔧 进行中 | ✅ 已完成

---

## 一、紧急 — Bug 修复

### 1.1 ✅ 修复 `useMinuteTicker` 不生效导致时间标签冻结

- `useMinuteTicker()` 改为返回 `tick` 值
- `NoteEditorPane` 中 `useMemo` 依赖加入 `tick`
- `NotesSidebar` 中 `tick` 作为 prop 传入 `NoteListItem`

### 1.2 ✅ 修复 `selectNote` 竞态条件

- 引入 `selectNoteSeq` 递增序列号
- 响应到达时检查 `seq !== selectNoteSeq` 则丢弃

### 1.3 ✅ 修复 `SettingsDropdown` 被侧边栏裁切

- `DropdownMenuContent` 添加 `portal` 属性
- `aria-label` 改为 `t('settings.title')`，新增 i18n key

---

## 二、紧急 — 安全

### 2.1 ✅ 添加 HTTP 安全响应头

- 创建 `apps/web/public/_headers`

---

## 三、中优先级 — 性能

### 3.1 ✅ 修复自动保存导致全部列表项重渲染

- `notesRef = useRef(notes)` + `useEffect` 同步
- 提取 `DELETE_UNDO_TIMEOUT_MS` 常量

### 3.2 ✅ 修复 `useIsBreakpoint` 移动端首帧布局闪烁

- `useState` 初始化函数中同步读取 `window.matchMedia`

---

## 四、中优先级 — 架构

### 4.1 ✅ 完善错误处理：拆分 error 状态 + 用户可见反馈

- `selectNote`、`createNote`、`deleteNote` 错误改用 toast 通知
- `error` 字段仅保留给 `fetchNotes`

### 4.2 ✅ Rate Limiter Map 清理无用 IP 条目

### 4.3 ✅ 分页游标碰撞（已在先前版本中修复）

### 4.4 ✅ 为编辑器添加独立 ErrorBoundary

- `EditorErrorBoundary` 包裹编辑器区域
- 新增 i18n key：`error.editorCrashed`、`error.retry`

---

## 五、低优先级 — 代码清理

### 5.1 ✅ 移除未使用的 `@tailwindcss/typography`

- 从 `index.css`、`tailwind.config.ts`、`package.json` 移除

### 5.2 ✅ 删除死代码

- 删除 `use-menu-navigation.ts`
- `tooltip.tsx` 移除 React 18 兼容分支和 `version` import

### 5.3 ✅ 小修缮

| 问题                                                 | 状态 |
| ---------------------------------------------------- | ---- |
| 删除超时硬编码 → `DELETE_UNDO_TIMEOUT_MS`            | ✅   |
| `aria-label` 未 i18n → `t('settings.title')`         | ✅   |
| `useUnmount` 参数类型 `any` → `() => void`           | ✅   |
| Route 测试 mock 补全 `nextCursorId`                  | ✅   |
| 重复 `useIsBreakpoint` → 从 App 传入 `isMobile` prop | ✅   |

---

## 六、低优先级 — 可访问性 & DX

### 6.1 ✅ Toast 无障碍（已在先前版本中修复）

- `aria-live="polite"` + `role="status"` + `aria-describedby` 已就位

### 6.2 ✅ CI/CD 优化

- `paths` trigger 添加 `tsconfig*.json`、`eslint.config.ts`
- pnpm store 缓存已通过 `actions/setup-node` 的 `cache: 'pnpm'` 配置

### 6.3 ✅ 生成的 CSS tokens 已排除出 git

- `generated-tokens.css` 已在 `.gitignore` 中且未被跟踪

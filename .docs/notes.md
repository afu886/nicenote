启动前必要步骤

# 1. 构建 Tiptap 编辑器 HTML bundle（首次及 editor 包变更后）

pnpm --filter @nicenote/editor-bridge build:template

# 2. 启动 Mobile

pnpm --filter nicenote-mobile start # Metro dev server
pnpm --filter nicenote-mobile ios # iOS
pnpm --filter nicenote-mobile android # Android

启动前必要步骤

# 1. 构建 Tiptap 编辑器 HTML bundle（首次及 editor 包变更后）

pnpm --filter @nicenote/editor-bridge build:template

# 2. 初始化平台原生工程（一次性）

cd apps/desktop
npx react-native-macos-init --overwrite # macOS
npx react-native-windows-init --version 0.76 # Windows
pnpm dlx react-native-windows-init@0.76 --overwrite --version 0.76 // Powershell

# 3. 启动

pnpm --filter nicenote-desktop macos
pnpm --filter nicenote-desktop windows

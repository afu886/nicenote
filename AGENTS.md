# NiceNote

A full-stack note-taking app with rich text editing, deployed on Cloudflare.

## Monorepo Structure

```
apps/
  api/          # Hono + Cloudflare Workers + D1 (SQLite) backend
  web/          # React 19 + Vite 7 + TailwindCSS v4 frontend
  mobile/       # React Native 0.79 (iOS/Android)
  desktop/      # React Native + macOS/Windows (react-native-macos, react-native-windows)
packages/
  database/     # op-sqlite + Drizzle ORM (native apps)
  store/        # Zustand v5 + Immer (native apps)
  editor-bridge/# Tiptap WebView bridge (native apps)
  ui-native/    # Native UI components
  editor/       # Tiptap v3 rich text editor component
  ui/           # Radix UI based component library
  tokens/       # Design tokens (colors, typography, spacing, shadows)
  shared/       # Shared utilities, types, constants
```

## Tech Stack

- **Runtime**: pnpm v10 monorepo + Turborepo
- **Language**: TypeScript 5.9 (strict mode, `bundler` module resolution)
- **Frontend**: React 19, Vite 7, TailwindCSS v4, Zustand v5
- **Native**: React Native 0.79 (iOS/Android), react-native-macos, react-native-windows
- **Backend**: Hono v4, Cloudflare Workers, D1 (SQLite), Drizzle ORM
- **Database (Native)**: op-sqlite, Drizzle ORM
- **Validation**: Zod v4 + @hono/zod-validator
- **Editor**: Tiptap v3 (ProseMirror), react-native-webview (native apps)
- **UI Primitives**: Radix UI, Floating UI
- **Linting**: ESLint 9 (flat config) + Prettier (single quotes, no semicolons, 100 width)
- **Git Hooks**: Husky + lint-staged

## Key Commands

```bash
# Root (monorepo)
pnpm dev                # Start all apps/packages in dev mode
pnpm build              # Build all (via Turborepo)
pnpm lint               # Lint all packages

# API (apps/api)
pnpm --filter api dev            # Local dev server
pnpm --filter api deploy         # Deploy to Cloudflare Workers
pnpm --filter api db:migrate     # Run D1 migrations (local)
pnpm --filter api db:migrate:prod # Run D1 migrations (production)
pnpm --filter api db:studio      # Drizzle Studio
pnpm --filter api cf-typegen     # Generate Cloudflare Worker types

# Web (apps/web)
pnpm --filter web dev            # Vite dev server (port 5173)
pnpm --filter web build          # Build (generates CSS from tokens first)
pnpm --filter web generate:css   # Regenerate CSS from design tokens

# Desktop & Native (apps/desktop & packages/editor-bridge)
pnpm --filter @nicenote/editor-bridge build:template # Build Tiptap editor HTML bundle (must run before launching desktop app)
pnpm --filter nicenote-desktop macos                 # Launch on macOS
pnpm --filter nicenote-desktop windows               # Launch on Windows
```

## Architecture

### End-to-End Type Safety

`AppType` is exported by `apps/api/src/routes.ts` (re-exported from `apps/api/src/index.ts`) and imported by the web app at `apps/web/src/lib/api.ts` as a type-only dependency (`import type { AppType } from 'api'`). This keeps full RPC type safety while avoiding a direct `web -> api runtime` type dependency.

### Database Schema

Tables in `apps/api/src/db/schema.ts`:

- `notes`: `id` (text, PK, nanoid), `title` (text), `content` (text, Markdown), `summary` (text), `folderId` (text, FK), `createdAt`/`updatedAt` (ISO 8601 strings)
- `folders`: `id` (text, PK), `name` (text), `parentId` (text, FK), `position` (integer), `createdAt`/`updatedAt`
- `tags`: `id` (text, PK), `name` (text), `color` (text), `createdAt`
- `note_tags`: `noteId` (FK), `tagId` (FK)

### API Routes (apps/api/src/\*-routes.ts)

```
GET    /                 # Health check
GET    /health           # Health check
GET    /notes            # List all (with cursor-based pagination)
GET    /notes/search     # Search notes
GET    /notes/:id        # Get one
POST   /notes            # Create
PATCH  /notes/:id        # Update
DELETE /notes/:id        # Delete
```

Folders (`/folders`) and Tags (`/tags`) also support full CRUD operations.

CORS allows: localhost:5173, nicenote.app, nicenote.pages.dev

### State Management

Zustand store at `apps/web/src/store/useNoteStore.ts` manages notes CRUD with cursor-based pagination, optimistic updates, auto-generated summaries, and 1-second debounced auto-save.

### Theme System

Design tokens in `packages/tokens/` are compiled to CSS variables via `apps/web/scripts/generate-css.ts`. Dark mode uses Tailwind's `class` strategy with localStorage persistence (`nicenote-theme` key). Flash prevention via inline script in `index.html`.

### Editor Package

Tiptap v3 editor at `packages/editor/src/index.ts` with extensions: StarterKit (includes Link), TextAlign, Typography, Placeholder, Markdown. Content stored as Markdown format.

### UI Package

Components: Button, DropdownMenu, Popover, Tooltip, Input, Separator, Toolbar.
Utility: `cn()` from `packages/ui/src/lib/utils.ts` (clsx + tailwind-merge).
Hooks: useIsBreakpoint, useThrottledCallback, useComposedRef, useMenuNavigation.

### Shared Package

Exports: async utils (debounce, throttle), parsers (toKebabCase), validators (getLinkValidationError).
Types/Schemas: NoteSelect, NoteInsert, NoteCreateInput, NoteUpdateInput, NoteListItem, NoteListQuery, NoteListResult, NoteContractService, and corresponding Zod schemas.

### Desktop Architecture (PLAN-desktop.md)

- **Database**: `initDatabase()` → op-sqlite opens `nicenote.db` → Drizzle wraps it → services (NoteService, FolderService, TagService) do CRUD
- **Migrations**: Synchronous JSI, run at startup via `runMigrations()`, FTS5 enabled
- **Store**: Zustand stores call `getDatabase()` lazily; note-store has 1s debounced auto-save
- **Editor Bridge**: EditorWebView (react-native-webview) loads `src/assets/editor.html`; build with `pnpm --filter @nicenote/editor-bridge build:template`
- **Desktop Layout**: 3-panel (Sidebar 220px | NoteList 260px | Editor flex:1), custom TitleBar (38px height)
- **Native Modules**: SystemTray (`NNSystemTray`), GlobalShortcuts (`NNGlobalShortcuts`) — declared in `apps/desktop/src/native/`

## Conventions

- Internal packages use `workspace:*` protocol
- Vite path alias: `@` maps to `packages/editor/src` in web app
- All packages export from their `src/index.ts` (or `src/index.tsx`)
- Prettier: single quotes, no semicolons, 100 char width
- Strict TypeScript, bundler module resolution
- Functional components with hooks, forwardRef for ref forwarding
- CSS variables for themeable values via design tokens
- Mobile-first responsive design (breakpoints: sm=640, md=768, lg=1024, xl=1280)
- Editor link input must use non-blocking UI (Popover/Modal + validation); do not use `window.prompt`
- **Native ID Generation**: `nanoid/non-secure` for id generation in native (no crypto dependency)
- **Native Store**: Store files use lazy `svc()` accessor (creates new service instance each call — stateless)
- **Native DB**: op-sqlite is a peer dependency of `@nicenote/database`

## Desktop Setup Steps (one-time, per platform)

1. `cd apps/desktop && npx react-native-macos-init --overwrite` (macOS target)
2. `cd apps/desktop && npx react-native-windows-init --overwrite --version 0.76` (Windows target)
3. Link native modules: op-sqlite, react-native-webview, react-native-fs
4. Implement `NNSystemTray` and `NNGlobalShortcuts` native modules in Xcode/VS
5. Run `pnpm --filter @nicenote/editor-bridge build:template` to build the editor bundle

## Deployment

- **API**: Cloudflare Workers (wrangler), D1 database binding "DB"
- **Web**: Cloudflare Pages
- **CI/CD**: GitHub Actions (ci-cd.yml)

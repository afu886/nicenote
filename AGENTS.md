# Nicenote

A full-stack note-taking app with rich text editing, deployed on Cloudflare.

## Monorepo Structure

```
apps/
  api/          # Hono + Cloudflare Workers + D1 (SQLite) backend
  web/          # React 19 + Vite 7 + TailwindCSS v4 frontend
packages/
  editor/       # Tiptap v3 rich text editor component
  ui/           # Radix UI based component library
  tokens/       # Design tokens (colors, typography, spacing, shadows)
  shared/       # Shared utilities, types, constants
```

## Tech Stack

- **Runtime**: pnpm v10 monorepo + Turborepo
- **Language**: TypeScript 5.9 (strict mode, `bundler` module resolution)
- **Frontend**: React 19, Vite 7, TailwindCSS v4, Zustand v5
- **Backend**: Hono v4, Cloudflare Workers, D1 (SQLite), Drizzle ORM
- **Validation**: Zod v4 + @hono/zod-validator
- **Editor**: Tiptap v3 (ProseMirror), lowlight for code highlighting
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
```

## Architecture

### End-to-End Type Safety

`AppType` is exported by `apps/api/src/routes.ts` (re-exported from `apps/api/src/index.ts`) and imported by the web app at `apps/web/src/lib/api.ts` as a type-only dependency (`import type { AppType } from 'api'`). This keeps full RPC type safety while avoiding a direct `web -> api runtime` type dependency.

### Database Schema

Single `notes` table in `apps/api/src/db/schema.ts`:

- `id` (text, PK, nanoid), `title` (text), `content` (text, Tiptap JSON), `createdAt`/`updatedAt` (ISO 8601 strings)

### API Routes (apps/api/src/index.ts)

```
GET    /           # Health check
GET    /notes      # List all (sorted by updatedAt desc)
GET    /notes/:id  # Get one
POST   /notes      # Create
PATCH  /notes/:id  # Update
DELETE /notes/:id  # Delete
```

CORS allows: localhost:5173, nicenote.app, nicenote.pages.dev

### State Management

Zustand store at `apps/web/src/store/useNoteStore.ts` manages notes CRUD with optimistic updates and 1-second debounced auto-save.

### Theme System

Design tokens in `packages/tokens/` are compiled to CSS variables via `apps/web/scripts/generate-css.ts`. Dark mode uses Tailwind's `class` strategy with localStorage persistence (`nicenote-theme` key). Flash prevention via inline script in `index.html`.

### Editor Package

Tiptap v3 editor at `packages/editor/src/index.tsx` with extensions: StarterKit, CodeBlockLowlight, Lists, Images, Links, Typography, TextAlign, Markdown, TableOfContents, Placeholder. Content stored as Tiptap JSON format.

### UI Package

Components: Button, Badge, Card, DropdownMenu, Popover, Tooltip, Input, Separator, Toolbar.
Utility: `cn()` from `packages/ui/src/lib/utils.ts` (clsx + tailwind-merge).
Hooks: useIsBreakpoint, useWindowSize, useThrottledCallback, useComposedRef, useMenuNavigation.

### Shared Package

Exports: date formatting (formatDate, timeAgo), async utils (debounce, throttle, sleep), deepClone, validators, parsers, storage adapters, request wrapper, string utils (toKebabCase, toCamelCase), random utils.
Types: Note, CreateNoteRequest, UpdateNoteRequest, ApiResponse.

## Conventions

- Internal packages use `workspace:*` protocol
- Vite path alias: `@` maps to `packages/editor/src` in web app
- All packages export from their `src/index.ts` (or `src/index.tsx`)
- Prettier: single quotes, no semicolons, 100 char width
- Functional components with hooks, forwardRef for ref forwarding
- CSS variables for themeable values via design tokens
- Mobile-first responsive design (breakpoints: sm=640, md=768, lg=1024, xl=1280)
- Editor link input must use non-blocking UI (Popover/Modal + validation); do not use `window.prompt`

## Deployment

- **API**: Cloudflare Workers (wrangler), D1 database binding "DB"
- **Web**: Cloudflare Pages
- **CI/CD**: GitHub Actions (deploy-api.yml, deploy-web.yml)

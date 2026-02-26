import { resolve } from 'path'
import { defineConfig } from 'vite'

/**
 * Builds the Tiptap editor into a single self-contained HTML file.
 * Output: src/assets/editor.html (imported as a string by EditorWebView.tsx)
 *
 * Run with: pnpm --filter @nicenote/editor-bridge build:template
 */
export default defineConfig({
  root: resolve(__dirname, 'template'),
  build: {
    outDir: resolve(__dirname, 'src/assets'),
    emptyOutDir: true,
    // Inline all assets so the result is a single self-contained HTML
    assetsInlineLimit: Infinity,
    rollupOptions: {
      input: resolve(__dirname, 'template/index.html'),
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
})

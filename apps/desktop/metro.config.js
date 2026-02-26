/* eslint-disable no-undef, @typescript-eslint/no-require-imports */
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const path = require('path')

const monorepoRoot = path.resolve(__dirname, '../..')

const defaultConfig = getDefaultConfig(__dirname)

/**
 * Metro config for nicenote-desktop
 *
 * Key concerns:
 *  1. Resolve workspace packages from the monorepo root
 *  2. Support .macos and .windows platform extensions
 *  3. Allow require() of .html assets (editor bundle)
 */
const config = {
  watchFolders: [monorepoRoot],

  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    // Prefer platform-specific extensions: Button.macos.tsx > Button.tsx
    platforms: ['macos', 'windows', 'native', 'ios', 'android'],
    unstable_enablePackageExports: false,
    // Teach Metro how to handle .html files (for the editor bundle)
    assetExts: [...(defaultConfig.resolver.assetExts ?? []), 'html'],
  },

  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
}

module.exports = mergeConfig(defaultConfig, config)

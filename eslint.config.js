// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

// Layer rules from docs/architecture.md §3 and docs/adr/0004-ports-and-composition-root.md:
//   Presentation → Application → Domain ← Data, Security, Platform
// Outer layers reach each other only through the ports in src/application/ports.
// Each zone lists what `target` may NOT import. `except` is relative to `from`.
const layer = (name, allowed) => ({
  target: `./src/${name}`,
  from: './src',
  except: allowed.map((dir) => `./${dir}`),
  message: `src/${name} may only import from: ${allowed.join(', ')} (docs/architecture.md §3).`,
});

const layerZones = [
  layer('domain', ['domain']),
  layer('application', ['application', 'domain', 'logging']),
  layer('data', ['data', 'application/ports', 'domain', 'logging']),
  layer('security', ['security', 'application/ports', 'domain', 'logging']),
  layer('platform', ['platform', 'application/ports', 'domain', 'logging']),
  layer('design-system', ['design-system', 'i18n']),
  layer('i18n', ['i18n']),
  layer('logging', ['logging']),
  // src/composition is the composition root: it may import every layer, and
  // only routes may import it.
  {
    target: './app',
    from: './src',
    except: [
      './application',
      './domain',
      './design-system',
      './i18n',
      './logging',
      './composition',
    ],
    message:
      'Routes may only import application, domain, design-system, i18n, logging and composition (docs/architecture.md §3).',
  },
  {
    target: './src',
    from: './app',
    message: 'src/ must not import from routes in app/.',
  },
];

const frameworkPackages = [
  'react',
  'react-dom',
  'react-native',
  'react-native-*',
  'expo',
  'expo-*',
  '@expo/*',
];

// Native capabilities that must sit behind a port, implemented in src/platform.
const platformPackages = [
  'expo-sqlite',
  'expo-secure-store',
  'expo-local-authentication',
  'expo-crypto',
  'expo-file-system',
  'expo-document-picker',
  'expo-sharing',
  'expo-notifications',
  'expo-background-task',
  'expo-print',
];

const frameworkPattern = {
  group: frameworkPackages,
  message:
    'Domain and application code is pure TypeScript: no React, React Native or Expo imports.',
};

// Test doubles (an in-memory key store, a predictable "random" source) must never ship.
const fakesPattern = {
  group: ['**/fakes', '**/fakes/**'],
  message: 'Test fakes may only be imported from test files.',
};

const platformPaths = platformPackages.map((name) => ({
  name,
  message: 'Use a port from src/application/ports, implemented in src/platform.',
}));

const testFiles = ['**/*.test.ts', '**/*.test.tsx', 'tests/**', '**/fakes/**'];

module.exports = defineConfig([
  globalIgnores([
    'node_modules/',
    '.expo/',
    'dist/',
    'coverage/',
    'ios/',
    'android/',
    'expo-env.d.ts',
  ]),
  expoConfig,
  {
    rules: {
      'import/no-restricted-paths': ['error', { zones: layerZones }],
      'import/no-cycle': 'error',
      'no-console': 'error',
      'no-restricted-imports': ['error', { patterns: [fakesPattern] }],
    },
  },
  {
    files: ['src/domain/**', 'src/application/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [frameworkPattern, fakesPattern] }],
    },
  },
  {
    files: ['app/**', 'src/design-system/**', 'src/i18n/**'],
    rules: {
      'no-restricted-imports': ['error', { paths: platformPaths, patterns: [fakesPattern] }],
    },
  },
  // Test files and the fakes themselves may use fakes; purity rules still apply.
  {
    files: testFiles,
    rules: { 'no-restricted-imports': 'off' },
  },
  // Tests may reach across layers to use a real implementation, for example
  // the libsodium adapter when testing the key hierarchy.
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**'],
    rules: { 'import/no-restricted-paths': 'off' },
  },
  {
    files: testFiles.flatMap((glob) => [`src/domain/${glob}`, `src/application/${glob}`]),
    rules: {
      'no-restricted-imports': ['error', { patterns: [frameworkPattern] }],
    },
  },
  prettierConfig,
]);

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

// Layer rules from docs/architecture.md §3:
//   Presentation → Application → Domain ← Data → Platform
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
  layer('data', ['data', 'application', 'domain', 'platform', 'security', 'logging']),
  layer('security', ['security', 'domain', 'platform', 'logging']),
  layer('platform', ['platform', 'logging']),
  layer('design-system', ['design-system', 'i18n']),
  layer('i18n', ['i18n']),
  layer('logging', ['logging']),
  {
    target: './app',
    from: './src',
    except: ['./application', './domain', './design-system', './i18n', './logging'],
    message:
      'Routes may only import application, domain, design-system, i18n and logging (docs/architecture.md §3).',
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

// Native capabilities that must sit behind an interface in src/platform.
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
    },
  },
  {
    files: ['src/domain/**', 'src/application/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: frameworkPackages,
              message:
                'Domain and application code is pure TypeScript: no React, React Native or Expo imports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['app/**', 'src/design-system/**', 'src/i18n/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: platformPackages.map((name) => ({
            name,
            message: 'Use the interface in src/platform through an application use case.',
          })),
        },
      ],
    },
  },
  prettierConfig,
]);

/**
 * @jest-environment node
 *
 * Proves the import-boundary lint rules in eslint.config.js actually fire
 * (docs/architecture.md §3). Each case lints a virtual file at `filePath`.
 */
import { ESLint } from 'eslint';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
// Jest cannot run ESLint's dynamic import of the config file, so pass it in.
// import/no-cycle walks the real module graph and cannot handle virtual files.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const baseConfig = require('../../eslint.config.js');
const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: true,
  overrideConfig: [...baseConfig, { rules: { 'import/no-cycle': 'off' } }],
});

async function ruleIds(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, filePath) });
  return (result?.messages ?? []).map((message) => message.ruleId ?? 'fatal');
}

describe('import boundaries', () => {
  jest.setTimeout(60_000);

  it('rejects domain code importing another layer by relative path', async () => {
    const ids = await ruleIds(
      'src/domain/money/example.ts',
      "import { colors } from '../../design-system/tokens';\nexport const x = colors;\n",
    );
    expect(ids).toContain('import/no-restricted-paths');
  });

  it('rejects domain code importing another layer through the @/ alias', async () => {
    const ids = await ruleIds(
      'src/domain/money/example.ts',
      "import { colors } from '@/design-system/tokens';\nexport const x = colors;\n",
    );
    expect(ids).toContain('import/no-restricted-paths');
  });

  it.each(['react', 'react-native', 'expo-crypto'])(
    'rejects domain code importing %s',
    async (pkg) => {
      const ids = await ruleIds(
        'src/domain/money/example.ts',
        `import * as dep from '${pkg}';\nexport const x = dep;\n`,
      );
      expect(ids).toContain('no-restricted-imports');
    },
  );

  it('rejects application code importing React Native', async () => {
    const ids = await ruleIds(
      'src/application/example.ts',
      "import { Platform } from 'react-native';\nexport const x = Platform.OS;\n",
    );
    expect(ids).toContain('no-restricted-imports');
  });

  it.each(['app/example.tsx', 'src/design-system/example.ts'])(
    'rejects %s importing a native capability directly',
    async (filePath) => {
      const ids = await ruleIds(
        filePath,
        "import * as SQLite from 'expo-sqlite';\nexport const x = SQLite;\n",
      );
      expect(ids).toContain('no-restricted-imports');
    },
  );

  it('rejects src code importing from routes', async () => {
    const ids = await ruleIds(
      'src/design-system/example.ts',
      "import Layout from '../../app/_layout';\nexport const x = Layout;\n",
    );
    expect(ids).toContain('import/no-restricted-paths');
  });

  it('allows routes to import the design system', async () => {
    const ids = await ruleIds(
      'app/example.tsx',
      "import { colors } from '@/design-system';\nexport const x = colors;\n",
    );
    expect(ids).toEqual([]);
  });

  it('rejects console logging', async () => {
    const ids = await ruleIds('src/design-system/example.ts', "console.log('amount');\n");
    expect(ids).toContain('no-console');
  });
});

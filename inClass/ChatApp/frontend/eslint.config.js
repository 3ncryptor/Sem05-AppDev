/**
 * ESLint config: Expo's recommended rules plus the project's own rules.
 *
 * - useContext / useReducer are banned: shared state goes through the
 *   store modules in src/store (see buildPlan.md, D4).
 * - lucide icons are imported one per file (lucide-react-native/icons/<name>):
 *   Metro does not tree-shake, so the barrel would bundle all ~1,600 icons.
 * - console is banned outside src/utils/logger.js, so every log line
 *   also reaches the in-app Inspector.
 */
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const BANNED_HOOK_MESSAGE =
  'Shared state uses the store modules in src/store (buildPlan.md D4), not useContext/useReducer.';

const JEST_GLOBALS = {
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  jest: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
};

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'coverage/*'] },
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['useContext', 'useReducer'],
              message: BANNED_HOOK_MESSAGE,
            },
            {
              name: 'lucide-react-native',
              message:
                "Import one icon per file: import House from 'lucide-react-native/icons/house' (the barrel bundles every icon).",
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name=/^use(Context|Reducer)$/]',
          message: BANNED_HOOK_MESSAGE,
        },
        {
          selector: "MemberExpression[object.name='React'][property.name=/^use(Context|Reducer)$/]",
          message: BANNED_HOOK_MESSAGE,
        },
      ],
      'no-console': 'error',
    },
  },
  { files: ['src/utils/logger.js'], rules: { 'no-console': 'off' } },
  { files: ['**/*.test.js'], languageOptions: { globals: JEST_GLOBALS } },
]);

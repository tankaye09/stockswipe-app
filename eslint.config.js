// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');
const testingLibrary = require('eslint-plugin-testing-library');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*'],
  },
  {
    files: ['src/__tests__/**/*.{ts,tsx}'],
    ...testingLibrary.configs['flat/react'],
    rules: {
      ...testingLibrary.configs['flat/react'].rules,
      // React Native Testing Library v14 makes fireEvent async, so it must be awaited.
      'testing-library/no-await-sync-events': 'off',
    },
  },
  {
    // jest.mock factories must use require().
    files: ['jest.setup.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
]);

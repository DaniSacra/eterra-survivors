import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: globals.browser },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // The pure game logic must never depend on Phaser.
    files: ['src/core/**/*.ts', 'src/data/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['phaser', '**/render/**', '**/scenes/**'],
              message: 'core/data must stay Phaser-free.',
            },
          ],
        },
      ],
    },
  },
  { files: ['tests/**/*.ts'], rules: { '@typescript-eslint/no-non-null-assertion': 'off' } },
  prettier,
);

// Flat ESLint config (ESLint 9/10). Replaces the legacy .eslintrc.js.
// Rules, globals and overrides are ported 1:1 from the old config; the only
// dropped entry is `@typescript-eslint/ban-types`, which was removed in
// typescript-eslint v8 (a configured unknown rule errors under flat config).
import path from 'node:path';
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';

const ROOT = path.resolve(import.meta.dirname, '..');

export default [
  // Global ignores (replaces ignorePatterns)
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      'test-output/',
      'vendor/',
      'config/',
      '**/*.min.js',
      '*.config.js',
      '*.config.ts',
    ],
  },

  // Base + Vue 3 recommended (flat)
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  // Project rules for TS + Vue SFCs (type-aware, parity with the old config)
  {
    files: ['**/*.ts', '**/*.vue'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        project: './tsconfig.json',
        tsconfigRootDir: ROOT,
        extraFileExtensions: ['.vue'],
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        // Vitest globals (vitest config sets test.globals = true)
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,

      // ===== Base rules =====
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
      'no-debugger': 'error',
      'no-unused-vars': 'off',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-duplicate-imports': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'prefer-const': 'error',
      'eqeqeq': ['error', 'smart'],
      'curly': ['error', 'multi-line'],
      'no-throw-literal': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'no-useless-escape': 'error',
      'no-control-regex': 'off',
      'no-prototype-builtins': 'off',
      'no-case-declarations': 'off',
      'no-extra-boolean-cast': 'off',
      'no-unexpected-multiline': 'error',
      'no-regex-spaces': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-loss-of-precision': 'error',
      'no-useless-backreference': 'error',
      'no-import-assign': 'error',
      'no-setter-return': 'error',
      'no-class-assign': 'error',
      'no-constructor-return': 'error',
      'no-dupe-else-if': 'error',
      'no-compare-neg-zero': 'error',
      'no-unsafe-negation': 'error',
      'require-atomic-updates': 'off',
      // New in the ESLint 10 recommended set; not part of the legacy rule set — keep parity.
      'no-useless-assignment': 'off',

      // ===== TypeScript rules =====
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': false,
        'ts-nocheck': false,
        'ts-check': false,
      }],
      '@typescript-eslint/no-empty-function': ['error', {
        allow: ['arrowFunctions', 'methods'],
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      }],
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-namespace': 'off',

      // ===== Vue rules =====
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'off',
      'vue/html-self-closing': ['error', {
        html: { void: 'any', normal: 'any', component: 'always' },
        svg: 'always',
        math: 'always',
      }],
      'vue/max-attributes-per-line': ['error', { singleline: 3, multiline: 1 }],
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-closing-bracket-newline': ['error', { singleline: 'never', multiline: 'always' }],
      'vue/no-unused-vars': 'warn',
      'vue/no-template-shadow': 'error',
      'vue/component-definition-name-casing': ['error', 'kebab-case'],
      'vue/prop-name-casing': ['error', 'camelCase'],
      'vue/attribute-hyphenation': ['error', 'always'],
      'vue/v-on-event-hyphenation': ['error', 'always'],
      'vue/no-reserved-component-names': 'error',
      'vue/no-duplicate-attributes': 'error',
      'vue/order-in-components': 'error',
      'vue/this-in-template': 'error',
      'vue/no-use-v-if-with-v-for': 'error',
      'vue/require-v-for-key': 'error',
      'vue/require-valid-default-prop': 'error',
      'vue/return-in-computed-property': 'error',
      'vue/valid-v-for': 'error',
      'vue/valid-v-if': 'error',
      'vue/valid-v-model': 'error',
      'vue/valid-v-show': 'error',
    },
  },

  // Node utility scripts (.js, ESM) — e.g. src/scripts/*
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },

  // Test overrides
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-console': 'off',
    },
  },
];

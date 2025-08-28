import eslint from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import vuePlugin from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.git/**',
      '**/coverage/**',
      '**/test-output/**',
      '**/*.min.js',
      '**/vendor/**',
      '**/.vscode/**',
      '**/.idea/**',
      '**/tmp/**',
      '**/temp/**',
      '**/.DS_Store',
      '**/Thumbs.db'
    ]
  },
  eslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx,vue}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        NodeJS: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        Symbol: 'readonly',
        Proxy: 'readonly',
        WeakMap: 'readonly',
        WeakSet: 'readonly',
        Reflect: 'readonly',
        BigInt: 'readonly',
        Uint8Array: 'readonly',
        ArrayBuffer: 'readonly',
        DataView: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        globalThis: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        HTMLElement: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        test: 'readonly',
        jest: 'readonly'
      }
    },
    rules: {
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
      'require-atomic-updates': 'off'
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd()
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': false,
        'ts-nocheck': false,
        'ts-check': false
      }],
      '@typescript-eslint/no-empty-function': ['error', {
        allow: ['arrowFunctions', 'methods']
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        disallowTypeAnnotations: false
      }],
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/no-namespace': 'off'
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    plugins: {
      vue: vuePlugin,
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...vuePlugin.configs['vue3-recommended'].rules,
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'off',
      'vue/html-self-closing': ['error', {
        html: {
          void: 'any',
          normal: 'any',
          component: 'always'
        },
        svg: 'always',
        math: 'always'
      }],
      'vue/max-attributes-per-line': ['error', {
        singleline: 3,
        multiline: 1
      }],
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-closing-bracket-newline': ['error', {
        singleline: 'never',
        multiline: 'always'
      }],
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
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }]
    }
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-console': 'off'
    }
  }
];
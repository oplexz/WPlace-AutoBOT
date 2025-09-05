import pluginJs from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        files: ['**/*.{js,ts,cjs,mjs,jsx,tsx}'],
        languageOptions: { parser: tsParser, globals: { ...globals.browser, ...globals.node } },
    },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    eslintConfigPrettier,
    {
        files: ['**/*.{js,jsx}'],
        rules: {
            'no-undef': 'warn',
            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            'no-useless-escape': 'off',
            'no-constant-binary-expression': 'warn',

            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-unused-expressions': [
                'warn',
                {
                    allowTernary: true,
                    allowShortCircuit: true,
                    allowTaggedTemplates: true,
                },
            ],
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        plugins: { unusedImports },
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'unusedImports/no-unused-imports': 'error',
        },
    },
    {
        files: ['**/*.{cjs,mjs}'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    { ignores: ['node_modules', 'dist', '**/*.mjs'] },
];

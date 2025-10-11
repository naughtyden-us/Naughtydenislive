import { FlatCompat } from '@eslint/eslintrc';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// Initialize compat
const compat = new FlatCompat();

export default tseslint.config(
  eslint.configs.recommended,
  ...compat.extends('plugin:@next/next/recommended', 'plugin:@next/next/core-web-vitals'),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
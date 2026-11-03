import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// Next.js recommended rules (React, hooks, accessibility, Core Web Vitals) + TypeScript.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Compiler rules that flag our data loading (setState inside useEffect)
    // and components declared inside other components. Fixing them means
    // restructuring pages (custom data hooks, splitting big components), so they
    // warn for now and get fixed part by part. `npm run lint` caps the warning
    // count, so the number can only go down.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    // Plain CommonJS config files (jest.config.js) are allowed to use require().
    files: ['*.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  globalIgnores(['.next/**', 'out/**', 'coverage/**', 'next-env.d.ts']),
])

import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default [
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/sdk.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      resolve(),
      typescript({ tsconfig: './tsconfig.json' }),
      production && terser()
    ]
  },
  // IIFE build (browser)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/sdk.iife.js',
      format: 'iife',
      name: 'ZentriaTracking',
      sourcemap: true
    },
    plugins: [
      resolve(),
      typescript({ tsconfig: './tsconfig.json' }),
      production && terser()
    ]
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/sdk.cjs.js',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      resolve(),
      typescript({ tsconfig: './tsconfig.json' }),
      production && terser()
    ]
  }
];

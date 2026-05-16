import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'tailwind-preset': 'src/tailwind-preset.ts',
    'tokens/index': 'src/tokens/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
});

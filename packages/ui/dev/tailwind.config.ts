import type { Config } from 'tailwindcss';
import preset from '../src/tailwind-preset';

export default {
  presets: [preset],
  content: [
    './**/*.{ts,tsx,html}',
    '../src/components/**/*.{ts,tsx}',
  ],
} satisfies Config;

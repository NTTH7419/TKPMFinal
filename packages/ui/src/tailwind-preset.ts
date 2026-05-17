import { tokens } from './tokens/tokens';
import type { Config } from 'tailwindcss';

const preset: Config = {
  content: [],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: tokens.colors,
      fontSize: Object.fromEntries(
        Object.entries(tokens.typography).map(([key, val]) => [
          key,
          [
            val.fontSize,
            {
              lineHeight: val.lineHeight,
              letterSpacing: val.letterSpacing !== '0' ? val.letterSpacing : undefined,
              fontWeight: val.fontWeight,
            },
          ],
        ])
      ),
      borderRadius: tokens.rounded,
      spacing: tokens.spacing,
      boxShadow: tokens.elevation,
    },
  },
};

export default preset;

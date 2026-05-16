import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tokens } from '../src/tokens/tokens';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../src/styles/tokens.css');
mkdirSync(dirname(outPath), { recursive: true });

const lines: string[] = [':root {'];

for (const [key, value] of Object.entries(tokens.colors)) {
  lines.push(`  --color-${key}: ${value};`);
}

for (const [key, val] of Object.entries(tokens.typography)) {
  lines.push(`  --text-${key}: ${val.fontSize};`);
  lines.push(`  --font-weight-${key}: ${val.fontWeight};`);
  lines.push(`  --leading-${key}: ${val.lineHeight};`);
  if (val.letterSpacing !== '0') {
    lines.push(`  --tracking-${key}: ${val.letterSpacing};`);
  }
}

for (const [key, value] of Object.entries(tokens.rounded)) {
  lines.push(`  --rounded-${key}: ${value};`);
}

for (const [key, value] of Object.entries(tokens.spacing)) {
  lines.push(`  --space-${key}: ${value};`);
}

for (const [key, value] of Object.entries(tokens.elevation)) {
  lines.push(`  --shadow-${key}: ${value};`);
}

lines.push('}');

writeFileSync(outPath, lines.join('\n') + '\n');
console.log(`✓ Emitted CSS variables to ${outPath}`);

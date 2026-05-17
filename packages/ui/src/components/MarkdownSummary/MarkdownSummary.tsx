import type { CSSProperties, ReactNode } from 'react';

export interface MarkdownSummaryProps {
  content: string;
  className?: string;
  style?: CSSProperties;
}

type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'unorderedList'; items: string[] }
  | { type: 'orderedList'; items: string[] };

const containerStyle: CSSProperties = {
  color: '#334155',
  fontSize: 14,
  lineHeight: 1.7,
};

const styles: Record<string, CSSProperties> = {
  h1: { margin: '0 0 12px', color: '#0f172a', fontSize: 22, lineHeight: 1.25, fontWeight: 700 },
  h2: { margin: '18px 0 10px', color: '#1e293b', fontSize: 18, lineHeight: 1.3, fontWeight: 700 },
  h3: { margin: '16px 0 8px', color: '#334155', fontSize: 15, lineHeight: 1.4, fontWeight: 700 },
  p: { margin: '0 0 12px' },
  ul: { margin: '0 0 14px', paddingLeft: 22 },
  ol: { margin: '0 0 14px', paddingLeft: 22 },
  li: { marginBottom: 6 },
  quote: {
    margin: '0 0 14px',
    padding: '10px 12px',
    borderLeft: '3px solid #6366f1',
    background: '#eef2ff',
    color: '#334155',
    borderRadius: 6,
  },
  code: {
    padding: '2px 5px',
    borderRadius: 5,
    background: '#e2e8f0',
    color: '#0f172a',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '0.92em',
  },
  link: { color: '#4f46e5', fontWeight: 600, textDecoration: 'none' },
  strong: { fontWeight: 700 },
  em: { fontStyle: 'italic' },
};

export function MarkdownSummary({ content, className, style }: MarkdownSummaryProps) {
  const blocks = parseMarkdownBlocks(content);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function parseMarkdownBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim();
    if (text) blocks.push({ type: 'paragraph', text });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      continue;
    }

    if (trimmed.startsWith('> ')) {
      flushParagraph();
      blocks.push({ type: 'quote', text: trimmed.replace(/^>\s*/, '') });
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(trimmed);
    if (unordered) {
      flushParagraph();
      const items = [unordered[1].trim()];
      while (i + 1 < lines.length) {
        const next = /^[-*]\s+(.+)$/.exec(lines[i + 1].trim());
        if (!next) break;
        items.push(next[1].trim());
        i += 1;
      }
      blocks.push({ type: 'unorderedList', items });
      continue;
    }

    const ordered = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    if (ordered) {
      flushParagraph();
      const items = [ordered[1].trim()];
      while (i + 1 < lines.length) {
        const next = /^\d+[.)]\s+(.+)$/.exec(lines[i + 1].trim());
        if (!next) break;
        items.push(next[1].trim());
        i += 1;
      }
      blocks.push({ type: 'orderedList', items });
      continue;
    }

    flushParagraph();
    blocks.push({ type: 'paragraph', text: trimmed });
  }

  flushParagraph();
  return blocks;
}

function renderBlock(block: Block, key: number) {
  if (block.type === 'heading') {
    const children = renderInline(block.text);
    if (block.level === 1) return <h1 key={key} style={styles.h1}>{children}</h1>;
    if (block.level === 2) return <h2 key={key} style={styles.h2}>{children}</h2>;
    return <h3 key={key} style={styles.h3}>{children}</h3>;
  }

  if (block.type === 'paragraph') {
    return <p key={key} style={styles.p}>{renderInline(block.text)}</p>;
  }

  if (block.type === 'quote') {
    return <blockquote key={key} style={styles.quote}>{renderInline(block.text)}</blockquote>;
  }

  if (block.type === 'unorderedList') {
    return (
      <ul key={key} style={styles.ul}>
        {block.items.map((item, index) => (
          <li key={index} style={styles.li}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }

  return (
    <ol key={key} style={styles.ol}>
      {block.items.map((item, index) => (
        <li key={index} style={styles.li}>{renderInline(item)}</li>
      ))}
    </ol>
  );
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = nodes.length;

    if (token.startsWith('**')) {
      nodes.push(<strong key={key} style={styles.strong}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key} style={styles.em}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('`')) {
      nodes.push(<code key={key} style={styles.code}>{token.slice(1, -1)}</code>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link && isSafeUrl(link[2])) {
        nodes.push(
          <a key={key} href={link[2]} target="_blank" rel="noreferrer" style={styles.link}>
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function isSafeUrl(url: string): boolean {
  return /^(https?:|mailto:)/i.test(url);
}

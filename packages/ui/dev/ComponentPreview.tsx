import React from 'react';
import {
  Badge,
  Button,
  Card,
  PillTab,
  PillTabGroup,
  SearchPill,
  SegmentedTab,
  SegmentedTabGroup,
  TextInput,
  type ButtonVariant,
  type CardVariant,
  type BadgeVariant,
} from '../src/components';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ marginBottom: 48 }}>
    <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, marginBottom: 16, color: '#1a1a1a', borderBottom: '1px solid #e5e3df', paddingBottom: 8 }}>
      {title}
    </h2>
    {children}
  </section>
);

const buttonVariants: ButtonVariant[] = ['primary', 'dark', 'secondary', 'on-dark', 'secondary-on-dark', 'ghost', 'link'];
const cardVariants: CardVariant[] = ['base', 'feature', 'feature-peach', 'feature-rose', 'feature-mint', 'feature-lavender', 'feature-sky', 'feature-yellow', 'feature-yellow-bold', 'feature-cream', 'agent-tile', 'template', 'startup-perk', 'testimonial'];
const badgeFilled: BadgeVariant[] = ['purple', 'pink', 'orange', 'popular'];
const badgeTags: BadgeVariant[] = ['tag-purple', 'tag-orange', 'tag-green'];

export const ComponentPreview: React.FC = () => {
  const [pill, setPill] = React.useState('b');
  const [seg, setSeg] = React.useState('x');
  return (
    <div style={{ fontFamily: 'var(--font-sans)', maxWidth: 1100, margin: '0 auto', padding: '40px 32px', background: '#ffffff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#0a1530' }}>@unihub/ui — Components</h1>
      <p style={{ color: '#787671', marginBottom: 48, fontSize: 14 }}>Primitive matrix · every variant × state from <code>DESIGN.md</code></p>

      <Section title="Button">
        <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(3, 1fr)', gap: 12, alignItems: 'center' }}>
          <div />
          <div style={{ fontSize: 12, color: '#787671' }}>default</div>
          <div style={{ fontSize: 12, color: '#787671' }}>pressed (className)</div>
          <div style={{ fontSize: 12, color: '#787671' }}>disabled</div>
          {buttonVariants.map((v) => (
            <React.Fragment key={v}>
              <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>{v}</div>
              <div style={v.includes('on-dark') ? { background: '#0a1530', padding: 12, borderRadius: 8 } : undefined}>
                <Button variant={v}>Click</Button>
              </div>
              <div style={v.includes('on-dark') ? { background: '#0a1530', padding: 12, borderRadius: 8 } : undefined}>
                <Button variant={v} className="opacity-90">Pressed</Button>
              </div>
              <div style={v.includes('on-dark') ? { background: '#0a1530', padding: 12, borderRadius: 8 } : undefined}>
                <Button variant={v} disabled>Disabled</Button>
              </div>
            </React.Fragment>
          ))}
        </div>
      </Section>

      <Section title="Card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {cardVariants.map((v) => (
            <Card key={v} variant={v}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{v}</h3>
              <p style={{ fontSize: 13, color: '#5d5b54' }}>Body copy demonstrating the card surface for variant <code>{v}</code>.</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Inputs">
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: 260 }}>
            <div style={{ fontSize: 12, color: '#787671', marginBottom: 6 }}>TextInput default</div>
            <TextInput placeholder="you@example.com" />
          </div>
          <div style={{ width: 260 }}>
            <div style={{ fontSize: 12, color: '#787671', marginBottom: 6 }}>TextInput autofocus</div>
            <TextInput placeholder="focused on mount" autoFocus />
          </div>
          <div style={{ width: 260 }}>
            <div style={{ fontSize: 12, color: '#787671', marginBottom: 6 }}>SearchPill</div>
            <SearchPill placeholder="Search" />
          </div>
        </div>
      </Section>

      <Section title="Badge">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {badgeFilled.map((v) => (
              <Badge key={v} variant={v}>{v}</Badge>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {badgeTags.map((v) => (
              <Badge key={v} variant={v}>{v}</Badge>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Tabs">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: '#787671', marginBottom: 6 }}>PillTabGroup (active: B)</div>
            <PillTabGroup value={pill} onValueChange={setPill}>
              <PillTab value="a">A</PillTab>
              <PillTab value="b">B</PillTab>
              <PillTab value="c">C</PillTab>
            </PillTabGroup>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#787671', marginBottom: 6 }}>SegmentedTabGroup (active: x)</div>
            <SegmentedTabGroup value={seg} onValueChange={setSeg}>
              <SegmentedTab value="x">x</SegmentedTab>
              <SegmentedTab value="y">y</SegmentedTab>
              <SegmentedTab value="z">z</SegmentedTab>
            </SegmentedTabGroup>
          </div>
        </div>
      </Section>
    </div>
  );
};

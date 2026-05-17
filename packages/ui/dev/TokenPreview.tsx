import React from 'react';
import { tokens } from '../src/tokens/tokens';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ marginBottom: 48 }}>
    <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, marginBottom: 16, color: '#1a1a1a', borderBottom: '1px solid #e5e3df', paddingBottom: 8 }}>
      {title}
    </h2>
    {children}
  </section>
);

export const TokenPreview: React.FC = () => {
  return (
    <div style={{ fontFamily: 'var(--font-sans)', maxWidth: 1100, margin: '0 auto', padding: '40px 32px', background: '#ffffff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#0a1530' }}>@unihub/ui — Design Tokens</h1>
      <p style={{ color: '#787671', marginBottom: 48, fontSize: 14 }}>Source of truth: <code>packages/ui/src/tokens/tokens.ts</code></p>

      <Section title="Colors">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {Object.entries(tokens.colors).map(([name, value]) => (
            <div key={name} style={{ border: '1px solid #e5e3df', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: value, height: 52, border: '1px solid rgba(0,0,0,0.06)' }} />
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', wordBreak: 'break-all' }}>{name}</div>
                <div style={{ fontSize: 11, color: '#787671', marginTop: 2 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(tokens.typography).map(([name, val]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '10px 0', borderBottom: '1px solid #e5e3df' }}>
              <div style={{ width: 160, flexShrink: 0, fontSize: 12, color: '#787671' }}>
                <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{name}</div>
                <div>{val.fontSize} / w{val.fontWeight}</div>
              </div>
              <div style={{
                fontSize: val.fontSize,
                fontWeight: parseInt(val.fontWeight),
                lineHeight: val.lineHeight,
                letterSpacing: val.letterSpacing !== '0' ? val.letterSpacing : undefined,
                color: '#1a1a1a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}>
                The quick brown fox
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Border Radius">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {Object.entries(tokens.rounded).map(([name, value]) => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 64, height: 64, background: '#5645d4', borderRadius: value }} />
              <div style={{ fontSize: 12, textAlign: 'center' }}>
                <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{name}</div>
                <div style={{ color: '#787671' }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(tokens.spacing).map(([name, value]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 120, fontSize: 12, flexShrink: 0 }}>
                <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{name}</span>
                <span style={{ color: '#787671', marginLeft: 8 }}>{value}</span>
              </div>
              <div style={{ height: 20, background: '#5645d4', width: value, flexShrink: 0, borderRadius: 4, maxWidth: '100%' }} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {Object.entries(tokens.elevation).map(([name, value]) => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 120,
                height: 80,
                background: '#ffffff',
                borderRadius: 12,
                boxShadow: value,
                border: '1px solid #e5e3df',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: '#787671',
              }}>
                {name}
              </div>
              <div style={{ fontSize: 11, color: '#a4a097', maxWidth: 120, textAlign: 'center', wordBreak: 'break-all' }}>{value}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

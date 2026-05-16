import React, { Suspense } from 'react';
import { Button, Badge } from '../src/components';
import {
  HeroBandDark,
  WorkspaceMockupCard,
  PricingCard,
  ComparisonTable,
  ComparisonRow,
  FaqAccordionItem,
  StatRow,
  TestimonialCard,
  LogoWallItem,
  CtaBannerLight,
  PromoBanner,
  FooterRegion,
  FooterLink,
} from '../src/layout';

const Section: React.FC<{ title: string; children: React.ReactNode; dark?: boolean }> = ({
  title,
  children,
  dark,
}) => (
  <section style={{ marginBottom: 64 }}>
    <h2
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 22,
        fontWeight: 600,
        marginBottom: 16,
        color: dark ? '#e5e3df' : '#1a1a1a',
        borderBottom: `1px solid ${dark ? '#2a3f5f' : '#e5e3df'}`,
        paddingBottom: 8,
      }}
    >
      {title}
    </h2>
    {children}
  </section>
);

// 1. HeroBandDark + WorkspaceMockupCard
const HeroSection: React.FC = () => (
  <Section title="HeroBandDark + WorkspaceMockupCard" dark>
    <HeroBandDark
      eyebrow={<Badge variant="purple">Beta</Badge>}
      headline="Meet the night shift."
      subtitle="The AI-powered workspace that never sleeps. Built for modern teams."
      primaryCta={<Button variant="primary">Get UniHub free</Button>}
      secondaryCta={<Button variant="secondary-on-dark">Request a demo</Button>}
    >
      <WorkspaceMockupCard style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>
        <div
          style={{
            height: 320,
            background: 'linear-gradient(135deg, #e0e7ff 0%, #f0fdf4 100%)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6366f1',
            fontSize: 14,
            fontFamily: 'var(--font-sans)',
          }}
        >
          Product mockup goes here
        </div>
      </WorkspaceMockupCard>
    </HeroBandDark>
  </Section>
);

// 2. PricingCard
const tiers = [
  { name: 'Free', price: '$0', desc: 'Get started at zero cost.', features: ['Up to 3 projects', '1 GB storage', 'Community support'], featured: false },
  { name: 'Plus', price: '$10/mo', desc: 'For individuals who ship fast.', features: ['Unlimited projects', '20 GB storage', 'Email support', 'AI summaries'], featured: false },
  { name: 'Business', price: '$25/mo', desc: 'For small teams with real needs.', features: ['Everything in Plus', 'Team workspaces', 'SSO', 'Priority support', 'Analytics'], featured: true },
  { name: 'Enterprise', price: 'Custom', desc: 'For large orgs at scale.', features: ['Unlimited seats', 'SLA guarantee', 'Dedicated CSM', 'Custom integrations', 'On-prem option'], featured: false },
];

const PricingSection: React.FC = () => (
  <Section title="PricingCard">
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {tiers.map((t) => (
        <PricingCard
          key={t.name}
          tierName={t.name}
          price={t.price}
          description={t.desc}
          featureList={t.features}
          featured={t.featured}
          popularBadge={t.featured ? <Badge variant="popular">Most Popular</Badge> : undefined}
          cta={<Button variant="primary" style={{ width: '100%' }}>Get {t.name}</Button>}
        />
      ))}
    </div>
  </Section>
);

// 3. ComparisonTable
const features = ['Storage', 'Projects', 'Seats', 'AI Summaries', 'SSO', 'SLA'];
const plans = ['Free', 'Plus', 'Business', 'Enterprise'];
const tableData: Record<string, string[]> = {
  Storage: ['1 GB', '20 GB', '100 GB', 'Unlimited'],
  Projects: ['3', 'Unlimited', 'Unlimited', 'Unlimited'],
  Seats: ['1', '1', '10', 'Unlimited'],
  'AI Summaries': ['—', '✓', '✓', '✓'],
  SSO: ['—', '—', '✓', '✓'],
  SLA: ['—', '—', '—', '✓'],
};

const ComparisonSection: React.FC = () => (
  <Section title="ComparisonTable">
    <div style={{ overflowX: 'auto' }}>
      <ComparisonTable style={{ minWidth: 600 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e5e3df' }}>
            <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#787671' }}>Feature</th>
            {plans.map((p) => (
              <th key={p} style={{ textAlign: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
            <ComparisonRow key={f}>
              <td style={{ padding: '10px 16px', fontWeight: 500 }}>{f}</td>
              {tableData[f].map((val, i) => (
                <td key={i} style={{ textAlign: 'center', padding: '10px 16px', color: val === '—' ? '#bbb' : undefined }}>{val}</td>
              ))}
            </ComparisonRow>
          ))}
        </tbody>
      </ComparisonTable>
    </div>
  </Section>
);

// 4. FaqAccordionItem
const faqs = [
  { q: 'How does billing work?', a: 'You are billed monthly or annually depending on your plan. Upgrade or downgrade at any time.' },
  { q: 'Can I invite my team?', a: 'Yes! Business and Enterprise plans include team seat management and SSO.' },
  { q: 'Is there a free trial?', a: 'All paid plans include a 14-day free trial with no credit card required.' },
];

const FaqSection: React.FC = () => (
  <Section title="FaqAccordionItem">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 680 }}>
      {faqs.map((faq, i) => (
        <FaqAccordionItem key={i} question={faq.q} defaultOpen={i === 0}>
          {faq.a}
        </FaqAccordionItem>
      ))}
    </div>
  </Section>
);

// 5. StatRow
const StatRowSection: React.FC = () => (
  <Section title="StatRow">
    <StatRow>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, textAlign: 'center', fontFamily: 'var(--font-sans)' }}>
        {[['10 000+', 'Active users'], ['99.9%', 'Uptime SLA'], ['4.9★', 'Average rating']].map(([val, label]) => (
          <div key={label}>
            <div style={{ fontSize: 40, fontWeight: 700, color: '#0a1530' }}>{val}</div>
            <div style={{ fontSize: 14, color: '#787671', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
    </StatRow>
  </Section>
);

// 6. TestimonialCard / LogoWallItem / CtaBannerLight / PromoBanner
const MiscSection: React.FC = () => (
  <>
    <Section title="TestimonialCard">
      <TestimonialCard style={{ maxWidth: 480 }}>
        <blockquote style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: '#1a1a1a', fontStyle: 'italic', margin: 0 }}>
          "UniHub transformed how our team manages semester projects. The AI summaries alone save us hours every week."
        </blockquote>
        <p style={{ marginTop: 12, fontSize: 13, color: '#787671', fontFamily: 'var(--font-sans)' }}>— Alex K., Product Lead at Acme Corp</p>
      </TestimonialCard>
    </Section>

    <Section title="LogoWallItem">
      <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'center', background: '#f9f9f8', borderRadius: 8 }}>
        {['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli'].map((name) => (
          <LogoWallItem key={name}>
            <div style={{ width: 80, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{name}</div>
          </LogoWallItem>
        ))}
      </div>
    </Section>

    <Section title="CtaBannerLight">
      <CtaBannerLight style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontFamily: 'var(--font-sans)' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0a1530' }}>Ready to get started?</div>
          <div style={{ fontSize: 14, color: '#787671', marginTop: 4 }}>Join thousands of teams already using UniHub.</div>
        </div>
        <Button variant="primary">Start for free</Button>
      </CtaBannerLight>
    </Section>

    <Section title="PromoBanner">
      <PromoBanner style={{ textAlign: 'center', borderRadius: 6 }}>
        🎉 Limited offer: 3 months free on the Business plan — <a href="#" style={{ textDecoration: 'underline', color: 'inherit' }}>Claim now</a>
      </PromoBanner>
    </Section>
  </>
);

// 7. FooterRegion
const FooterSection: React.FC = () => (
  <Section title="FooterRegion">
    <FooterRegion>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, fontFamily: 'var(--font-sans)' }}>
        {[
          { heading: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
          { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
          { heading: 'Resources', links: ['Docs', 'API Reference', 'Status', 'Community'] },
          { heading: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
        ].map(({ heading, links }) => (
          <div key={heading}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>{heading}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {links.map((link) => (
                <FooterLink key={link} href="#">{link}</FooterLink>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e5e3df', fontSize: 12, color: '#787671' }}>
        © 2026 UniHub, Inc. All rights reserved.
      </div>
    </FooterRegion>
  </Section>
);

export const LayoutPreview: React.FC = () => {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>Loading layout components…</div>}>
      <div style={{ fontFamily: 'var(--font-sans)', background: '#ffffff', minHeight: '100vh' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 32px' }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8, color: '#0a1530' }}>@unihub/ui — Layout</h1>
          <p style={{ color: '#787671', marginBottom: 48, fontSize: 14 }}>Composite layout components · validated against <code>DESIGN.md</code></p>
        </div>

        {/* Hero is full-width */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, marginBottom: 16, color: '#1a1a1a', borderBottom: '1px solid #e5e3df', paddingBottom: 8 }}>
              HeroBandDark + WorkspaceMockupCard
            </h2>
          </div>
          <HeroBandDark
            eyebrow={<Badge variant="purple">Beta</Badge>}
            headline="Meet the night shift."
            subtitle="The AI-powered workspace that never sleeps. Built for modern teams."
            primaryCta={<Button variant="primary">Get UniHub free</Button>}
            secondaryCta={<Button variant="secondary-on-dark">Request a demo</Button>}
          >
            <WorkspaceMockupCard style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>
              <div
                style={{
                  height: 320,
                  background: 'linear-gradient(135deg, #e0e7ff 0%, #f0fdf4 100%)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6366f1',
                  fontSize: 14,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Product mockup placeholder
              </div>
            </WorkspaceMockupCard>
          </HeroBandDark>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <PricingSection />
          <ComparisonSection />
          <FaqSection />
          <StatRowSection />
          <MiscSection />
          <FooterSection />
        </div>
      </div>
    </Suspense>
  );
};

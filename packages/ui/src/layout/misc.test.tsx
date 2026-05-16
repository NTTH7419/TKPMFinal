import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TestimonialCard } from './TestimonialCard/TestimonialCard';
import { LogoWallItem } from './LogoWallItem/LogoWallItem';
import { CtaBannerLight } from './CtaBannerLight/CtaBannerLight';
import { PromoBanner } from './PromoBanner/PromoBanner';

describe('TestimonialCard', () => {
  it('renders children', () => {
    render(<TestimonialCard><span data-testid="tc">quote</span></TestimonialCard>);
    expect(screen.getByTestId('tc')).toBeInTheDocument();
  });

  it('has bg-canvas and p-xxl classes', () => {
    const { container } = render(<TestimonialCard />);
    expect(container.firstChild).toHaveClass('bg-canvas');
    expect(container.firstChild).toHaveClass('p-xxl');
  });
});

describe('LogoWallItem', () => {
  it('renders children', () => {
    render(<LogoWallItem><span data-testid="logo">Acme</span></LogoWallItem>);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('has text-steel and p-lg classes', () => {
    const { container } = render(<LogoWallItem />);
    expect(container.firstChild).toHaveClass('text-steel');
    expect(container.firstChild).toHaveClass('p-lg');
  });
});

describe('CtaBannerLight', () => {
  it('renders children', () => {
    render(<CtaBannerLight><span data-testid="cta">Sign up</span></CtaBannerLight>);
    expect(screen.getByTestId('cta')).toBeInTheDocument();
  });

  it('has bg-surface and p-section classes', () => {
    const { container } = render(<CtaBannerLight />);
    expect(container.firstChild).toHaveClass('bg-surface');
    expect(container.firstChild).toHaveClass('p-section');
  });
});

describe('PromoBanner', () => {
  it('renders children', () => {
    render(<PromoBanner><span data-testid="promo">50% off</span></PromoBanner>);
    expect(screen.getByTestId('promo')).toBeInTheDocument();
  });

  it('has bg-surface and py-sm px-md classes', () => {
    const { container } = render(<PromoBanner />);
    expect(container.firstChild).toHaveClass('bg-surface');
    expect(container.firstChild).toHaveClass('py-sm');
    expect(container.firstChild).toHaveClass('px-md');
  });
});

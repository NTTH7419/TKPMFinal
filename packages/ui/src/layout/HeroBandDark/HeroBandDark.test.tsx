import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HeroBandDark } from './HeroBandDark';

describe('HeroBandDark', () => {
  it('renders headline', () => {
    render(<HeroBandDark headline="Hello World" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('has bg-brand-navy class', () => {
    const { container } = render(<HeroBandDark headline="Hi" />);
    expect(container.firstChild).toHaveClass('bg-brand-navy');
  });

  it('renders all slots in order', () => {
    render(
      <HeroBandDark
        eyebrow={<span data-testid="eyebrow">Beta</span>}
        headline="Title"
        subtitle="Sub"
        primaryCta={<button>CTA1</button>}
        secondaryCta={<button>CTA2</button>}
      >
        <div data-testid="child">content</div>
      </HeroBandDark>,
    );
    expect(screen.getByTestId('eyebrow')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Sub')).toBeInTheDocument();
    expect(screen.getByText('CTA1')).toBeInTheDocument();
    expect(screen.getByText('CTA2')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders default decoration when decoration prop omitted', () => {
    const { container } = render(<HeroBandDark headline="Hi" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders custom decoration when provided', () => {
    render(
      <HeroBandDark headline="Hi" decoration={<div data-testid="custom-deco" />} />,
    );
    expect(screen.getByTestId('custom-deco')).toBeInTheDocument();
  });
});

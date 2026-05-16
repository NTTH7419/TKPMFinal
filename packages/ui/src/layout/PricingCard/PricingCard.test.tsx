import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PricingCard } from './PricingCard';

const features = ['Feature A', 'Feature B'];

describe('PricingCard', () => {
  it('renders tier name and price', () => {
    render(<PricingCard tierName="Plus" price="$10/mo" featureList={features} />);
    expect(screen.getByText('Plus')).toBeInTheDocument();
    expect(screen.getByText('$10/mo')).toBeInTheDocument();
  });

  it('default has bg-canvas and border-hairline classes', () => {
    const { container } = render(
      <PricingCard tierName="Free" price="$0" featureList={features} />,
    );
    expect(container.firstChild).toHaveClass('bg-canvas');
    expect(container.firstChild).toHaveClass('border-hairline');
  });

  it('featured has bg-surface and border-primary classes', () => {
    const { container } = render(
      <PricingCard featured tierName="Business" price="$25" featureList={features} />,
    );
    expect(container.firstChild).toHaveClass('bg-surface');
    expect(container.firstChild).toHaveClass('border-primary');
  });

  it('renders popular badge when supplied', () => {
    render(
      <PricingCard
        tierName="Plus"
        price="$10"
        featureList={features}
        popularBadge={<span data-testid="badge">Popular</span>}
      />,
    );
    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });

  it('renders feature list items', () => {
    render(<PricingCard tierName="Plus" price="$10" featureList={features} />);
    expect(screen.getByText('Feature A')).toBeInTheDocument();
    expect(screen.getByText('Feature B')).toBeInTheDocument();
  });
});

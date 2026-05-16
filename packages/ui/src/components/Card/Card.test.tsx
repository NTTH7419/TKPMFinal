import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';
import { cardVariantClasses, type CardVariant } from './Card.types';

const allVariants = Object.keys(cardVariantClasses) as CardVariant[];

describe('Card', () => {
  it.each(allVariants)('renders variant=%s without error', (variant) => {
    render(
      <Card variant={variant}>
        <span>child-{variant}</span>
      </Card>,
    );
    expect(screen.getByText(`child-${variant}`)).toBeInTheDocument();
  });

  it('feature-peach uses --color-card-tint-peach background utility', () => {
    render(<Card variant="feature-peach" data-testid="c">x</Card>);
    expect(screen.getByTestId('c').className).toContain('bg-card-tint-peach');
    expect(screen.getByTestId('c').className).toContain('rounded-lg');
    expect(screen.getByTestId('c').className).toContain('p-xxl');
  });

  it('renders children inside the card surface', () => {
    render(<Card><span data-testid="inner">hi</span></Card>);
    expect(screen.getByTestId('inner').parentElement?.className).toContain('bg-canvas');
  });
});

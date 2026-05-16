import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatRow } from './StatRow';

describe('StatRow', () => {
  it('renders children', () => {
    render(<StatRow><span data-testid="stat">42</span></StatRow>);
    expect(screen.getByTestId('stat')).toBeInTheDocument();
  });

  it('has bg-surface and rounded-lg classes', () => {
    const { container } = render(<StatRow />);
    expect(container.firstChild).toHaveClass('bg-surface');
    expect(container.firstChild).toHaveClass('rounded-lg');
  });

  it('has p-section-sm class', () => {
    const { container } = render(<StatRow />);
    expect(container.firstChild).toHaveClass('p-section-sm');
  });
});

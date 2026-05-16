import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WorkspaceMockupCard } from './WorkspaceMockupCard';

describe('WorkspaceMockupCard', () => {
  it('renders children inside', () => {
    render(<WorkspaceMockupCard><span data-testid="child">content</span></WorkspaceMockupCard>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('has shadow-mockup and rounded-lg classes', () => {
    const { container } = render(<WorkspaceMockupCard />);
    expect(container.firstChild).toHaveClass('shadow-mockup');
    expect(container.firstChild).toHaveClass('rounded-lg');
  });

  it('has no padding by default', () => {
    const { container } = render(<WorkspaceMockupCard />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toMatch(/\bp-/);
  });

  it('accepts className override', () => {
    const { container } = render(<WorkspaceMockupCard className="extra-class" />);
    expect(container.firstChild).toHaveClass('extra-class');
  });
});

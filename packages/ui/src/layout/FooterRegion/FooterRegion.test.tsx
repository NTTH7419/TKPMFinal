import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FooterRegion } from './FooterRegion';
import { FooterLink } from './FooterLink';

describe('FooterRegion', () => {
  it('renders as a footer element', () => {
    render(<FooterRegion><p>content</p></FooterRegion>);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('has bg-canvas and border-t border-hairline classes', () => {
    const { container } = render(<FooterRegion />);
    expect(container.firstChild).toHaveClass('bg-canvas');
    expect(container.firstChild).toHaveClass('border-t');
    expect(container.firstChild).toHaveClass('border-hairline');
  });

  it('renders children', () => {
    render(<FooterRegion><span data-testid="col">Column</span></FooterRegion>);
    expect(screen.getByTestId('col')).toBeInTheDocument();
  });
});

describe('FooterLink', () => {
  it('renders as an anchor element with href', () => {
    render(<FooterLink href="/docs">Docs</FooterLink>);
    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/docs');
  });

  it('has text-steel class', () => {
    const { container } = render(<FooterLink href="/">Home</FooterLink>);
    expect(container.firstChild).toHaveClass('text-steel');
  });
});

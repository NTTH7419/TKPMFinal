import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('filled purple uses rounded-full and bg-primary', () => {
    render(<Badge variant="purple">New</Badge>);
    const node = screen.getByText('New');
    expect(node.className).toContain('rounded-full');
    expect(node.className).toContain('bg-primary');
    expect(node.className).toContain('text-on-primary');
  });

  it('tag-green uses rounded-sm with mint tint and green text', () => {
    render(<Badge variant="tag-green">Active</Badge>);
    const node = screen.getByText('Active');
    expect(node.className).toContain('rounded-sm');
    expect(node.className).toContain('bg-card-tint-mint');
    expect(node.className).toContain('text-brand-green');
  });

  it('popular variant renders with brand-yellow background', () => {
    render(<Badge variant="popular">Popular</Badge>);
    expect(screen.getByText('Popular').className).toContain('bg-brand-yellow');
  });
});

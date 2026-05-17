import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TextInput } from './TextInput';
import { SearchPill } from './SearchPill';

describe('TextInput', () => {
  it('renders with default border + focus-visible classes that swap to primary', () => {
    render(<TextInput placeholder="p" />);
    const node = screen.getByPlaceholderText('p');
    expect(node.className).toContain('border-hairline-strong');
    expect(node.className).toContain('focus-visible:border-primary');
    expect(node.className).toContain('focus-ring');
  });
});

describe('SearchPill', () => {
  it('renders with surface background and steel text utilities', () => {
    render(<SearchPill placeholder="Search" />);
    const node = screen.getByPlaceholderText('Search');
    expect(node.className).toContain('bg-surface');
    expect(node.className).toContain('text-steel');
  });
});

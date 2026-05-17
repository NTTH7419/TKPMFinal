import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';
import { buttonVariantClasses } from './Button.types';

describe('Button', () => {
  it('renders a <button> by default with primary variant tokens', () => {
    render(<Button>Click</Button>);
    const node = screen.getByRole('button', { name: 'Click' });
    expect(node.tagName).toBe('BUTTON');
    expect(node).toHaveAttribute('type', 'button');
    expect(node.className).toContain('bg-primary');
    expect(node.className).toContain('text-on-primary');
    expect(node.className).toContain('rounded-md');
    expect(node.className).toContain('focus-ring');
  });

  it.each(
    Object.keys(buttonVariantClasses) as Array<keyof typeof buttonVariantClasses>,
  )('renders variant=%s without throwing', (variant) => {
    render(<Button variant={variant}>v-{variant}</Button>);
    const node = screen.getByText(`v-${variant}`);
    expect(node).toBeInTheDocument();
  });

  it('does not invoke onClick when disabled and exposes aria-disabled', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        x
      </Button>,
    );
    const node = screen.getByRole('button', { name: 'x' });
    fireEvent.click(node);
    expect(onClick).not.toHaveBeenCalled();
    expect(node).toHaveAttribute('aria-disabled', 'true');
    expect(node.className).toContain('bg-hairline');
  });

  it('renders as <a> when href is provided', () => {
    render(
      <Button href="/foo" variant="secondary">
        Go
      </Button>,
    );
    const node = screen.getByRole('link', { name: 'Go' });
    expect(node.tagName).toBe('A');
    expect(node).toHaveAttribute('href', '/foo');
    expect(node.className).toContain('border-hairline-strong');
  });

  it('forwards refs to the underlying DOM node', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

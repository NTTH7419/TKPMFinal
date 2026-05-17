import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PillTab, PillTabGroup, SegmentedTab, SegmentedTabGroup } from './index';

describe('PillTabGroup + PillTab', () => {
  it('marks the active child as selected and gives roving tabIndex', () => {
    render(
      <PillTabGroup value="b">
        <PillTab value="a">A</PillTab>
        <PillTab value="b">B</PillTab>
      </PillTabGroup>,
    );
    const a = screen.getByRole('tab', { name: 'A' });
    const b = screen.getByRole('tab', { name: 'B' });
    expect(b).toHaveAttribute('aria-selected', 'true');
    expect(b).toHaveAttribute('tabIndex', '0');
    expect(a).toHaveAttribute('aria-selected', 'false');
    expect(a).toHaveAttribute('tabIndex', '-1');
  });

  it('invokes onValueChange when a child is clicked', () => {
    const fn = vi.fn();
    render(
      <PillTabGroup value="a" onValueChange={fn}>
        <PillTab value="a">A</PillTab>
        <PillTab value="b">B</PillTab>
      </PillTabGroup>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'B' }));
    expect(fn).toHaveBeenCalledWith('b');
  });

  it('arrow keys shift focus along the tablist', () => {
    const fn = vi.fn();
    render(
      <PillTabGroup value="a" onValueChange={fn}>
        <PillTab value="a">A</PillTab>
        <PillTab value="b">B</PillTab>
      </PillTabGroup>,
    );
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(fn).toHaveBeenCalledWith('b');
  });
});

describe('SegmentedTabGroup + SegmentedTab', () => {
  it('active segmented tab gets aria-current="page"', () => {
    render(
      <SegmentedTabGroup value="x">
        <SegmentedTab value="x">X</SegmentedTab>
        <SegmentedTab value="y">Y</SegmentedTab>
      </SegmentedTabGroup>,
    );
    const x = screen.getByRole('tab', { name: 'X' });
    expect(x).toHaveAttribute('aria-current', 'page');
    expect(x.className).toContain('border-ink');
  });
});

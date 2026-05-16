import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { FaqAccordionItem } from './FaqAccordionItem';

describe('FaqAccordionItem', () => {
  it('renders question and answer', () => {
    render(<FaqAccordionItem question="Q1">Answer text</FaqAccordionItem>);
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Answer text')).toBeInTheDocument();
  });

  it('has bg-canvas and p-xl classes', () => {
    const { container } = render(<FaqAccordionItem question="Q">A</FaqAccordionItem>);
    expect(container.firstChild).toHaveClass('bg-canvas');
    expect(container.firstChild).toHaveClass('p-xl');
  });

  it('is collapsed by default', () => {
    const { container } = render(<FaqAccordionItem question="Q">A</FaqAccordionItem>);
    const details = container.querySelector('details');
    expect(details).not.toHaveAttribute('open');
  });

  it('toggles open when summary is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<FaqAccordionItem question="Q">A</FaqAccordionItem>);
    const details = container.querySelector('details')!;
    const summary = container.querySelector('summary')!;
    expect(details.open).toBe(false);
    await user.click(summary);
    expect(details.open).toBe(true);
  });

  it('defaultOpen renders open', () => {
    const { container } = render(
      <FaqAccordionItem question="Q" defaultOpen>A</FaqAccordionItem>,
    );
    expect(container.querySelector('details')).toHaveAttribute('open');
  });
});

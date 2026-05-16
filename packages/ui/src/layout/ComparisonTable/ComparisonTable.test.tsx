import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ComparisonTable } from './ComparisonTable';
import { ComparisonRow } from './ComparisonRow';

describe('ComparisonTable', () => {
  it('renders as a table element', () => {
    render(
      <ComparisonTable>
        <tbody>
          <ComparisonRow>
            <td>Cell</td>
          </ComparisonRow>
        </tbody>
      </ComparisonTable>,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('has bg-canvas and border-hairline classes', () => {
    const { container } = render(<ComparisonTable><tbody /></ComparisonTable>);
    expect(container.firstChild).toHaveClass('bg-canvas');
    expect(container.firstChild).toHaveClass('border-hairline');
  });

  it('renders rows via getByRole', () => {
    render(
      <ComparisonTable>
        <tbody>
          <ComparisonRow><td>Row 1</td></ComparisonRow>
          <ComparisonRow><td>Row 2</td></ComparisonRow>
        </tbody>
      </ComparisonTable>,
    );
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('ComparisonRow has border-b class', () => {
    const { container } = render(
      <table><tbody><ComparisonRow><td>x</td></ComparisonRow></tbody></table>,
    );
    const row = container.querySelector('tr');
    expect(row).toHaveClass('border-b');
  });
});

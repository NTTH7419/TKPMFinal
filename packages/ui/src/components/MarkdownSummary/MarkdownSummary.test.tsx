import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownSummary } from './MarkdownSummary';

describe('MarkdownSummary', () => {
  it('renders common Gemini markdown as structured content', () => {
    render(
      <MarkdownSummary
        content={[
          '## Tổng quan',
          'Nội dung **quan trọng** và *ngắn gọn*.',
          '',
          '- Kỹ năng phỏng vấn',
          '- Chuẩn bị CV',
          '',
          '1. Đăng ký',
          '2. Nhận QR',
          '',
          '> Ghi chú cho sinh viên',
          '',
          'Xem thêm tại [UniHub](https://example.com) và `QR code`.',
        ].join('\n')}
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Tổng quan' })).toBeInTheDocument();
    expect(screen.getByText('quan trọng')).toHaveStyle({ fontWeight: '700' });
    expect(screen.getByText('ngắn gọn')).toHaveStyle({ fontStyle: 'italic' });
    expect(screen.getByText('Kỹ năng phỏng vấn')).toBeInTheDocument();
    expect(screen.getByText('Đăng ký')).toBeInTheDocument();
    expect(screen.getByText('Ghi chú cho sinh viên')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'UniHub' })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByText('QR code').tagName).toBe('CODE');
  });

  it('renders plain text paragraphs without injecting html', () => {
    render(<MarkdownSummary content={'Hello <script>alert(1)</script>\nPlain paragraph'} />);

    expect(screen.getByText('Hello <script>alert(1)</script>')).toBeInTheDocument();
    expect(screen.queryByText('alert(1)')).not.toBeInTheDocument();
    expect(screen.getByText('Plain paragraph')).toBeInTheDocument();
  });
});

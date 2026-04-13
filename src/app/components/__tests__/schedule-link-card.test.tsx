import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleLinkCard } from '../ScheduleLinkCard';

describe('ScheduleLinkCard', () => {
  const defaultProps = {
    id: 'link-1',
    name: '30分ミーティング',
    slug: 'tanaka-30min',
    duration: 30,
    participantCount: 3,
    createdAt: '2026-04-10T00:00:00Z',
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render link name and duration', () => {
    render(<ScheduleLinkCard {...defaultProps} />);
    expect(screen.getByText('30分ミーティング')).toBeInTheDocument();
    expect(screen.getByText('30分 / 参加者 3人')).toBeInTheDocument();
  });

  it('should render link URL', () => {
    render(<ScheduleLinkCard {...defaultProps} />);
    const input = screen.getByLabelText('リンクURL') as HTMLInputElement;
    expect(input.value).toContain('/schedule/tanaka-30min');
  });

  it('should copy URL on copy button click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ScheduleLinkCard {...defaultProps} />);
    fireEvent.click(screen.getByText('コピー'));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/schedule/tanaka-30min'));
    await waitFor(() => {
      expect(screen.getByText('コピー済み')).toBeInTheDocument();
    });
  });

  it('should show delete confirmation on delete click', () => {
    render(<ScheduleLinkCard {...defaultProps} />);
    fireEvent.click(screen.getByText('削除'));

    expect(screen.getByText('本当に削除しますか？')).toBeInTheDocument();
    expect(screen.getByText('削除する')).toBeInTheDocument();
    expect(screen.getByText('キャンセル')).toBeInTheDocument();
  });

  it('should call onDelete when confirmed', () => {
    render(<ScheduleLinkCard {...defaultProps} />);
    fireEvent.click(screen.getByText('削除'));
    fireEvent.click(screen.getByText('削除する'));

    expect(defaultProps.onDelete).toHaveBeenCalledWith('link-1');
  });

  it('should hide confirmation on cancel', () => {
    render(<ScheduleLinkCard {...defaultProps} />);
    fireEvent.click(screen.getByText('削除'));
    fireEvent.click(screen.getByText('キャンセル'));

    expect(screen.queryByText('本当に削除しますか？')).not.toBeInTheDocument();
  });

  it('should display creation date in Japanese format', () => {
    render(<ScheduleLinkCard {...defaultProps} />);
    expect(screen.getByText(/2026\/4\/10/)).toBeInTheDocument();
  });
});

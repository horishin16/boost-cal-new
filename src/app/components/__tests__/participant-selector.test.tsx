import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ParticipantSelector } from '../ParticipantSelector';

global.fetch = vi.fn();

describe('ParticipantSelector', () => {
  const defaultProps = {
    selectedInternalIds: [] as string[],
    selectedExternalEmails: [] as string[],
    onChangeInternal: vi.fn(),
    onChangeExternal: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
  });

  it('should render search input and external email input', () => {
    render(<ParticipantSelector {...defaultProps} />);
    expect(screen.getByPlaceholderText('名前またはメールで検索')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('guest@example.com')).toBeInTheDocument();
  });

  it('should search members on input', async () => {
    const members = [
      { id: 'u1', email: 'tanaka@boost.co.jp', name: '田中', linked: true },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: members }),
    });

    render(<ParticipantSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('名前またはメールで検索');
    fireEvent.change(input, { target: { value: '田中' } });

    await waitFor(() => {
      expect(screen.getByText('田中')).toBeInTheDocument();
      expect(screen.getByText('tanaka@boost.co.jp')).toBeInTheDocument();
      expect(screen.getByText('連携済み')).toBeInTheDocument();
    });
  });

  it('should add external email', () => {
    render(<ParticipantSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('guest@example.com');
    fireEvent.change(input, { target: { value: 'guest@gmail.com' } });
    fireEvent.click(screen.getByText('追加'));

    expect(defaultProps.onChangeExternal).toHaveBeenCalledWith(['guest@gmail.com']);
  });

  it('should show validation error for invalid email', () => {
    render(<ParticipantSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('guest@example.com');
    fireEvent.change(input, { target: { value: 'invalid-email' } });
    fireEvent.click(screen.getByText('追加'));

    expect(screen.getByText('正しいメールアドレスを入力してください')).toBeInTheDocument();
    expect(defaultProps.onChangeExternal).not.toHaveBeenCalled();
  });

  it('should show duplicate error', () => {
    render(
      <ParticipantSelector
        {...defaultProps}
        selectedExternalEmails={['guest@gmail.com']}
      />
    );

    const input = screen.getByPlaceholderText('guest@example.com');
    fireEvent.change(input, { target: { value: 'guest@gmail.com' } });
    fireEvent.click(screen.getByText('追加'));

    expect(screen.getByText('既に追加されています')).toBeInTheDocument();
  });

  it('should display external emails with invitation status', () => {
    render(
      <ParticipantSelector
        {...defaultProps}
        selectedExternalEmails={['guest@gmail.com']}
      />
    );

    expect(screen.getByText('guest@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('未招待')).toBeInTheDocument();
    expect(screen.getByText('連携依頼を送信')).toBeInTheDocument();
  });

  it('should remove external email on delete click', () => {
    render(
      <ParticipantSelector
        {...defaultProps}
        selectedExternalEmails={['guest@gmail.com']}
      />
    );

    fireEvent.click(screen.getByText('×'));
    expect(defaultProps.onChangeExternal).toHaveBeenCalledWith([]);
  });

  it('should send invitation and show status', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'inv-1', status: 'PENDING' } }),
    });

    render(
      <ParticipantSelector
        {...defaultProps}
        selectedExternalEmails={['guest@gmail.com']}
      />
    );

    fireEvent.click(screen.getByText('連携依頼を送信'));

    await waitFor(() => {
      expect(screen.getByText('招待送信済み')).toBeInTheDocument();
      expect(screen.getByText('再送信')).toBeInTheDocument();
    });
  });

  it('should show linked status for already linked email', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'ALREADY_LINKED', message: '既にカレンダー連携済みです' }),
    });

    render(
      <ParticipantSelector
        {...defaultProps}
        selectedExternalEmails={['guest@gmail.com']}
      />
    );

    fireEvent.click(screen.getByText('連携依頼を送信'));

    await waitFor(() => {
      expect(screen.getByText('連携済み')).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleLinkForm } from '../ScheduleLinkForm';

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('ScheduleLinkForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ available: true }),
    });
  });

  it('should render create mode by default', () => {
    render(<ScheduleLinkForm />);
    expect(screen.getByText('スケジュールリンク作成')).toBeInTheDocument();
    expect(screen.getByText('作成')).toBeInTheDocument();
  });

  it('should render edit mode when editId is provided', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            name: '既存リンク',
            description: '説明',
            slug: 'existing',
            duration: 30,
            settings: {
              allowedDurations: [30],
              meetingOptions: {
                allowOnline: true,
                allowInPersonOffice: false,
                allowInPersonVisit: false,
                bufferOnline: 0,
                bufferInPersonOffice: 0,
                bufferInPersonVisit: 60,
              },
            },
          },
        }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ available: true }),
      });

    render(<ScheduleLinkForm editId="link-1" />);

    await waitFor(() => {
      expect(screen.getByText('スケジュールリンク編集')).toBeInTheDocument();
    });
  });

  it('should show validation error for empty title', async () => {
    render(<ScheduleLinkForm />);
    fireEvent.click(screen.getByText('作成'));

    expect(screen.getByText('タイトルは必須です')).toBeInTheDocument();
  });

  it('should show error when no meeting mode selected', async () => {
    render(<ScheduleLinkForm />);

    // Fill title
    const nameInput = screen.getByLabelText(/タイトル/);
    fireEvent.change(nameInput, { target: { value: 'テスト' } });

    // Uncheck online (default is checked)
    const onlineCheckbox = screen.getByLabelText('オンライン');
    fireEvent.click(onlineCheckbox);

    fireEvent.click(screen.getByText('作成'));

    expect(screen.getByText('会議形式を1つ以上選択してください')).toBeInTheDocument();
  });

  it('should render slug preview', () => {
    render(<ScheduleLinkForm />);
    expect(screen.getByText('/schedule/')).toBeInTheDocument();
  });

  it('should show duration options', () => {
    render(<ScheduleLinkForm />);
    DURATION_OPTIONS.forEach((d) => {
      const matches = screen.getAllByText(`${d}分`);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show buffer time when visit mode is selected', () => {
    render(<ScheduleLinkForm />);

    // Enable visit mode
    const visitCheckbox = screen.getByLabelText('対面（訪問）');
    fireEvent.click(visitCheckbox);

    expect(screen.getByLabelText(/訪問先名称/)).toBeInTheDocument();
    expect(screen.getByLabelText(/訪問先住所/)).toBeInTheDocument();
  });
});

const DURATION_OPTIONS = [15, 30, 60, 90];

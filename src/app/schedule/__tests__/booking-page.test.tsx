import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleBookingContent } from '@/app/components/ScheduleBookingContent';

global.fetch = vi.fn();

const mockAvailabilityResponse = {
  availableSlots: [
    { start: '2026-04-14T09:00:00.000+09:00', end: '2026-04-14T09:30:00.000+09:00' },
    { start: '2026-04-14T10:00:00.000+09:00', end: '2026-04-14T10:30:00.000+09:00' },
    { start: '2026-04-14T10:00:00.000+09:00', end: '2026-04-14T10:30:00.000+09:00' },
  ],
  linkInfo: {
    name: '30分ミーティング',
    description: 'テスト説明',
    ownerName: '田中 太郎',
    allowedDurations: [30, 60],
    meetingOptions: {
      allowOnline: true,
      allowInPersonOffice: true,
      allowInPersonVisit: false,
    },
    visitLocation: null,
    timezone: 'Asia/Tokyo',
  },
};

describe('ScheduleBookingContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockAvailabilityResponse,
    });
  });

  it('should display link info after loading', async () => {
    render(<ScheduleBookingContent slug="test-slug" />);

    await waitFor(() => {
      expect(screen.getByText('30分ミーティング')).toBeInTheDocument();
      expect(screen.getByText('テスト説明')).toBeInTheDocument();
      expect(screen.getByText('田中 太郎')).toBeInTheDocument();
    });
  });

  it('should display calendar with day headers', async () => {
    render(<ScheduleBookingContent slug="test-slug" />);

    await waitFor(() => {
      const dayLabels = screen.getAllByText(/^[月火水木金土日]$/);
      expect(dayLabels.length).toBe(7);
    });
  });

  it('should show meeting mode selector', async () => {
    render(<ScheduleBookingContent slug="test-slug" />);

    await waitFor(() => {
      expect(screen.getByText('オンライン')).toBeInTheDocument();
      expect(screen.getByText('対面（社内）')).toBeInTheDocument();
    });
  });

  it('should show navigation with today button', async () => {
    render(<ScheduleBookingContent slug="test-slug" />);

    await waitFor(() => {
      expect(screen.getByText('今日')).toBeInTheDocument();
    });
  });

  it('should show available slots as clickable blocks', async () => {
    render(<ScheduleBookingContent slug="test-slug" />);

    await waitFor(() => {
      expect(screen.getByText('09:00 - 09:30')).toBeInTheDocument();
      expect(screen.getAllByText('10:00 - 10:30').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show booking form when slot is clicked', async () => {
    render(<ScheduleBookingContent slug="test-slug" />);

    await waitFor(() => {
      expect(screen.getByText('09:00 - 09:30')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('09:00 - 09:30'));

    expect(screen.getByLabelText(/お名前/)).toBeInTheDocument();
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
    expect(screen.getByText('予約を確定する')).toBeInTheDocument();
  });

  it('should show error when link is not found', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'not found', error: 'LINK_NOT_FOUND' }),
    });

    render(<ScheduleBookingContent slug="bad-slug" />);

    await waitFor(() => {
      expect(screen.getByText('このリンクは無効です')).toBeInTheDocument();
    });
  });

  it('should show completion screen after successful booking', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailabilityResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'booking-1',
            startTime: '2026-04-14T09:00:00.000+09:00',
            endTime: '2026-04-14T09:30:00.000+09:00',
            meetingUrl: 'https://meet.google.com/xxx',
            meetingMode: 'online',
            status: 'CONFIRMED',
          },
        }),
      });

    render(<ScheduleBookingContent slug="test-slug" />);

    await waitFor(() => {
      expect(screen.getByText('09:00 - 09:30')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('09:00 - 09:30'));

    fireEvent.change(screen.getByLabelText(/お名前/), { target: { value: '山本 太郎' } });
    fireEvent.change(screen.getByLabelText(/メールアドレス/), { target: { value: 'yamamoto@test.com' } });

    fireEvent.click(screen.getByText('予約を確定する'));

    await waitFor(() => {
      expect(screen.getByText('予約が確定しました')).toBeInTheDocument();
    });
  });
});

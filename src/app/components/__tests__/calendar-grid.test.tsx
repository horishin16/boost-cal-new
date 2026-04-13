import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarGrid } from '../CalendarGrid';

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ events: [] }),
});

describe('CalendarGrid', () => {
  const defaultProps = {
    weekdayTimeSlots: {},
    dateOverrides: {},
    excludeHolidays: true,
    onChangeWeekday: vi.fn(),
    onChangeDateOverrides: vi.fn(),
    onChangeExcludeHolidays: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ events: [] }),
    });
  });

  it('should render day headers with day labels', () => {
    render(<CalendarGrid {...defaultProps} />);
    const dayLabels = screen.getAllByText(/^[月火水木金土日]$/);
    expect(dayLabels.length).toBe(7);
  });

  it('should render time labels', () => {
    render(<CalendarGrid {...defaultProps} />);
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
    expect(screen.getByText('17:00')).toBeInTheDocument();
  });

  it('should render navigation with today button', () => {
    render(<CalendarGrid {...defaultProps} />);
    expect(screen.getByText('今日')).toBeInTheDocument();
  });

  it('should render legend', () => {
    render(<CalendarGrid {...defaultProps} />);
    expect(screen.getByText('対応可能')).toBeInTheDocument();
    expect(screen.getByText('予定あり')).toBeInTheDocument();
  });
});

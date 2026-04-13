import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExclusionRuleEditor } from '../ExclusionRuleEditor';

describe('ExclusionRuleEditor', () => {
  const defaultProps = {
    excludeHolidays: true,
    dateOverrides: {},
    onChangeExcludeHolidays: vi.fn(),
    onChangeDateOverrides: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render holiday exclusion tag', () => {
    render(<ExclusionRuleEditor {...defaultProps} />);
    expect(screen.getByText('日本の祝日')).toBeInTheDocument();
  });

  it('should remove holiday exclusion on click', () => {
    render(<ExclusionRuleEditor {...defaultProps} />);
    fireEvent.click(screen.getByText('×'));
    expect(defaultProps.onChangeExcludeHolidays).toHaveBeenCalledWith(false);
  });

  it('should show add button when holidays not excluded', () => {
    render(<ExclusionRuleEditor {...defaultProps} excludeHolidays={false} />);
    expect(screen.getByText('+ 日本の祝日を除外')).toBeInTheDocument();
  });

  it('should show exclusion dialog on click', () => {
    render(<ExclusionRuleEditor {...defaultProps} />);
    fireEvent.click(screen.getByText('除外日時を追加'));
    expect(screen.getByText('除外日時を追加', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('保存')).toBeInTheDocument();
    expect(screen.getByText('終日除外')).toBeInTheDocument();
  });

  it('should display existing exclusions', () => {
    render(
      <ExclusionRuleEditor
        {...defaultProps}
        dateOverrides={{
          '2026-04-15': [],
          '2026-04-16': [{ start: '18:00', end: '18:30' }],
        }}
      />
    );
    expect(screen.getByText(/2026-04-15/)).toBeInTheDocument();
    expect(screen.getByText(/終日/)).toBeInTheDocument();
    expect(screen.getByText(/18:00-18:30/)).toBeInTheDocument();
  });
});

'use client';

import { useState, useCallback } from 'react';

interface TimeSlot {
  start: string;
  end: string;
}

type WeekdayTimeSlots = Record<string, TimeSlot[]>;

interface WeekdayTimeSlotEditorProps {
  weekdayTimeSlots: WeekdayTimeSlots;
  onChange: (slots: WeekdayTimeSlots) => void;
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 36;
const TOTAL_HOURS = END_HOUR - START_HOUR;

function timeToY(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return ((h - START_HOUR) * 60 + m) / 60 * HOUR_HEIGHT;
}

function yToTime(y: number): string {
  const clampedY = Math.max(0, Math.min(y, TOTAL_HOURS * HOUR_HEIGHT));
  const totalMin = Math.round((clampedY / HOUR_HEIGHT) * 60 / 30) * 30;
  const hours = START_HOUR + Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function mergeSlots(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length === 0) return [];
  const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
  const merged: TimeSlot[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = sorted[i].end > last.end ? sorted[i].end : last.end;
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

/** Summary display for form sidebar */
export function WeekdayTimeSlotSummary({
  weekdayTimeSlots,
  onEdit,
}: {
  weekdayTimeSlots: WeekdayTimeSlots;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">曜日・時間帯</h3>
        <button
          type="button"
          onClick={onEdit}
          className="px-3 py-1 text-sm rounded-md border border-blue-400 text-blue-600 hover:bg-blue-50"
        >
          曜日・時間帯を変更
        </button>
      </div>
      <div className="flex gap-4">
        {DAY_LABELS.map((label, i) => {
          const slots = weekdayTimeSlots[i.toString()] ?? [];
          return (
            <div key={i} className="text-center">
              <div className={`text-xs font-medium ${i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-700'}`}>
                {label}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {slots.length > 0
                  ? slots.map((s) => `${s.start.slice(0, 5)}-${s.end.slice(0, 5)}`).join(', ')
                  : '-'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Full-screen modal editor */
export function WeekdayTimeSlotModal({
  weekdayTimeSlots,
  onChange,
  onClose,
}: WeekdayTimeSlotEditorProps & { onClose: () => void }) {
  const [draft, setDraft] = useState<WeekdayTimeSlots>({ ...weekdayTimeSlots });
  const [dragging, setDragging] = useState(false);
  const [dragDay, setDragDay] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragEndY, setDragEndY] = useState<number | null>(null);

  const handleMouseDown = (dayKey: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDragging(true);
    setDragDay(dayKey);
    setDragStartY(y);
    setDragEndY(y);
  };

  const handleMouseMove = (dayKey: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging && dayKey === dragDay) {
      const rect = e.currentTarget.getBoundingClientRect();
      setDragEndY(e.clientY - rect.top);
    }
  };

  const handleMouseUp = () => {
    if (dragging && dragDay !== null && dragStartY !== null && dragEndY !== null) {
      const startTime = yToTime(Math.min(dragStartY, dragEndY));
      const endTime = yToTime(Math.max(dragStartY, dragEndY) + HOUR_HEIGHT / 2);
      if (startTime < endTime) {
        const existing = draft[dragDay] ?? [];
        setDraft({
          ...draft,
          [dragDay]: mergeSlots([...existing, { start: startTime, end: endTime }]),
        });
      }
    }
    setDragging(false);
    setDragDay(null);
    setDragStartY(null);
    setDragEndY(null);
  };

  const clearDay = (dayKey: string) => {
    setDraft({ ...draft, [dayKey]: [] });
  };

  const handleComplete = () => {
    onChange(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">曜日・時間帯を選択</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
      </div>

      {/* Guide */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
        希望する時間帯をドラッグすると選択できます
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto px-6 py-4" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <div className="flex">
          {/* Time axis */}
          <div className="w-12 flex-shrink-0">
            <div className="h-10" />
            <div className="relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
              {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 text-right pr-2 text-xs text-gray-400 -translate-y-1/2"
                  style={{ top: i * HOUR_HEIGHT }}
                >
                  {String(START_HOUR + i).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Day columns */}
          {DAY_LABELS.map((label, dayIdx) => {
            const dayKey = dayIdx.toString();
            const slots = draft[dayKey] ?? [];
            const isWeekend = dayIdx === 0 || dayIdx === 6;

            return (
              <div key={dayIdx} className={`flex-1 ${dayIdx > 0 ? 'border-l border-gray-200' : ''}`}>
                {/* Day header */}
                <div className="h-10 flex flex-col items-center justify-center border-b border-gray-200">
                  <span className={`text-sm font-medium ${isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                    {label}
                  </span>
                </div>

                {/* Body */}
                <div
                  className={`relative select-none ${isWeekend ? 'bg-gray-50' : 'bg-white'}`}
                  style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                  onMouseDown={(e) => handleMouseDown(dayKey, e)}
                  onMouseMove={(e) => handleMouseMove(dayKey, e)}
                >
                  {/* Hour lines */}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div key={i} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: i * HOUR_HEIGHT }} />
                  ))}

                  {/* Existing slots */}
                  {slots.map((slot, i) => {
                    const top = timeToY(slot.start);
                    const height = timeToY(slot.end) - top;
                    if (height <= 0) return null;
                    return (
                      <div
                        key={`slot-${i}`}
                        className="absolute left-1 right-1 bg-blue-50 border border-dashed border-blue-400 rounded px-1 overflow-hidden cursor-pointer group"
                        style={{ top, height }}
                        onClick={(e) => { e.stopPropagation(); clearDay(dayKey); }}
                      >
                        <div className="text-[10px] leading-3 text-blue-600 mt-px truncate font-medium">
                          {slot.start} - {slot.end}
                        </div>
                        <div className="text-[9px] text-blue-400 truncate hidden group-hover:block">
                          クリックで解除
                        </div>
                      </div>
                    );
                  })}

                  {/* Drag preview */}
                  {dragging && dragDay === dayKey && dragStartY !== null && dragEndY !== null && (
                    <div
                      className="absolute left-1 right-1 bg-blue-100 opacity-60 border border-dashed border-blue-400 rounded z-20"
                      style={{
                        top: Math.min(dragStartY, dragEndY),
                        height: Math.abs(dragEndY - dragStartY),
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end px-6 py-4 border-t border-gray-200">
        <button
          onClick={handleComplete}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          完了
        </button>
      </div>
    </div>
  );
}

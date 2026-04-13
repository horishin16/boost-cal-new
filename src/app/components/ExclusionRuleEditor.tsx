'use client';

import { useState } from 'react';

interface TimeSlot {
  start: string;
  end: string;
}

type DateOverrides = Record<string, TimeSlot[]>;

interface ExclusionRuleEditorProps {
  excludeHolidays: boolean;
  dateOverrides: DateOverrides;
  onChangeExcludeHolidays: (value: boolean) => void;
  onChangeDateOverrides: (overrides: DateOverrides) => void;
}

export function ExclusionRuleEditor({
  excludeHolidays,
  dateOverrides,
  onChangeExcludeHolidays,
  onChangeDateOverrides,
}: ExclusionRuleEditorProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogDate, setDialogDate] = useState('');
  const [dialogStartTime, setDialogStartTime] = useState('18:00');
  const [dialogEndTime, setDialogEndTime] = useState('18:30');

  const handleSave = () => {
    if (!dialogDate) return;
    const existing = dateOverrides[dialogDate] ?? [];
    // Empty array means exclude the whole day; adding a slot means override times
    // For exclusion, we store empty array
    onChangeDateOverrides({
      ...dateOverrides,
      [dialogDate]: [],
    });
    setShowDialog(false);
    resetDialog();
  };

  const handleSaveWithTime = () => {
    if (!dialogDate || !dialogStartTime || !dialogEndTime) return;
    if (dialogStartTime >= dialogEndTime) return;
    // Store exclusion as date override with the specified time removed
    // For simplicity, store the exclusion time range
    const existing = dateOverrides[dialogDate] ?? [];
    onChangeDateOverrides({
      ...dateOverrides,
      [dialogDate]: [...existing, { start: dialogStartTime, end: dialogEndTime }],
    });
    setShowDialog(false);
    resetDialog();
  };

  const resetDialog = () => {
    setDialogDate('');
    setDialogStartTime('18:00');
    setDialogEndTime('18:30');
  };

  const removeOverride = (date: string) => {
    const next = { ...dateOverrides };
    delete next[date];
    onChangeDateOverrides(next);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">候補除外ルール</h3>

      {/* Holiday exclusion */}
      <div>
        <p className="text-xs text-gray-500 mb-2">候補から除外する祝日</p>
        <div className="flex items-center gap-2">
          {excludeHolidays ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
              日本の祝日
              <button
                type="button"
                onClick={() => onChangeExcludeHolidays(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onChangeExcludeHolidays(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + 日本の祝日を除外
            </button>
          )}
        </div>
      </div>

      {/* Date exclusions */}
      <div>
        <p className="text-xs text-gray-500 mb-2">候補から除外する日時</p>
        <button
          type="button"
          onClick={() => setShowDialog(true)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          除外日時を追加
        </button>

        <p className="mt-2 text-[11px] text-gray-400">
          カレンダーをドラッグすると候補から除外したい日時を追加できます
        </p>

        {/* Existing exclusions */}
        {Object.keys(dateOverrides).length > 0 && (
          <ul className="mt-3 space-y-1">
            {Object.entries(dateOverrides).map(([date, slots]) => (
              <li key={date} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                <span className="text-gray-700">
                  {date}
                  {slots.length === 0
                    ? ' （終日）'
                    : ` ${slots.map((s) => `${s.start}-${s.end}`).join(', ')}`}
                </span>
                <button
                  type="button"
                  onClick={() => removeOverride(date)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[400px] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">除外日時を追加</h3>
              <button
                onClick={() => { setShowDialog(false); resetDialog(); }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始日時</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dialogDate}
                  onChange={(e) => setDialogDate(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
                <input
                  type="time"
                  value={dialogStartTime}
                  onChange={(e) => setDialogStartTime(e.target.value)}
                  className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">終了日時</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dialogDate}
                  disabled
                  className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
                <input
                  type="time"
                  value={dialogEndTime}
                  onChange={(e) => setDialogEndTime(e.target.value)}
                  className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={handleSave}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                終日除外
              </button>
              <button
                type="button"
                onClick={handleSaveWithTime}
                disabled={!dialogDate || dialogStartTime >= dialogEndTime}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

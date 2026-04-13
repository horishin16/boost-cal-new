'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ParticipantSelector } from './ParticipantSelector';
import { CalendarGrid } from './CalendarGrid';
import { WeekdayTimeSlotSummary, WeekdayTimeSlotModal } from './WeekdayTimeSlotEditor';
import { ExclusionRuleEditor } from './ExclusionRuleEditor';

const DURATION_OPTIONS = [15, 30, 60, 90];
const MEETING_MODES = [
  { key: 'allowOnline', label: 'オンライン' },
  { key: 'allowInPersonOffice', label: '対面（社内）' },
  { key: 'allowInPersonVisit', label: '対面（訪問）' },
] as const;

interface TimeSlot {
  start: string;
  end: string;
}

interface FormData {
  name: string;
  description: string;
  slug: string;
  duration: number;
  allowedDurations: number[];
  allowOnline: boolean;
  allowInPersonOffice: boolean;
  allowInPersonVisit: boolean;
  bufferOnline: number;
  bufferInPersonOffice: number;
  bufferInPersonVisit: number;
  visitLocationName: string;
  visitLocationAddress: string;
  weekdayTimeSlots: Record<string, TimeSlot[]>;
  dateOverrides: Record<string, TimeSlot[]>;
  excludeHolidays: boolean;
  internalIds: string[];
  externalEmails: string[];
}

interface ScheduleLinkFormProps {
  editId?: string;
}

const defaultWeekdaySlots: Record<string, TimeSlot[]> = {
  '1': [{ start: '09:00', end: '17:00' }],
  '2': [{ start: '09:00', end: '17:00' }],
  '3': [{ start: '09:00', end: '17:00' }],
  '4': [{ start: '09:00', end: '17:00' }],
  '5': [{ start: '09:00', end: '17:00' }],
};

const defaultForm: FormData = {
  name: '',
  description: '',
  slug: '',
  duration: 30,
  allowedDurations: [30],
  allowOnline: true,
  allowInPersonOffice: false,
  allowInPersonVisit: false,
  bufferOnline: 0,
  bufferInPersonOffice: 0,
  bufferInPersonVisit: 60,
  visitLocationName: '',
  visitLocationAddress: '',
  weekdayTimeSlots: defaultWeekdaySlots,
  dateOverrides: {},
  excludeHolidays: true,
  internalIds: [],
  externalEmails: [],
};

export function ScheduleLinkForm({ editId }: ScheduleLinkFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [saving, setSaving] = useState(false);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load existing link for edit mode
  useEffect(() => {
    if (!editId) return;
    async function loadLink() {
      const res = await fetch(`/api/schedule-links/${editId}`);
      if (!res.ok) {
        router.replace('/dashboard');
        return;
      }
      const { data } = await res.json();
      setForm({
        name: data.name,
        description: data.description ?? '',
        slug: data.slug,
        duration: data.duration,
        allowedDurations: data.settings.allowedDurations ?? [data.duration],
        allowOnline: data.settings.meetingOptions?.allowOnline ?? true,
        allowInPersonOffice: data.settings.meetingOptions?.allowInPersonOffice ?? false,
        allowInPersonVisit: data.settings.meetingOptions?.allowInPersonVisit ?? false,
        bufferOnline: data.settings.meetingOptions?.bufferOnline ?? 0,
        bufferInPersonOffice: data.settings.meetingOptions?.bufferInPersonOffice ?? 0,
        bufferInPersonVisit: data.settings.meetingOptions?.bufferInPersonVisit ?? 60,
        visitLocationName: data.settings.visitLocationName ?? '',
        visitLocationAddress: data.settings.visitLocationAddress ?? '',
        weekdayTimeSlots: data.settings.weekdayTimeSlots ?? defaultWeekdaySlots,
        dateOverrides: data.settings.dateOverrides ?? {},
        excludeHolidays: data.settings.excludeHolidays ?? true,
        internalIds: data.settings.participants?.internalIds ?? [],
        externalEmails: data.settings.participants?.externalEmails ?? [],
      });
    }
    loadLink();
  }, [editId, router]);

  // Debounced slug check
  useEffect(() => {
    if (!form.slug) {
      setSlugStatus('idle');
      return;
    }

    const timer = setTimeout(async () => {
      setSlugStatus('checking');
      const params = new URLSearchParams({ slug: form.slug });
      if (editId) params.set('excludeId', editId);

      const res = await fetch(`/api/schedule-links/check-slug?${params}`);
      if (res.ok) {
        const { available } = await res.json();
        setSlugStatus(available ? 'available' : 'taken');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.slug, editId]);

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }, []);


  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'タイトルは必須です';
    if (form.name.length > 100) errs.name = 'タイトルは100文字以内で入力してください';
    if (form.description.length > 500) errs.description = '説明は500文字以内で入力してください';
    if (form.slug && !/^[a-z0-9-]*$/.test(form.slug)) errs.slug = '半角英小文字・数字・ハイフンのみ使用できます';
    if (form.slug && form.slug.length > 50) errs.slug = 'スラッグは50文字以内で入力してください';
    if (!form.allowOnline && !form.allowInPersonOffice && !form.allowInPersonVisit) {
      errs.meetingMode = '会議形式を1つ以上選択してください';
    }
    if (slugStatus === 'taken') errs.slug = 'このスラッグは既に使用されています';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        slug: form.slug || null,
        duration: form.duration,
        settings: {
          weekdayTimeSlots: form.weekdayTimeSlots,
          excludeHolidays: form.excludeHolidays,
          dateOverrides: form.dateOverrides,
          allowedDurations: form.allowedDurations,
          participants: { internalIds: form.internalIds, externalEmails: form.externalEmails },
          meetingOptions: {
            allowOnline: form.allowOnline,
            allowInPersonOffice: form.allowInPersonOffice,
            allowInPersonVisit: form.allowInPersonVisit,
            bufferOnline: form.bufferOnline,
            bufferInPersonOffice: form.bufferInPersonOffice,
            bufferInPersonVisit: form.bufferInPersonVisit,
          },
          visitLocationName: form.visitLocationName || undefined,
          visitLocationAddress: form.visitLocationAddress || undefined,
          timezone: 'Asia/Tokyo',
        },
      };

      const url = editId ? `/api/schedule-links/${editId}` : '/api/schedule-links';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.error === 'SLUG_CONFLICT') {
          setErrors({ slug: 'このスラッグは既に使用されています' });
        } else if (err.error === 'VALIDATION_ERROR') {
          setErrors({ general: err.message });
        }
        return;
      }

      const { data } = await res.json();
      if (data.url) {
        setSavedUrl(data.url);
      } else {
        router.push('/dashboard');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!savedUrl) return;
    await navigator.clipboard.writeText(savedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (savedUrl) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            {editId ? 'リンクを更新しました' : 'リンクを作成しました'}
          </h2>
          <div className="flex items-center gap-2 mt-4">
            <input
              readOnly
              value={savedUrl}
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              aria-label="作成されたURL"
            />
            <button
              onClick={handleCopyUrl}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {copied ? 'コピー済み' : 'コピー'}
            </button>
          </div>
          <a
            href="/dashboard"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700 text-sm"
          >
            ダッシュボードに戻る
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 p-6 max-w-[1400px] mx-auto">
      {/* Left: Form */}
      <form onSubmit={handleSubmit} className="w-[360px] flex-shrink-0 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">
        {editId ? 'スケジュールリンク編集' : 'スケジュールリンク作成'}
      </h1>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-700">{errors.general}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          placeholder="例: 30分ミーティング"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          説明
        </label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          placeholder="例: お気軽にご予約ください"
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
          カスタムスラッグ
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-gray-500">/schedule/</span>
          <input
            id="slug"
            value={form.slug}
            onChange={(e) => updateField('slug', e.target.value.toLowerCase())}
            className="block flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            placeholder="auto-generated"
          />
        </div>
        {slugStatus === 'checking' && (
          <p className="mt-1 text-sm text-gray-500">確認中...</p>
        )}
        {slugStatus === 'available' && (
          <p className="mt-1 text-sm text-green-600">利用可能です</p>
        )}
        {slugStatus === 'taken' && (
          <p className="mt-1 text-sm text-red-600">このスラッグは使用されています</p>
        )}
        {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          会議時間 <span className="text-red-500">*</span>
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                updateField('duration', d);
                updateField('allowedDurations', [d]);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                form.duration === d
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {d}分
            </button>
          ))}
        </div>
      </div>

      {/* Meeting Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          会議形式 <span className="text-red-500">*</span>
        </label>
        <div className="mt-2 space-y-2">
          {MEETING_MODES.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => updateField(key, e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
        {errors.meetingMode && <p className="mt-1 text-sm text-red-600">{errors.meetingMode}</p>}
      </div>

      {/* Buffer time for each mode */}
      {form.allowOnline && (
        <div>
          <label htmlFor="bufferOnline" className="block text-sm font-medium text-gray-700">
            バッファー時間（オンライン）
          </label>
          <select
            id="bufferOnline"
            value={form.bufferOnline}
            onChange={(e) => updateField('bufferOnline', Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          >
            <option value={0}>なし</option>
            <option value={15}>15分</option>
            <option value={30}>30分</option>
            <option value={60}>60分</option>
          </select>
        </div>
      )}

      {form.allowInPersonOffice && (
        <div>
          <label htmlFor="bufferInPersonOffice" className="block text-sm font-medium text-gray-700">
            バッファー時間（対面・社内）
          </label>
          <select
            id="bufferInPersonOffice"
            value={form.bufferInPersonOffice}
            onChange={(e) => updateField('bufferInPersonOffice', Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          >
            <option value={0}>なし</option>
            <option value={15}>15分</option>
            <option value={30}>30分</option>
            <option value={60}>60分</option>
          </select>
        </div>
      )}

      {form.allowInPersonVisit && (
        <>
          <div>
            <label htmlFor="bufferInPersonVisit" className="block text-sm font-medium text-gray-700">
              バッファー時間（対面・訪問）
            </label>
            <select
              id="bufferInPersonVisit"
              value={form.bufferInPersonVisit}
              onChange={(e) => updateField('bufferInPersonVisit', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              <option value={30}>30分</option>
              <option value={60}>60分</option>
              <option value={90}>90分</option>
              <option value={120}>120分</option>
            </select>
          </div>
          <div>
            <label htmlFor="visitLocationName" className="block text-sm font-medium text-gray-700">
              訪問先名称
            </label>
            <input
              id="visitLocationName"
              value={form.visitLocationName}
              onChange={(e) => updateField('visitLocationName', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="例: 株式会社〇〇 本社"
            />
          </div>
          <div>
            <label htmlFor="visitLocationAddress" className="block text-sm font-medium text-gray-700">
              訪問先住所
            </label>
            <input
              id="visitLocationAddress"
              value={form.visitLocationAddress}
              onChange={(e) => updateField('visitLocationAddress', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="例: 東京都渋谷区..."
            />
          </div>
        </>
      )}

      {/* Weekday time slots summary */}
      <WeekdayTimeSlotSummary
        weekdayTimeSlots={form.weekdayTimeSlots}
        onEdit={() => setShowTimeSlotModal(true)}
      />

      {/* Exclusion rules */}
      <ExclusionRuleEditor
        excludeHolidays={form.excludeHolidays}
        dateOverrides={form.dateOverrides}
        onChangeExcludeHolidays={(value) => updateField('excludeHolidays', value)}
        onChangeDateOverrides={(overrides) => updateField('dateOverrides', overrides)}
      />

      {/* Participants */}
      <ParticipantSelector
        selectedInternalIds={form.internalIds}
        selectedExternalEmails={form.externalEmails}
        onChangeInternal={(ids) => updateField('internalIds', ids)}
        onChangeExternal={(emails) => updateField('externalEmails', emails)}
      />

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : editId ? '更新' : '作成'}
        </button>
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          キャンセル
        </a>
      </div>
    </form>

      {/* Right: Calendar */}
      <div className="flex-1 min-w-0">
        <CalendarGrid
          weekdayTimeSlots={form.weekdayTimeSlots}
          dateOverrides={form.dateOverrides}
          excludeHolidays={form.excludeHolidays}
          onChangeWeekday={(slots) => updateField('weekdayTimeSlots', slots)}
          onChangeDateOverrides={(overrides) => updateField('dateOverrides', overrides)}
          onChangeExcludeHolidays={(value) => updateField('excludeHolidays', value)}
          participantIds={form.internalIds}
          duration={form.duration}
        />
      </div>

      {/* Weekday time slot modal */}
      {showTimeSlotModal && (
        <WeekdayTimeSlotModal
          weekdayTimeSlots={form.weekdayTimeSlots}
          onChange={(slots) => updateField('weekdayTimeSlots', slots)}
          onClose={() => setShowTimeSlotModal(false)}
        />
      )}
    </div>
  );
}

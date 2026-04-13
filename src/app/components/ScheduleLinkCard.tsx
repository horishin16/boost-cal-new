'use client';

import { useState } from 'react';

interface ScheduleLinkCardProps {
  id: string;
  name: string;
  slug: string;
  duration: number;
  participantCount: number;
  createdAt: string;
  onDelete: (id: string) => void;
}

export function ScheduleLinkCard({
  id,
  name,
  slug,
  duration,
  participantCount,
  createdAt,
  onDelete,
}: ScheduleLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const linkUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/schedule/${slug}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    onDelete(id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
          <p className="mt-1 text-sm text-gray-500">{duration}分 / 参加者 {participantCount}人</p>
          <p className="mt-1 text-xs text-gray-400">
            作成日: {new Date(createdAt).toLocaleDateString('ja-JP')}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          readOnly
          value={linkUrl}
          className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600"
          aria-label="リンクURL"
        />
        <button
          onClick={handleCopy}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {copied ? 'コピー済み' : 'コピー'}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <a
          href={`/schedule-links/${id}/edit`}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          編集
        </a>
        {showDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">本当に削除しますか？</span>
            <button
              onClick={handleDelete}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              削除する
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm text-red-500 hover:text-red-700"
          >
            削除
          </button>
        )}
      </div>
    </div>
  );
}

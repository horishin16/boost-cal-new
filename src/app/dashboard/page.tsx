'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScheduleLinkCard } from '@/app/components/ScheduleLinkCard';

interface ScheduleLinkItem {
  id: string;
  name: string;
  slug: string;
  duration: number;
  isActive: boolean;
  participantCount: number;
  createdAt: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  hasGoogleToken: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [links, setLinks] = useState<ScheduleLinkItem[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [userRes, linksRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/schedule-links'),
        ]);

        if (!userRes.ok) {
          router.replace('/login');
          return;
        }

        const userData = await userRes.json();
        setUser(userData);

        if (linksRes.ok) {
          const linksData = await linksRes.json();
          setLinks(linksData.data);
        }
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/schedule-links/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setLinks((prev) => prev.filter((link) => link.id !== id));
    }
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">BoostCal</h1>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-gray-600">{user.name}</span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {user && !user.hasGoogleToken && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              Google Calendar との連携が完了していません。ログインし直すと連携されます。
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">スケジュールリンク</h2>
          <a
            href="/schedule-links/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            新規作成
          </a>
        </div>

        {links.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">スケジュールリンクがありません</p>
            <a
              href="/schedule-links/new"
              className="mt-4 inline-block text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              最初のリンクを作成する
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {links.map((link) => (
              <ScheduleLinkCard
                key={link.id}
                {...link}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

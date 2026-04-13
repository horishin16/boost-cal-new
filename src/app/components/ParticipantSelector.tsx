'use client';

import { useState, useEffect, useCallback } from 'react';

interface Member {
  id: string;
  email: string;
  name: string;
  linked: boolean | 'external';
}

type InvitationStatus = 'none' | 'sending' | 'sent' | 'linked' | 'error';

interface ParticipantSelectorProps {
  selectedInternalIds: string[];
  selectedExternalEmails: string[];
  onChangeInternal: (ids: string[]) => void;
  onChangeExternal: (emails: string[]) => void;
}

export function ParticipantSelector({
  selectedInternalIds,
  selectedExternalEmails,
  onChangeInternal,
  onChangeExternal,
}: ParticipantSelectorProps) {
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [externalEmail, setExternalEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [invitationStatuses, setInvitationStatuses] = useState<Record<string, InvitationStatus>>({});
  const [memberCache, setMemberCache] = useState<Record<string, Member>>({});
  const [searched, setSearched] = useState(false);

  // Fetch member info for selected IDs not yet in cache
  useEffect(() => {
    const uncached = selectedInternalIds.filter((id) => !memberCache[id]);
    if (uncached.length === 0) return;

    async function fetchMemberInfo() {
      try {
        const res = await fetch('/api/team/members?pageSize=100');
        if (res.ok) {
          const { data } = await res.json();
          const newCache: Record<string, Member> = { ...memberCache };
          for (const m of data) { newCache[m.id] = m; }
          setMemberCache(newCache);
        }
      } catch { /* ignore */ }
    }
    fetchMemberInfo();
  }, [selectedInternalIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check linked status for external emails on mount
  useEffect(() => {
    if (selectedExternalEmails.length === 0) return;
    async function checkStatuses() {
      try {
        const res = await fetch('/api/team/members?pageSize=100');
        if (res.ok) {
          const { data } = await res.json();
          const newStatuses: Record<string, InvitationStatus> = { ...invitationStatuses };
          for (const email of selectedExternalEmails) {
            const found = data.find((m: Member) => m.email === email);
            if (found && found.linked) {
              newStatuses[email] = 'linked';
            } else if (!newStatuses[email]) {
              newStatuses[email] = 'none';
            }
          }
          setInvitationStatuses(newStatuses);
        }
      } catch { /* ignore */ }
    }
    checkStatuses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Search members with debounce
  useEffect(() => {
    if (!query || query.length < 1) {
      setMembers([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const res = await fetch(`/api/team/members?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const { data } = await res.json();
          setMembers(data);
          const newCache: Record<string, Member> = { ...memberCache };
          for (const m of data) { newCache[m.id] = m; }
          setMemberCache(newCache);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleInternal = useCallback(
    (id: string) => {
      if (selectedInternalIds.includes(id)) {
        onChangeInternal(selectedInternalIds.filter((i) => i !== id));
      } else {
        onChangeInternal([...selectedInternalIds, id]);
      }
    },
    [selectedInternalIds, onChangeInternal]
  );

  const addExternalEmail = useCallback(() => {
    const email = externalEmail.trim();
    setEmailError('');

    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('正しいメールアドレスを入力してください');
      return;
    }
    if (selectedExternalEmails.includes(email)) {
      setEmailError('既に追加されています');
      return;
    }

    onChangeExternal([...selectedExternalEmails, email]);
    setInvitationStatuses((prev) => ({ ...prev, [email]: 'none' }));
    setExternalEmail('');
  }, [externalEmail, selectedExternalEmails, onChangeExternal]);

  const removeExternal = useCallback(
    (email: string) => {
      onChangeExternal(selectedExternalEmails.filter((e) => e !== email));
      setInvitationStatuses((prev) => {
        const next = { ...prev };
        delete next[email];
        return next;
      });
    },
    [selectedExternalEmails, onChangeExternal]
  );

  const sendInvitation = useCallback(async (email: string) => {
    setInvitationStatuses((prev) => ({ ...prev, [email]: 'sending' }));
    try {
      const res = await fetch('/api/calendar-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setInvitationStatuses((prev) => ({ ...prev, [email]: 'sent' }));
      } else {
        const err = await res.json();
        if (err.error === 'ALREADY_LINKED') {
          setInvitationStatuses((prev) => ({ ...prev, [email]: 'linked' }));
        } else {
          setInvitationStatuses((prev) => ({ ...prev, [email]: 'error' }));
        }
      }
    } catch {
      setInvitationStatuses((prev) => ({ ...prev, [email]: 'error' }));
    }
  }, []);

  const getStatusLabel = (status: InvitationStatus) => {
    switch (status) {
      case 'sending': return { text: '送信中...', color: 'text-gray-500' };
      case 'sent': return { text: '招待送信済み', color: 'text-green-600' };
      case 'linked': return { text: '連携済み', color: 'text-blue-600' };
      case 'error': return { text: '送信失敗', color: 'text-red-500' };
      default: return { text: '未招待', color: 'text-gray-400' };
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">参加者</h3>

      {/* Internal member search */}
      <div>
        <label htmlFor="member-search" className="block text-xs text-gray-500 mb-1">
          社内メンバーを検索
        </label>
        <input
          id="member-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          placeholder="名前またはメールで検索"
        />

        {loading && <p className="mt-1 text-xs text-gray-500">検索中...</p>}

        {!loading && searched && members.length === 0 && (
          <p className="mt-2 text-xs text-gray-500">
            該当するメンバーが見つかりません。BoostCalにログイン済みのメンバーのみ表示されます。
          </p>
        )}

        {members.length > 0 && (
          <ul className="mt-2 border border-gray-200 rounded-md divide-y divide-gray-100 max-h-48 overflow-auto">
            {members.map((m) => (
              <li
                key={m.id}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer ${
                  selectedInternalIds.includes(m.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => toggleInternal(m.id)}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.linked === true && (
                    <span className="text-xs text-green-600">連携済み</span>
                  )}
                  {m.linked === 'external' && (
                    <span className="text-xs text-blue-600">外部連携済み</span>
                  )}
                  {!m.linked && (
                    <span className="text-xs text-gray-400">未連携</span>
                  )}
                  {selectedInternalIds.includes(m.id) && (
                    <span className="text-blue-600 font-bold">✓</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected internal members */}
      {selectedInternalIds.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">
            選択済み社内メンバー ({selectedInternalIds.length}人)
          </p>
          {selectedInternalIds.some((id) => !memberCache[id]) ? (
            <p className="text-xs text-gray-400">読み込み中...</p>
          ) : (
          <ul className="space-y-1">
            {selectedInternalIds.map((id) => {
              const m = memberCache[id];
              return (
                <li
                  key={id}
                  className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m?.name}</p>
                    {m?.email && <p className="text-xs text-gray-500">{m.email}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onChangeInternal(selectedInternalIds.filter((i) => i !== id))}
                    className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                  >
                    &times;
                  </button>
                </li>
              );
            })}
          </ul>
          )}
        </div>
      )}

      {/* External email input */}
      <div>
        <label htmlFor="external-email" className="block text-xs text-gray-500 mb-1">
          外部メールアドレスを追加
        </label>
        <div className="flex gap-2">
          <input
            id="external-email"
            type="email"
            value={externalEmail}
            onChange={(e) => { setExternalEmail(e.target.value); setEmailError(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addExternalEmail();
              }
            }}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            placeholder="guest@example.com"
          />
          <button
            type="button"
            onClick={addExternalEmail}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            追加
          </button>
        </div>
        {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
      </div>

      {/* Selected external emails */}
      {selectedExternalEmails.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">
            外部参加者 ({selectedExternalEmails.length}人)
          </p>
          <ul className="space-y-1">
            {selectedExternalEmails.map((email) => {
              const status = invitationStatuses[email] ?? 'none';
              const statusLabel = getStatusLabel(status);

              return (
                <li
                  key={email}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-gray-900">{email}</p>
                    <p className={`text-xs ${statusLabel.color}`}>{statusLabel.text}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(status === 'none' || status === 'error') && (
                      <button
                        type="button"
                        onClick={() => sendInvitation(email)}
                        className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        連携依頼を送信
                      </button>
                    )}
                    {status === 'sending' && (
                      <span className="text-xs text-gray-400">送信中...</span>
                    )}
                    {status === 'sent' && (
                      <button
                        type="button"
                        onClick={() => sendInvitation(email)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        再送信
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExternal(email)}
                      className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                    >
                      &times;
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

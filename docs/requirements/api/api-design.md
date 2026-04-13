# API設計書

> DB設計・要件定義書v2・IPO一覧から作成

## API一覧

| # | エンドポイント | メソッド | 機能 | 認証 | 対応テーブル |
|---|--------------|---------|------|------|------------|
| 1 | `/api/auth/me` | GET | 現在のユーザー取得 | 要 | users |
| 2 | `/api/auth/login` | GET | Google OAuth開始 | 不要 | - |
| 3 | `/api/auth/callback` | GET | OAuthコールバック | 不要 | users |
| 4 | `/api/auth/sync-tokens` | POST | Googleトークン同期 | 要 | users |
| 5 | `/api/auth/logout` | POST | ログアウト | 不要 | - |
| 6 | `/api/schedule-links` | GET | リンク一覧取得 | 要 | schedule_links |
| 7 | `/api/schedule-links` | POST | リンク新規作成 | 要 | schedule_links |
| 8 | `/api/schedule-links/:id` | GET | リンク詳細取得 | 要 | schedule_links |
| 9 | `/api/schedule-links/:id` | PUT | リンク更新 | 要 | schedule_links |
| 10 | `/api/schedule-links/:id` | DELETE | リンク削除 | 要 | schedule_links |
| 11 | `/api/schedule-links/check-slug` | GET | スラッグ重複チェック | 要 | schedule_links |
| 12 | `/api/schedule/:slug/availability` | GET | 公開リンク情報＋空き時間取得 | 不要 | schedule_links, users |
| 13 | `/api/schedule/:slug/book` | POST | 予約作成 | 不要 | bookings, booking_participants |
| 14 | `/api/team/members` | GET | メンバー一覧取得（GUEST含む） | 要 | users + Google Directory API |
| 15 | `/api/calendar/events` | GET | カレンダーイベント取得 | 要 | users + Google Calendar API |
| 16 | `/api/conference-rooms` | GET | 会議室一覧取得 | 要 | Google Workspace API |
| 17 | `/api/calendar-invitations` | POST | カレンダー連携招待送信 | 要 | calendar_invitations |
| 18 | `/api/calendar-invitations/:token/accept` | POST | 連携招待受諾 | 不要 | calendar_invitations, users |
| 19 | `/api/health` | GET | ヘルスチェック | 不要 | - |
| - | `/api/cron/reminders` | GET | リマインダーバッチ（cron） | 不要（cron秘密鍵で認証） | bookings, booking_participants, users |

## 認証・認可

| 項目 | 内容 |
|------|------|
| 認証方式 | Supabase Auth（Google OAuth 2.0 + PKCE） |
| セッション管理 | HttpOnly Cookie（sb-access-token, sb-refresh-token） |
| アクセストークン有効期限 | 1時間（自動リフレッシュ） |
| リフレッシュトークン有効期限 | 7日 |
| ドメイン制限 | ALLOWED_ORG_DOMAINS（boostconsulting.co.jp, boostcapital.co.jp）。GUESTロールはバイパス |
| 権限 | ADMIN: 全操作、MEMBER: 自分のリンクのCRUD、GUEST: カレンダー連携のみ |

## エラーレスポンス共通構造

```json
{
  "message": "エラーメッセージ（ユーザー向け）",
  "error": "ERROR_CODE",
  "details": []
}
```

- `details` は開発環境のみ返却（本番では除外）

## エンドポイント詳細

---

### 1. 現在のユーザー取得

- **Method**: GET
- **Path**: `/api/auth/me`
- **目的**: ログイン中のユーザー情報を取得
- **対応テーブル**: users

#### レスポンス（成功: 200）

```json
{
  "id": "uuid",
  "email": "tanaka@boostconsulting.co.jp",
  "name": "田中 翔太",
  "domain": "boostconsulting.co.jp",
  "role": "MEMBER",
  "hasGoogleToken": true
}
```

#### レスポンス（エラー）

| ステータス | 意味 | エラーコード |
|-----------|------|------------|
| 401 | 未認証 | UNAUTHORIZED |

---

### 2-5. 認証系（OAuth フロー）

- `GET /api/auth/login` — Supabase Auth経由でGoogle OAuth画面へリダイレクト
- `GET /api/auth/callback` — OAuthコールバック。セッションCookie設定後ダッシュボードへリダイレクト
- `POST /api/auth/sync-tokens` — Supabaseのプロバイダトークン（access_token/refresh_token）をusersテーブルに同期
- `POST /api/auth/logout` — セッションCookie削除

---

### 6. リンク一覧取得

- **Method**: GET
- **Path**: `/api/schedule-links`
- **目的**: ログインユーザーの全スケジュールリンクを取得
- **対応テーブル**: schedule_links

#### レスポンス（成功: 200）

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "30分ミーティング",
      "slug": "tanaka-30min",
      "duration": 30,
      "isActive": true,
      "participantCount": 3,
      "createdAt": "2026-04-09T10:00:00Z"
    }
  ]
}
```

---

### 7. リンク新規作成

- **Method**: POST
- **Path**: `/api/schedule-links`
- **目的**: 新しいスケジュールリンクを作成
- **対応テーブル**: schedule_links

#### リクエスト

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| name | string | Yes | リンク名（最大100文字） |
| description | string | No | 説明（最大500文字） |
| slug | string | No | カスタムスラッグ（最大50文字、英数字・ハイフン。未指定時はサーバー側でnanoid等により自動生成） |
| duration | number | Yes | デフォルト会議時間（分） |
| settings | object | Yes | 詳細設定（LinkSettings型） |

```json
{
  "name": "30分ミーティング",
  "slug": "tanaka-30min",
  "duration": 30,
  "settings": {
    "weekdayTimeSlots": {
      "0": [{"start": "09:00", "end": "18:00"}],
      "1": [{"start": "09:00", "end": "18:00"}]
    },
    "excludeHolidays": true,
    "dateOverrides": [],
    "allowedDurations": [30, 60],
    "participants": {
      "internalIds": ["uuid1", "uuid2"],
      "externalEmails": ["client@example.com"]
    },
    "meetingOptions": {
      "allowOnline": true,
      "allowInPersonOffice": true,
      "allowInPersonVisit": false,
      "bufferOnline": 0,
      "bufferInPersonOffice": 0,
      "bufferInPersonVisit": 60
    },
    "conferenceRoomId": "room-id",
    "timezone": "Asia/Tokyo"
  }
}
```

#### レスポンス（成功: 201）

```json
{
  "data": {
    "id": "uuid",
    "slug": "tanaka-30min",
    "url": "https://boostcal.app/schedule/tanaka-30min"
  }
}
```

#### レスポンス（エラー）

| ステータス | 意味 | エラーコード |
|-----------|------|------------|
| 400 | バリデーションエラー（タイトル未入力、形式未選択等） | VALIDATION_ERROR |
| 409 | スラッグ重複 | SLUG_CONFLICT |

---

### 8. リンク詳細取得

- **Method**: GET
- **Path**: `/api/schedule-links/:id`
- **目的**: リンクの全設定を取得（編集画面のロード用）
- **対応テーブル**: schedule_links

#### レスポンス（成功: 200）

```json
{
  "data": {
    "id": "uuid",
    "name": "30分ミーティング",
    "description": "お気軽にどうぞ",
    "slug": "tanaka-30min",
    "duration": 30,
    "isActive": true,
    "settings": { "...LinkSettings全体..." },
    "createdAt": "2026-04-09T10:00:00Z",
    "updatedAt": "2026-04-09T10:00:00Z"
  }
}
```

#### レスポンス（エラー）

| ステータス | 意味 | エラーコード |
|-----------|------|------------|
| 404 | リンクが存在しない or 自分のリンクでない | NOT_FOUND |

---

### 9. リンク更新

- **Method**: PUT
- **Path**: `/api/schedule-links/:id`
- **目的**: 既存リンクの設定を更新
- **対応テーブル**: schedule_links
- **リクエスト**: #7と同じ構造（全フィールドを送信）
- **レスポンス**: #8と同じ構造

---

### 10. リンク削除

- **Method**: DELETE
- **Path**: `/api/schedule-links/:id`
- **目的**: スケジュールリンクを削除
- **対応テーブル**: schedule_links

#### レスポンス（成功: 204）

No Content

---

### 11. スラッグ重複チェック

- **Method**: GET
- **Path**: `/api/schedule-links/check-slug?slug=tanaka-30min&excludeId=uuid`
- **目的**: カスタムスラッグの利用可否をリアルタイムチェック
- **対応テーブル**: schedule_links

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| slug | string | Yes | チェック対象のスラッグ |
| excludeId | string | No | 編集中のリンクID（自分自身を除外） |

#### レスポンス（成功: 200）

```json
{
  "available": true
}
```

---

### 12. 公開リンク情報＋空き時間取得

- **Method**: GET
- **Path**: `/api/schedule/:slug/availability`
- **目的**: ゲスト向け。リンク情報と、指定した会議形式のバッファーを加味した空き時間スロットを返す。P004の初期表示とモード切替時に使用
- **対応テーブル**: schedule_links, users + Google Calendar API

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| meetingMode | string | No | 会議形式（online/inPerson_office/inPerson_visit）。未指定時はデフォルトのバッファーで計算 |
| duration | number | No | 会議時間（分）。未指定時はリンクのデフォルト |
| startDate | string | No | 取得開始日（ISO形式）。デフォルト: 今日 |
| endDate | string | No | 取得終了日（ISO形式）。デフォルト: 2週間後 |

#### 空き時間計算ロジック（サーバー側）

```
1. settings.weekdayTimeSlots から曜日別のベーススロットを生成
2. settings.dateOverrides がある日 → オーバーライドの時間帯で上書き（空配列=その日を除外）
3. settings.excludeHolidays が true → 祝日（@holiday-jp）に該当する日を除外
   ※ ただし dateOverrides で明示的にスロットが設定された祝日は除外しない
4. 参加者のGoogleカレンダーからビジー時間を取得し、重なるスロットを除外
5. 過去のスロットを除外
6. meetingMode に対応するバッファー時間（bufferOnline/bufferInPersonOffice/bufferInPersonVisit）を
   各スロットの前後に適用し、他の予定と重なるスロットを除外
7. duration に合わないスロット（短すぎるもの）を除外
8. 重複スロットを除去して返却
```

#### レスポンス（成功: 200）

```json
{
  "availableSlots": [
    {"start": "2026-04-10T09:00:00+09:00", "end": "2026-04-10T09:30:00+09:00"},
    {"start": "2026-04-10T10:00:00+09:00", "end": "2026-04-10T10:30:00+09:00"}
  ],
  "linkInfo": {
    "name": "30分ミーティング",
    "description": "お気軽にどうぞ",
    "ownerName": "田中 翔太",
    "allowedDurations": [30, 60],
    "meetingOptions": {
      "allowOnline": true,
      "allowInPersonOffice": true,
      "allowInPersonVisit": false
    },
    "visitLocation": null,
    "timezone": "Asia/Tokyo"
  }
}
```

#### レスポンス（エラー）

| ステータス | 意味 | エラーコード |
|-----------|------|------------|
| 404 | リンクが存在しない or 無効化済み | LINK_NOT_FOUND |

---

### 13. 予約作成

- **Method**: POST
- **Path**: `/api/schedule/:slug/book`
- **目的**: ゲストがスロットを選択して予約を確定
- **対応テーブル**: bookings, booking_participants, schedule_links, users + Google Calendar API
- **eventTitle生成ルール**: `{リンク名} - {予約者名}` で自動生成（例: 「30分ミーティング - 山本 太郎」）

#### リクエスト

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| clientName | string | Yes | 予約者名 |
| clientEmail | string | Yes | 予約者メール |
| startTime | string | Yes | 開始時刻（ISO形式） |
| endTime | string | Yes | 終了時刻（ISO形式） |
| meetingMode | string | Yes | 会議形式（online/inPerson_office/inPerson_visit） |
| customMeetingUrl | string | No | カスタム会議URL（Zoom/Teams等） |
| notes | string | No | メモ |

```json
{
  "clientName": "山本 太郎",
  "clientEmail": "yamamoto@client.com",
  "startTime": "2026-04-10T10:00:00+09:00",
  "endTime": "2026-04-10T10:30:00+09:00",
  "meetingMode": "online",
  "notes": "プロジェクトの件でご相談"
}
```

#### レスポンス（成功: 201）

```json
{
  "data": {
    "id": "uuid",
    "startTime": "2026-04-10T10:00:00+09:00",
    "endTime": "2026-04-10T10:30:00+09:00",
    "meetingUrl": "https://meet.google.com/xxx-yyyy-zzz",
    "meetingMode": "online",
    "status": "CONFIRMED"
  }
}
```

#### レスポンス（エラー）

| ステータス | 意味 | エラーコード |
|-----------|------|------------|
| 400 | バリデーションエラー | VALIDATION_ERROR |
| 404 | リンクが存在しない or 無効 | LINK_NOT_FOUND |
| 409 | ダブルブッキング | DOUBLE_BOOKING |

---

### 15. メンバー一覧取得

- **Method**: GET
- **Path**: `/api/team/members`
- **目的**: 参加者選択用の組織メンバー一覧を検索・取得
- **対応テーブル**: users + Google Directory API

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| q | string | No | 名前/メール検索 |
| page | number | No | ページ番号（デフォルト: 1） |
| pageSize | number | No | 件数（デフォルト: 50、最大: 100） |

#### レスポンス（成功: 200）

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "sato@boostconsulting.co.jp",
      "name": "佐藤 恵子",
      "linked": true
    }
  ],
  "total": 120,
  "page": 1,
  "pageSize": 50
}
```

`linked` の値: `true`=Calendar連携済み（社内）、`false`=未連携（社内）、`"external"`=外部Gmail連携済み（GUEST）

**データソースの優先順位**:
1. Google Directory API（DWD経由）で組織メンバーを取得
2. usersテーブルからGUESTロール（カレンダー連携済み外部ユーザー）を検索に含める
3. 検索キーワードで名前・メールをフィルタ

---

### 16. カレンダーイベント取得

- **Method**: GET
- **Path**: `/api/calendar/events`
- **目的**: カレンダーグリッドに既存予定を表示するためのイベント取得
- **対応テーブル**: users + Google Calendar API

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| startDate | string | Yes | 取得開始日（ISO形式） |
| endDate | string | Yes | 取得終了日（ISO形式） |
| userIds | string | No | カンマ区切りのユーザーID（参加者のカレンダーも取得時） |

#### レスポンス（成功: 200）

```json
{
  "events": [
    {"start": "2026-04-10T09:00:00+09:00", "end": "2026-04-10T10:00:00+09:00", "userId": "uuid"}
  ],
  "busyByUser": {
    "uuid1": [{"start": "...", "end": "..."}],
    "uuid2": [{"start": "...", "end": "..."}]
  }
}
```

---

### 17. 会議室一覧取得

- **Method**: GET
- **Path**: `/api/conference-rooms`
- **目的**: 会議室選択ドロップダウン用
- **対応テーブル**: Google Workspace API

#### レスポンス（成功: 200）

```json
{
  "data": [
    {"id": "resource-id", "name": "会議室A（6F）", "capacity": 10}
  ]
}
```

---

### 18. カレンダー連携招待送信

- **Method**: POST
- **Path**: `/api/calendar-invitations`
- **目的**: 外部ユーザーにカレンダー連携を依頼するメールを送信
- **対応テーブル**: calendar_invitations

#### リクエスト

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| email | string | Yes | 招待先メールアドレス |

```json
{
  "email": "client@gmail.com"
}
```

#### レスポンス（成功: 201）

```json
{
  "data": {
    "id": "uuid",
    "email": "client@gmail.com",
    "status": "PENDING",
    "expiresAt": "2026-04-16T10:00:00Z"
  }
}
```

#### レスポンス（エラー）

| ステータス | 意味 | エラーコード |
|-----------|------|------------|
| 400 | メール形式不正 | VALIDATION_ERROR |
| 409 | 既に連携済みのユーザー | ALREADY_LINKED |

---

### 18. 連携招待受諾

- **Method**: POST
- **Path**: `/api/calendar-invitations/:token/accept`
- **目的**: 外部ユーザーが招待リンクからGoogleログインしてカレンダーアクセスを許可
- **対応テーブル**: calendar_invitations, users
- **フロントエンドページ**: `/invite/:token` — 招待メールのリンク先。Googleログインボタンを表示し、OAuthフロー完了後にこのAPIを呼び出す。完了後は「連携が完了しました」メッセージを表示

#### リクエスト

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| googleAccessToken | string | Yes | Google OAuthで取得したアクセストークン |
| googleRefreshToken | string | Yes | リフレッシュトークン |

#### レスポンス（成功: 200）

```json
{
  "data": {
    "userId": "uuid",
    "email": "client@gmail.com",
    "name": "山本 太郎",
    "status": "ACCEPTED"
  }
}
```

#### レスポンス（エラー）

| ステータス | 意味 | エラーコード |
|-----------|------|------------|
| 404 | 招待トークンが無効 | INVITATION_NOT_FOUND |
| 410 | 招待期限切れ | INVITATION_EXPIRED |

---

### 20. ヘルスチェック

- **Method**: GET
- **Path**: `/api/health`
- **目的**: サーバーステータス確認

#### レスポンス（成功: 200）

```json
{
  "status": "ok",
  "timestamp": "2026-04-09T10:00:00Z"
}
```

## バッチ処理

### リマインダーメール送信

- **トリガー**: 毎日 09:00 JST にcronジョブで実行
- **処理内容**: 翌日の確定済み予約（status=CONFIRMED）を検索し、参加者全員にリマインダーメールを送信
- **対応テーブル**: bookings (READ: status=CONFIRMED AND start_time が翌日), booking_participants (READ), users (READ: 参加者メール)
- **メール内容**: 会議タイトル、日時、会議URL/場所、参加者一覧
- **実装方式**: Vercel Cron Functions（vercel.json で定義）または外部のcronサービス

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## レート制限

| 対象 | ウィンドウ | 上限 |
|------|----------|------|
| 一般API (`/api/*`) | 15分 | 100リクエスト |
| 認証API (`/api/auth/*`) | 15分 | 10リクエスト |
| 予約API (`/api/schedule/*/book`) | 15分 | 5リクエスト |

# BoostCal アプリケーション仕様書

> 最終更新: 2026-04-08

## 1. 概要

### 1.1 目的
BoostCalは、Boost Consulting社内向けのスケジュール調整Webアプリケーション。社内メンバーと外部クライアント間の会議スケジュールを効率的に調整するためのURLベースのスケジューリングリンクを提供する。

### 1.2 対象ユーザー
- **社内ユーザー**: boostconsulting.co.jp / boostcapital.co.jp ドメインのメンバー
- **外部ゲスト**: スケジュールリンク経由で予約を行うクライアント

### 1.3 主要機能
1. Google OAuth認証（ドメイン制限）
2. スケジュールリンクの作成・管理
3. Google Calendar連携による空き時間自動計算
4. 個別・チームスケジューリング
5. 予約管理・メール通知
6. 会議室予約（Google Workspace連携）
7. オンライン/対面の会議モード選択
8. カスタム会議URL対応（Zoom/Teams等）

---

## 2. 技術スタック

### 2.1 フロントエンド
| 項目 | 技術 |
|------|------|
| フレームワーク | React 18 + TypeScript |
| ビルドツール | Vite |
| UIコンポーネント | Shadcn/ui (Radix UI + Tailwind CSS) |
| ルーティング | Wouter |
| 状態管理 | TanStack Query (React Query) |
| フォーム | React Hook Form + Zod |
| スタイリング | Tailwind CSS (カスタムトークン: boost-blue, boost-gray等) |
| ドラッグ&ドロップ | @dnd-kit |
| フォント | Noto Sans JP |

### 2.2 バックエンド
| 項目 | 技術 |
|------|------|
| ランタイム | Node.js + Express.js |
| 言語 | TypeScript (ES Modules) |
| API | RESTful |
| 認証 | Supabase Auth (Google OAuth 2.0 + PKCE) |
| セキュリティ | Helmet.js + Rate Limiting |
| デプロイ | Vercel (Serverless Functions) |

### 2.3 データベース
| 項目 | 技術 |
|------|------|
| DB | PostgreSQL (Supabase / Neon) |
| ORM | Drizzle ORM |
| マイグレーション | Drizzle Kit |

### 2.4 外部サービス
| サービス | 用途 |
|---------|------|
| Google Calendar API | カレンダー連携・空き時間取得・イベント作成 |
| Google Directory API | 組織メンバー一覧取得（DWD経由） |
| Google Meet | オンライン会議URL自動生成 |
| Supabase | 認証・データベース |
| Postmark | メール通知（ブランド化テンプレート） |

---

## 3. ディレクトリ構造

```
boost-cal/
├── client/                    # フロントエンド
│   └── src/
│       ├── components/        # UIコンポーネント
│       │   ├── ui/           # Shadcn基本コンポーネント
│       │   ├── ScheduleLinksManager.tsx    # リンク一覧・管理
│       │   ├── ScheduleComposerModal.tsx   # リンク新規作成
│       │   ├── EditLinkModal.tsx           # リンク編集モーダル
│       │   ├── DragDropCalendarGrid.tsx    # カレンダーグリッド
│       │   ├── DraggableTimeBlock.tsx      # タイムブロック
│       │   └── BookingCalendar.tsx         # ゲスト用予約カレンダー
│       ├── pages/             # ページコンポーネント
│       │   ├── dashboard.tsx  # ダッシュボード
│       │   ├── login.tsx      # ログイン
│       │   ├── auth-callback.tsx          # OAuthコールバック
│       │   ├── guest-auth-callback.tsx    # ゲスト認証コールバック
│       │   ├── ScheduleNewPage.tsx        # リンク新規作成ページ
│       │   ├── ScheduleEditPage.tsx       # リンク編集ページ
│       │   └── schedule/[slug].tsx        # 予約ページ
│       ├── lib/               # ユーティリティ
│       └── hooks/             # カスタムフック
├── server/                    # バックエンド
│   ├── app.ts                 # Expressアプリ設定
│   ├── routes.ts              # ルート登録
│   ├── routes-auth.ts         # 認証API
│   ├── routes-schedule-links.ts  # リンクCRUD
│   ├── routes-availability.ts    # 空き時間計算
│   ├── routes-bookings.ts        # 予約API
│   ├── routes-team.ts            # チーム管理
│   ├── routes-calendar.ts        # カレンダーAPI
│   ├── google-calendar.ts        # GCal連携サービス
│   ├── google-impersonation.ts   # DWD委任
│   ├── email-service.ts          # メール送信サービス
│   ├── email-template-service.ts # ブランド化メールテンプレート
│   ├── error-handler.ts          # 標準化エラーハンドリング
│   ├── logger.ts                 # ロガー
│   ├── storage.ts                # DB操作
│   └── auth-supabase.ts          # Supabase認証ミドルウェア
├── shared/                    # 共有
│   └── schema.ts              # DB スキーマ・型定義
├── api/                       # Vercel Functions
└── dist/                      # ビルド出力
```

---

## 4. データモデル

### 4.1 users（ユーザー）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | varchar (UUID) | 主キー |
| email | text | メールアドレス（ユニーク） |
| name | text | 表示名 |
| domain | text | ドメイン（boostconsulting.co.jp等） |
| googleId | text | Google ID（ユニーク） |
| googleCalendarId | text | カレンダーID |
| accessToken | text | Googleアクセストークン |
| refreshToken | text | Googleリフレッシュトークン |
| role | text | 権限（ADMIN/MEMBER/GUEST） |
| createdAt | timestamp | 作成日時 |
| updatedAt | timestamp | 更新日時 |

### 4.2 teams（チーム）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | varchar (UUID) | 主キー |
| name | text | チーム名 |
| description | text | 説明 |
| domain | text | ドメイン |
| ownerId | varchar | オーナーユーザーID（FK: users） |
| createdAt | timestamp | 作成日時 |

### 4.3 teamMembers（チームメンバー）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | varchar (UUID) | 主キー |
| teamId | varchar | チームID（FK: teams） |
| userId | varchar | ユーザーID（FK: users） |
| role | text | 権限（ADMIN/MEMBER） |
| createdAt | timestamp | 作成日時 |

### 4.4 scheduleLinks（スケジュールリンク）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | varchar (UUID) | 主キー |
| name | text | リンク名 |
| description | text | 説明 |
| slug | text | URLスラッグ（ユニーク） |
| type | text | タイプ（individual/team） |
| duration | integer | デフォルト会議時間（分） |
| ownerId | varchar | 作成者ID（FK: users） |
| teamId | varchar | チームID（FK: teams） |
| isActive | boolean | 有効フラグ |
| settings | json | 詳細設定（4.6参照） |
| createdAt | timestamp | 作成日時 |
| updatedAt | timestamp | 更新日時 |

### 4.5 bookings（予約）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | varchar (UUID) | 主キー |
| scheduleLinkId | varchar | リンクID（FK: scheduleLinks） |
| clientName | text | 予約者名 |
| clientEmail | text | 予約者メール |
| startTime | timestamp | 開始時刻 |
| endTime | timestamp | 終了時刻 |
| eventTitle | text | イベント名 |
| meetingUrl | text | 会議URL |
| status | text | ステータス（CONFIRMED/CANCELLED/PENDING） |
| notes | text | メモ |
| createdAt | timestamp | 作成日時 |
| updatedAt | timestamp | 更新日時 |

### 4.6 bookingParticipants（予約参加者）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | varchar (UUID) | 主キー |
| bookingId | varchar | 予約ID（FK: bookings） |
| userId | varchar | ユーザーID（FK: users） |
| createdAt | timestamp | 作成日時 |

### 4.7 settings（JSON構造）

```typescript
interface AvailabilitySettings {
  // === 対応可能時間帯 ===

  // 曜日別時間帯（推奨形式）
  // キー: "0"=月, "1"=火, "2"=水, "3"=木, "4"=金, "5"=土, "6"=日
  weekdayTimeSlots?: Record<string, { start: string; end: string }[]>;

  // 旧形式（自動マイグレーション対応）
  weekdays?: number[];                                    // [1,2,3,4,5] = 月〜金
  timeSlots?: { start: string; end: string }[];           // [{start:"09:00", end:"18:00"}]

  // 個別スロット（日付ベースのオーバーライド）
  individualSlots?: {
    date: string;      // "2026-01-01"
    start: string;     // "10:00"
    end: string;       // "11:00"
  }[];

  // === 会議時間 ===

  // 許可する会議時間（受信者が選択可能）
  allowedDurations?: number[];  // [15, 30, 60, 90]

  // === 参加者 ===

  participants?: {
    internalIds?: string[];      // 社内ユーザーID
    externalEmails?: string[];   // 外部メールアドレス
  };
  includeOwnerAsAttendee?: boolean;  // オーナーを参加者に含める

  // レガシーフォーマット（互換性維持）
  team?: { memberIds: string[] };
  externalGmail?: string;

  // === 会議オプション ===

  meetingOptions?: {
    allowOnline: boolean;              // オンライン会議を許可（デフォルト: true）
    allowInPerson: boolean;            // 対面会議を許可（デフォルト: false）
    defaultMode?: 'online' | 'inPerson';  // デフォルト会議モード
    autoGenerateOnlineUrl: boolean;    // Google Meet URL自動生成（デフォルト: true）
    onlineDetails?: {                  // カスタムオンライン会議設定
      platform?: string;              // プラットフォーム名（Zoom, Teams等）
      url?: string;                   // 固定会議URL
      instructions?: string;          // 参加方法の説明
    };
    locations?: MeetingLocation[];     // 対面会議の場所リスト
  };

  // === 会議室 ===

  enableConferenceRoom?: boolean;      // 会議室選択を有効にする
  conferenceRoomId?: string;           // 選択された会議室ID

  // === その他 ===

  calendarIds?: string[];              // 空き時間チェック対象カレンダーID
  timezone?: string;                   // タイムゾーン（デフォルト: Asia/Tokyo）
  description?: string;                // リンクの説明
}

interface MeetingLocation {
  id: string;
  label: string;         // 場所名
  address?: string;      // 住所
  mapUrl?: string;       // 地図URL
  notes?: string;        // 備考
}
```

---

## 5. 画面仕様

### 5.1 ログイン画面 (`/login`)
- Googleでログインボタン
- ドメイン制限あり（boostconsulting.co.jp / boostcapital.co.jp）
- Supabase Auth + PKCE フロー

### 5.2 認証コールバック (`/auth-callback`)
- Google OAuthコールバック処理
- プロバイダトークンのDB同期（`/api/auth/sync-tokens`呼び出し）
- ダッシュボードへリダイレクト

### 5.3 ダッシュボード (`/dashboard`)
- ヘッダー（ユーザー名・ログアウト）
- スケジュールリンク一覧
  - 各リンク: 名前、URL、参加者数、作成日
  - アクション: URLコピー、編集、削除
- Google Calendar連携ステータス表示

### 5.4 リンク新規作成ページ (`ScheduleNewPage`)
**入力項目:**
- タイトル・説明
- 参加者選択（社内メンバー/外部メール）
- 会議時間選択（15/30/60/90分、デフォルト60分）
- 対応可能時間帯設定（曜日別カレンダーグリッドモーダル）
- 会議オプション（オンライン/対面）
- 会議室選択（Google Workspace連携時）

**前提条件:**
- Google Calendar連携済みであること（未連携時は警告バナー表示、作成ボタン無効化）
- メンバー選択済みであること（未選択時はカレンダーでの候補時間追加を防止）

### 5.5 リンク編集ページ (`ScheduleEditPage`)
- 新規作成ページと同様の編集機能
- 既存設定のロード・更新

### 5.6 カレンダーグリッド（対応可能時間帯設定）
**コンポーネント構成:**
```
DragDropCalendarGrid
├── 週ヘッダー（日付表示）
├── 時間軸（左側）
├── busyLayers（Googleカレンダー予定・背景表示）
└── timeBlocks（対応可能時間ブロック）
    └── DraggableTimeBlock
```

**機能:**
- 週表示（月〜日）
- 週移動ナビゲーション
- 対応可能時間ブロック表示（青色）
- Googleカレンダーの既存予定を背景レイヤーで表示
- クリック/ドラッグで時間帯の追加・編集
- weekdayTimeSlotsをベースに、individualSlotsで日付単位のオーバーライド

**データフロー:**
```
weekdayTimeSlots（曜日別デフォルト）
    ↓
individualSlots（日付別オーバーライド）がある日 → individualSlotsを使用
individualSlotsがない日 → weekdayTimeSlotsにフォールバック
    ↓
DragDropCalendarGrid で表示
```

### 5.7 予約ページ (`/schedule/:slug`)
- ゲスト向け公開ページ（認証不要）
- カレンダーから日付選択
- 利用可能な時間枠の表示
- 会議時間の選択（allowedDurationsに基づく）
- 会議モード選択（オンライン/対面）
  - 対面時: 場所選択ドロップダウン
- カスタム会議URL入力（Zoom/Teams等）
- 予約フォーム入力（名前、メール、メモ）
- 確認・完了画面

---

## 6. API仕様

### 6.1 認証
| メソッド | エンドポイント | 認証 | 説明 |
|---------|---------------|------|------|
| GET | `/api/auth/me` | 要 | 現在のユーザー取得 |
| GET | `/api/auth/login` | 不要 | Supabase OAuth開始 |
| GET | `/api/auth/callback` | 不要 | OAuthコールバック |
| POST | `/api/auth/google/token` | 不要 | コード→トークン交換（MEMBER） |
| POST | `/api/auth/google/guest` | 不要 | コード→トークン交換（GUEST） |
| POST | `/api/auth/sync-tokens` | 要 | Googleプロバイダトークンをdb同期 |
| POST | `/api/auth/logout` | 不要 | ログアウト（Cookie削除） |

### 6.2 スケジュールリンク
| メソッド | エンドポイント | 認証 | 説明 |
|---------|---------------|------|------|
| GET | `/api/schedule-links` | 要 | 自分のリンク一覧取得 |
| GET | `/api/schedule-links/:id` | 要 | リンク詳細取得（オーナーのみ） |
| POST | `/api/schedule-links` | 要 | 新規作成 |
| PUT | `/api/schedule-links/:id` | 要 | 更新（オーナーのみ） |
| DELETE | `/api/schedule-links/:id` | 要 | 削除（オーナーのみ） |

### 6.3 空き時間
| メソッド | エンドポイント | 認証 | 説明 |
|---------|---------------|------|------|
| GET | `/api/schedule-links/:slug/availability` | 不要 | 公開空き時間取得 |
| GET | `/api/schedule-links/:slug/availability-preview` | 要 | 保存済み設定でプレビュー |
| POST | `/api/schedule-links/:slug/availability-preview` | 要 | カスタム設定でプレビュー |
| POST | `/api/schedule-links/availability-preview-draft` | 要 | 未保存設定でプレビュー |

**空き時間APIレスポンス:**
```typescript
{
  availableSlots: { start: string; end: string }[];
  slotsLocal?: { start: string; end: string }[];  // ローカルタイム表示
  busyBlocks: { start: string; end: string }[];
  busyByParticipant: Record<string, { start: string; end: string }[]>;
  usedCalendar: string;
  calendarUserEmail: string;
}
```

### 6.4 予約
| メソッド | エンドポイント | 認証 | 説明 |
|---------|---------------|------|------|
| GET | `/api/schedule/:slug` | 不要 | 公開リンク情報取得 |
| POST | `/api/schedule/:slug/book` | 不要 | 予約作成 |
| GET | `/api/bookings` | 要 | 自分のリンクの予約一覧 |

**予約作成リクエスト:**
```typescript
{
  clientName: string;
  clientEmail: string;
  startTime: string;       // ISO形式
  endTime: string;         // ISO形式
  eventTitle?: string;
  notes?: string;
  meetingMode?: 'online' | 'inPerson';
  meetingLocationId?: string;     // 対面時の場所ID
  conferenceRoomId?: string;      // 会議室ID
  customMeetingUrl?: string;      // カスタム会議URL（Zoom/Teams等）
}
```

### 6.5 カレンダー
| メソッド | エンドポイント | 認証 | 説明 |
|---------|---------------|------|------|
| GET | `/api/calendar/list` | 要 | ユーザーのカレンダー一覧 |
| GET | `/api/calendar/events` | 不要 | カレンダーイベント取得 |
| GET | `/api/conference-rooms` | 要 | 会議室一覧 |
| GET | `/api/conference-rooms/availability` | 要 | 会議室空き状況 |

### 6.6 チーム
| メソッド | エンドポイント | 認証 | 説明 |
|---------|---------------|------|------|
| GET | `/api/team/members` | 要 | メンバー一覧（検索・ページング対応） |
| POST | `/api/team/external-gmail/check` | 要 | 外部Gmailアクセス確認 |

**メンバー一覧クエリパラメータ:**
- `q`: 名前/メール検索
- `page`: ページ番号（デフォルト: 1）
- `pageSize`: 件数（デフォルト: 50、最大: 100）
- `bypassCache`: キャッシュバイパス（5分間キャッシュ）

**メンバーステータス:**
- `linked: true` - Google Calendar連携済み
- `linked: false` - 未連携
- `linked: 'external'` - 外部Gmailメンバー

### 6.7 ヘルスチェック
| メソッド | エンドポイント | 認証 | 説明 |
|---------|---------------|------|------|
| GET | `/api/health` | 不要 | サーバーステータス確認 |

---

## 7. 空き時間計算ロジック

### 7.1 計算フロー
```
1. 設定から対応可能時間帯を生成
   weekdayTimeSlots → 曜日別のベーススロット
   individualSlots → 日付単位のオーバーライド
   
2. 祝日を除外（@holiday-jp/holiday_jp）

3. 参加者のビジー時間を取得
   - オーナーのGoogleカレンダー
   - 社内メンバー（DWD経由）
   - 外部参加者（Google Calendar API）

4. ビジー時間と重なるスロットを除外

5. 過去のスロットを除外

6. 重複スロットの除去

7. 結果を返却
```

### 7.2 スロット粒度
- 15分または30分単位（会議時間に応じて自動調整）

### 7.3 参加者ビジーデータの取得方法
| 参加者タイプ | 取得方法 |
|-------------|---------|
| オーナー | 直接Google Calendar API |
| 社内メンバー | Domain-Wide Delegation（サービスアカウント委任） |
| 外部Gmail | Google Calendar APIアクセス（オーナー権限） |

---

## 8. 予約・Google Calendar連携

### 8.1 予約作成時の処理
1. 予約データをDBに保存
2. Google Calendarイベントを作成
   - 参加者（ゲスト、オーナー、チームメンバー、外部参加者）
   - Google Meet URL自動生成（`autoGenerateOnlineUrl`時）
   - 会議室予約（リソースカレンダー）
   - カスタム会議URL対応
3. 確認メールを全参加者に送信

### 8.2 会議モード
| モード | 説明 |
|--------|------|
| オンライン | Google Meet自動生成 or カスタムURL（Zoom/Teams等） |
| 対面 | 場所選択（住所、地図URL付き） |

### 8.3 会議室機能
- Google Workspaceの会議室リソースカレンダーと連携
- リンク作成時に会議室を選択
- 予約時に自動で会議室を予約
- 会議室の空き状況確認

---

## 9. メール通知

### 9.1 メールサービス
- **プロバイダ**: Postmark
- **フォールバック**: ブランド化HTMLテンプレート（Postmarkテンプレート未設定時）

### 9.2 送信メール
| テンプレート | トリガー | 件名 |
|-------------|---------|------|
| 会議予約確認 | 予約作成時 | `[新規予約] {会議名} {日時}` |
| 会議キャンセル | 予約キャンセル時 | `[予約キャンセル] {会議名} {日時}` |

### 9.3 メール内容
- Boost Consultingブランドデザイン（ロゴ・カラー）
- 会議タイトル、日時、所要時間
- 主催者・参加者名
- 会議URL（オンライン時）
- 場所情報（対面時: 場所名、住所、地図URL）
- メモ
- ICSカレンダーファイル添付

### 9.4 メール設定（環境変数）
| 変数 | 説明 |
|------|------|
| `POSTMARK_TOKEN` | Postmark APIトークン |
| `MAIL_FROM` | 送信元メールアドレス |
| `USE_EMAIL_TEMPLATES` | Postmarkテンプレート使用フラグ |
| `EMAIL_ASSET_BASE_URL` | メールアセットのベースURL |
| `EMAIL_BRAND_LOGOS` | ブランドロゴ設定（パイプ区切り） |

---

## 10. 認証・セキュリティ

### 10.1 認証フロー
1. ユーザーが「Googleでログイン」をクリック
2. Supabase Auth → Google OAuth 2.0 + PKCE
3. コールバックでセッションCookie設定
4. プロバイダトークン（access_token/refresh_token）をDBに同期
5. 以降のAPIリクエストはCookieベースの認証

### 10.2 セッション管理
| Cookie | 有効期限 | 用途 |
|--------|---------|------|
| sb-access-token | 1時間 | アクセストークン |
| sb-refresh-token | 7日 | リフレッシュトークン |
| pkce-code-verifier | 10分 | PKCE検証用 |

属性: HttpOnly, SameSite=Lax, Secure（HTTPS時）

### 10.3 ドメイン制限
- 許可ドメイン: `ALLOWED_ORG_DOMAINS`（デフォルト: `boostconsulting.co.jp,boostcapital.co.jp`）
- GUESTロールはドメインチェックをバイパス

### 10.4 セキュリティヘッダー（Helmet.js）
- Content Security Policy（CSP）
- X-Content-Type-Options: nosniff
- X-Frame-Options
- Strict-Transport-Security

### 10.5 レート制限
| 対象 | ウィンドウ | 上限 |
|------|----------|------|
| 一般API (`/api/*`) | 15分 | 100リクエスト |
| 認証API (`/api/auth/*`) | 15分 | 10リクエスト |

### 10.6 CORS
- **開発環境**: 全オリジン許可（credentials付き）
- **本番環境**: `https://boostcal.app`, `https://www.boostcal.app` のみ許可

---

## 11. Google Workspace連携

### 11.1 Domain-Wide Delegation（DWD）
- サービスアカウントによるユーザー委任
- チームメンバーのカレンダーデータ取得（本人の同意なし）
- Directory APIによる組織メンバー一覧取得

### 11.2 チームメンバー取得優先順位
1. Google Directory API（DWD経由）
2. Supabaseに登録済みのユーザー（フォールバック）
3. 現在のユーザーのみ（最終フォールバック）
4. 外部Gmailメンバー（常に追加）

### 11.3 必要な環境変数
| 変数 | 説明 |
|------|------|
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |
| `GOOGLE_DWD_CLIENT_EMAIL` | サービスアカウントメール |
| `GOOGLE_DWD_PRIVATE_KEY` | サービスアカウント秘密鍵 |
| `GOOGLE_WORKSPACE_ADMIN_EMAIL` | Workspace管理者メール |

---

## 12. エラーハンドリング

### 12.1 標準化エラーレスポンス
```json
{
  "message": "エラーメッセージ",
  "error": "ERROR_CODE",
  "details": []
}
```
- `details`は開発環境のみ返却（本番環境ではセキュリティのため除外）

### 12.2 ErrorHandlerクラス
- `StandardError`: カスタムエラークラス（ステータスコード・エラーコード付き）
- `asyncHandler()`: 非同期ルートハンドラーのラッパー
- `middleware()`: Expressグローバルエラーミドルウェア
- Zod バリデーションエラーの自動変換

---

## 13. 環境変数一覧

### 必須
```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database
DATABASE_URL=
```

### オプション
```env
# Google DWD（チーム機能に必要）
GOOGLE_DWD_CLIENT_EMAIL=
GOOGLE_DWD_PRIVATE_KEY=
GOOGLE_WORKSPACE_ADMIN_EMAIL=

# メール通知
POSTMARK_TOKEN=
MAIL_FROM=
USE_EMAIL_TEMPLATES=false
EMAIL_ASSET_BASE_URL=https://boost-cal.vercel.app/email-assets
EMAIL_BRAND_LOGOS=

# ドメイン制限
ALLOWED_ORG_DOMAINS=boostconsulting.co.jp,boostcapital.co.jp

# アプリ設定
VITE_APP_URL=
SESSION_SECRET=
PORT=5000
HOST=localhost
NODE_ENV=development
SCHEDULER_DEBUG=0
```

---

## 14. 開発コマンド

```bash
# 開発サーバー起動（ポート5000）
npm run dev

# ポート5050で起動
npm run dev:5050

# 型チェック
npm run check

# リント
npm run lint
npm run lint:fix

# テスト
npm test              # ウォッチモード
npm run test:run      # 単発実行
npm run test:coverage # カバレッジ付き

# ビルド
npm run build         # フロントエンドのみ
npm run build:all     # フロントエンド + バックエンド

# DB
npm run db:push       # スキーマ反映

# デプロイ
vercel --prod
```

---

## 15. デプロイ

- **プラットフォーム**: Vercel
- **本番URL**: https://boost-cal.vercel.app（カスタムドメイン: boostcal.app）
- **構成**: 静的フロントエンド + Serverless API Functions
- **設定ファイル**: `vercel.json`（ルーティング・Functions設定）

---

## 16. テスト

### 16.1 テストフレームワーク
- **ユニットテスト**: Vitest
- **コンポーネントテスト**: React Testing Library
- **APIテスト**: Supertest
- **モック**: MSW (Mock Service Worker)

### 16.2 テストファイル規約
- テストファイル: `*.test.ts`, `*.test.tsx`
- 配置: `server/__tests__/`, コンポーネント隣接

### 16.3 主要テストシナリオ
1. **ログインフロー**: Google OAuth → トークン同期 → ダッシュボード表示
2. **リンク作成**: Google連携確認 → 設定入力 → 作成完了
3. **リンク編集**: 既存設定ロード → 変更 → 保存
4. **予約ページ**: ゲストアクセス → 空き時間表示 → 予約完了
5. **再ログイン**: ログアウト → 再ログイン → Google連携維持

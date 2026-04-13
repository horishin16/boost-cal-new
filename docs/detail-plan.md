# Sprint 1 実装計画

## 概要

このドキュメントは、BoostCal（予定調整アプリ）の Vertical Slice Architecture（VSA）に基づいた実装計画です。各スライスは Data Access → Business Logic → Presentation の順に TDD で実装し、早期の動作確認と段階的な進捗を実現します。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 14（App Router）、React、Tailwind CSS |
| バックエンド | Next.js API Routes、Server Actions |
| データベース | Supabase（PostgreSQL） |
| 認証 | Supabase Auth（Google OAuth 2.0 + PKCE） |
| デプロイ | Vercel + Supabase |

---

## 機能スライス一覧と実装順序

### Phase 1: 認証基盤（依存なし）

#### Slice 1: 認証・ログイン（P001）

- **概要**: Google OAuth + PKCE によるログイン機能。ドメイン制限（boostconsulting.co.jp / boostcapital.co.jp）で許可されたユーザーのみアクセス可能にする。ログイン済みユーザーの自動リダイレクト、Googleプロバイダトークンの同期を含む。
- **対象画面**: P001（ログイン画面）
- **関連テーブル**: users
- **関連API**: GET /api/auth/me, GET /api/auth/login, GET /api/auth/callback, POST /api/auth/sync-tokens, POST /api/auth/logout
- **依存**: なし

**実装手順**:

1. **Data Access Layer** (`domain/repositories/`)
   - `UserRepository`: ユーザーの CREATE/UPDATE（email, name, domain, google_id, access_token, refresh_token）
   - `UserRepository.findByEmail()`: メールアドレスでユーザー検索
   - `UserRepository.updateTokens()`: Googleトークンの更新

2. **Business Logic Layer** (`domain/services/`)
   - `AuthService.validateDomain()`: メールドメインが許可リストに含まれるか検証
   - `AuthService.syncProviderTokens()`: Supabase のプロバイダトークンを users テーブルに同期
   - `AuthService.getCurrentUser()`: セッションからユーザー情報を取得

3. **Presentation Layer** (`app/`)
   - `app/(routes)/login/page.tsx`: ログイン画面（ロゴ、Googleログインボタン、ドメイン案内）
   - `app/api/auth/callback/route.ts`: OAuthコールバック（セッションCookie設定、トークン同期）
   - `app/api/auth/me/route.ts`: 現在のユーザー情報取得
   - `app/api/auth/sync-tokens/route.ts`: トークン同期エンドポイント
   - `app/api/auth/logout/route.ts`: ログアウト
   - `app/lib/supabase/`: Supabase クライアント設定（server/client）
   - 認証ミドルウェア（middleware.ts）: 未認証ユーザーのリダイレクト

**TDD テスト対象**:

| レイヤー | テスト内容 |
|---------|-----------|
| Data Access | UserRepository の CRUD 操作（作成、検索、トークン更新） |
| Business Logic | ドメイン制限の検証（許可/非許可ドメイン）、トークン同期ロジック |
| Presentation | ログインボタンの表示、未認証時リダイレクト、ドメインエラー表示 |

**チェックリスト**:
- [ ] Supabase クライアント設定完了
- [ ] UserRepository 実装・テスト完了
- [ ] AuthService 実装・テスト完了
- [ ] ログイン画面 UI 完了
- [ ] OAuth コールバック実装完了
- [ ] 認証ミドルウェア実装完了
- [ ] 自動リダイレクト動作確認済み
- [ ] ドメイン制限動作確認済み

---

### Phase 2: コア機能（Phase 1に依存）

#### Slice 2: ダッシュボード・リンク一覧（P002）

- **概要**: ログイン後のホーム画面。スケジュールリンクの一覧表示、URLコピー、削除、Google Calendar 連携ステータス表示を実装する。
- **対象画面**: P002（ダッシュボード）
- **関連テーブル**: schedule_links, users
- **関連API**: GET /api/schedule-links, DELETE /api/schedule-links/:id, GET /api/auth/me
- **依存**: Slice 1（認証基盤）

**実装手順**:

1. **Data Access Layer** (`domain/repositories/`)
   - `ScheduleLinkRepository.findByOwnerId()`: オーナーのリンク一覧取得（名前、スラッグ、会議時間、参加者数、作成日）
   - `ScheduleLinkRepository.deleteById()`: リンク削除（owner_id の所有権チェック付き）

2. **Business Logic Layer** (`domain/services/`)
   - `ScheduleLinkService.getMyLinks()`: ログインユーザーのリンク一覧を取得
   - `ScheduleLinkService.deleteLink()`: 所有権チェック後にリンクを削除
   - `CalendarService.checkConnectionStatus()`: Google アクセストークンの有効性確認

3. **Presentation Layer** (`app/`)
   - `app/(routes)/dashboard/page.tsx`: ダッシュボード画面
   - `app/components/ScheduleLinkCard.tsx`: リンクカード（名前、URL、参加者数、作成日、操作ボタン）
   - `app/components/CalendarStatusBanner.tsx`: Calendar 連携ステータスバナー
   - `app/components/DeleteConfirmDialog.tsx`: 削除確認ダイアログ
   - `app/api/schedule-links/route.ts`: GET（一覧取得）
   - `app/api/schedule-links/[id]/route.ts`: DELETE（削除）
   - URLコピー機能（Clipboard API）、トースト通知

**TDD テスト対象**:

| レイヤー | テスト内容 |
|---------|-----------|
| Data Access | リンク一覧取得（owner_id フィルタ）、リンク削除 |
| Business Logic | 一覧取得ロジック、削除時の所有権チェック、Calendar 連携ステータス判定 |
| Presentation | リンクカード一覧表示、空状態表示、URLコピー、削除確認ダイアログ、ステータスバナー |

**チェックリスト**:
- [ ] ScheduleLinkRepository 実装・テスト完了
- [ ] ScheduleLinkService 実装・テスト完了
- [ ] ダッシュボード画面 UI 完了
- [ ] リンク一覧 API 実装完了
- [ ] リンク削除 API 実装完了
- [ ] URLコピー機能動作確認済み
- [ ] Calendar 連携ステータス表示動作確認済み
- [ ] ログアウト機能動作確認済み

---

#### Slice 3: スケジュールリンク作成・編集 基本フォーム（P003前半）

- **概要**: スケジュールリンクの基本情報を入力・保存するフォーム。タイトル・説明、カスタムスラッグ、会議時間、会議形式、バッファー時間、訪問先の設定と、リンクの保存・URL生成を実装する。
- **対象画面**: P003（予定調整作成画面 - 基本フォーム部分）
- **関連テーブル**: schedule_links
- **関連API**: POST /api/schedule-links, PUT /api/schedule-links/:id, GET /api/schedule-links/:id, GET /api/schedule-links/check-slug
- **依存**: Slice 2（ダッシュボードからの遷移）

**実装手順**:

1. **Data Access Layer** (`domain/repositories/`)
   - `ScheduleLinkRepository.create()`: リンク新規作成（name, description, slug, duration, owner_id, settings）
   - `ScheduleLinkRepository.update()`: リンク更新
   - `ScheduleLinkRepository.findById()`: リンク詳細取得（編集モード用）
   - `ScheduleLinkRepository.findBySlug()`: スラッグ重複チェック

2. **Business Logic Layer** (`domain/services/`)
   - `ScheduleLinkService.createLink()`: バリデーション（タイトル必須100文字以内、形式1つ以上選択）後にリンク作成。スラッグ未指定時は自動生成
   - `ScheduleLinkService.updateLink()`: 所有権チェック後にリンク更新
   - `ScheduleLinkService.getLink()`: リンク詳細取得（編集画面ロード）
   - `ScheduleLinkService.checkSlugAvailability()`: スラッグ利用可否チェック

3. **Presentation Layer** (`app/`)
   - `app/(routes)/schedule-links/new/page.tsx`: 新規作成画面
   - `app/(routes)/schedule-links/[id]/edit/page.tsx`: 編集画面
   - `app/components/ScheduleLinkForm.tsx`: 基本フォーム（タイトル、説明、スラッグ、会議時間、会議形式、バッファー、訪問先、保存ボタン）
   - `app/api/schedule-links/route.ts`: POST（新規作成）
   - `app/api/schedule-links/[id]/route.ts`: GET（詳細取得）、PUT（更新）
   - `app/api/schedule-links/check-slug/route.ts`: GET（スラッグチェック）
   - スラッグのリアルタイムバリデーション（デバウンス付き）
   - 保存後の URL 表示・コピー機能

4. **Schemas** (`schemas/`)
   - `scheduleLinkSchema`: Zod スキーマ（タイトル必須100文字以内、説明500文字以内、スラッグ50文字以内半角英数字ハイフン、settings の構造検証）

**TDD テスト対象**:

| レイヤー | テスト内容 |
|---------|-----------|
| Data Access | リンクの作成・更新・詳細取得・スラッグ検索 |
| Business Logic | バリデーション（タイトル必須、文字数制限、形式必須）、スラッグ自動生成、スラッグ重複チェック、所有権チェック |
| Presentation | フォーム入力・バリデーション表示、スラッグプレビュー、保存成功時のURL表示、編集モードの既存データロード |

**チェックリスト**:
- [ ] Zod スキーマ定義完了
- [ ] ScheduleLinkRepository CRUD 実装・テスト完了
- [ ] ScheduleLinkService 実装・テスト完了
- [ ] 基本フォーム UI 完了
- [ ] API エンドポイント（POST/PUT/GET）実装完了
- [ ] スラッグ重複チェック動作確認済み
- [ ] 保存後の URL 表示・コピー動作確認済み
- [ ] 編集モードの既存設定ロード動作確認済み

---

### Phase 3: 拡張機能（Phase 2に依存）

#### Slice 4: 参加者選択・カレンダー連携招待（P003中盤）

- **概要**: スケジュールリンク作成画面で、社内メンバーの検索・選択、外部メールアドレスの追加、外部参加者へのカレンダー連携招待メール送信を実装する。
- **対象画面**: P003（予定調整作成画面 - 参加者選択部分）
- **関連テーブル**: users, calendar_invitations
- **関連API**: GET /api/team/members, POST /api/calendar-invitations, POST /api/calendar-invitations/:token/accept
- **依存**: Slice 3（基本フォームに参加者選択を追加）

**実装手順**:

1. **Data Access Layer** (`domain/repositories/`)
   - `UserRepository.searchMembers()`: 名前/メールでの組織メンバー検索（ページネーション付き）
   - `UserRepository.findGuestByEmail()`: GUEST ロールのユーザー検索（連携済み確認）
   - `CalendarInvitationRepository.create()`: 連携招待の作成（token, email, inviter_id, expires_at）
   - `CalendarInvitationRepository.findByToken()`: トークンで招待を検索
   - `CalendarInvitationRepository.updateStatus()`: 招待ステータスの更新（ACCEPTED）

2. **Business Logic Layer** (`domain/services/`)
   - `TeamService.searchMembers()`: Google Directory API + users テーブルから統合検索
   - `CalendarInvitationService.sendInvitation()`: 招待リンク生成、メール送信
   - `CalendarInvitationService.acceptInvitation()`: トークン検証、期限チェック、GUEST ユーザー作成、トークン保存

3. **Presentation Layer** (`app/`)
   - `app/components/ParticipantSelector.tsx`: 参加者検索・選択 UI（検索フィールド、候補リスト、選択済みリスト、連携ステータス表示）
   - `app/components/InvitationButton.tsx`: 連携依頼ボタン（未連携外部参加者に表示）
   - `app/(routes)/invite/[token]/page.tsx`: カレンダー連携受諾ページ（Google ログインボタン、連携完了メッセージ）
   - `app/api/team/members/route.ts`: GET（メンバー検索）
   - `app/api/calendar-invitations/route.ts`: POST（招待送信）
   - `app/api/calendar-invitations/[token]/accept/route.ts`: POST（招待受諾）

**TDD テスト対象**:

| レイヤー | テスト内容 |
|---------|-----------|
| Data Access | メンバー検索（キーワードフィルタ、ページネーション）、招待の CRUD |
| Business Logic | メンバー検索の統合ロジック、招待リンク生成、期限チェック、既に連携済みのエラー |
| Presentation | 参加者検索 UI、候補選択、連携ステータス表示、連携受諾ページ |

**チェックリスト**:
- [ ] UserRepository 検索機能実装・テスト完了
- [ ] CalendarInvitationRepository 実装・テスト完了
- [ ] TeamService 実装・テスト完了
- [ ] CalendarInvitationService 実装・テスト完了
- [ ] 参加者選択 UI 完了
- [ ] カレンダー連携招待メール送信動作確認済み
- [ ] 連携受諾ページ動作確認済み
- [ ] 基本フォーム（Slice 3）との統合動作確認済み

---

#### Slice 5: 対応可能時間帯設定・空き時間計算（P003後半）

- **概要**: カレンダーグリッドでの対応可能時間帯設定（ドラッグ操作）、祝日除外、日付オーバーライド、参加者の Google Calendar から空き時間を自動計算して表示する機能を実装する。会議室選択も含む。
- **対象画面**: P003（予定調整作成画面 - 時間帯設定・空き時間計算部分）
- **関連テーブル**: schedule_links（settings）, users（トークン）
- **関連API**: GET /api/calendar/events, GET /api/conference-rooms
- **外部API**: Google Calendar API（イベント取得）、Google Workspace API（会議室リソース）
- **依存**: Slice 4（参加者情報が空き時間計算に必要）

**実装手順**:

1. **Data Access Layer** (`domain/repositories/`)
   - `UserRepository.getTokensByIds()`: 複数ユーザーの Google トークン一括取得

2. **Business Logic Layer** (`domain/services/`)
   - `CalendarService.getEvents()`: Google Calendar API からイベント取得（自分 + 参加者）
   - `CalendarService.calculateAvailability()`: 空き時間計算ロジック
     - weekdayTimeSlots からベーススロット生成
     - dateOverrides で上書き
     - excludeHolidays が true の場合、祝日を除外（@holiday-jp）
     - 参加者のビジー時間を除外
     - 過去のスロットを除外
   - `ConferenceRoomService.getRooms()`: Google Workspace API から会議室一覧取得

3. **Presentation Layer** (`app/`)
   - `app/components/CalendarGrid.tsx`: カレンダーグリッド（ドラッグで時間帯設定、空き/ビジー表示、祝日表示）
   - `app/components/HolidayExcludeToggle.tsx`: 祝日除外トグル
   - `app/components/DateOverrideEditor.tsx`: 日付オーバーライド設定 UI
   - `app/components/ConferenceRoomSelect.tsx`: 会議室選択ドロップダウン
   - `app/api/calendar/events/route.ts`: GET（カレンダーイベント取得）
   - `app/api/conference-rooms/route.ts`: GET（会議室一覧取得）

**TDD テスト対象**:

| レイヤー | テスト内容 |
|---------|-----------|
| Data Access | 複数ユーザーのトークン取得 |
| Business Logic | 空き時間計算（ベーススロット生成、祝日除外、ビジー除外、オーバーライド適用、過去除外）、会議室一覧取得 |
| Presentation | カレンダーグリッドの表示、ドラッグ操作、祝日トグル、オーバーライド設定、会議室選択 |

**チェックリスト**:
- [ ] CalendarService 空き時間計算ロジック実装・テスト完了
- [ ] カレンダーグリッド UI 完了
- [ ] ドラッグによる時間帯設定動作確認済み
- [ ] 祝日除外機能動作確認済み
- [ ] 日付オーバーライド機能動作確認済み
- [ ] 空き時間自動計算・表示動作確認済み
- [ ] 会議室選択動作確認済み
- [ ] Slice 3/4 との統合動作確認済み

---

#### Slice 6: 調整回答画面・予約（P004）

- **概要**: ゲストがスケジュールリンクの URL にアクセスし、空き時間スロットの確認・日付/時間選択・会議モード選択・予約情報入力・予約確定を行う画面。ダブルブッキングチェック、Google カレンダーイベント作成、確認メール送信を含む。
- **対象画面**: P004（調整回答画面）
- **関連テーブル**: schedule_links, bookings, booking_participants, users
- **関連API**: GET /api/schedule/:slug/availability, POST /api/schedule/:slug/book
- **外部API**: Google Calendar API（イベント作成、Google Meet URL 生成）
- **依存**: Slice 5（空き時間計算ロジックを再利用）

**実装手順**:

1. **Data Access Layer** (`domain/repositories/`)
   - `ScheduleLinkRepository.findActiveBySlug()`: スラッグでアクティブなリンクを取得
   - `BookingRepository.create()`: 予約作成（client_name, client_email, start_time, end_time, meeting_mode, meeting_url, notes など）
   - `BookingRepository.checkOverlap()`: 時間帯の重複チェック（ダブルブッキング検出）
   - `BookingParticipantRepository.createBulk()`: 参加者一括登録

2. **Business Logic Layer** (`domain/services/`)
   - `PublicScheduleService.getAvailability()`: 公開リンク情報 + 空き時間スロット取得（CalendarService.calculateAvailability を再利用し、バッファー時間・duration を加味）
   - `BookingService.createBooking()`: 予約確定処理
     - ダブルブッキングチェック（BookingRepository.checkOverlap）
     - bookings レコード作成
     - booking_participants レコード作成
     - Google カレンダーイベント作成（全参加者招待）
     - Google Meet URL 生成（カスタム URL 未指定時）
     - 会議室予約（対面・社内時）
     - 確認メール送信（全参加者）
   - `BookingService.generateEventTitle()`: イベントタイトル生成（`{リンク名} - {予約者名}`）

3. **Presentation Layer** (`app/`)
   - `app/(routes)/schedule/[slug]/page.tsx`: 調整回答画面（認証不要）
   - `app/components/AvailabilityCalendar.tsx`: カレンダービュー（月表示、空き日付ハイライト）
   - `app/components/TimeSlotList.tsx`: 利用可能スロット一覧
   - `app/components/MeetingModeSelector.tsx`: 会議モード選択（オンライン/対面・社内/対面・訪問）
   - `app/components/BookingForm.tsx`: 予約情報入力フォーム（名前、メール、メモ、カスタム会議URL）
   - `app/components/BookingComplete.tsx`: 予約完了画面
   - `app/components/GuestCalendarOverlay.tsx`: ゲストカレンダーオーバーレイ（任意連携時）
   - `app/api/schedule/[slug]/availability/route.ts`: GET（空き時間取得）
   - `app/api/schedule/[slug]/book/route.ts`: POST（予約作成）

4. **Schemas** (`schemas/`)
   - `bookingSchema`: Zod スキーマ（clientName 必須、clientEmail 必須メール形式、startTime/endTime ISO形式、meetingMode 列挙型）

**TDD テスト対象**:

| レイヤー | テスト内容 |
|---------|-----------|
| Data Access | スラッグでリンク取得、予約作成、ダブルブッキングチェック（重複あり/なし）、参加者一括登録 |
| Business Logic | 空き時間スロット計算（バッファー加味、duration フィルタ）、予約確定フロー（正常系/ダブルブッキング）、イベントタイトル生成 |
| Presentation | カレンダービュー表示、日付選択→スロット表示、会議モード切替→スロット再計算、予約フォームバリデーション、予約完了画面、無効リンクエラー表示 |

**チェックリスト**:
- [ ] BookingRepository 実装・テスト完了
- [ ] PublicScheduleService 実装・テスト完了
- [ ] BookingService 実装・テスト完了
- [ ] 調整回答画面 UI 完了
- [ ] 空き時間スロット表示動作確認済み
- [ ] 会議モード切替によるスロット再計算動作確認済み
- [ ] 予約確定フロー動作確認済み
- [ ] ダブルブッキングチェック動作確認済み
- [ ] Google カレンダーイベント作成動作確認済み
- [ ] 確認メール送信動作確認済み
- [ ] 無効リンクのエラー表示動作確認済み

---

### Phase 4: 付加機能（Phase 3に依存）

#### Slice 7: ゲストカレンダー連携・リマインダー

- **概要**: ゲスト側の任意カレンダー連携（自分の予定をオーバーレイ表示）と、予約前日のリマインダーメールバッチ処理を実装する。
- **対象画面**: P004（調整回答画面 - カレンダー連携部分）、バックエンド（バッチ処理）
- **関連テーブル**: bookings, booking_participants, users
- **関連API**: /api/cron/reminders
- **依存**: Slice 6（予約機能の完成が前提）

**実装手順**:

1. **Data Access Layer** (`domain/repositories/`)
   - `BookingRepository.findUpcomingConfirmed()`: 翌日の確定済み予約を検索（status=CONFIRMED AND start_time が翌日）
   - `BookingParticipantRepository.findByBookingIds()`: 予約IDから参加者一覧取得

2. **Business Logic Layer** (`domain/services/`)
   - `ReminderService.sendDailyReminders()`: リマインダーメール送信バッチ
     - 翌日の確定済み予約を検索
     - 参加者全員のメールアドレスを取得
     - リマインダーメールを生成・送信（会議タイトル、日時、会議URL/場所、参加者一覧）
   - `GuestCalendarService.getGuestEvents()`: ゲスト側 OAuth でカレンダーイベント取得（一時的、DB に保存しない）

3. **Presentation Layer** (`app/`)
   - `app/components/GuestCalendarOverlay.tsx`: ゲスト予定のオーバーレイ表示強化（半透明表示）
   - `app/api/cron/reminders/route.ts`: GET（cron ジョブ、秘密鍵認証）
   - Vercel cron 設定（vercel.json）

**TDD テスト対象**:

| レイヤー | テスト内容 |
|---------|-----------|
| Data Access | 翌日の確定済み予約検索、参加者一覧取得 |
| Business Logic | リマインダー対象の抽出ロジック、メール内容の生成、ゲストカレンダーイベント取得 |
| Presentation | ゲストカレンダーオーバーレイ UI、cron エンドポイントの認証・実行 |

**チェックリスト**:
- [ ] BookingRepository 検索機能拡張・テスト完了
- [ ] ReminderService 実装・テスト完了
- [ ] GuestCalendarService 実装・テスト完了
- [ ] リマインダーメール送信動作確認済み
- [ ] ゲストカレンダーオーバーレイ動作確認済み
- [ ] Vercel cron 設定完了
- [ ] cron エンドポイント認証動作確認済み

---

## 依存関係マップ

```
Phase 1:
  Slice 1: 認証・ログイン
    │
Phase 2:
    ├──→ Slice 2: ダッシュボード・リンク一覧
    │       │
    │       └──→ Slice 3: リンク作成・編集 基本フォーム
    │               │
Phase 3:            │
    │               ├──→ Slice 4: 参加者選択・カレンダー連携招待
    │               │       │
    │               │       └──→ Slice 5: 対応可能時間帯設定・空き時間計算
    │               │               │
    │               │               └──→ Slice 6: 調整回答画面・予約
    │               │                       │
Phase 4:            │                       │
    │               │                       └──→ Slice 7: ゲストカレンダー連携・リマインダー
```

## アーキテクチャ参照

- **Vertical Slice Architecture（VSA）**: `.claude/rules/vsa-guide.md`
- **3レイヤードアーキテクチャ**: `.claude/rules/three-layer-architecture.md`
- **TDD ガイド**: `.claude/rules/tdd-guide.md`

## 計画の変更

計画を変更する場合は `/planner` を再度実行してください。

---

生成日時: 2026-04-10

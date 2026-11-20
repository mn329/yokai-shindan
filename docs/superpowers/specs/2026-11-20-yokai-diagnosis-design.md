# 妖怪診断アプリ 設計書

- 作成日: 2026-11-20
- ステータス: レビュー待ち

## 1. 目的

学習目的で「あなたを妖怪に例えると？」というネタ系診断アプリを作る。

### 学習目標

1. Next.js / React の基礎（App Router のページ構成・動的ルーティング・Server/Client Component の境界・state 管理）
2. テスト駆動開発（TDD）— 診断ロジックをテストファーストで書く
3. 結果のシェア機能（結果ごとの URL、OGP 画像生成、X シェア）

### 成功基準

- 7 問に答えると 6 匹のうちいずれかの妖怪が結果として表示される
- 結果ページは `/result/<yokaiId>` という共有可能な URL を持ち、妖怪ごとの OGP 画像とメタデータが付く
- X シェアボタンと URL コピーボタンが動作する
- 診断ロジック・データ整合性・シェア URL 生成・質問画面の各テストが `npm test` で通る
- `npm run build` が成功し、6 匹分の結果ページと OGP 画像が静的生成される

## 2. スコープ

### 段階 1（本設計書の対象）

選択式の診断アプリを完成させる。

### 段階 2（将来・本設計書の対象外）

TypeSafe AI の **Jev**（テキスト分類モデル）を使った自由記述モードを追加する。段階 1 では、判定の入口を「入力 → `YokaiId`」の形に揃えておき、段階 2 でサーバー側に `diagnoseByText(text): Promise<YokaiId>` を追加するだけで済む構造にする。Jev の API 仕様は段階 2 着手時に公式ドキュメントで確認する。

### スコープ外

- DB・データ保存・統計
- ログイン
- 多言語対応（日本語のみ）
- 回答途中の保存
- X 以外のシェア（LINE、Web Share API）
- E2E テスト（Playwright）
- デプロイ（X 上での実際のカード表示確認を含む）

## 3. 技術スタック

既存の雛形をそのまま使う。

- Next.js 16.4（App Router）/ React 19.3 / TypeScript
- Tailwind CSS v4
- テスト: Vitest + React Testing Library（jsdom）

## 4. 画面とルーティング

| URL | 画面 | 種別 |
|---|---|---|
| `/` | トップ（タイトル・説明・「診断スタート」ボタン） | Server Component |
| `/quiz` | 質問画面（1 問ずつ表示・進捗表示） | ページは Server、本体 `Quiz` は Client Component |
| `/result/[yokaiId]` | 結果（妖怪の絵文字・名前・キャッチ・説明・シェアボタン） | Server Component |

### 流れ

1. トップ → `/quiz`
2. 全問回答すると、クライアントで `diagnose(questions, answers)` を実行して `YokaiId` を得る
3. `router.push('/result/<yokaiId>')` で結果画面へ遷移

### 設計判断

- 結果 URL には回答を含めず、妖怪 ID だけにする。どの回答経路でも同じ妖怪なら同じ URL・同じ OGP 画像になり、そのままシェアできる。
- 結果ページは `generateStaticParams` で 6 匹分を静的生成する。未定義の ID は `notFound()` で 404 にする。
- 動的ルートの `params` は Next.js 16 では `Promise` なので `await params` で受け取る。
- `next.config.ts` で `cacheComponents: true` が有効なため、`dynamicParams` は使えない（ビルドエラーになる）。未定義 ID は `notFound()` で拒否する。`notFound()` は Suspense の内側で呼ぶと 404 ではなく 200 + noindex になるので、`params` の読み取りと `notFound()` は Suspense の外で行う。この構成がビルドを通るかは実装の早い段階で本番ビルドして確認する。
- 質問画面では「前の問題に戻る」ボタンを付ける（回答配列の末尾を取り除く）。

## 5. データ構造

`lib/yokai/types.ts`:

```ts
export type YokaiId =
  | 'kappa'
  | 'tengu'
  | 'zashikiwarashi'
  | 'kyubi'
  | 'yukionna'
  | 'ittanmomen'

export type Yokai = {
  id: YokaiId
  name: string        // 表示名（例: 河童）
  emoji: string       // 見た目（画像素材は使わない）
  catchphrase: string // 一言キャッチ
  description: string // 説明文
}

export type Choice = {
  label: string
  points: Partial<Record<YokaiId, number>>
}

export type Question = {
  id: string
  text: string
  choices: Choice[]
}

export type Answers = number[] // 各質問で選んだ選択肢のインデックス
```

### 妖怪（6 匹）

`lib/yokai/yokai.ts` に定数配列 `YOKAI: Yokai[]` として定義する。配列の順序は同点時の優先順位を兼ねる。

| ID | 名前 | 絵文字 | 性格 | キャッチ（案） |
|---|---|---|---|---|
| `kappa` | 河童 | 🥒 | 好奇心旺盛で人懐っこいムードメーカー | とりあえず飛び込んでみる派 |
| `tengu` | 天狗 | 👺 | 自信家でストイックなリーダー | 頂上しか見ていない |
| `zashikiwarashi` | 座敷わらし | 👘 | いるだけで場が和む癒し系 | あなたのいる場所が福になる |
| `kyubi` | 九尾の狐 | 🦊 | 頭脳派の戦略家、人の心を読むのが上手い | 3 手先まで読んでいる |
| `yukionna` | 雪女 | ❄️ | クールな一匹狼、実は情が深い | 静かに、でも芯は熱い |
| `ittanmomen` | 一反木綿 | 🧣 | 自由人で気まぐれ、縛られるのが苦手 | 風が吹いたら、そっちへ行く |

説明文は実装時に作成する。

### 質問（7 問）

`lib/yokai/questions.ts` に定数配列 `QUESTIONS: Question[]` として定義する。

- 各質問の選択肢は 3〜4 個
- 各妖怪は少なくとも 1 つの選択肢で最大点を受け取るように配点する
- 質問文・選択肢・配点は実装時に作成する

## 6. 診断ロジック

`lib/yokai/diagnose.ts`:

```ts
export function diagnose(
  questions: Question[],
  answers: Answers,
  yokaiOrder: YokaiId[],
): YokaiId
```

### 仕様

1. 各回答で選ばれた選択肢の `points` を妖怪ごとに合計する
2. 合計点が最も高い妖怪を返す
3. 同点の場合は `yokaiOrder` で先に現れる妖怪を返す（乱数は使わない）
4. 全員 0 点の場合も同じ規則により `yokaiOrder` の先頭を返す
5. 次の場合は `Error` を投げる
   - `answers.length !== questions.length`
   - 選択肢インデックスが範囲外（負数・`choices.length` 以上・非整数）
   - `yokaiOrder` が空

質問データと妖怪の順序を引数で受け取る純粋関数にする。テストでは小さなダミーデータを渡し、本番データを変更してもテストが壊れないようにする。アプリ側からは `diagnose(QUESTIONS, answers, YOKAI.map(y => y.id))` として呼ぶ。

### ヘルパー

- `getYokai(id: string): Yokai | undefined` — 結果ページで ID から妖怪を引く。見つからなければ `notFound()` へ。

## 7. シェア機能

### メタデータ

- `app/layout.tsx` に `metadataBase` を設定する。値は環境変数 `NEXT_PUBLIC_SITE_URL`、未設定時は `http://localhost:3000`。
- `app/result/[yokaiId]/page.tsx` の `generateMetadata` で妖怪ごとのタイトルと説明文を返す。
  - タイトル例: 「あなたを妖怪に例えると…河童！」
  - 説明文: キャッチ

### OGP 画像

- `app/result/[yokaiId]/opengraph-image.tsx` で `ImageResponse` を使い、1200×630 の画像を生成する。内容は絵文字、妖怪名、キャッチ、サイト名。
- 絵文字は `ImageResponse` の標準設定（twemoji）で描画する。
- 日本語フォント（Noto Sans JP Bold）は、画像に使う文字だけに絞ったサブセットをリポジトリに置き、モジュールのトップレベルで `readFile` して読む（Next.js ドキュメントの方式）。`ImageResponse` には 500KB の上限があり、フォント全体は入らないため。
  - サブセットは `npm run og:font`（`scripts/fetch-og-font.ts`）で Google Fonts の `text=` パラメータから取得し、`assets/og/NotoSansJP-Bold-subset.ttf` と収録文字の一覧 `assets/og/chars.txt` を保存する。妖怪名・キャッチ・見出しを変えたら再実行する。
  - ビルド時に OGP 画像内で `fetch` する方式は、`cacheComponents` 下での挙動がドキュメントに記載されていないため採らない。
  - OGP の文言（見出し・妖怪名・キャッチ・サイト名）は `lib/og.ts` に集め、スクリプト・画像・テストで共有する。

### シェアボタン

`components/ShareButtons.tsx`（Client Component）:

- **X でシェア**: `buildShareUrl` で作った `https://x.com/intent/post?...` を新しいタブで開く
  - 投稿文: 「私を妖怪に例えると【河童】でした！ #妖怪診断」＋結果 URL
- **URL をコピー**: `navigator.clipboard.writeText` で結果 URL をコピーし、「コピーしました」を 2 秒表示する。失敗した場合は「コピーできませんでした」を表示する
- **もう一度診断する**: `/quiz` へのリンク

`lib/share.ts`:

```ts
export function buildShareUrl(yokai: Yokai, siteUrl: string): string
```

`text` と `url` を `URLSearchParams` でエンコードして X の投稿画面の URL を返す。結果 URL は `buildResultUrl(siteUrl, yokaiId)` で作り、`siteUrl` 末尾のスラッシュを取り除いて `//result/...` にならないようにする。

`Quiz` は `questions: Question[]` と `yokaiOrder: YokaiId[]` を props で受け取る（テストでダミーデータを渡せるようにするため）。最後の回答後は選択肢を消して「結果を表示しています…」を表示し、二重遷移を防ぐ。

## 8. ファイル構成

```
app/
  layout.tsx                  # metadataBase 追加、lang="ja"
  page.tsx                    # トップ（作り直し）
  quiz/page.tsx               # Quiz を表示
  result/[yokaiId]/
    page.tsx                  # generateStaticParams / generateMetadata / notFound
    opengraph-image.tsx
components/
  Quiz.tsx                    # 'use client'
  Quiz.test.tsx
  ShareButtons.tsx            # 'use client'
lib/
  yokai/
    types.ts
    yokai.ts
    questions.ts
    diagnose.ts
    diagnose.test.ts
    data.test.ts
  og.ts                       # OGP の文言と使用文字
  og.test.ts
  share.ts
  share.test.ts
  site.ts                     # SITE_URL
scripts/
  fetch-og-font.ts            # サブセットフォントの取得
assets/og/
  NotoSansJP-Bold-subset.ttf
  chars.txt
vitest.config.mts
vitest.setup.ts               # React Testing Library の cleanup
```

パスエイリアスは既存の `@/*` → `./*` を使う。

## 9. テスト方針

### セットアップ

Next.js 公式ガイド（`node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`）に従い、次を dev dependency として入れる。

`vitest` `@vitejs/plugin-react` `jsdom` `@testing-library/react` `@testing-library/dom` `vite-tsconfig-paths`

`package.json` に `"test": "vitest"` を追加する。

フォント取得スクリプトの実行用に `tsx` も dev dependency に入れ、`"og:font": "tsx scripts/fetch-og-font.ts"` を追加する。

### 対象と方法

| 対象 | 方法 | 確認内容 |
|---|---|---|
| `diagnose` | 単体テスト（TDD） | 加点の合計、最高点の妖怪、同点時の優先順位、全員 0 点、回答数の不一致、範囲外インデックス |
| 妖怪・質問データ | 単体テスト | `points` の ID がすべて定義済み、各質問の選択肢が 2 個以上、6 匹すべてに結果として出る回答パターンが存在する |
| `buildShareUrl` | 単体テスト（TDD） | 日本語とハッシュタグのエンコード、結果 URL を含む |
| `Quiz` | React Testing Library | 選択で次の問題へ進む、戻るボタン、最終回答後に `router.push('/result/<id>')` が呼ばれる（`next/navigation` はモック） |
| OGP の文言とフォント | 単体テスト | OGP に描く全文字が `assets/og/chars.txt` に含まれる（含まれない文字は豆腐になる） |
| 結果ページ・OGP 画像 | `npm run build` と本番サーバーへの `curl`、手動確認 | async Server Component は Vitest で扱えないため。ビルドで 6 ページ分が生成されること、`/result/foo` の HTTP ステータスが 404 であること、OGP 画像 6 枚の見た目を確認 |

「6 匹すべてが結果に出うる」の確認は、質問 7 問・選択肢 3〜4 個なら全回答パターンが最大 4^7 = 16,384 通りなので、全探索で出現する妖怪の集合を求める。

## 10. エラー処理

- 未定義の妖怪 ID で結果ページにアクセス → `notFound()`（404）
- `diagnose` への不正入力 → `Error`。UI からは常に正しい形で呼ぶので、通常は起きない
- クリップボード API の失敗 → 失敗メッセージを表示

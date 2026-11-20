# 妖怪診断アプリ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 7 問の選択式質問に答えると 6 匹の妖怪のいずれかが結果として表示され、結果ごとの URL・OGP 画像・X シェアを持つ Next.js アプリを作る。

**Architecture:** 診断ロジックは `lib/yokai/` の純粋関数とデータに閉じ込め、Vitest で TDD する。画面は App Router の 3 ルート（`/`、`/quiz`、`/result/[yokaiId]`）で、質問画面の本体だけが Client Component。結果ページと OGP 画像は `generateStaticParams` で 6 匹分を静的生成し、OGP 用の日本語フォントは使用文字だけに絞ったサブセットをリポジトリに置く。

**Tech Stack:** Next.js 16.4.6（App Router、`cacheComponents: true`）/ React 19.3 / TypeScript / Tailwind CSS v4 / Vitest + React Testing Library（jsdom）/ tsx（フォント取得スクリプト用）

**Spec:** `docs/superpowers/specs/2026-11-20-yokai-diagnosis-design.md`

## Global Constraints

- Next.js 16 は学習データと API が異なる。コードを書く前に `node_modules/next/dist/docs/` の該当ガイドを確認する（`AGENTS.md` の指示）。
- `next.config.ts` は `cacheComponents: true` / `partialPrefetching: true`。**`dynamicParams` を export してはいけない**（ビルドエラーになる）。未定義 ID の拒否は `notFound()` で行う。
- 動的ルートの `params` は `Promise`。`await params` で受け取る。
- `generateStaticParams` は 1 件以上を返す（空配列はビルドエラー）。
- テストは必ず `npx vitest run <file>` で実行する。`npm test`（= `vitest`）はウォッチモードで終了しない。
- `next dev` は `AGENTS.md` の管理ブロックを書き換えることがある。`git add` は必ずファイルを個別に指定し、`git add .` / `git add -A` は使わない。
- UI の文言は日本語。妖怪 ID と順序は `kappa, tengu, zashikiwarashi, kyubi, yukionna, ittanmomen`（この順が同点時の優先順位）。
- パスエイリアスは `@/*` → `./*`（`src/` は使わない）。
- サイト URL は `NEXT_PUBLIC_SITE_URL`、未設定時は `http://localhost:3000`。
- X シェアの投稿文: `私を妖怪に例えると【<妖怪名>】でした！ #妖怪診断`。
- 素の `tsc` は実行しない（`PageProps` / `LayoutProps` などの型は `next build` / `next dev` が生成する）。型チェックは `npm run build` で行う。

## Review Focus

1. 未定義の妖怪 ID（`/result/foo`）に本番ビルドでアクセスしたとき、HTTP ステータスが本当に 404 になる（Suspense 内で `notFound()` すると 200 + noindex になるため）。→ Task 3 Step 6 の `curl` で固定。
2. 最後の質問に答えた後、`router.push` が 1 回だけ呼ばれ、選択肢ボタンが残らない（連打で二重遷移しない）。→ Task 6 のテストで固定。
3. 1 問目で「前の問題に戻る」を押してもクラッシュしない（ボタンが無効）。→ Task 6 のテストで固定。
4. `NEXT_PUBLIC_SITE_URL` の末尾に `/` があっても結果 URL が `//result/...` にならない。→ Task 4 のテストで固定。
5. OGP 画像の文言にサブセットフォントに含まれない文字が混ざると豆腐（□）になる。→ Task 5 の `lib/og.test.ts` で固定。

---

### Task 1: Vitest の導入と診断ロジック `diagnose`

**Files:**
- Modify: `package.json`（devDependencies と `test` スクリプト）
- Create: `vitest.config.mts`
- Create: `vitest.setup.ts`
- Create: `lib/yokai/types.ts`
- Create: `lib/yokai/diagnose.ts`
- Test: `lib/yokai/diagnose.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `type YokaiId = 'kappa' | 'tengu' | 'zashikiwarashi' | 'kyubi' | 'yukionna' | 'ittanmomen'`
  - `type Yokai = { id: YokaiId; name: string; emoji: string; catchphrase: string; description: string }`
  - `type Choice = { label: string; points: Partial<Record<YokaiId, number>> }`
  - `type Question = { id: string; text: string; choices: Choice[] }`
  - `type Answers = number[]`
  - `diagnose(questions: Question[], answers: Answers, yokaiOrder: YokaiId[]): YokaiId`

- [ ] **Step 1: テスト用パッケージを入れる**

参考: `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

- [ ] **Step 2: Vitest の設定ファイルを作る**

`vitest.config.mts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

`vitest.setup.ts`（`globals: true` にしないので、React Testing Library の後片付けを明示的に登録する）:

```ts
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

`package.json` の `scripts` に追加:

```json
"test": "vitest"
```

- [ ] **Step 3: 型を定義する**

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
  name: string
  emoji: string
  catchphrase: string
  description: string
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

// 各質問で選んだ選択肢のインデックス
export type Answers = number[]
```

- [ ] **Step 4: 加点と最高点の失敗するテストを書く**

`lib/yokai/diagnose.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { diagnose } from './diagnose'
import type { Question, YokaiId } from './types'

const order: YokaiId[] = ['kappa', 'tengu', 'zashikiwarashi']

const questions: Question[] = [
  {
    id: 'q1',
    text: '質問1',
    choices: [
      { label: 'A', points: { kappa: 2 } },
      { label: 'B', points: { tengu: 2, zashikiwarashi: 1 } },
      { label: 'C', points: {} },
    ],
  },
  {
    id: 'q2',
    text: '質問2',
    choices: [
      { label: 'A', points: { kappa: 1 } },
      { label: 'B', points: { zashikiwarashi: 3 } },
      { label: 'C', points: {} },
    ],
  },
]

describe('diagnose', () => {
  it('選んだ選択肢の点数を合計し、最高点の妖怪を返す', () => {
    expect(diagnose(questions, [0, 0], order)).toBe('kappa') // kappa 3
    expect(diagnose(questions, [1, 1], order)).toBe('zashikiwarashi') // tengu 2, zashikiwarashi 4
  })

  it('同点のときは yokaiOrder で先に現れる妖怪を返す', () => {
    // kappa 2, tengu 2, zashikiwarashi 1
    expect(diagnose(questions, [0, 2], order)).toBe('kappa')
    expect(diagnose(questions, [0, 2], ['tengu', 'kappa', 'zashikiwarashi'])).toBe('tengu')
  })

  it('全員 0 点のときは yokaiOrder の先頭を返す', () => {
    expect(diagnose(questions, [2, 2], order)).toBe('kappa')
  })
})
```

- [ ] **Step 5: テストが失敗することを確認する**

Run: `npx vitest run lib/yokai/diagnose.test.ts`
Expected: FAIL（`./diagnose` が存在しないため import エラー）

- [ ] **Step 6: 加点と最高点を実装する**

`lib/yokai/diagnose.ts`:

```ts
import type { Answers, Question, YokaiId } from './types'

export function diagnose(
  questions: Question[],
  answers: Answers,
  yokaiOrder: YokaiId[],
): YokaiId {
  const scores = new Map<YokaiId, number>(yokaiOrder.map((id) => [id, 0]))

  questions.forEach((question, i) => {
    const choice = question.choices[answers[i]]
    for (const [id, point] of Object.entries(choice.points)) {
      const yokaiId = id as YokaiId
      scores.set(yokaiId, (scores.get(yokaiId) ?? 0) + (point ?? 0))
    }
  })

  // 同点なら先に現れた妖怪を残すため、厳密に大きいときだけ更新する
  let best = yokaiOrder[0]
  for (const id of yokaiOrder) {
    if ((scores.get(id) ?? 0) > (scores.get(best) ?? 0)) best = id
  }
  return best
}
```

- [ ] **Step 7: テストが通ることを確認する**

Run: `npx vitest run lib/yokai/diagnose.test.ts`
Expected: PASS（3 件）

- [ ] **Step 8: 不正入力の失敗するテストを追加する**

`lib/yokai/diagnose.test.ts` の `describe('diagnose', ...)` の中に追加:

```ts
  it('回答数が質問数と一致しないときはエラーを投げる', () => {
    expect(() => diagnose(questions, [0], order)).toThrow('回答数')
    expect(() => diagnose(questions, [0, 0, 0], order)).toThrow('回答数')
  })

  it('選択肢インデックスが範囲外ならエラーを投げる', () => {
    expect(() => diagnose(questions, [0, 3], order)).toThrow('範囲外')
    expect(() => diagnose(questions, [-1, 0], order)).toThrow('範囲外')
    expect(() => diagnose(questions, [0.5, 0], order)).toThrow('範囲外')
  })

  it('yokaiOrder が空ならエラーを投げる', () => {
    expect(() => diagnose(questions, [0, 0], [])).toThrow('yokaiOrder')
  })
```

- [ ] **Step 9: テストが失敗することを確認する**

Run: `npx vitest run lib/yokai/diagnose.test.ts`
Expected: FAIL（新しい 3 件が失敗。`choice` が `undefined` になり `TypeError` などで落ちる、またはエラーが投げられない）

- [ ] **Step 10: 入力チェックを実装する**

`lib/yokai/diagnose.ts` の関数本体の先頭（`const scores = ...` の前）に追加:

```ts
  if (yokaiOrder.length === 0) {
    throw new Error('yokaiOrder が空です')
  }
  if (answers.length !== questions.length) {
    throw new Error(
      `回答数(${answers.length})が質問数(${questions.length})と一致しません`,
    )
  }
```

`questions.forEach` の中を次に置き換える:

```ts
  questions.forEach((question, i) => {
    const answer = answers[i]
    if (!Number.isInteger(answer) || answer < 0 || answer >= question.choices.length) {
      throw new Error(`質問 ${question.id} の回答 ${answer} は範囲外です`)
    }
    const choice = question.choices[answer]
    for (const [id, point] of Object.entries(choice.points)) {
      const yokaiId = id as YokaiId
      scores.set(yokaiId, (scores.get(yokaiId) ?? 0) + (point ?? 0))
    }
  })
```

- [ ] **Step 11: テストが通ることを確認する**

Run: `npx vitest run lib/yokai/diagnose.test.ts`
Expected: PASS（6 件）

- [ ] **Step 12: コミット**

```bash
git add package.json package-lock.json vitest.config.mts vitest.setup.ts lib/yokai/types.ts lib/yokai/diagnose.ts lib/yokai/diagnose.test.ts
git commit -m "feat: 診断ロジック diagnose を TDD で実装し Vitest を導入"
```

---

### Task 2: 妖怪と質問のデータ

**Files:**
- Create: `lib/yokai/yokai.ts`
- Create: `lib/yokai/questions.ts`
- Test: `lib/yokai/data.test.ts`

**Interfaces:**
- Consumes: Task 1 の型と `diagnose`
- Produces:
  - `YOKAI: Yokai[]`（6 匹、順序が同点時の優先順位）
  - `YOKAI_IDS: YokaiId[]`（`YOKAI.map((y) => y.id)`）
  - `getYokai(id: string): Yokai | undefined`
  - `QUESTIONS: Question[]`（7 問）

- [ ] **Step 1: データの失敗するテストを書く**

`lib/yokai/data.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { diagnose } from './diagnose'
import { QUESTIONS } from './questions'
import type { Answers, YokaiId } from './types'
import { YOKAI, YOKAI_IDS, getYokai } from './yokai'

// すべての回答パターンを列挙する（7 問・各 3〜4 択なら最大 16,384 通り）
function allAnswerPatterns(): Answers[] {
  let patterns: Answers[] = [[]]
  for (const question of QUESTIONS) {
    patterns = patterns.flatMap((prefix) =>
      question.choices.map((_, i) => [...prefix, i]),
    )
  }
  return patterns
}

describe('妖怪データ', () => {
  it('6 匹が仕様の順序で定義されている', () => {
    expect(YOKAI_IDS).toEqual([
      'kappa',
      'tengu',
      'zashikiwarashi',
      'kyubi',
      'yukionna',
      'ittanmomen',
    ])
  })

  it('名前・絵文字・キャッチ・説明文が空でない', () => {
    for (const yokai of YOKAI) {
      expect(yokai.name).not.toBe('')
      expect(yokai.emoji).not.toBe('')
      expect(yokai.catchphrase).not.toBe('')
      expect(yokai.description).not.toBe('')
    }
  })

  it('getYokai は ID から妖怪を返し、未定義の ID には undefined を返す', () => {
    expect(getYokai('kappa')?.name).toBe('河童')
    expect(getYokai('foo')).toBeUndefined()
    expect(getYokai('constructor')).toBeUndefined()
  })
})

describe('質問データ', () => {
  it('7 問あり、質問 ID が重複しない', () => {
    expect(QUESTIONS).toHaveLength(7)
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length)
  })

  it('各質問の選択肢は 2 個以上ある', () => {
    for (const question of QUESTIONS) {
      expect(question.choices.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('points に出てくる ID はすべて定義済みの妖怪である', () => {
    const ids = new Set<string>(YOKAI_IDS)
    for (const question of QUESTIONS) {
      for (const choice of question.choices) {
        for (const id of Object.keys(choice.points)) {
          expect(ids.has(id), `${question.id}「${choice.label}」の ${id}`).toBe(true)
        }
      }
    }
  })

  it('6 匹すべてに、その妖怪が結果になる回答パターンが存在する', () => {
    const results = new Set<YokaiId>(
      allAnswerPatterns().map((answers) => diagnose(QUESTIONS, answers, YOKAI_IDS)),
    )
    expect([...results].sort()).toEqual([...YOKAI_IDS].sort())
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run lib/yokai/data.test.ts`
Expected: FAIL（`./questions` と `./yokai` が存在しないため import エラー）

- [ ] **Step 3: 妖怪データを書く**

`lib/yokai/yokai.ts`:

```ts
import type { Yokai } from './types'

// 配列の順序は同点時の優先順位を兼ねる
export const YOKAI: Yokai[] = [
  {
    id: 'kappa',
    name: '河童',
    emoji: '🥒',
    catchphrase: 'とりあえず飛び込んでみる派',
    description:
      '「面白そう」と思ったら、考えるより先に体が動くタイプ。好奇心旺盛で人懐っこく、あなたがいると場が一気ににぎやかになります。ときどき勢い余って川に流されることもありますが、それも含めて愛されキャラです。',
  },
  {
    id: 'tengu',
    name: '天狗',
    emoji: '👺',
    catchphrase: '頂上しか見ていない',
    description:
      '高い目標を掲げ、自分を鍛え続けるストイックなリーダー。自信に満ちた姿に、周りは自然とついていきます。ただし鼻が高くなりすぎないよう、ときどき山を下りて仲間の声を聞いてみて。',
  },
  {
    id: 'zashikiwarashi',
    name: '座敷わらし',
    emoji: '👘',
    catchphrase: 'あなたのいる場所が福になる',
    description:
      'いるだけで場がふんわり和む癒し系。人の喜ぶ顔が何よりのごちそうで、気づけばみんなの幸せを支えています。あなたがいなくなると、周りは初めてその存在の大きさに気づくかも。',
  },
  {
    id: 'kyubi',
    name: '九尾の狐',
    emoji: '🦊',
    catchphrase: '3手先まで読んでいる',
    description:
      '人の心の動きを読み、静かに最善手を打つ頭脳派の戦略家。表情ひとつ変えずに場をコントロールできる、九本のしっぽを隠し持った切れ者です。たまには化けずに、素の自分を見せても大丈夫。',
  },
  {
    id: 'yukionna',
    name: '雪女',
    emoji: '❄️',
    catchphrase: '静かに、でも芯は熱い',
    description:
      '感情を表に出さないクールな一匹狼。近寄りがたく見られがちですが、本当は誰よりも情が深く、大切な人のことはずっと覚えています。心を許した相手にだけ見せる笑顔は、雪解けのような破壊力。',
  },
  {
    id: 'ittanmomen',
    name: '一反木綿',
    emoji: '🧣',
    catchphrase: '風が吹いたら、そっちへ行く',
    description:
      '風の向くまま気の向くまま、ひらひらと生きる自由人。ルールや予定に縛られるのが苦手で、思いがけない場所にふらっと現れます。その身軽さが、周りに新しい景色を見せてくれます。',
  },
]

export const YOKAI_IDS = YOKAI.map((yokai) => yokai.id)

export function getYokai(id: string): Yokai | undefined {
  return YOKAI.find((yokai) => yokai.id === id)
}
```

- [ ] **Step 4: 質問データを書く**

`lib/yokai/questions.ts`:

```ts
import type { Question } from './types'

export const QUESTIONS: Question[] = [
  {
    id: 'holiday',
    text: '休日の過ごし方は？',
    choices: [
      { label: '友達を誘って新しい場所へ', points: { kappa: 2, zashikiwarashi: 1 } },
      { label: '目標に向けて自主練や勉強', points: { tengu: 2, kyubi: 1 } },
      { label: '一人で静かに読書や映画', points: { yukionna: 2, kyubi: 1 } },
      { label: '予定は決めず、気の向くまま', points: { ittanmomen: 2, kappa: 1 } },
    ],
  },
  {
    id: 'group-decision',
    text: 'グループで何かを決めるとき、あなたは？',
    choices: [
      { label: '真っ先に意見を出して引っ張る', points: { tengu: 2, kappa: 1 } },
      { label: 'みんなの意見を聞いてまとめる', points: { zashikiwarashi: 2, kyubi: 1 } },
      { label: '流れを見て、最後に通りそうな案を出す', points: { kyubi: 2, yukionna: 1 } },
      { label: '決まったことについていく', points: { ittanmomen: 2, zashikiwarashi: 1 } },
    ],
  },
  {
    id: 'friend-down',
    text: '友達が落ち込んでいたら？',
    choices: [
      { label: '遊びに連れ出して気分転換', points: { kappa: 2, ittanmomen: 1 } },
      { label: '黙ってそばにいる', points: { zashikiwarashi: 2, yukionna: 1 } },
      { label: '原因を一緒に分析して解決策を考える', points: { kyubi: 2, tengu: 1 } },
      { label: 'あえて触れず、落ち着いたころに一言かける', points: { yukionna: 2, kyubi: 1 } },
    ],
  },
  {
    id: 'trip',
    text: '旅行の計画を立てるなら？',
    choices: [
      { label: '分刻みのスケジュールを組む', points: { tengu: 2, kyubi: 1 } },
      { label: '行き先だけ決めて、あとは現地で', points: { ittanmomen: 2, kappa: 1 } },
      { label: 'みんなの行きたい所を全部入れる', points: { zashikiwarashi: 2, kappa: 1 } },
      { label: '誰も知らない穴場を下調べする', points: { kyubi: 2, yukionna: 1 } },
    ],
  },
  {
    id: 'party',
    text: '初対面の人が多い集まりでは？',
    choices: [
      { label: '自分から話しかけて輪を広げる', points: { kappa: 2, tengu: 1 } },
      { label: '気づけば聞き役になっている', points: { zashikiwarashi: 2, kyubi: 1 } },
      { label: '端のほうで様子を観察する', points: { yukionna: 2, kyubi: 1 } },
      { label: '途中でふらっと抜ける', points: { ittanmomen: 2, yukionna: 1 } },
    ],
  },
  {
    id: 'failure',
    text: '失敗してしまったときは？',
    choices: [
      { label: '悔しくて「次は絶対に勝つ」と燃える', points: { tengu: 2 } },
      { label: '「まあいっか」とすぐ切り替える', points: { ittanmomen: 2, kappa: 1 } },
      { label: 'なぜ失敗したかを冷静に振り返る', points: { kyubi: 2, yukionna: 1 } },
      { label: '迷惑をかけた人にまず謝りに行く', points: { zashikiwarashi: 2 } },
    ],
  },
  {
    id: 'value',
    text: 'あなたが一番大事にしたいものは？',
    choices: [
      { label: '楽しさ', points: { kappa: 2 } },
      { label: '成長', points: { tengu: 2 } },
      { label: '人とのつながり', points: { zashikiwarashi: 2 } },
      { label: '自分だけの時間', points: { yukionna: 2, ittanmomen: 1 } },
    ],
  },
]
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `npx vitest run lib/yokai/data.test.ts`
Expected: PASS（7 件）。「6 匹すべてに…」が失敗した場合は、出てこない妖怪に最大点（2）を与える選択肢を増やすよう `points` を調整して再実行する（ロジック側は変えない）。

- [ ] **Step 6: 全テストを確認してコミット**

Run: `npx vitest run`
Expected: PASS（Task 1 と合わせて 13 件）

```bash
git add lib/yokai/yokai.ts lib/yokai/questions.ts lib/yokai/data.test.ts
git commit -m "feat: 妖怪 6 匹と質問 7 問のデータを追加"
```

---

### Task 3: 結果ページと OGP 画像の骨組み＋本番ビルド検証（判断ゲートあり）

`cacheComponents` 下で「`params` を Suspense の外で読む」「`generateMetadata` で `params` を読む」「OGP 画像で `params` を読む」がビルドを通るか、未定義 ID が本当に 404 になるかは、ドキュメントからは確定できない。ここで最小構成のまま本番ビルドして確かめる。

**Files:**
- Create: `lib/site.ts`
- Create: `app/result/[yokaiId]/page.tsx`
- Create: `app/result/[yokaiId]/opengraph-image.tsx`（この時点では日本語を含まない仮の画像）
- Create: `proxy.ts`、Test: `proxy.test.ts`（判断ゲートの結果を受けて追加。下記「実施時の追記」参照）

**Interfaces:**
- Consumes: `YOKAI`、`getYokai`（Task 2）
- Produces:
  - `SITE_URL: string`（`lib/site.ts`）
  - ルート `/result/[yokaiId]`（6 匹分を静的生成、未定義 ID は 404）
  - ルート `/result/[yokaiId]/opengraph-image`

- [ ] **Step 1: サイト URL の定数を作る**

`lib/site.ts`:

```ts
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
```

- [ ] **Step 2: 結果ページを書く**

参考: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md`、`.../02-guides/migrating-to-cache-components.md`（`dynamicParams` の項）

`app/result/[yokaiId]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { YOKAI, getYokai } from '@/lib/yokai/yokai'

type Props = {
  params: Promise<{ yokaiId: string }>
}

export function generateStaticParams() {
  return YOKAI.map((yokai) => ({ yokaiId: yokai.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { yokaiId } = await params
  const yokai = getYokai(yokaiId)
  if (!yokai) return {}
  return {
    title: `あなたを妖怪に例えると…${yokai.name}！`,
    description: yokai.catchphrase,
  }
}

export default async function ResultPage({ params }: Props) {
  const { yokaiId } = await params
  const yokai = getYokai(yokaiId)
  // cacheComponents では dynamicParams が使えないため、未定義 ID はここで 404 にする
  if (!yokai) notFound()

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-6 px-6 py-16 text-center">
      <p className="text-sm text-zinc-500">あなたを妖怪に例えると…</p>
      <p className="text-8xl" aria-hidden="true">
        {yokai.emoji}
      </p>
      <h1 className="text-4xl font-bold">{yokai.name}</h1>
      <p className="text-lg font-semibold">「{yokai.catchphrase}」</p>
      <p className="leading-8 text-zinc-700 dark:text-zinc-300">{yokai.description}</p>
      <Link href="/quiz" className="underline">
        もう一度診断する
      </Link>
    </main>
  )
}
```

- [ ] **Step 3: 仮の OGP 画像を書く**

参考: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`

`app/result/[yokaiId]/opengraph-image.tsx`（日本語フォントは Task 5 で入れるので、ここでは絵文字と英数字だけ）:

```tsx
import { ImageResponse } from 'next/og'
import { getYokai } from '@/lib/yokai/yokai'

export const alt = '妖怪診断の結果'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = {
  params: Promise<{ yokaiId: string }>
}

export default async function Image({ params }: Props) {
  const { yokaiId } = await params
  const yokai = getYokai(yokaiId)
  if (!yokai) return new Response('Not Found', { status: 404 })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 240,
          background: '#1c1917',
        }}
      >
        {yokai.emoji}
      </div>
    ),
    size,
  )
}
```

- [ ] **Step 4: 本番ビルドする**

Run: `npm run build`
Expected: 成功。ルート一覧に `/result/[yokaiId]` と、その配下に 6 匹分のパス（`/result/kappa` など）が表示される。

- [ ] **Step 5: 本番サーバーを起動する**

```bash
npx next start -p 3100 > .next/start.log 2>&1 &
echo $! > .next/start.pid
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3100/ && break; sleep 1; done
```

- [ ] **Step 6: ステータスコードを確認する**

```bash
curl -s -o /dev/null -w 'kappa: %{http_code}\n' http://localhost:3100/result/kappa
curl -s -o /dev/null -w 'foo: %{http_code}\n' http://localhost:3100/result/foo
curl -s -o /dev/null -w 'og: %{http_code} %{content_type}\n' http://localhost:3100/result/kappa/opengraph-image
curl -s http://localhost:3100/result/kappa | grep -o '<title>[^<]*</title>'
```

Expected:

```
kappa: 200
foo: 404
og: 200 image/png
<title>あなたを妖怪に例えると…河童！</title>
```

- [ ] **Step 7: サーバーを止める**

```bash
kill "$(cat .next/start.pid)"
```

- [ ] **Step 8: 判断ゲート**

Step 4 または Step 6 の結果が Expected と一つでも違った場合（例: ビルドが「`params` accessed outside of `<Suspense>`」で失敗する、`foo` が 200 になる、OGP が 200 にならない）は、**ここで作業を止め、コマンド出力をそのままユーザーに報告して方針を相談する**。自己判断で `<Suspense>` で包む・`'use cache'` を足す・`instant` を export する等の構造変更はしない（Suspense 内の `notFound()` は 404 ではなく 200 + noindex になり、仕様の「未定義 ID は 404」と衝突するため）。

すべて Expected どおりなら次へ進む。

**実施時の追記（2026-11-20）:** Step 6 で `/result/foo` が 200 + noindex になり判断ゲートに該当した（`partialPrefetching` によりページの外枠が先に送られるため）。ユーザーと相談のうえ、`proxy.ts` で未定義 ID を `/404` へ rewrite する方式を採用し、`proxy.test.ts`（3 件）を TDD で追加。再ビルド後、`/result/foo` と `/result/foo/opengraph-image` が 404、既知 ID が 200 になることを確認した。以降のタスクのテスト件数は proxy の 3 件を加えて数える。

- [ ] **Step 9: コミット**

```bash
git add proxy.ts proxy.test.ts lib/site.ts "app/result/[yokaiId]/page.tsx" "app/result/[yokaiId]/opengraph-image.tsx"
git commit -m "feat: 結果ページと OGP 画像の骨組みを追加（6 匹分を静的生成、未定義 ID は 404）"
```

---

### Task 4: シェア URL とシェアボタン、`metadataBase`

**Files:**
- Create: `lib/share.ts`
- Test: `lib/share.test.ts`
- Create: `components/ShareButtons.tsx`
- Modify: `app/result/[yokaiId]/page.tsx`（「もう一度診断する」リンクを `ShareButtons` に置き換え）
- Modify: `app/layout.tsx`（`metadataBase`、`lang="ja"`、タイトルと説明）

**Interfaces:**
- Consumes: `Yokai`、`YokaiId`（Task 1）、`SITE_URL`（Task 3）、`getYokai`（Task 2）
- Produces:
  - `buildResultUrl(siteUrl: string, yokaiId: YokaiId): string`
  - `buildShareUrl(yokai: Yokai, siteUrl: string): string`
  - `<ShareButtons yokai={Yokai} siteUrl={string} />`

- [ ] **Step 1: 失敗するテストを書く**

`lib/share.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildResultUrl, buildShareUrl } from './share'
import type { Yokai } from './yokai/types'

const kappa: Yokai = {
  id: 'kappa',
  name: '河童',
  emoji: '🥒',
  catchphrase: 'とりあえず飛び込んでみる派',
  description: '説明',
}

describe('buildResultUrl', () => {
  it('サイト URL と妖怪 ID から結果 URL を作る', () => {
    expect(buildResultUrl('https://example.com', 'kappa')).toBe(
      'https://example.com/result/kappa',
    )
  })

  it('サイト URL の末尾のスラッシュを二重にしない', () => {
    expect(buildResultUrl('https://example.com/', 'kappa')).toBe(
      'https://example.com/result/kappa',
    )
    expect(buildResultUrl('https://example.com//', 'kappa')).toBe(
      'https://example.com/result/kappa',
    )
  })
})

describe('buildShareUrl', () => {
  it('X の投稿画面の URL を返す', () => {
    const url = new URL(buildShareUrl(kappa, 'https://example.com'))
    expect(url.origin + url.pathname).toBe('https://x.com/intent/post')
  })

  it('投稿文と結果 URL をパラメータに含める', () => {
    const url = new URL(buildShareUrl(kappa, 'https://example.com/'))
    expect(url.searchParams.get('text')).toBe('私を妖怪に例えると【河童】でした！ #妖怪診断')
    expect(url.searchParams.get('url')).toBe('https://example.com/result/kappa')
  })

  it('ハッシュタグの # をエンコードし、URL のフラグメントにしない', () => {
    const raw = buildShareUrl(kappa, 'https://example.com')
    expect(raw).not.toContain('#')
    expect(new URL(raw).hash).toBe('')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run lib/share.test.ts`
Expected: FAIL（`./share` が存在しないため import エラー）

- [ ] **Step 3: 実装する**

`lib/share.ts`:

```ts
import type { Yokai, YokaiId } from './yokai/types'

export function buildResultUrl(siteUrl: string, yokaiId: YokaiId): string {
  return `${siteUrl.replace(/\/+$/, '')}/result/${yokaiId}`
}

export function buildShareUrl(yokai: Yokai, siteUrl: string): string {
  const params = new URLSearchParams({
    text: `私を妖怪に例えると【${yokai.name}】でした！ #妖怪診断`,
    url: buildResultUrl(siteUrl, yokai.id),
  })
  return `https://x.com/intent/post?${params.toString()}`
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run lib/share.test.ts`
Expected: PASS（5 件）

- [ ] **Step 5: シェアボタンを作る**

`components/ShareButtons.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { buildResultUrl, buildShareUrl } from '@/lib/share'
import type { Yokai } from '@/lib/yokai/types'

type Props = {
  yokai: Yokai
  siteUrl: string
}

type CopyStatus = 'idle' | 'copied' | 'failed'

const COPY_MESSAGES: Record<CopyStatus, string> = {
  idle: '',
  copied: 'コピーしました',
  failed: 'コピーできませんでした',
}

export function ShareButtons({ yokai, siteUrl }: Props) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')

  async function copyResultUrl() {
    try {
      // 非セキュアな環境では navigator.clipboard が無いので、ここで例外になる
      await navigator.clipboard.writeText(buildResultUrl(siteUrl, yokai.id))
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
    setTimeout(() => setCopyStatus('idle'), 2000)
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <a
        href={buildShareUrl(yokai, siteUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full rounded-full bg-black px-6 py-3 font-semibold text-white dark:bg-white dark:text-black"
      >
        X でシェア
      </a>
      <button
        type="button"
        onClick={copyResultUrl}
        className="w-full rounded-full border border-zinc-300 px-6 py-3 font-semibold dark:border-zinc-700"
      >
        URL をコピー
      </button>
      <p role="status" className="h-5 text-sm text-zinc-500">
        {COPY_MESSAGES[copyStatus]}
      </p>
      <Link href="/quiz" className="underline">
        もう一度診断する
      </Link>
    </div>
  )
}
```

- [ ] **Step 6: 結果ページに組み込む**

`app/result/[yokaiId]/page.tsx` の import に追加:

```tsx
import { ShareButtons } from '@/components/ShareButtons'
import { SITE_URL } from '@/lib/site'
```

`import Link from 'next/link'` を削除し、ページ末尾の

```tsx
      <Link href="/quiz" className="underline">
        もう一度診断する
      </Link>
```

を次に置き換える:

```tsx
      <ShareButtons yokai={yokai} siteUrl={SITE_URL} />
```

- [ ] **Step 7: レイアウトに metadataBase を設定する**

`app/layout.tsx` の import に `import { SITE_URL } from "@/lib/site";` を追加し、`metadata` と `<html lang>` を変更する（既存のダブルクォート・セミコロンのスタイルに合わせる）:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "妖怪診断",
  description: "7つの質問に答えて、あなたを妖怪に例えると何になるかを診断します。",
};
```

```tsx
    <html
      lang="ja"
```

- [ ] **Step 8: ビルドと OGP メタタグを確認する**

Run: `npm run build`
Expected: 成功

```bash
npx next start -p 3100 > .next/start.log 2>&1 &
echo $! > .next/start.pid
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3100/ && break; sleep 1; done
curl -s http://localhost:3100/result/kappa | grep -o '<meta property="og:image"[^>]*>'
curl -s -o /dev/null -w 'foo: %{http_code}\n' http://localhost:3100/result/foo
kill "$(cat .next/start.pid)"
```

Expected: `og:image` の `content` が `http://localhost:3000/result/kappa/opengraph-image...` で始まる絶対 URL（`metadataBase` 未設定の警告が出ないこと）。`foo: 404`。

- [ ] **Step 9: 全テストを確認してコミット**

Run: `npx vitest run`
Expected: PASS（18 件）

```bash
git add lib/share.ts lib/share.test.ts components/ShareButtons.tsx "app/result/[yokaiId]/page.tsx" app/layout.tsx
git commit -m "feat: X シェアと URL コピーを追加し metadataBase を設定"
```

---

### Task 5: OGP 画像の日本語化（サブセットフォント）

`ImageResponse` は合計 500KB の上限があり、日本語フォント全体は入らない。また、`cacheComponents` 下で OGP 画像内の `fetch` がどう扱われるかはドキュメントに記載がない。そこで、ドキュメントにある「モジュールのトップレベルで `readFile` する」方式を採る。画像に使う文字だけを Google Fonts の `text=` パラメータで取得するスクリプトを用意し、取得したサブセットフォントをリポジトリに置く。

**Files:**
- Create: `lib/og.ts`
- Test: `lib/og.test.ts`
- Create: `scripts/fetch-og-font.ts`
- Create（スクリプトが生成）: `assets/og/NotoSansJP-Bold-subset.ttf`、`assets/og/chars.txt`
- Modify: `package.json`（`tsx` と `og:font` スクリプト）
- Modify: `app/result/[yokaiId]/opengraph-image.tsx`

**Interfaces:**
- Consumes: `YOKAI`、`getYokai`（Task 2）、`Yokai`（Task 1）
- Produces:
  - `OG_HEADING = 'あなたを妖怪に例えると'`、`OG_SITE_NAME = '妖怪診断'`
  - `ogTexts(yokai: Yokai): string[]`
  - `allOgChars(): string`（全妖怪の OGP 文言に含まれる文字を重複なく並べたもの）
  - `npm run og:font`（フォントと `chars.txt` を再生成）

- [ ] **Step 1: 失敗するテストを書く**

`lib/og.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { allOgChars, ogTexts } from './og'
import { YOKAI } from './yokai/yokai'

describe('OGP の文言', () => {
  it('見出し・妖怪名・キャッチ・サイト名を含む', () => {
    expect(ogTexts(YOKAI[0])).toEqual([
      'あなたを妖怪に例えると',
      '河童',
      'とりあえず飛び込んでみる派',
      '妖怪診断',
    ])
  })

  it('allOgChars は文字を重複なく返す', () => {
    const chars = [...allOgChars()]
    expect(new Set(chars).size).toBe(chars.length)
  })

  it('サブセットフォントが OGP の全文字を含んでいる（含まないなら npm run og:font を実行する）', () => {
    const fontChars = new Set(
      readFileSync(join(process.cwd(), 'assets/og/chars.txt'), 'utf8'),
    )
    const missing = [...allOgChars()].filter((char) => !fontChars.has(char))
    expect(missing).toEqual([])
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run lib/og.test.ts`
Expected: FAIL（`./og` が存在しないため import エラー）

- [ ] **Step 3: OGP の文言を定義する**

`lib/og.ts`:

```ts
import type { Yokai } from './yokai/types'
import { YOKAI } from './yokai/yokai'

export const OG_HEADING = 'あなたを妖怪に例えると'
export const OG_SITE_NAME = '妖怪診断'

// OGP 画像に描く文字列（絵文字は twemoji で描くので含めない）
export function ogTexts(yokai: Yokai): string[] {
  return [OG_HEADING, yokai.name, yokai.catchphrase, OG_SITE_NAME]
}

export function allOgChars(): string {
  const chars = new Set(YOKAI.flatMap(ogTexts).join(''))
  return [...chars].sort().join('')
}
```

- [ ] **Step 4: 3 件目だけが失敗することを確認する**

Run: `npx vitest run lib/og.test.ts`
Expected: 2 件 PASS、「サブセットフォントが…」の 1 件が FAIL（`assets/og/chars.txt` が無いため ENOENT）

- [ ] **Step 5: フォント取得スクリプトを書く**

```bash
npm install -D tsx
```

`package.json` の `scripts` に追加:

```json
"og:font": "tsx scripts/fetch-og-font.ts"
```

`scripts/fetch-og-font.ts`:

```ts
// OGP 画像に使う文字だけを含む Noto Sans JP Bold を Google Fonts から取得する。
// 妖怪名・キャッチ・OGP の見出しを変えたら再実行すること。
import { mkdir, writeFile } from 'node:fs/promises'
import { allOgChars } from '../lib/og'

const OUT_DIR = 'assets/og'

async function main() {
  const chars = allOgChars()
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(chars)}`
  const cssResponse = await fetch(cssUrl)
  if (!cssResponse.ok) {
    throw new Error(`CSS の取得に失敗しました: ${cssResponse.status}`)
  }
  const css = await cssResponse.text()

  // ImageResponse は woff2 を読めないので ttf / otf の URL を取り出す
  const match = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)
  if (!match) {
    throw new Error(`ttf / otf のフォント URL が見つかりません:\n${css}`)
  }

  const fontResponse = await fetch(match[1])
  if (!fontResponse.ok) {
    throw new Error(`フォントの取得に失敗しました: ${fontResponse.status}`)
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(
    `${OUT_DIR}/NotoSansJP-Bold-subset.ttf`,
    Buffer.from(await fontResponse.arrayBuffer()),
  )
  await writeFile(`${OUT_DIR}/chars.txt`, chars)
  console.log(`${chars.length} 文字分のフォントを ${OUT_DIR} に保存しました`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 6: スクリプトを実行する**

Run: `npm run og:font`
Expected: `… 文字分のフォントを assets/og に保存しました`。`ls -l assets/og` で ttf が数十 KB 程度（500KB 未満）であること。

「ttf / otf のフォント URL が見つかりません」で失敗した場合は、出力された CSS をそのままユーザーに報告して止まる（取得方式の変更は相談してから）。

- [ ] **Step 7: テストが通ることを確認する**

Run: `npx vitest run lib/og.test.ts`
Expected: PASS（3 件）

- [ ] **Step 8: OGP 画像を日本語化する**

参考: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md`（Custom fonts の項）

`app/result/[yokaiId]/opengraph-image.tsx` を全体置き換え:

```tsx
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { OG_HEADING, OG_SITE_NAME } from '@/lib/og'
import { getYokai } from '@/lib/yokai/yokai'

export const alt = '妖怪診断の結果'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = {
  params: Promise<{ yokaiId: string }>
}

// フォントはリクエストに依存しないので、モジュールのトップレベルで 1 回だけ読む
const notoSansJpBold = await readFile(
  join(process.cwd(), 'assets/og/NotoSansJP-Bold-subset.ttf'),
)

export default async function Image({ params }: Props) {
  const { yokaiId } = await params
  const yokai = getYokai(yokaiId)
  if (!yokai) return new Response('Not Found', { status: 404 })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: '#1c1917',
          color: '#fafaf9',
          fontFamily: 'Noto Sans JP',
        }}
      >
        <div style={{ display: 'flex', fontSize: 36, color: '#a8a29e' }}>{OG_HEADING}</div>
        <div style={{ display: 'flex', fontSize: 160 }}>{yokai.emoji}</div>
        <div style={{ display: 'flex', fontSize: 96 }}>{yokai.name}</div>
        <div style={{ display: 'flex', fontSize: 40 }}>{yokai.catchphrase}</div>
        <div style={{ display: 'flex', fontSize: 28, color: '#a8a29e', marginTop: 24 }}>
          {OG_SITE_NAME}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Noto Sans JP', data: notoSansJpBold, weight: 700, style: 'normal' }],
    },
  )
}
```

- [ ] **Step 9: ビルドして画像を目で確認する**

Run: `npm run build`
Expected: 成功

```bash
npx next start -p 3100 > .next/start.log 2>&1 &
echo $! > .next/start.pid
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3100/ && break; sleep 1; done
for id in kappa tengu zashikiwarashi kyubi yukionna ittanmomen; do
  curl -s -o ".next/og-$id.png" -w "$id: %{http_code} %{content_type}\n" "http://localhost:3100/result/$id/opengraph-image"
done
kill "$(cat .next/start.pid)"
```

Expected: 6 行とも `200 image/png`。`.next/og-*.png` を画像ビューアで開き、6 枚すべてで日本語が豆腐（□）にならず、絵文字・妖怪名・キャッチ・サイト名が表示されていること。

- [ ] **Step 10: 設計書をこの方式に合わせて更新済みであることを確認する**

`docs/superpowers/specs/2026-11-20-yokai-diagnosis-design.md` の「7. シェア機能 › OGP 画像」が「サブセットフォントをリポジトリに置き `readFile` で読む」方式になっていること（計画作成時に更新済み。食い違っていたら直す）。

- [ ] **Step 11: 全テストを確認してコミット**

Run: `npx vitest run`
Expected: PASS（21 件）

```bash
git add lib/og.ts lib/og.test.ts scripts/fetch-og-font.ts assets/og/NotoSansJP-Bold-subset.ttf assets/og/chars.txt package.json package-lock.json "app/result/[yokaiId]/opengraph-image.tsx"
git commit -m "feat: OGP 画像を日本語化（使用文字だけのサブセットフォント）"
```

---

### Task 6: 質問画面 `Quiz`

**Files:**
- Create: `components/Quiz.tsx`
- Test: `components/Quiz.test.tsx`
- Create: `app/quiz/page.tsx`

**Interfaces:**
- Consumes: `diagnose`、`Question`、`YokaiId`（Task 1）、`QUESTIONS`、`YOKAI_IDS`（Task 2）
- Produces: `<Quiz questions={Question[]} yokaiOrder={YokaiId[]} />`、ルート `/quiz`

- [ ] **Step 1: 失敗するテストを書く**

`components/Quiz.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Question, YokaiId } from '@/lib/yokai/types'
import { Quiz } from './Quiz'

// vi.mock は import より先に実行されるため、モック関数は vi.hoisted で作る
const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

const questions: Question[] = [
  {
    id: 'q1',
    text: '質問その1',
    choices: [
      { label: 'A1', points: { kappa: 1 } },
      { label: 'B1', points: { tengu: 1 } },
    ],
  },
  {
    id: 'q2',
    text: '質問その2',
    choices: [
      { label: 'A2', points: { kappa: 1 } },
      { label: 'B2', points: { tengu: 1 } },
    ],
  },
]
const order: YokaiId[] = ['kappa', 'tengu']

describe('Quiz', () => {
  beforeEach(() => {
    push.mockClear()
  })

  it('1 問目と進捗を表示する', () => {
    render(<Quiz questions={questions} yokaiOrder={order} />)
    expect(screen.getByRole('heading', { name: '質問その1' })).toBeDefined()
    expect(screen.getByText('1 / 2')).toBeDefined()
  })

  it('選択肢を選ぶと次の問題に進む', () => {
    render(<Quiz questions={questions} yokaiOrder={order} />)
    fireEvent.click(screen.getByRole('button', { name: 'A1' }))
    expect(screen.getByRole('heading', { name: '質問その2' })).toBeDefined()
    expect(screen.getByText('2 / 2')).toBeDefined()
  })

  it('1 問目では「前の問題に戻る」が押せない', () => {
    render(<Quiz questions={questions} yokaiOrder={order} />)
    const back = screen.getByRole('button', { name: '前の問題に戻る' }) as HTMLButtonElement
    expect(back.disabled).toBe(true)
  })

  it('「前の問題に戻る」で 1 つ前の問題に戻り、選び直せる', () => {
    render(<Quiz questions={questions} yokaiOrder={order} />)
    fireEvent.click(screen.getByRole('button', { name: 'A1' }))
    fireEvent.click(screen.getByRole('button', { name: '前の問題に戻る' }))
    expect(screen.getByRole('heading', { name: '質問その1' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'B1' }))
    fireEvent.click(screen.getByRole('button', { name: 'B2' }))
    expect(push).toHaveBeenCalledWith('/result/tengu')
  })

  it('最後の回答で結果ページへ 1 回だけ遷移し、選択肢を残さない', () => {
    render(<Quiz questions={questions} yokaiOrder={order} />)
    fireEvent.click(screen.getByRole('button', { name: 'A1' }))
    fireEvent.click(screen.getByRole('button', { name: 'A2' }))

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/result/kappa')
    expect(screen.queryByRole('button', { name: 'A2' })).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('結果を表示しています…')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run components/Quiz.test.tsx`
Expected: FAIL（`./Quiz` が存在しないため import エラー）

- [ ] **Step 3: 実装する**

`components/Quiz.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { diagnose } from '@/lib/yokai/diagnose'
import type { Answers, Question, YokaiId } from '@/lib/yokai/types'

type Props = {
  questions: Question[]
  yokaiOrder: YokaiId[]
}

export function Quiz({ questions, yokaiOrder }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Answers>([])

  // 全問回答済み。選択肢を消して二重遷移を防ぐ
  if (answers.length === questions.length) {
    return (
      <p role="status" className="text-center text-zinc-500">
        結果を表示しています…
      </p>
    )
  }

  const index = answers.length
  const question = questions[index]

  function choose(choiceIndex: number) {
    const next = [...answers, choiceIndex]
    setAnswers(next)
    if (next.length === questions.length) {
      router.push(`/result/${diagnose(questions, next, yokaiOrder)}`)
    }
  }

  function goBack() {
    setAnswers(answers.slice(0, -1))
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <p className="text-sm text-zinc-500">
        {index + 1} / {questions.length}
      </p>
      <h1 className="text-2xl font-bold">{question.text}</h1>
      <ul className="flex flex-col gap-3">
        {question.choices.map((choice, i) => (
          <li key={choice.label}>
            <button
              type="button"
              onClick={() => choose(i)}
              className="w-full rounded-xl border border-zinc-300 px-5 py-4 text-left hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              {choice.label}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={goBack}
        disabled={index === 0}
        className="self-start text-sm underline disabled:no-underline disabled:opacity-40"
      >
        前の問題に戻る
      </button>
    </div>
  )
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run components/Quiz.test.tsx`
Expected: PASS（5 件）

- [ ] **Step 5: 質問ページを作る**

`app/quiz/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { Quiz } from '@/components/Quiz'
import { QUESTIONS } from '@/lib/yokai/questions'
import { YOKAI_IDS } from '@/lib/yokai/yokai'

export const metadata: Metadata = {
  title: '診断中 | 妖怪診断',
}

export default function QuizPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-16">
      <Quiz questions={QUESTIONS} yokaiOrder={YOKAI_IDS} />
    </main>
  )
}
```

- [ ] **Step 6: 全テストとビルドを確認する**

Run: `npx vitest run`
Expected: PASS（26 件）

Run: `npm run build`
Expected: 成功。ルート一覧に `/quiz` が表示される

- [ ] **Step 7: コミット**

```bash
git add components/Quiz.tsx components/Quiz.test.tsx app/quiz/page.tsx
git commit -m "feat: 質問画面を追加（進捗表示・戻る・最後の回答で結果へ遷移）"
```

---

### Task 7: トップページと最終確認

**Files:**
- Modify: `app/page.tsx`（雛形を全体置き換え）

**Interfaces:**
- Consumes: `YOKAI`（Task 2）、ルート `/quiz`（Task 6）
- Produces: ルート `/`

- [ ] **Step 1: トップページを書く**

`app/page.tsx` を全体置き換え（既存ファイルのダブルクォート・セミコロンのスタイルに合わせる）:

```tsx
import Link from "next/link";
import { YOKAI } from "@/lib/yokai/yokai";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <p className="text-5xl" aria-hidden="true">
        {YOKAI.map((yokai) => yokai.emoji).join(" ")}
      </p>
      <h1 className="text-4xl font-bold">妖怪診断</h1>
      <p className="leading-8 text-zinc-700 dark:text-zinc-300">
        7つの質問に答えると、あなたを妖怪に例えると何になるかがわかります。
      </p>
      <Link
        href="/quiz"
        className="rounded-full bg-black px-8 py-4 text-lg font-semibold text-white dark:bg-white dark:text-black"
      >
        診断スタート
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: テスト・lint・ビルドをまとめて確認する**

Run: `npx vitest run`
Expected: PASS（26 件）

Run: `npm run lint`
Expected: エラーなし

Run: `npm run build`
Expected: 成功。ルート一覧に `/`、`/quiz`、`/result/[yokaiId]`（6 パス）、`/result/[yokaiId]/opengraph-image` が表示される

- [ ] **Step 3: 本番サーバーでステータスを最終確認する**

```bash
npx next start -p 3100 > .next/start.log 2>&1 &
echo $! > .next/start.pid
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3100/ && break; sleep 1; done
for p in / /quiz /result/kappa /result/foo /result/kappa/opengraph-image; do
  curl -s -o /dev/null -w "$p: %{http_code}\n" "http://localhost:3100$p"
done
kill "$(cat .next/start.pid)"
```

Expected:

```
/: 200
/quiz: 200
/result/kappa: 200
/result/foo: 404
/result/kappa/opengraph-image: 200
```

- [ ] **Step 4: ブラウザで通しの動作を確認する**

`npm run dev` を起動し、`http://localhost:3000` で次を確認する（終わったら停止する。`AGENTS.md` が書き換わっていてもコミットに含めない）。

1. トップの「診断スタート」→ 質問 1 / 7 が表示される
2. 1 問目では「前の問題に戻る」が押せない。2 問目で押すと 1 問目に戻る
3. 7 問答えると `/result/<id>` に遷移し、絵文字・名前・キャッチ・説明が表示される
4. 「X でシェア」で X の投稿画面が新しいタブで開き、投稿文と結果 URL が入っている
5. 「URL をコピー」で「コピーしました」が約 2 秒表示される
6. 「もう一度診断する」で 1 問目から始まる

- [ ] **Step 5: コミット**

```bash
git add app/page.tsx
git commit -m "feat: トップページを妖怪診断の入口に作り直す"
```

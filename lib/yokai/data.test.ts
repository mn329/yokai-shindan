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

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
      { label: 'D', points: { tengu: 2 } },
    ],
  },
]

describe('diagnose', () => {
  it('選んだ選択肢の点数を合計し、最高点の妖怪を返す', () => {
    expect(diagnose(questions, [0, 0], order)).toBe('kappa') // kappa 3
    expect(diagnose(questions, [1, 1], order)).toBe('zashikiwarashi') // tengu 2, zashikiwarashi 4
  })

  it('同点のときは yokaiOrder で先に現れる妖怪を返す', () => {
    // kappa 2, tengu 2
    expect(diagnose(questions, [0, 3], order)).toBe('kappa')
    expect(diagnose(questions, [0, 3], ['tengu', 'kappa', 'zashikiwarashi'])).toBe('tengu')
  })

  it('全員 0 点のときは yokaiOrder の先頭を返す', () => {
    expect(diagnose(questions, [2, 2], order)).toBe('kappa')
  })

  it('回答数が質問数と一致しないときはエラーを投げる', () => {
    expect(() => diagnose(questions, [0], order)).toThrow('回答数')
    expect(() => diagnose(questions, [0, 0, 0], order)).toThrow('回答数')
  })

  it('選択肢インデックスが範囲外ならエラーを投げる', () => {
    expect(() => diagnose(questions, [0, 4], order)).toThrow('範囲外')
    expect(() => diagnose(questions, [-1, 0], order)).toThrow('範囲外')
    expect(() => diagnose(questions, [0.5, 0], order)).toThrow('範囲外')
  })

  it('yokaiOrder が空ならエラーを投げる', () => {
    expect(() => diagnose(questions, [0, 0], [])).toThrow('yokaiOrder')
  })
})

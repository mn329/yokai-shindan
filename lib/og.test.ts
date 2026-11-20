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

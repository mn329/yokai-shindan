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

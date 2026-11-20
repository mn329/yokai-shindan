// @vitest-environment node
import { NextRequest } from 'next/server'
import {
  getRewrittenUrl,
  isRewrite,
  unstable_doesMiddlewareMatch,
} from 'next/experimental/testing/server'
import { describe, expect, it } from 'vitest'
import { config, proxy } from './proxy'

function request(path: string) {
  return new NextRequest(`http://localhost:3000${path}`)
}

describe('proxy', () => {
  it('結果ページへのリクエストにだけ適用される', () => {
    const match = (url: string) => unstable_doesMiddlewareMatch({ config, url })
    expect(match('/result/kappa')).toBe(true)
    expect(match('/result/foo/opengraph-image')).toBe(true)
    expect(match('/')).toBe(false)
    expect(match('/quiz')).toBe(false)
  })

  it('定義済みの妖怪 ID はそのまま通す', () => {
    expect(isRewrite(proxy(request('/result/kappa')))).toBe(false)
    expect(isRewrite(proxy(request('/result/ittanmomen/opengraph-image')))).toBe(false)
  })

  it('未定義の妖怪 ID は存在しないパスに振り替えて 404 にする', () => {
    for (const path of ['/result/foo', '/result/foo/opengraph-image', '/result/constructor']) {
      const response = proxy(request(path))
      expect(isRewrite(response), path).toBe(true)
      expect(getRewrittenUrl(response)).toBe('http://localhost:3000/404')
    }
  })
})

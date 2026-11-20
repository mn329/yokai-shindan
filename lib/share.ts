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

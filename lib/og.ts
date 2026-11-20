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

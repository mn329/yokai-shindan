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

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

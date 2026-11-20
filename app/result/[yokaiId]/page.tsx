import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ShareButtons } from '@/components/ShareButtons'
import { SITE_URL } from '@/lib/site'
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
      <ShareButtons yokai={yokai} siteUrl={SITE_URL} />
    </main>
  )
}

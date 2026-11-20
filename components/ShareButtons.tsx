'use client'

import Link from 'next/link'
import { useState } from 'react'
import { buildResultUrl, buildShareUrl } from '@/lib/share'
import type { Yokai } from '@/lib/yokai/types'

type Props = {
  yokai: Yokai
  siteUrl: string
}

type CopyStatus = 'idle' | 'copied' | 'failed'

const COPY_MESSAGES: Record<CopyStatus, string> = {
  idle: '',
  copied: 'コピーしました',
  failed: 'コピーできませんでした',
}

export function ShareButtons({ yokai, siteUrl }: Props) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')

  async function copyResultUrl() {
    try {
      // 非セキュアな環境では navigator.clipboard が無いので、ここで例外になる
      await navigator.clipboard.writeText(buildResultUrl(siteUrl, yokai.id))
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
    setTimeout(() => setCopyStatus('idle'), 2000)
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <a
        href={buildShareUrl(yokai, siteUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full rounded-full bg-black px-6 py-3 font-semibold text-white dark:bg-white dark:text-black"
      >
        X でシェア
      </a>
      <button
        type="button"
        onClick={copyResultUrl}
        className="w-full rounded-full border border-zinc-300 px-6 py-3 font-semibold dark:border-zinc-700"
      >
        URL をコピー
      </button>
      <p role="status" className="h-5 text-sm text-zinc-500">
        {COPY_MESSAGES[copyStatus]}
      </p>
      <Link href="/quiz" className="underline">
        もう一度診断する
      </Link>
    </div>
  )
}

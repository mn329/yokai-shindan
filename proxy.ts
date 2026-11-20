import { NextResponse, type NextRequest } from 'next/server'
import { YOKAI_IDS } from '@/lib/yokai/yokai'

const KNOWN_IDS = new Set<string>(YOKAI_IDS)

// partialPrefetching 下ではページ内の notFound() が 200 + noindex になるため、
// 未定義の妖怪 ID は描画前にここで存在しないパスへ振り替え、本物の 404 を返す
export function proxy(request: NextRequest) {
  const yokaiId = request.nextUrl.pathname.split('/')[2]
  if (!KNOWN_IDS.has(yokaiId)) {
    return NextResponse.rewrite(new URL('/404', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/result/:path+',
}

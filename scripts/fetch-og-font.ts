// OGP 画像に使う文字だけを含む Noto Sans JP Bold を Google Fonts から取得する。
// 妖怪名・キャッチ・OGP の見出しを変えたら再実行すること。
import { mkdir, writeFile } from 'node:fs/promises'
import { allOgChars } from '../lib/og'

const OUT_DIR = 'assets/og'

async function main() {
  const chars = allOgChars()
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(chars)}`
  const cssResponse = await fetch(cssUrl)
  if (!cssResponse.ok) {
    throw new Error(`CSS の取得に失敗しました: ${cssResponse.status}`)
  }
  const css = await cssResponse.text()

  // ImageResponse は woff2 を読めないので ttf / otf の URL を取り出す
  const match = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)
  if (!match) {
    throw new Error(`ttf / otf のフォント URL が見つかりません:\n${css}`)
  }

  const fontResponse = await fetch(match[1])
  if (!fontResponse.ok) {
    throw new Error(`フォントの取得に失敗しました: ${fontResponse.status}`)
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(
    `${OUT_DIR}/NotoSansJP-Bold-subset.ttf`,
    Buffer.from(await fontResponse.arrayBuffer()),
  )
  await writeFile(`${OUT_DIR}/chars.txt`, chars)
  console.log(`${chars.length} 文字分のフォントを ${OUT_DIR} に保存しました`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

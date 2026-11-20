import type { Yokai } from './types'

// 配列の順序は同点時の優先順位を兼ねる
export const YOKAI: Yokai[] = [
  {
    id: 'kappa',
    name: '河童',
    emoji: '🥒',
    catchphrase: 'とりあえず飛び込んでみる派',
    description:
      '「面白そう」と思ったら、考えるより先に体が動くタイプ。好奇心旺盛で人懐っこく、あなたがいると場が一気ににぎやかになります。ときどき勢い余って川に流されることもありますが、それも含めて愛されキャラです。',
  },
  {
    id: 'tengu',
    name: '天狗',
    emoji: '👺',
    catchphrase: '頂上しか見ていない',
    description:
      '高い目標を掲げ、自分を鍛え続けるストイックなリーダー。自信に満ちた姿に、周りは自然とついていきます。ただし鼻が高くなりすぎないよう、ときどき山を下りて仲間の声を聞いてみて。',
  },
  {
    id: 'zashikiwarashi',
    name: '座敷わらし',
    emoji: '👘',
    catchphrase: 'あなたのいる場所が福になる',
    description:
      'いるだけで場がふんわり和む癒し系。人の喜ぶ顔が何よりのごちそうで、気づけばみんなの幸せを支えています。あなたがいなくなると、周りは初めてその存在の大きさに気づくかも。',
  },
  {
    id: 'kyubi',
    name: '九尾の狐',
    emoji: '🦊',
    catchphrase: '3手先まで読んでいる',
    description:
      '人の心の動きを読み、静かに最善手を打つ頭脳派の戦略家。表情ひとつ変えずに場をコントロールできる、九本のしっぽを隠し持った切れ者です。たまには化けずに、素の自分を見せても大丈夫。',
  },
  {
    id: 'yukionna',
    name: '雪女',
    emoji: '❄️',
    catchphrase: '静かに、でも芯は熱い',
    description:
      '感情を表に出さないクールな一匹狼。近寄りがたく見られがちですが、本当は誰よりも情が深く、大切な人のことはずっと覚えています。心を許した相手にだけ見せる笑顔は、雪解けのような破壊力。',
  },
  {
    id: 'ittanmomen',
    name: '一反木綿',
    emoji: '🧣',
    catchphrase: '風が吹いたら、そっちへ行く',
    description:
      '風の向くまま気の向くまま、ひらひらと生きる自由人。ルールや予定に縛られるのが苦手で、思いがけない場所にふらっと現れます。その身軽さが、周りに新しい景色を見せてくれます。',
  },
]

export const YOKAI_IDS = YOKAI.map((yokai) => yokai.id)

export function getYokai(id: string): Yokai | undefined {
  return YOKAI.find((yokai) => yokai.id === id)
}

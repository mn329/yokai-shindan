import type { Question } from './types'

export const QUESTIONS: Question[] = [
  {
    id: 'holiday',
    text: '休日の過ごし方は？',
    choices: [
      { label: '友達を誘って新しい場所へ', points: { kappa: 2, zashikiwarashi: 1 } },
      { label: '目標に向けて自主練や勉強', points: { tengu: 2, kyubi: 1 } },
      { label: '一人で静かに読書や映画', points: { yukionna: 2, kyubi: 1 } },
      { label: '予定は決めず、気の向くまま', points: { ittanmomen: 2, kappa: 1 } },
    ],
  },
  {
    id: 'group-decision',
    text: 'グループで何かを決めるとき、あなたは？',
    choices: [
      { label: '真っ先に意見を出して引っ張る', points: { tengu: 2, kappa: 1 } },
      { label: 'みんなの意見を聞いてまとめる', points: { zashikiwarashi: 2, kyubi: 1 } },
      { label: '流れを見て、最後に通りそうな案を出す', points: { kyubi: 2, yukionna: 1 } },
      { label: '決まったことについていく', points: { ittanmomen: 2, zashikiwarashi: 1 } },
    ],
  },
  {
    id: 'friend-down',
    text: '友達が落ち込んでいたら？',
    choices: [
      { label: '遊びに連れ出して気分転換', points: { kappa: 2, ittanmomen: 1 } },
      { label: '黙ってそばにいる', points: { zashikiwarashi: 2, yukionna: 1 } },
      { label: '原因を一緒に分析して解決策を考える', points: { kyubi: 2, tengu: 1 } },
      { label: 'あえて触れず、落ち着いたころに一言かける', points: { yukionna: 2, kyubi: 1 } },
    ],
  },
  {
    id: 'trip',
    text: '旅行の計画を立てるなら？',
    choices: [
      { label: '分刻みのスケジュールを組む', points: { tengu: 2, kyubi: 1 } },
      { label: '行き先だけ決めて、あとは現地で', points: { ittanmomen: 2, kappa: 1 } },
      { label: 'みんなの行きたい所を全部入れる', points: { zashikiwarashi: 2, kappa: 1 } },
      { label: '誰も知らない穴場を下調べする', points: { kyubi: 2, yukionna: 1 } },
    ],
  },
  {
    id: 'party',
    text: '初対面の人が多い集まりでは？',
    choices: [
      { label: '自分から話しかけて輪を広げる', points: { kappa: 2, tengu: 1 } },
      { label: '気づけば聞き役になっている', points: { zashikiwarashi: 2, kyubi: 1 } },
      { label: '端のほうで様子を観察する', points: { yukionna: 2, kyubi: 1 } },
      { label: '途中でふらっと抜ける', points: { ittanmomen: 2, yukionna: 1 } },
    ],
  },
  {
    id: 'failure',
    text: '失敗してしまったときは？',
    choices: [
      { label: '悔しくて「次は絶対に勝つ」と燃える', points: { tengu: 2 } },
      { label: '「まあいっか」とすぐ切り替える', points: { ittanmomen: 2, kappa: 1 } },
      { label: 'なぜ失敗したかを冷静に振り返る', points: { kyubi: 2, yukionna: 1 } },
      { label: '迷惑をかけた人にまず謝りに行く', points: { zashikiwarashi: 2 } },
    ],
  },
  {
    id: 'value',
    text: 'あなたが一番大事にしたいものは？',
    choices: [
      { label: '楽しさ', points: { kappa: 2 } },
      { label: '成長', points: { tengu: 2 } },
      { label: '人とのつながり', points: { zashikiwarashi: 2 } },
      { label: '自分だけの時間', points: { yukionna: 2, ittanmomen: 1 } },
    ],
  },
]

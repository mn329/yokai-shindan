export type YokaiId =
  | 'kappa'
  | 'tengu'
  | 'zashikiwarashi'
  | 'kyubi'
  | 'yukionna'
  | 'ittanmomen'

export type Yokai = {
  id: YokaiId
  name: string
  emoji: string
  catchphrase: string
  description: string
}

export type Choice = {
  label: string
  points: Partial<Record<YokaiId, number>>
}

export type Question = {
  id: string
  text: string
  choices: Choice[]
}

// 各質問で選んだ選択肢のインデックス
export type Answers = number[]

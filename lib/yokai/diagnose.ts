import type { Answers, Question, YokaiId } from './types'

export function diagnose(
  questions: Question[],
  answers: Answers,
  yokaiOrder: YokaiId[],
): YokaiId {
  if (yokaiOrder.length === 0) {
    throw new Error('yokaiOrder が空です')
  }
  if (answers.length !== questions.length) {
    throw new Error(
      `回答数(${answers.length})が質問数(${questions.length})と一致しません`,
    )
  }

  const scores = new Map<YokaiId, number>(yokaiOrder.map((id) => [id, 0]))

  questions.forEach((question, i) => {
    const answer = answers[i]
    if (!Number.isInteger(answer) || answer < 0 || answer >= question.choices.length) {
      throw new Error(`質問 ${question.id} の回答 ${answer} は範囲外です`)
    }
    const choice = question.choices[answer]
    for (const [id, point] of Object.entries(choice.points)) {
      const yokaiId = id as YokaiId
      scores.set(yokaiId, (scores.get(yokaiId) ?? 0) + (point ?? 0))
    }
  })

  // 同点なら先に現れた妖怪を残すため、厳密に大きいときだけ更新する
  let best = yokaiOrder[0]
  for (const id of yokaiOrder) {
    if ((scores.get(id) ?? 0) > (scores.get(best) ?? 0)) best = id
  }
  return best
}

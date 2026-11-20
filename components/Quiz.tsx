'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { diagnose } from '@/lib/yokai/diagnose'
import type { Answers, Question, YokaiId } from '@/lib/yokai/types'

type Props = {
  questions: Question[]
  yokaiOrder: YokaiId[]
}

export function Quiz({ questions, yokaiOrder }: Props) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Answers>([])

  // 全問回答済み。選択肢を消して二重遷移を防ぐ
  if (answers.length === questions.length) {
    return (
      <p role="status" className="text-center text-zinc-500">
        結果を表示しています…
      </p>
    )
  }

  const index = answers.length
  const question = questions[index]

  function choose(choiceIndex: number) {
    const next = [...answers, choiceIndex]
    setAnswers(next)
    if (next.length === questions.length) {
      router.push(`/result/${diagnose(questions, next, yokaiOrder)}`)
    }
  }

  function goBack() {
    setAnswers(answers.slice(0, -1))
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <p className="text-sm text-zinc-500">
        {index + 1} / {questions.length}
      </p>
      <h1 className="text-2xl font-bold">{question.text}</h1>
      <ul className="flex flex-col gap-3">
        {question.choices.map((choice, i) => (
          <li key={choice.label}>
            <button
              type="button"
              onClick={() => choose(i)}
              className="w-full rounded-xl border border-zinc-300 px-5 py-4 text-left hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              {choice.label}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={goBack}
        disabled={index === 0}
        className="self-start text-sm underline disabled:no-underline disabled:opacity-40"
      >
        前の問題に戻る
      </button>
    </div>
  )
}

import type { Metadata } from 'next'
import { Quiz } from '@/components/Quiz'
import { QUESTIONS } from '@/lib/yokai/questions'
import { YOKAI_IDS } from '@/lib/yokai/yokai'

export const metadata: Metadata = {
  title: '診断中 | 妖怪診断',
}

export default function QuizPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-16">
      <Quiz questions={QUESTIONS} yokaiOrder={YOKAI_IDS} />
    </main>
  )
}

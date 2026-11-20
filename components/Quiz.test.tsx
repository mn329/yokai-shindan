import { fireEvent, render, screen } from '@testing-library/react'
import { Activity } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Question, YokaiId } from '@/lib/yokai/types'
import { Quiz } from './Quiz'

// vi.mock は import より先に実行されるため、モック関数は vi.hoisted で作る
const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

const questions: Question[] = [
  {
    id: 'q1',
    text: '質問その1',
    choices: [
      { label: 'A1', points: { kappa: 1 } },
      { label: 'B1', points: { tengu: 1 } },
    ],
  },
  {
    id: 'q2',
    text: '質問その2',
    choices: [
      { label: 'A2', points: { kappa: 1 } },
      { label: 'B2', points: { tengu: 1 } },
    ],
  },
]
const order: YokaiId[] = ['kappa', 'tengu']

describe('Quiz', () => {
  beforeEach(() => {
    push.mockClear()
  })

  it('1 問目と進捗を表示する', () => {
    render(<Quiz questions={questions} yokaiOrder={order} />)
    expect(screen.getByRole('heading', { name: '質問その1' })).toBeDefined()
    expect(screen.getByText('1 / 2')).toBeDefined()
  })

  it('選択肢を選ぶと次の問題に進む', () => {
    render(<Quiz questions={questions} yokaiOrder={order} />)
    fireEvent.click(screen.getByRole('button', { name: 'A1' }))
    expect(screen.getByRole('heading', { name: '質問その2' })).toBeDefined()
    expect(screen.getByText('2 / 2')).toBeDefined()
  })

  it('1 問目では「前の問題に戻る」が押せない', () => {
    render(<Quiz questions={questions} yokaiOrder={order} />)
    const back = screen.getByRole('button', { name: '前の問題に戻る' }) as HTMLButtonElement
    expect(back.disabled).toBe(true)
  })

  it('「前の問題に戻る」で 1 つ前の問題に戻り、選び直せる', () => {
    render(<Quiz questions={questions} yokaiOrder={order} />)
    fireEvent.click(screen.getByRole('button', { name: 'A1' }))
    fireEvent.click(screen.getByRole('button', { name: '前の問題に戻る' }))
    expect(screen.getByRole('heading', { name: '質問その1' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'B1' }))
    fireEvent.click(screen.getByRole('button', { name: 'B2' }))
    expect(push).toHaveBeenCalledWith('/result/tengu')
  })

  it('最後の回答で結果ページへ 1 回だけ遷移し、選択肢を残さない', () => {
    render(<Quiz questions={questions} yokaiOrder={order} />)
    fireEvent.click(screen.getByRole('button', { name: 'A1' }))
    fireEvent.click(screen.getByRole('button', { name: 'A2' }))

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/result/kappa')
    expect(screen.queryByRole('button', { name: 'A2' })).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('結果を表示しています…')
  })

  it('全問回答後に画面が隠れて再表示されたら、1 問目からやり直せる', () => {
    // cacheComponents ではページ遷移で Activity に隠され、state が保持される
    const { rerender } = render(
      <Activity mode="visible">
        <Quiz questions={questions} yokaiOrder={order} />
      </Activity>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'A1' }))
    fireEvent.click(screen.getByRole('button', { name: 'A2' }))

    rerender(
      <Activity mode="hidden">
        <Quiz questions={questions} yokaiOrder={order} />
      </Activity>,
    )
    rerender(
      <Activity mode="visible">
        <Quiz questions={questions} yokaiOrder={order} />
      </Activity>,
    )

    expect(screen.getByRole('heading', { name: '質問その1' })).toBeDefined()
    expect(screen.getByText('1 / 2')).toBeDefined()
  })

  it('回答途中で画面が隠れて再表示されたら、途中から続けられる', () => {
    const { rerender } = render(
      <Activity mode="visible">
        <Quiz questions={questions} yokaiOrder={order} />
      </Activity>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'A1' }))

    rerender(
      <Activity mode="hidden">
        <Quiz questions={questions} yokaiOrder={order} />
      </Activity>,
    )
    rerender(
      <Activity mode="visible">
        <Quiz questions={questions} yokaiOrder={order} />
      </Activity>,
    )

    expect(screen.getByRole('heading', { name: '質問その2' })).toBeDefined()
  })
})

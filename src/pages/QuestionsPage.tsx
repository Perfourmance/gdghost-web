import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { Chip } from '@/components/Chip'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockSheet } from '@/features/auth/LockSheet'
import { useMe } from '@/features/auth/session'
import { useLockSheet } from '@/features/auth/useLockSheet'
import { EmptyCard, QuestionCard, type CardTarget } from '@/features/content/Cards'
import { questionCategoryLabel } from '@/features/content/labels'
import { useQuestionList, type QuestionFilters } from '@/features/questions/api'
import { useInView } from '@/hooks/useInView'
import { useNowEveryMinute } from '@/lib/time'

const CATEGORIES = ['JOB', 'CAREER', 'PATH', 'CAMPUS', 'STUDY']

/** 질문 목록 (S20) — 분류 필터 · 내 질문 · 답변 기다리는 질문만 · 무한 스크롤. 필터는 주소에 둔다(뒤로 와도 유지) */
export function QuestionsPage() {
  const { data: me } = useMe()
  const member = me != null
  const [params, setParams] = useSearchParams()
  const lock = useLockSheet()
  const now = useNowEveryMinute()

  const category = CATEGORIES.includes(params.get('category') ?? '') ? params.get('category') : null
  const filters: QuestionFilters = {
    category,
    // 내 질문 · 답변 대기 필터는 부원만 (비회원이 mine=true면 401)
    mine: member && params.get('mine') === '1',
    unanswered: member && params.get('unanswered') === '1',
  }

  const list = useQuestionList(filters)
  const { ref: bottomRef, inView } = useInView<HTMLDivElement>()
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  function setFilter(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value == null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const target: CardTarget = { member, onLocked: lock.open }
  const questions = list.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="pb-4">
      <h1 className="text-xl font-bold text-title">질문</h1>

      {/* 분류 칩 — 가로로 밀어서 본다 */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex w-max gap-2">
          <Chip selected={category == null} onClick={() => setFilter('category', null)}>
            전체
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} selected={category === c} onClick={() => setFilter('category', category === c ? null : c)}>
              {questionCategoryLabel(c)}
            </Chip>
          ))}
        </div>
      </div>

      {member && (
        <div className="mt-3 flex gap-4 text-sm">
          <ToggleText checked={filters.mine} onChange={(on) => setFilter('mine', on ? '1' : null)}>
            내 질문
          </ToggleText>
          <ToggleText checked={filters.unanswered} onChange={(on) => setFilter('unanswered', on ? '1' : null)}>
            답변 기다리는 질문만
          </ToggleText>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {list.isPending &&
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[88px] w-full rounded-xl" />)}

        {list.isError && (
          <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
            <p className="text-sm">질문을 불러오지 못했어요.</p>
            <Button variant="secondary" onClick={() => list.refetch()}>
              다시 시도
            </Button>
          </div>
        )}

        {list.isSuccess && questions.length === 0 && (
          <EmptyCard>
            {filters.mine
              ? '아직 남긴 질문이 없어요. 궁금한 걸 선배에게 물어보세요.'
              : filters.unanswered
                ? '답변을 기다리는 질문이 없어요.'
                : '아직 질문이 없어요. 첫 질문을 남겨 보세요.'}
          </EmptyCard>
        )}

        {questions.map((q) => (
          <QuestionCard key={q.id} question={q} target={target} now={now} showDetails />
        ))}

        {/* 바닥이 보이면 다음 20개. 첫 페이지를 받은 뒤에만 붙인다(스크롤 전에 둘째 페이지를 부르지 않게) */}
        {list.isSuccess && hasNextPage && <div ref={bottomRef} aria-hidden className="h-1" />}
        {isFetchingNextPage && <Skeleton className="h-[88px] w-full rounded-xl" />}
        {list.isFetchNextPageError && (
          <Button variant="secondary" className="w-full" onClick={() => fetchNextPage()}>
            더 불러오지 못했어요. 다시 시도
          </Button>
        )}
      </div>

      <LockSheet next={lock.next} onClose={lock.close} title="선배의 답변은 회원에게 열려요" />
    </div>
  )
}

function ToggleText({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={checked ? 'font-bold text-brand-text' : 'text-muted-foreground'}
    >
      {checked ? '✓ ' : ''}
      {children}
    </button>
  )
}

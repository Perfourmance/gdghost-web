import { PencilLine } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Chip, FilterToggle } from '@/components/Chip'
import { SegmentTabs } from '@/components/layout/SegmentTabs'
import { QUESTION_SEGMENTS } from '@/components/layout/segments'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockSheet } from '@/features/auth/LockSheet'
import { useMe } from '@/features/auth/session'
import { useLockSheet } from '@/features/auth/useLockSheet'
import { EmptyCard, QuestionCard, type CardTarget } from '@/features/content/Cards'
import { questionCategoryLabel } from '@/features/content/labels'
import { useQuestionList, type QuestionFilters } from '@/features/questions/api'
import { QUESTION_CATEGORIES as CATEGORIES } from '@/features/questions/write'
import { useLoadMore } from '@/hooks/useLoadMore'
import { useNowEveryMinute } from '@/lib/time'

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
  const { isFetchingNextPage, fetchNextPage } = list
  // 처음 60개까지 저절로, 그다음은 더보기
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)

  function setFilter(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value == null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const target: CardTarget = { member, onLocked: lock.open }
  const questions = list.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="pb-20">
      <h1 className="sr-only">질문</h1>
      <SegmentTabs items={QUESTION_SEGMENTS} label="질문 탭" />

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
        <div className="mt-2 flex gap-4">
          <FilterToggle checked={filters.mine} onClick={() => setFilter('mine', filters.mine ? null : '1')}>
            내 질문
          </FilterToggle>
          <FilterToggle checked={filters.unanswered} onClick={() => setFilter('unanswered', filters.unanswered ? null : '1')}>
            답변 기다리는 질문만
          </FilterToggle>
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

        {/* 바닥이 보이면 다음 20개 (60개까지), 그다음은 더보기 */}
        {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
        {isFetchingNextPage && <Skeleton className="h-[88px] w-full rounded-xl" />}
        {showMoreButton && (
          <Button variant="secondary" className="w-full" onClick={() => fetchNextPage()}>
            더보기
          </Button>
        )}
        {list.isFetchNextPageError && (
          <Button variant="secondary" className="w-full" onClick={() => fetchNextPage()}>
            더 불러오지 못했어요. 다시 시도
          </Button>
        )}
      </div>

      {/* 질문 쓰기 — 하단 탭 위에 떠 있다. 비회원은 잠금 안내 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 mx-auto flex max-w-md justify-end px-4">
        {member ? (
          <Link to={WRITE_PATH} className={writeButtonClass}>
            <PencilLine aria-hidden />
            질문하기
          </Link>
        ) : (
          <button type="button" className={writeButtonClass} onClick={() => lock.open(WRITE_PATH)}>
            <PencilLine aria-hidden />
            질문하기
          </button>
        )}
      </div>

      {lock.next === WRITE_PATH ? (
        <LockSheet
          next={lock.next}
          onClose={lock.close}
          title="질문은 부원만 남길 수 있어요"
          description="GDGoC SMU 부원으로 로그인하면 선배에게 물어볼 수 있어요."
        />
      ) : (
        <LockSheet next={lock.next} onClose={lock.close} title="선배의 답변은 부원만 볼 수 있어요" />
      )}
    </div>
  )
}

const WRITE_PATH = '/questions/new'

const writeButtonClass = buttonVariants({
  size: 'lg',
  className: 'pointer-events-auto h-12 rounded-full px-5 text-[15px] font-bold shadow-lg',
})

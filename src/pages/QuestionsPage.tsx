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
import { DayRetry, LetterCard } from '@/components/day/Day'
import { BigTitle, EmptyState, Fab, Ghost, IconPencil, StoryDayTopBar, TextTabs } from '@/components/story'
import { EmptyCard, QuestionCard, type CardTarget, type QuestionCardData } from '@/features/content/Cards'
import { authorName } from '@/features/member/author'
import { questionCategoryLabel } from '@/features/content/labels'
import { useQuestionList, type QuestionFilters } from '@/features/questions/api'
import { QUESTION_CATEGORIES as CATEGORIES } from '@/features/questions/write'
import { useLoadMore } from '@/hooks/useLoadMore'
import { formatRelative, useNowEveryMinute } from '@/lib/time'

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

  if (!member) {
    return (
      <GuestQuestions
        category={category}
        onCategory={(c) => setFilter('category', c)}
        list={list}
        questions={questions}
        sentinelRef={bottomRef}
        showSentinel={showSentinel}
        showMoreButton={showMoreButton}
        lock={lock}
        now={now}
      />
    )
  }

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
              ? '아직 남긴 질문이 없어요.'
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
          title="질문은 부원만 남길 수 있어요."
          description="부원으로 로그인하면 선배에게 질문할 수 있어요."
        />
      ) : (
        <LockSheet next={lock.next} onClose={lock.close} title="선배의 답변은 부원만 볼 수 있어요." />
      )}
    </div>
  )
}

const WRITE_PATH = '/questions/new'

const writeButtonClass = buttonVariants({
  size: 'lg',
  className: 'pointer-events-auto h-12 rounded-full px-5 text-[15px] font-bold shadow-lg',
})

/**
 * 비회원 질문 목록 — 시안 gquestions-final. 데이터 · 필터 처리는 위 QuestionsPage와 같고 그리는 것만 낮 화면.
 * 아직 안 켜진 별(빈 동그라미) + 점선 길 + 흰 편지 카드, 누르면 잠금 안내
 */
function GuestQuestions({
  category,
  onCategory,
  list,
  questions,
  sentinelRef,
  showSentinel,
  showMoreButton,
  lock,
  now,
}: {
  category: string | null
  onCategory: (c: string | null) => void
  list: ReturnType<typeof useQuestionList>
  questions: QuestionCardData[]
  sentinelRef: ReturnType<typeof useLoadMore>['bottomRef']
  showSentinel: boolean
  showMoreButton: boolean
  lock: ReturnType<typeof useLockSheet>
  now: number
}) {
  return (
    <div className="gh-dayback pb-44">
      <StoryDayTopBar loginTo="/login?next=%2Fquestions" />
      <div className="relative">
        <BigTitle items={[{ to: '/questions', label: '질문', on: true }, { to: '/members', label: '부원' }]} />
        <Ghost pose="glass" className="absolute top-3 right-1 w-[118px] drop-shadow-[0_6px_8px_rgba(30,40,30,0.2)]" />
        <p className="gh-intro px-[22px] pt-0.5">
          <b>질문</b>은 누구나 볼 수 있어요.
          <br />
          <b>답변</b>은 부원이 되면 열려요.
        </p>
      </div>
      <TextTabs
        label="분류"
        value={category ?? 'ALL'}
        onChange={(v) => onCategory(v === 'ALL' ? null : v)}
        options={[{ value: 'ALL', label: '전체' }, ...CATEGORIES.map((c) => ({ value: c, label: questionCategoryLabel(c) }))]}
      />

      {list.isPending && (
        <div className="space-y-2.5 px-4 pt-[18px] pl-12" aria-label="불러오는 중">
          {[0, 1, 2].map((i) => (
            <div key={i} className="gh-day-skeleton" />
          ))}
        </div>
      )}
      {list.isError && (
        <div className="px-4 pt-[18px] pl-12">
          <DayRetry onRetry={() => list.refetch()}>질문을 불러오지 못했어요.</DayRetry>
        </div>
      )}
      {list.isSuccess && questions.length === 0 && (
        <div className="px-4 pt-[18px] pl-12">
          <EmptyState row pose="glass" title="아직 질문이 없어요">
            첫 질문이 오면 이 길에 놓아 둘게요.
          </EmptyState>
        </div>
      )}

      {questions.length > 0 && (
        <ul className="gh-path">
          {questions.map((q) => (
            <li key={q.id}>
              <span className="gh-off-star" aria-hidden />
              <LetterCard
                category={questionCategoryLabel(q.category)}
                title={q.title}
                meta={`${authorName(q.author)} · ${formatRelative(q.createdAt, now)}`}
                answers={q.answerCount}
                onClick={() => lock.open(`/questions/${q.id}`)}
              />
            </li>
          ))}
        </ul>
      )}
      {showSentinel && <div ref={sentinelRef} aria-hidden className="h-1" />}
      {list.isFetchingNextPage && <div className="gh-day-skeleton mx-4 mt-2.5 ml-12" />}
      {(showMoreButton || list.isFetchNextPageError) && (
        <div className="px-4 pt-2 pl-12">
          <button type="button" className="gh-letter text-center font-title text-sm text-gh-pine" onClick={() => list.fetchNextPage()}>
            {list.isFetchNextPageError ? '더 불러오지 못했어요. 다시 시도' : '더보기'}
          </button>
        </div>
      )}
      {list.isSuccess && questions.length > 0 && (
        <p className="gh-night-note">
          <i aria-hidden />
          해가 지면 이 길에 질문마다 별이 떠요
        </p>
      )}

      <Fab night membersOnly icon={<IconPencil />} onClick={() => lock.open(WRITE_PATH)}>
        질문하기
      </Fab>

      {lock.next === WRITE_PATH ? (
        <LockSheet
          next={lock.next}
          onClose={lock.close}
          title={
            <>
              질문은 해가 진 뒤에
              <br />
              띄울 수 있어요
            </>
          }
          description={
            <>
              부원으로 들어오면 <b>선배에게 바로 질문</b>할 수 있어요.
            </>
          }
        />
      ) : (
        <LockSheet next={lock.next} onClose={lock.close} title="선배의 답장은 부원이 되면 열려요" />
      )}
    </div>
  )
}

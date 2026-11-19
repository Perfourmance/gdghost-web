import { Link, useSearchParams } from 'react-router'
import { LockSheet } from '@/features/auth/LockSheet'
import { useMe } from '@/features/auth/session'
import { useLockSheet } from '@/features/auth/useLockSheet'
import { DayRetry, LetterCard } from '@/components/day/Day'
import {
  BigTitle,
  EmptyState,
  Fab,
  FilterSwitches,
  Ghost,
  IconPencil,
  Lab,
  Nums,
  Pill,
  ReplyBubble,
  StarItem,
  StarLine,
  StoryDayTopBar,
  StoryTopBar,
  TextTabs,
} from '@/components/story'
import type { QuestionCardData } from '@/features/content/Cards'
import { authorName } from '@/features/member/author'
import { questionCategoryLabel, questionStateLabel } from '@/features/content/labels'
import { useQuestionList, type QuestionFilters } from '@/features/questions/api'
import { QUESTION_CATEGORIES as CATEGORIES } from '@/features/questions/write'
import { useLoadMore } from '@/hooks/useLoadMore'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import '@/styles/questions.css'

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

  const questions = list.data?.pages.flatMap((page) => page.items) ?? []

  if (!me) {
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

  const empty = filters.mine
    ? { title: '아직 띄운 질문이 없어요', body: '궁금한 게 생기면 선배들에게 물어보세요.' }
    : filters.unanswered
      ? { title: '빛을 기다리는 질문이 없어요', body: '모든 질문에 답장이 닿았어요.' }
      : { title: '아직 질문이 없어요', body: '첫 질문을 띄워 보세요.' }

  return (
    <div className="pb-28">
      <div className="gh-qsky">
        <StoryTopBar unread={me.unreadNotificationCount} />
        <BigTitle items={[{ to: '/questions', label: '질문', on: true }, { to: '/members', label: '부원' }]} />
        <Ghost pose="glass" className="gh-peek" />
      </div>
      <Link to={WRITE_PATH} className="gh-ask">
        <Ghost pose="b" />
        <span>
          궁금한 건
          <br />
          선배들이 들어 줘요
        </span>
        <b>
          <IconPencil />
          질문하기
        </b>
      </Link>

      <TextTabs
        label="분류"
        className="mt-1"
        value={category ?? 'ALL'}
        onChange={(v) => setFilter('category', v === 'ALL' ? null : v)}
        options={[{ value: 'ALL', label: '전체' }, ...CATEGORIES.map((c) => ({ value: c, label: questionCategoryLabel(c) }))]}
      />
      <FilterSwitches
        items={[
          { label: '내 질문', on: filters.mine, onToggle: () => setFilter('mine', filters.mine ? null : '1') },
          { label: '답변 기다리는 질문만', on: filters.unanswered, onToggle: () => setFilter('unanswered', filters.unanswered ? null : '1') },
        ]}
      />

      {list.isPending && (
        <div aria-label="불러오는 중">
          {[0, 1, 2].map((i) => (
            <div key={i} className="gh-qskel" />
          ))}
        </div>
      )}
      {list.isError && (
        <div className="px-4 pt-4">
          <EmptyState
            row
            pose="shh"
            title="질문을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => list.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}
      {list.isSuccess && questions.length === 0 && (
        <div className="px-4 pt-4">
          <EmptyState pose="glass" title={empty.title}>
            {empty.body}
          </EmptyState>
        </div>
      )}

      {questions.length > 0 && (
        <StarLine>
          {questions.map((q) => {
            const kind = q.state === 'ADOPTED' ? 'pick' : q.state === 'WAITING' ? 'wait' : 'plain'
            return (
              <StarItem key={q.id} kind={kind} to={`/questions/${q.id}`}>
                <div className="flex items-center gap-2">
                  <Lab>{questionCategoryLabel(q.category)}</Lab>
                  {kind !== 'plain' && <span className={`gh-state is-${kind}`}>{questionStateLabel(q.state!)}</span>}
                </div>
                <h3>{q.title}</h3>
                <div className="gh-meta">
                  <span>
                    {authorName(q.author)} · {formatRelative(q.createdAt, now)}
                  </span>
                  <Nums answers={q.answerCount} views={q.viewCount} />
                </div>
                <ReplyBubble names={answererNames(q.answererPreview)} />
              </StarItem>
            )
          })}
        </StarLine>
      )}

      {/* 바닥이 보이면 다음 20개 (60개까지), 그다음은 더보기 */}
      {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
      {isFetchingNextPage && <div className="gh-qskel" />}
      {(showMoreButton || list.isFetchNextPageError) && (
        <button type="button" className="gh-qmore" onClick={() => fetchNextPage()}>
          {list.isFetchNextPageError ? '더 불러오지 못했어요. 다시 시도' : '더보기'}
        </button>
      )}
    </div>
  )
}

/** "준호 외 1명" — 답한 사람이 없으면 null */
function answererNames(answerers: QuestionCardData['answererPreview']): string | null {
  if (!answerers?.length) return null
  const first = authorName(answerers[0])
  return answerers.length > 1 ? `${first} 외 ${answerers.length - 1}명` : first
}

const WRITE_PATH = '/questions/new'


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

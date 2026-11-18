import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import {
  Bookmark,
  EmptyState,
  Ghost,
  House,
  IconBookmark,
  IconCalendar,
  IconChat,
  IconUser,
  Lab,
  LoadingDots,
  Nums,
  Pill,
  SearchField,
  Shelf,
  StarItem,
  StarLine,
  StorySubPage,
  TextTabs,
  Ticket,
  Town,
} from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { questionCategoryLabel, questionStateLabel, scheduleKindLabel, shareCategoryLabel } from '@/features/content/labels'
import { authorName } from '@/features/member/author'
import { memberStatusLabel, positionLabel } from '@/features/member/labels'
import {
  QUERY_MAX,
  QUERY_MIN,
  useSearchAll,
  useSearchType,
  type SearchItems,
  type SearchType,
} from '@/features/search/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLoadMore } from '@/hooks/useLoadMore'
import { toApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'
import { colorOf, ROOF_COLORS, SCHEDULE_COLORS, SHARE_COLORS } from '@/lib/categoryColors'
import { formatDay, formatRelative, useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'
import '@/styles/common.css'
import '@/styles/schedules.css'

const TYPES: { type: SearchType; label: string; group: 'members' | 'questions' | 'shares' | 'schedules' }[] = [
  { type: 'MEMBER', label: '부원', group: 'members' },
  { type: 'QUESTION', label: '질문', group: 'questions' },
  { type: 'SHARE', label: '공유', group: 'shares' },
  { type: 'SCHEDULE', label: '일정', group: 'schedules' },
]

/** 검색 (S60) — 부원 · 질문 · 공유 · 일정. 전체는 종류별 5개, 종류 탭을 고르면 그 종류만 이어서. 주소에 q · type을 둔다 */
export function SearchPage() {
  const { data: me } = useMe()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [text, setText] = useState(params.get('q') ?? '')
  const debounced = useDebouncedValue(text.trim(), 400)
  const rawType = params.get('type')
  const type = TYPES.find((t) => t.type === rawType)?.type ?? null

  // 입력이 멈추면 주소에 반영 (뒤로 와도 검색어 유지)
  useEffect(() => {
    const next = new URLSearchParams(params)
    if (debounced) next.set('q', debounced)
    else next.delete('q')
    if (next.toString() !== params.toString()) setParams(next, { replace: true, preventScrollReset: true })
  }, [debounced, params, setParams])

  if (!me) {
    return (
      <SubPageLayout>
        <LockPanel next={location.pathname + location.search} title="검색은 부원만 쓸 수 있어요." />
      </SubPageLayout>
    )
  }

  const q = debounced.length >= QUERY_MIN ? debounced : null

  function selectType(next: SearchType | null) {
    const p = new URLSearchParams(params)
    if (next) p.set('type', next)
    else p.delete('type')
    setParams(p, { replace: true, preventScrollReset: true })
  }

  return (
    <StorySubPage className={cn('gh-search-pg', q && 'is-hit')}>
      <div className="gh-sbar">
        <SearchField
          // 들어오자마자 바로 쓸 수 있게
          autoFocus
          aria-label="검색어"
          maxLength={QUERY_MAX}
          placeholder="부원 · 질문 · 공유 · 일정 찾기"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onClear={() => setText('')}
        />
      </div>
      <TextTabs
        label="검색 종류"
        className="mt-2"
        value={type ?? 'ALL'}
        onChange={(v) => selectType(v === 'ALL' ? null : (v as SearchType))}
        options={[{ value: 'ALL', label: '전체' }, ...TYPES.map((t) => ({ value: t.type as string, label: t.label }))]}
      />

      {q == null ? (
        <section className="gh-lost">
          <span className="gh-beam" aria-hidden />
          <Ghost pose="glass" />
          <h1>
            {text.trim().length > 0 && text.trim().length < QUERY_MIN ? `${QUERY_MIN}자 이상 적어 주세요` : '무엇을 찾아 드릴까요?'}
          </h1>
          <p>닉네임, 관심 분야, 질문 제목, 태그, 일정 이름으로 찾아요.</p>
        </section>
      ) : type ? (
        <TypeResults key={`${type}-${q}`} type={type} q={q} />
      ) : (
        <AllResults q={q} onMore={selectType} />
      )}
    </StorySubPage>
  )
}

/** 검색어를 밑줄 형광으로 */
function Hl({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

/** 못 찾았을 때 — 돋보기 유령 */
function Lost({ q }: { q: string }) {
  return (
    <section className="gh-lost">
      <span className="gh-beam" aria-hidden />
      <Ghost pose="glass" />
      <h1>
        <q>{q}</q>은
        <br />
        마을 어디에도 없었어요
      </h1>
      <p>
        돋보기로 집집마다 살펴봤지만 못 찾았어요.
        <br />
        다른 말로 찾아볼까요?
      </p>
      <div className="gh-dots" aria-hidden>
        <i />
        <i />
        <i />
      </div>
    </section>
  )
}

const GROUP_ICONS: Record<SearchType, ReactNode> = {
  MEMBER: <IconUser />,
  QUESTION: <IconChat />,
  SHARE: <IconBookmark />,
  SCHEDULE: <IconCalendar />,
}

/** 종류마다 목록 화면과 같은 부품 — 부원 = 집, 질문 = 별빛 줄, 공유 = 책갈피, 일정 = 티켓 */
function Items<T extends SearchType>({ type, items, q, now }: { type: T; items: SearchItems[T][]; q: string; now: number }) {
  if (type === 'MEMBER') {
    return (
      <Town>
        {(items as SearchItems['MEMBER'][]).map((m) => (
          <House
            key={m.id}
            to={`/members/${m.id}`}
            roofColor={colorOf(ROOF_COLORS, m.position)}
            track={positionLabel(m.position)}
            staff={m.isStaff}
            lit={m.acceptCoffee}
            generation={`${m.generation}기 · ${memberStatusLabel(m.status)}`}
            name={m.nickname}
            intro={m.statusNote}
            field={m.interestTags[0]}
            answers={m.answerCount}
          />
        ))}
      </Town>
    )
  }
  if (type === 'QUESTION') {
    return (
      <StarLine>
        {(items as SearchItems['QUESTION'][]).map((qq) => {
          const kind = qq.state === 'ADOPTED' ? 'pick' : qq.state === 'WAITING' ? 'wait' : 'plain'
          return (
            <StarItem key={qq.id} kind={kind} to={`/questions/${qq.id}`}>
              <div className="flex items-center gap-2">
                <Lab>{questionCategoryLabel(qq.category)}</Lab>
                {qq.state && kind !== 'plain' && <span className={`gh-state is-${kind}`}>{questionStateLabel(qq.state)}</span>}
              </div>
              <h3>
                <Hl text={qq.title} q={q} />
              </h3>
              <div className="gh-meta">
                <span>
                  {authorName(qq.author)} · {formatRelative(qq.createdAt, now)}
                </span>
                <Nums answers={qq.answerCount} />
              </div>
            </StarItem>
          )
        })}
      </StarLine>
    )
  }
  if (type === 'SHARE') {
    return (
      <Shelf>
        {(items as SearchItems['SHARE'][]).map((s) => (
          <Bookmark
            key={s.id}
            to={`/shares/${s.id}`}
            color={colorOf(SHARE_COLORS, s.category)}
            category={shareCategoryLabel(s.category)}
            title={s.title}
            tags={s.tags}
            by={`${authorName(s.author)} · ${formatRelative(s.createdAt, now)}`}
            saved={s.saved}
            saveCount={s.saveCount}
            noteCount={s.noteCount}
            hasPhoto={s.hasPhoto}
          />
        ))}
      </Shelf>
    )
  }
  return (
    <>
      {(items as SearchItems['SCHEDULE'][]).map((s) => (
        <div key={s.id} className="gh-tw">
          <Ticket
            to={`/schedules/${s.id}`}
            color={colorOf(SCHEDULE_COLORS, s.kind)}
            category={scheduleKindLabel(s.kind)}
            official={s.isOfficial}
            title={s.title}
            when={[s.endDate && s.endDate !== s.startDate ? `${formatDay(s.startDate)} ~ ${formatDay(s.endDate)}` : formatDay(s.startDate), s.place].filter(Boolean).join(' · ')}
            dday={s.dDay == null ? undefined : s.dDay < 0 ? '지남' : s.dDay === 0 ? 'D-DAY' : `D-${s.dDay}`}
          />
        </div>
      ))}
    </>
  )
}

function searchError(error: unknown): string {
  const apiError = toApiError(error)
  if (apiError.code === 'VALIDATION_FAILED') return `검색어를 ${QUERY_MIN}~${QUERY_MAX}자로 입력해 주세요.`
  return commonErrorMessage(apiError)
}

function Failed({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="px-4 pt-6">
      <EmptyState
        row
        pose="shh"
        title={searchError(error)}
        action={
          <Pill soft className="mt-2" onClick={onRetry}>
            다시 시도
          </Pill>
        }
      />
    </div>
  )
}

function AllResults({ q, onMore }: { q: string; onMore: (type: SearchType) => void }) {
  const all = useSearchAll(q)
  const now = useNowEveryMinute()

  if (all.isPending) return <LoadingDots className="mt-16" />
  if (all.isError) return <Failed error={all.error} onRetry={() => all.refetch()} />

  const groups = TYPES.map((t) => ({ ...t, ...all.data[t.group] }))
  if (groups.every((g) => g.total === 0)) return <Lost q={q} />

  return (
    <section className="gh-found">
      {groups
        .filter((g) => g.total > 0)
        .map((g) => (
          <div key={g.type}>
            <h2 className="gh-gh2">
              {GROUP_ICONS[g.type]}
              {g.label}
              <em>{g.total}</em>
              {g.total > g.items.length && (
                <button type="button" onClick={() => onMore(g.type)}>
                  더보기 ›
                </button>
              )}
            </h2>
            <Items type={g.type} items={g.items} q={q} now={now} />
          </div>
        ))}
    </section>
  )
}

function TypeResults({ type, q }: { type: SearchType; q: string }) {
  const list = useSearchType(type, q)
  const now = useNowEveryMinute()
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  if (list.isPending) return <LoadingDots className="mt-16" />
  if (list.isError) return <Failed error={list.error} onRetry={() => list.refetch()} />
  if (items.length === 0) return <Lost q={q} />

  return (
    <section className="gh-found">
      <Items type={type} items={items} q={q} now={now} />
      {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
      {list.isFetchingNextPage && <LoadingDots className="mt-6" />}
      {showMoreButton && (
        <button type="button" className="gh-cmore !mx-0 !w-full" onClick={() => list.fetchNextPage()}>
          더보기
        </button>
      )}
    </section>
  )
}

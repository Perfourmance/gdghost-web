import { Link, useLocation, useSearchParams } from 'react-router'
import { BigTitle, EmptyState, Ghost, House, LineChips, Pill, StoryTopBar, TextTabs, Town } from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { useMemberList, type MemberFilters } from '@/features/member/api'
import { MEMBER_STATUSES, memberStatusLabel, positionLabel, type MemberStatus } from '@/features/member/labels'
import { useLoadMore } from '@/hooks/useLoadMore'
import { colorOf, ROOF_COLORS } from '@/lib/categoryColors'
import '@/styles/members.css'

// 기수 칩은 1–4기 (디자인 가이드 6장). 그보다 늦은 기수가 가입해 있으면 그 기수까지 늘린다
const MIN_GENERATIONS = 4

/** 부원 목록 (S23) — 기수 · 상태 필터, 무한 스크롤. 필터는 주소에 둔다(뒤로 와도 유지) */
export function MembersPage() {
  const { data: me } = useMe()
  const location = useLocation()

  if (!me) {
    return (
      <LockPanel next={location.pathname} title="부원 목록은 부원만 볼 수 있어요." />
    )
  }

  return (
    <div className="pb-28">
      <div className="gh-msky">
        <StoryTopBar unread={me.unreadNotificationCount} />
        <BigTitle items={[{ to: '/questions', label: '질문' }, { to: '/members', label: '부원', on: true }]} />
        <p className="gh-mdesc">기수를 넘어 이어지는 사람들</p>
        <Ghost pose="glass" className="gh-peek" />
      </div>
      {/* 선배 찾기 (IA S25 — 부원 목록 상단) */}
      <Link to="/find-senior" className="gh-findbar">
        <span>
          <b>질문에 맞는 선배 찾기</b>
          유령이 이야기 나눌 선배를 찾아 드려요
        </span>
        <em>시작</em>
      </Link>
      <MemberDirectory maxGeneration={Math.max(MIN_GENERATIONS, me.generation)} />
    </div>
  )
}

function MemberDirectory({ maxGeneration }: { maxGeneration: number }) {
  const [params, setParams] = useSearchParams()
  const generations = Array.from({ length: maxGeneration }, (_, i) => i + 1)

  const rawGeneration = Number(params.get('generation'))
  const generation = generations.includes(rawGeneration) ? rawGeneration : null
  const rawStatus = params.get('status')
  const status = MEMBER_STATUSES.some((s) => s.value === rawStatus) ? (rawStatus as MemberStatus) : null
  const filters: MemberFilters = { generation, status }

  const list = useMemberList(filters)
  const { isFetchingNextPage, fetchNextPage } = list
  // 처음 60개까지 저절로, 그다음은 더보기
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)

  function setFilter(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value == null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const members = list.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <>
      <TextTabs
        label="기수"
        className="mt-1"
        value={generation == null ? 'ALL' : String(generation)}
        onChange={(v) => setFilter('generation', v === 'ALL' ? null : v)}
        options={[{ value: 'ALL', label: '전체' }, ...generations.map((g) => ({ value: String(g), label: `${g}기` }))]}
      />
      {/* 상태는 테두리 칩 — 한 번 더 누르면 해제 */}
      <div className="gh-mstates">
        <LineChips label="상태" value={status} onChange={(v) => setFilter('status', v)} options={MEMBER_STATUSES} />
      </div>

      {list.isPending && (
        <div className="gh-town" aria-label="불러오는 중">
          <div>
            <div className="gh-mskel" />
            <div className="gh-mskel" />
          </div>
          <div>
            <div className="gh-mskel" />
          </div>
        </div>
      )}

      {list.isError && (
        <div className="px-4">
          <EmptyState
            row
            pose="shh"
            title="부원 목록을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => list.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}

      {list.isSuccess && members.length === 0 && (
        <div className="px-4">
          <EmptyState pose="glass" title={generation != null || status != null ? '조건에 맞는 부원이 없어요' : '아직 불 켜진 집이 없어요'}>
            {generation != null || status != null ? '다른 기수나 상태로 찾아보세요.' : '부원이 가입하면 여기 집이 생겨요.'}
          </EmptyState>
        </div>
      )}

      {members.length > 0 && (
        <Town>
          {members.map((m) => (
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
      )}

      {/* 첫 페이지를 받은 뒤에만 바닥을 지켜본다 */}
      {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
      {isFetchingNextPage && <div className="gh-mskel mx-3.5 mt-3.5" />}
      {(showMoreButton || list.isFetchNextPageError) && (
        <button type="button" className="gh-mmore" onClick={() => fetchNextPage()}>
          {list.isFetchNextPageError ? '더 불러오지 못했어요. 다시 시도' : '더보기'}
        </button>
      )}
      {members.length > 0 && <div className="gh-village" aria-hidden />}
    </>
  )
}

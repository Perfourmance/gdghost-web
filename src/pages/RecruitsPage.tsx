import { useSearchParams } from 'react-router'
import { BigTitle, DotChips, EmptyState, Fab, Ghost, IconPeople, Pill, StoryTopBar } from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { recruitKindLabel } from '@/features/content/labels'
import { RECRUIT_KINDS, useRecruitList } from '@/features/recruits/api'
import { RecruitCard } from '@/features/recruits/RecruitBits'
import { RecruitSheet } from '@/features/recruits/RecruitSheet'
import { useLoadMore } from '@/hooks/useLoadMore'
import '@/styles/schedules.css'

/** 모집 목록 (S33) — 택시 · 공모전 팀원 · 구독 공유. 누르면 상세 시트(?open=id, 마감 임박 알림도 이 주소로 온다) */
export function RecruitsPage() {
  const { data: me } = useMe()
  const member = me != null
  const [params, setParams] = useSearchParams()

  const rawKind = params.get('kind')
  const kind = rawKind && (RECRUIT_KINDS as readonly string[]).includes(rawKind) ? rawKind : null
  const openId = Number(params.get('open'))
  const open = Number.isInteger(openId) && openId > 0 ? openId : null

  const list = useRecruitList(kind, member)
  const { isFetchingNextPage, fetchNextPage } = list
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)
  const recruits = list.data?.pages.flatMap((page) => page.items) ?? []

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value == null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  if (!member) {
    return (
      <LockPanel
            next={`/recruits${params.toString() ? `?${params}` : ''}`}
            title="모집은 부원만 볼 수 있어요."
            buttonText="로그인하고 모집 보기"
          />
    )
  }

  return (
    <div className="pb-44">
      <div className="gh-ssky">
        <StoryTopBar unread={me.unreadNotificationCount} />
        <BigTitle
          items={[
            { to: '/schedules', label: '일정' },
            { to: '/recruits', label: '모집', on: true },
            { to: '/events', label: '이벤트' },
          ]}
        />
        <p className="gh-sdesc">빈 자리에 등불을 켜 주세요</p>
        <Ghost pose="lantern" className="gh-speek" />
        <DotChips
          label="분류"
          value={kind ?? 'ALL'}
          onChange={(v) => update('kind', v === 'ALL' ? null : v)}
          options={[{ value: 'ALL', label: '전체' }, ...RECRUIT_KINDS.map((k) => ({ value: k, label: recruitKindLabel(k) }))]}
        />
      </div>

      {list.isPending && [0, 1, 2].map((i) => <div key={i} className="gh-sskel" />)}

      {list.isError && (
        <div className="px-4 pt-4">
          <EmptyState
            row
            pose="shh"
            title="모집을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => list.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}

      {list.isSuccess && recruits.length === 0 && (
        <div className="px-4 pt-4">
          <EmptyState pose="lantern" title={kind ? `${recruitKindLabel(kind)} 모집이 없어요` : '아직 열린 모집이 없어요'}>
            택시를 같이 타거나 팀원을 구하고 있다면 모집을 열어 보세요.
          </EmptyState>
        </div>
      )}

      {recruits.length > 0 && (
        <div className="gh-rcards">
          {recruits.map((r) => (
            <RecruitCard key={r.id} recruit={r} onOpen={(id) => update('open', String(id))} />
          ))}
        </div>
      )}

      {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
      {isFetchingNextPage && <div className="gh-sskel" />}
      {(showMoreButton || list.isFetchNextPageError) && (
        <button type="button" className="gh-emore mt-3" onClick={() => fetchNextPage()}>
          {list.isFetchNextPageError ? '더 불러오지 못했어요. 다시 시도' : '더보기'}
        </button>
      )}

      <Fab to="/recruits/new" icon={<IconPeople />}>
        모집 열기
      </Fab>

      <RecruitSheet recruitId={open} onClose={() => update('open', null)} />
    </div>
  )
}

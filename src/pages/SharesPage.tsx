import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  BigTitle,
  Bookmark,
  DotChips,
  EmptyState,
  Fab,
  Ghost,
  IconBookmark,
  Pill,
  SearchField,
  Shelf,
  SortLinks,
  StoryDayTopBar,
  StoryTopBar,
} from '@/components/story'
import { DayRetry } from '@/components/day/Day'
import { LockSheet } from '@/features/auth/LockSheet'
import { useMe } from '@/features/auth/session'
import { useLockSheet } from '@/features/auth/useLockSheet'
import { SHARE_CATEGORY_KEYS, shareCategoryLabel } from '@/features/content/labels'
import { QUERY_MAX, QUERY_MIN, useShareList, type ShareFilters, type ShareSort } from '@/features/shares/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLoadMore } from '@/hooks/useLoadMore'
import { authorName } from '@/features/member/author'
import { colorOf, SHARE_COLORS } from '@/lib/categoryColors'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import '@/styles/shares.css'

const WRITE_PATH = '/shares/new'

/** 공유 목록 (S40) — 분류 칩 · 저장순 / 최신순 · 검색(부원만) · 무한 스크롤. 필터는 주소에 둔다 */
export function SharesPage() {
  const { data: me } = useMe()
  const member = me != null
  const [params, setParams] = useSearchParams()
  const lock = useLockSheet()
  const now = useNowEveryMinute()

  const rawCategory = params.get('category')
  const category = rawCategory && SHARE_CATEGORY_KEYS.includes(rawCategory) ? rawCategory : null
  const sort: ShareSort = params.get('sort') === 'LATEST' ? 'LATEST' : 'SAVED'

  // 검색어는 입력이 멈추면 주소에 반영 (2자 미만은 검색하지 않음)
  const [query, setQuery] = useState(params.get('q') ?? '')
  const debounced = useDebouncedValue(query.trim(), 400)
  const q = member && debounced.length >= QUERY_MIN ? debounced : null

  const filters: ShareFilters = { category, sort, q }
  const list = useShareList(filters, member)
  const { isFetchingNextPage, fetchNextPage } = list
  const { bottomRef, showSentinel, showMoreButton } = useLoadMore(list, 3)

  function setFilter(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value == null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const shares = list.data?.pages.flatMap((page) => page.items) ?? []
  const tooShort = query.trim().length > 0 && query.trim().length < QUERY_MIN

  if (!me) {
    return (
      <div className="gh-dayback pb-28">
        <StoryDayTopBar loginTo="/login?next=%2Fshares" />
        <BigTitle items={[{ label: '공유' }]} />
        <p className="gh-gdesc">
          <b>마을 사람들이 꽂아 둔 책갈피</b>예요. 제목은 누구나, 내용은 부원이 되면 볼 수 있어요.
        </p>
        <DotChips
          label="분류"
          className="px-4 pt-4"
          value={category ?? 'ALL'}
          onChange={(v) => setFilter('category', v === 'ALL' ? null : v)}
          options={[
            { value: 'ALL', label: '전체' },
            ...SHARE_CATEGORY_KEYS.map((c) => ({ value: c, label: shareCategoryLabel(c), color: colorOf(SHARE_COLORS, c) })),
          ]}
        />
        {list.isPending && (
          <div className="space-y-2.5 px-4 pt-[18px]" aria-label="불러오는 중">
            {[0, 1].map((i) => (
              <div key={i} className="gh-day-skeleton" />
            ))}
          </div>
        )}
        {list.isError && (
          <div className="px-4 pt-[18px]">
            <DayRetry onRetry={() => list.refetch()}>공유를 불러오지 못했어요.</DayRetry>
          </div>
        )}
        {list.isSuccess && shares.length === 0 && (
          <div className="px-4 pt-[18px]">
            <EmptyState row pose="glass" title="아직 꽂힌 책갈피가 없어요" />
          </div>
        )}
        {shares.length > 0 && (
          <div className="px-3.5">
            <Shelf>
              {shares.map((s) => (
                <Bookmark
                  key={s.id}
                  to={`/shares/${s.id}`}
                  onClick={() => lock.open(`/shares/${s.id}`)}
                  color={colorOf(SHARE_COLORS, s.category)}
                  category={shareCategoryLabel(s.category)}
                  title={s.title}
                  tags={s.tags}
                  saveCount={s.saveCount}
                />
              ))}
            </Shelf>
          </div>
        )}
        {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
        <Fab night membersOnly icon={<IconBookmark />} onClick={() => lock.open(WRITE_PATH)}>
          책갈피 꽂기
        </Fab>
        {lock.next === WRITE_PATH ? (
          <LockSheet next={lock.next} onClose={lock.close} title="책갈피는 부원이 되면 꽂을 수 있어요" />
        ) : (
          <LockSheet next={lock.next} onClose={lock.close} title="책갈피 내용은 부원이 되면 열려요" />
        )}
      </div>
    )
  }

  return (
    <div className="pb-44">
      <div className="gh-shsky">
        <StoryTopBar unread={me.unreadNotificationCount} />
        <div className="gh-shttl">
          <h1>공유</h1>
          <Link to="/saved-shares">
            <IconBookmark />
            저장한 공유
          </Link>
        </div>
        <p className="gh-shdesc">마을 사람들이 꽂아 둔 책갈피</p>
        <div className="gh-shfind">
          <SearchField
            aria-label="공유 검색"
            maxLength={QUERY_MAX}
            placeholder="제목이나 태그로 찾기"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
          />
          {!query && <Ghost pose="glass" />}
          {tooShort && <small>검색어 {QUERY_MIN}자 이상</small>}
        </div>
        <DotChips
          label="분류"
          value={category ?? 'ALL'}
          onChange={(v) => setFilter('category', v === 'ALL' ? null : v)}
          options={[
            { value: 'ALL', label: '전체' },
            ...SHARE_CATEGORY_KEYS.map((c) => ({ value: c, label: shareCategoryLabel(c), color: colorOf(SHARE_COLORS, c) })),
          ]}
        />
      </div>
      <div className="gh-shsort">
        <SortLinks
          value={sort}
          onChange={(v) => setFilter('sort', v === 'SAVED' ? null : v)}
          options={[
            { value: 'SAVED', label: '저장 많은 순' },
            { value: 'LATEST', label: '최신순' },
          ]}
        />
      </div>

      {list.isPending && <div className="gh-shskel" aria-label="불러오는 중" />}
      {list.isError && (
        <div className="px-4 pt-4">
          <EmptyState
            row
            pose="shh"
            title="공유를 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => list.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}
      {list.isSuccess && shares.length === 0 && (
        <div className="px-4 pt-4">
          <EmptyState pose="glass" title={q ? `‘${q}’에 맞는 책갈피가 없어요` : category ? '이 칸은 아직 비어 있어요' : '아직 꽂힌 책갈피가 없어요'}>
            {q ? '다른 말로 찾아보세요.' : '알아 둔 걸 첫 책갈피로 꽂아 주세요.'}
          </EmptyState>
        </div>
      )}

      {shares.length > 0 && (
        <div className="gh-shelfwrap">
          <Shelf>
            {shares.map((s) => (
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
        </div>
      )}

      {showSentinel && <div ref={bottomRef} aria-hidden className="h-1" />}
      {isFetchingNextPage && <div className="gh-shskel" />}
      {(showMoreButton || list.isFetchNextPageError) && (
        <button type="button" className="gh-shmore" onClick={() => fetchNextPage()}>
          {list.isFetchNextPageError ? '더 불러오지 못했어요. 다시 시도' : '더보기'}
        </button>
      )}

      <Fab to={WRITE_PATH} icon={<IconBookmark />}>
        책갈피 꽂기
      </Fab>
    </div>
  )
}

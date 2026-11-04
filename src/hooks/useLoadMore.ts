import { useEffect } from 'react'
import { useInView } from '@/hooks/useInView'

interface InfiniteList {
  isSuccess: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => unknown
  data?: { pages: unknown[] }
}

/**
 * 커서 목록 — 처음 autoPages쪽까지는 바닥이 보이면 저절로 더 불러오고, 그 뒤로는 `더보기` 버튼.
 * 끝없이 길어져 아래 내용(하단 탭 위 버튼 등)에 닿기 어려운 걸 막는다
 */
export function useLoadMore(list: InfiniteList, autoPages: number) {
  const { ref: bottomRef, inView } = useInView<HTMLDivElement>()
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list
  const loadedPages = list.data?.pages.length ?? 0
  const auto = loadedPages < autoPages

  useEffect(() => {
    if (auto && inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [auto, inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  return {
    /** 바닥 표시에 붙이는 ref */
    bottomRef,
    /** 첫 페이지를 받은 뒤 자동 구간에서만 바닥 표시를 붙인다(스크롤 전에 둘째 페이지를 부르지 않게) */
    showSentinel: list.isSuccess && hasNextPage && auto,
    /** 자동 구간이 끝났고 더 있으면 버튼 */
    showMoreButton: list.isSuccess && hasNextPage && !auto && !isFetchingNextPage,
  }
}

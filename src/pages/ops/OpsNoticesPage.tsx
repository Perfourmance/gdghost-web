import { useState } from 'react'
import { PencilLine } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { LoadError } from '@/components/PageStates'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyCard } from '@/features/content/Cards'
import { MustReadBadge, PinnedBadge } from '@/features/notices/NoticeBits'
import { dueText, isOverdue } from '@/features/notices/format'
import { contentErrorMessage, useDeleteNotice, useOpsNotices, useRemindNotice, type OpsNotice } from '@/features/ops/content'
import { Pager } from '@/features/ops/OpsBits'
import { formatDate } from '@/lib/time'
import { toApiError } from '@/lib/api'

/** 운영 · 공지 관리 (S71) — 목록 · 확인 집계 · 쓰기 · 수정 · 삭제 · 한 번 더 알리기 */
export function OpsNoticesPage() {
  const [page, setPage] = useState(0)
  const list = useOpsNotices(page)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  return (
    <div>
      <Link to="/ops/notices/new" className={buttonVariants({ className: 'h-11 w-full' })}>
        <PencilLine aria-hidden />
        공지 쓰기
      </Link>
      {message && (
        <p
          className={message.error ? 'mt-3 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive' : 'mt-3 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-text'}
          role="status"
        >
          {message.text}
        </p>
      )}
      <div className="mt-4 space-y-2">
        {list.isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        {list.isError && <LoadError text="공지를 불러오지 못했어요." onRetry={() => list.refetch()} />}
        {list.isSuccess && list.data.items.length === 0 && <EmptyCard>아직 공지가 없어요.</EmptyCard>}
        {list.data?.items.map((n) => (
          <NoticeRow key={n.id} notice={n} onMessage={setMessage} />
        ))}
      </div>
      {list.data && <Pager page={list.data.page} size={list.data.size} total={list.data.total} onChange={setPage} />}
    </div>
  )
}

function NoticeRow({ notice: n, onMessage }: { notice: OpsNotice; onMessage: (m: { text: string; error: boolean } | null) => void }) {
  const navigate = useNavigate()
  const remind = useRemindNotice()
  const remove = useDeleteNotice()
  const rate = n.stats.memberCount > 0 ? Math.round((n.stats.confirmedCount / n.stats.memberCount) * 100) : 0
  const unconfirmed = n.stats.memberCount - n.stats.confirmedCount

  function handleRemind() {
    if (!window.confirm(`확인하지 않은 ${unconfirmed}명에게 한 번 더 알릴까요? 공지당 한 번만 보낼 수 있어요.`)) return
    onMessage(null)
    remind.mutate(n.id, {
      onSuccess: (r) => onMessage({ text: `${r.targetCount}명에게 한 번 더 알렸어요.`, error: false }),
      onError: (e) => onMessage({ text: contentErrorMessage(toApiError(e)), error: true }),
    })
  }

  function handleDelete() {
    if (!window.confirm(`'${n.title}' 공지를 삭제할까요? 디스코드에 올라간 메시지는 지워지지 않아요.`)) return
    onMessage(null)
    remove.mutate(n.id, {
      onSuccess: () => onMessage({ text: '공지를 삭제했어요.', error: false }),
      onError: (e) => onMessage({ text: contentErrorMessage(toApiError(e)), error: true }),
    })
  }

  return (
    <article className="rounded-xl bg-card px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        {n.isPinned && <PinnedBadge />}
        {n.isMustRead && <MustReadBadge />}
        {n.dueDate && (
          <span className={isOverdue(n.dueDate) ? 'text-xs text-muted-foreground' : 'text-xs font-bold text-brand-text'}>
            {isOverdue(n.dueDate) ? dueText(n.dueDate) : `마감 ${dueText(n.dueDate)}`}
          </span>
        )}
      </div>
      <Link to={`/notices/${n.id}`} className="mt-1 block text-[15px] font-bold text-title hover:underline">
        {n.title}
      </Link>
      <p className="mt-1 text-xs text-muted-foreground">
        {n.author.nickname ?? '탈퇴한 운영진'} · {formatDate(n.createdAt)} · 댓글 {n.commentCount}
      </p>

      {/* 확인 집계 — 탈퇴 · 정지 제외 */}
      <div className="mt-2.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {n.stats.memberCount}명 중 <b className="text-brand-text">{n.stats.confirmedCount}명</b> 확인 · 열어 본 사람 {n.stats.readCount}명
          </span>
          <span className="font-bold text-brand-text tabular-nums">{rate}%</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-muted">
          <div className="h-full rounded-full bg-brand" style={{ width: `${rate}%` }} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => navigate(`/ops/notices/${n.id}/edit`)}>
          수정
        </Button>
        {n.remindedAt ? (
          <span className="self-center text-xs text-muted-foreground">{formatDate(n.remindedAt)}에 한 번 더 알림</span>
        ) : (
          <Button variant="secondary" size="sm" disabled={remind.isPending || unconfirmed <= 0} onClick={handleRemind}>
            한 번 더 알리기
          </Button>
        )}
        <Button variant="ghost" size="sm" className="ml-auto text-destructive" disabled={remove.isPending} onClick={handleDelete}>
          삭제
        </Button>
      </div>
    </article>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bookmark } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { GoneNotice, LoadError, OverflowMenu } from '@/components/PageStates'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { shareCategoryLabel } from '@/features/content/labels'
import { AuthorLink } from '@/features/questions/AnswerList'
import type { ReportTarget } from '@/features/reports/api'
import { ReportSheet } from '@/features/reports/ReportSheet'
import {
  NOTE_MAX,
  noteErrorMessage,
  shareSubmitError,
  useCreateShareNote,
  useDeleteShare,
  useDeleteShareNote,
  useShareDetail,
  useToggleSave,
  type ShareDetail,
  type ShareNote,
} from '@/features/shares/api'
import { PhotoGrid } from '@/features/uploads/PhotoGrid'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import { cn } from '@/lib/utils'

/** 공유 상세 (S41) — 본문 · 사진 · 태그 · 저장 · 한 줄 덧붙이기. 비회원은 잠금 안내(상세 API가 401) */
export function ShareDetailPage() {
  const { shareId } = useParams()
  const id = Number(shareId)
  const validId = Number.isInteger(id) && id > 0
  const { data: me } = useMe()
  const location = useLocation()
  const detail = useShareDetail(id, validId && me != null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [report, setReport] = useState<ReportTarget | null>(null)

  // #note-{id}로 들어오면 그 한 줄로 내려간다 (알림 · 신고 링크)
  useEffect(() => {
    if (!detail.data || !location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' })
  }, [detail.data, location.hash])

  if (!me) {
    return (
      <SubPageLayout fallback="/shares">
        <LockPanel next={location.pathname + location.hash} title="공유 글은 부원만 볼 수 있어요" buttonText="로그인하고 글 보기" />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')
  const menu = !detail.data ? null : detail.data.mine ? (
    <OwnerMenu shareId={detail.data.id} onError={setActionError} />
  ) : (
    <OverflowMenu
      label="공유 메뉴 열기"
      items={[{ label: '신고하기', onClick: () => setReport({ type: 'SHARE', id: detail.data.id }) }]}
    />
  )

  return (
    <SubPageLayout fallback="/shares" actions={menu}>
      {actionError && (
        <p className="mb-4 rounded-lg bg-muted px-3 py-2.5 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}
      {notFound && <GoneNotice to="/shares" link="공유 목록으로" />}
      {!notFound && detail.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}
      {!notFound && detail.isError && <LoadError text="공유를 불러오지 못했어요." onRetry={() => detail.refetch()} />}
      {detail.data && <ShareBody share={detail.data} onReport={setReport} />}
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </SubPageLayout>
  )
}

function OwnerMenu({ shareId, onError }: { shareId: number; onError: (message: string | null) => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const remove = useDeleteShare(shareId)

  function leave() {
    queryClient.invalidateQueries({ queryKey: ['shares', 'detail', shareId], refetchType: 'none' })
    navigate('/shares', { replace: true })
  }

  function handleDelete() {
    if (!window.confirm('공유를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
    onError(null)
    remove.mutate(undefined, {
      onSuccess: leave,
      onError: (e) => {
        const error = toApiError(e)
        if (error.code === 'NOT_FOUND') leave()
        else onError(shareSubmitError(error))
      },
    })
  }

  return (
    <OverflowMenu
      label="공유 메뉴 열기"
      disabled={remove.isPending}
      items={[
        { label: '수정', onClick: () => navigate(`/shares/${shareId}/edit`) },
        { label: '삭제', onClick: handleDelete, destructive: true },
      ]}
    />
  )
}

function ShareBody({ share, onReport }: { share: ShareDetail; onReport: (target: ReportTarget) => void }) {
  const now = useNowEveryMinute()
  const save = useToggleSave(share.id)

  return (
    <article className="pb-10">
      <p className="text-xs font-bold text-brand-text">{shareCategoryLabel(share.category)}</p>
      <h1 className="mt-2 text-[22px] leading-snug font-bold text-title">{share.title}</h1>
      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <AuthorLink author={share.author} />
        <span aria-hidden>·</span>
        <span>{formatRelative(share.createdAt, now)}</span>
        {share.updatedAt && (
          <>
            <span aria-hidden>·</span>
            <span>수정됨</span>
          </>
        )}
      </p>

      <PhotoGrid photos={share.photos} alt="공유 사진" className="mt-5" />
      <LinkifiedText text={share.body} className="mt-5 text-[15px] leading-relaxed text-foreground" />

      {share.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {share.tags.map((tag) => (
            <li key={tag} className="rounded-md bg-brand-soft px-2 py-1 text-xs text-brand-text">
              #{tag}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Button
          variant={share.saved ? 'default' : 'secondary'}
          size="lg"
          className="h-11 w-full"
          aria-pressed={share.saved}
          onClick={() => save.mutate(!share.saved)}
        >
          <Bookmark className={cn(share.saved && 'fill-current')} aria-hidden />
          {share.saved ? '저장함' : '저장하기'} <span className="tabular-nums">{share.saveCount}</span>
        </Button>
        {save.isError && (
          <p className="mt-2 text-center text-sm text-destructive" role="alert">
            {toApiError(save.error).code === 'NOT_FOUND' ? '삭제된 글이라 저장할 수 없어요.' : commonErrorMessage(toApiError(save.error))}
          </p>
        )}
      </div>

      <NoteSection share={share} now={now} onReport={onReport} />
    </article>
  )
}

/** 한 줄 덧붙이기 — 다른 부원이 짧게 보태는 정보 (F6-04) */
function NoteSection({
  share,
  now,
  onReport,
}: {
  share: ShareDetail
  now: number
  onReport: (target: ReportTarget) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const remove = useDeleteShareNote(share.id)

  function handleDelete(note: ShareNote) {
    if (!window.confirm('덧붙인 한 줄을 삭제할까요?')) return
    setError(null)
    remove.mutate(note.id, { onError: (e) => setError(noteErrorMessage(toApiError(e))) })
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-bold text-title">
        한 줄 덧붙이기 <span className="text-brand-text">{share.notes.length}</span>
      </h2>
      {error && (
        <p className="mb-3 rounded-lg bg-muted px-3 py-2.5 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {share.notes.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
          더 알고 있는 게 있으면 한 줄로 보태 주세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {share.notes.map((note) => (
            <li key={note.id} id={`note-${note.id}`} className="scroll-mt-20 rounded-xl bg-card px-4 py-3">
              <div className="flex items-center gap-2 text-xs">
                <AuthorLink
                  author={{ id: note.author.id ?? undefined, nickname: note.author.nickname, withdrawn: note.author.id == null }}
                />
                <span className="text-muted-foreground">{formatRelative(note.createdAt, now)}</span>
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => (note.mine ? handleDelete(note) : onReport({ type: 'SHARE_NOTE', id: note.id }))}
                  className="ml-auto py-1 text-muted-foreground hover:underline disabled:opacity-50"
                >
                  {note.mine ? '삭제' : '신고'}
                </button>
              </div>
              <LinkifiedText text={note.body} className="mt-1.5 text-sm leading-relaxed text-foreground" />
            </li>
          ))}
        </ul>
      )}
      <NoteForm shareId={share.id} />
    </section>
  )
}

function NoteForm({ shareId }: { shareId: number }) {
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const create = useCreateShareNote(shareId)
  const keyFor = useIdempotencyKey()
  const trimmed = body.trim()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || create.isPending) return
    setError(null)
    create.mutate(
      { body: trimmed, key: keyFor({ shareId, body: trimmed }) },
      { onSuccess: () => setBody(''), onError: (err) => setError(noteErrorMessage(toApiError(err))) },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex items-center gap-2">
        <input
          aria-label="덧붙일 한 줄"
          maxLength={NOTE_MAX}
          placeholder="예) 주말엔 웨이팅 30분 있어요"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
        <Button type="submit" className="h-11 shrink-0 px-4 font-bold" disabled={!trimmed || create.isPending}>
          {create.isPending ? '등록 중' : '등록'}
        </Button>
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums">
        <span className="text-destructive" role={error ? 'alert' : undefined}>
          {error ?? ''}
        </span>
        <span>
          {body.length} / {NOTE_MAX}
        </span>
      </div>
    </form>
  )
}

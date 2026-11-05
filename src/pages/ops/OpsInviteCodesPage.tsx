import { useState, type FormEvent } from 'react'
import { Copy } from 'lucide-react'
import { LoadError } from '@/components/PageStates'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyCard } from '@/features/content/Cards'
import {
  opsErrorMessage,
  useInviteCodeMembers,
  useInviteCodes,
  useIssueInviteCode,
  useRevokeInviteCode,
  type InviteCode,
  type InviteCodeState,
} from '@/features/ops/api'
import { Pager } from '@/features/ops/OpsBits'
import { formatDate } from '@/lib/time'
import { toApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const STATES: Record<InviteCodeState, string> = {
  ACTIVE: '사용 중',
  EXPIRED: '만료',
  REVOKED: '폐기',
  EXHAUSTED: '다 씀',
}

/** 운영 · 초대 코드 (S76) — 발급(기수당 활성 1개, 같은 기수의 코드는 자동 폐기) · 폐기 · 코드별 가입자 */
export function OpsInviteCodesPage() {
  const [page, setPage] = useState(0)
  const list = useInviteCodes(page)
  const revoke = useRevokeInviteCode()
  const [membersOf, setMembersOf] = useState<InviteCode | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  function handleRevoke(code: InviteCode) {
    if (!window.confirm(`${code.generation}기 코드 ${code.code}를 폐기할까요? 이미 가입한 부원에게는 영향이 없어요.`)) return
    revoke.mutate(code.id)
  }

  async function copy(code: InviteCode) {
    try {
      await navigator.clipboard.writeText(code.code)
      setCopied(code.id)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div>
      <IssueForm />

      <h2 className="mt-8 mb-2 text-base font-bold text-title">발급한 코드</h2>
      {revoke.isError && <p className="mb-2 text-sm text-destructive">{opsErrorMessage(toApiError(revoke.error))}</p>}
      <div className="space-y-2">
        {list.isPending && <Skeleton className="h-24 w-full rounded-xl" />}
        {list.isError && <LoadError text="초대 코드를 불러오지 못했어요." onRetry={() => list.refetch()} />}
        {list.isSuccess && list.data.items.length === 0 && <EmptyCard>아직 발급한 코드가 없어요.</EmptyCard>}
        {list.data?.items.map((c) => (
          <article key={c.id} className="rounded-xl bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold tracking-wider text-title">{c.code}</span>
              <button type="button" aria-label="코드 복사" onClick={() => copy(c)} className="text-muted-foreground hover:text-foreground">
                <Copy className="size-4" />
              </button>
              {copied === c.id && <span className="text-xs text-brand-text">복사했어요</span>}
              <span
                className={cn(
                  'ml-auto rounded px-1.5 py-0.5 text-[11px] font-bold',
                  c.state === 'ACTIVE' ? 'bg-brand-soft text-brand-text' : 'bg-muted text-muted-foreground',
                )}
              >
                {STATES[c.state] ?? '기타'}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {c.generation}기 · {c.usedCount}/{c.maxUses}명 가입 · {formatDate(c.expiresAt)}까지 · {c.createdBy ? `${c.createdBy.nickname ?? '탈퇴한 운영진'} 발급` : '준비용'}
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMembersOf(c)}>
                가입자 보기
              </Button>
              {c.state === 'ACTIVE' && (
                <Button variant="ghost" size="sm" disabled={revoke.isPending} onClick={() => handleRevoke(c)}>
                  폐기
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
      {list.data && <Pager page={list.data.page} size={list.data.size} total={list.data.total} onChange={setPage} />}

      <MembersSheet code={membersOf} onClose={() => setMembersOf(null)} />
    </div>
  )
}

function IssueForm() {
  const issue = useIssueInviteCode()
  const [generation, setGeneration] = useState('')
  const [maxUses, setMaxUses] = useState('50')
  const [days, setDays] = useState('30')
  const [issued, setIssued] = useState<InviteCode | null>(null)

  const g = Number(generation)
  const m = Number(maxUses)
  const d = Number(days)
  const valid = g >= 1 && g <= 99 && m >= 1 && m <= 200 && d >= 1 && d <= 90

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || issue.isPending) return
    if (!window.confirm(`${g}기 코드를 새로 발급할까요? 지금 쓰고 있는 ${g}기 코드는 폐기돼요.`)) return
    issue.mutate({ generation: g, maxUses: m, expiresInDays: d }, { onSuccess: setIssued })
  }

  const field = 'h-10 w-full rounded-md border bg-card px-2 text-base md:text-sm'
  return (
    <section>
      <h2 className="text-base font-bold text-title">새 코드 발급</h2>
      <p className="mt-1 text-xs text-muted-foreground">기수당 쓸 수 있는 코드는 하나예요. 새로 발급하면 같은 기수의 이전 코드는 폐기돼요.</p>
      <form onSubmit={submit} className="mt-3 grid grid-cols-3 gap-2">
        <label className="text-xs text-muted-foreground">
          기수
          <input inputMode="numeric" className={cn(field, 'mt-1')} value={generation} onChange={(e) => setGeneration(e.target.value.replace(/\D/g, ''))} placeholder="예) 5" />
        </label>
        <label className="text-xs text-muted-foreground">
          최대 인원 (1–200)
          <input inputMode="numeric" className={cn(field, 'mt-1')} value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ''))} />
        </label>
        <label className="text-xs text-muted-foreground">
          유효 기간(일, 1–90)
          <input inputMode="numeric" className={cn(field, 'mt-1')} value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} />
        </label>
        <Button type="submit" className="col-span-3 h-11" disabled={!valid || issue.isPending}>
          {issue.isPending ? '발급하는 중…' : '발급하기'}
        </Button>
      </form>
      {issue.isError && <p className="mt-2 text-sm text-destructive">{opsErrorMessage(toApiError(issue.error))}</p>}
      {issued && (
        <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-text" role="status">
          {issued.generation}기 코드 <b className="font-mono text-base">{issued.code}</b>를 발급했어요.
        </p>
      )}
    </section>
  )
}

function MembersSheet({ code, onClose }: { code: InviteCode | null; onClose: () => void }) {
  const members = useInviteCodeMembers(code?.id ?? null)
  return (
    <Sheet open={code != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[80dvh] max-w-md gap-0 overflow-y-auto rounded-t-2xl border-0 bg-card px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetTitle className="text-lg font-bold text-title">{code?.code} 가입자</SheetTitle>
        <SheetDescription className="mt-1 text-xs text-muted-foreground">유출이 의심되면 누가 가입했는지 확인해요.</SheetDescription>
        <div className="mt-4">
          {members.isPending && <Skeleton className="h-20 w-full" />}
          {members.isError && <p className="text-sm text-destructive">가입자를 불러오지 못했어요.</p>}
          {members.data?.length === 0 && <p className="text-sm text-muted-foreground">아직 이 코드로 가입한 사람이 없어요.</p>}
          <ul className="divide-y">
            {members.data?.map((m) => (
              <li key={m.id} className="py-2.5 text-sm">
                <span className="font-bold text-title">{m.nickname}</span>
                <span className="ml-1.5 text-muted-foreground">{m.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {m.studentNo ? `${m.studentNo}학번 · ` : ''}가입 {formatDate(m.joinedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  )
}

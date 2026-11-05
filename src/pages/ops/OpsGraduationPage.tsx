import { useState } from 'react'
import { Link } from 'react-router'
import { LoadError } from '@/components/PageStates'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyCard } from '@/features/content/Cards'
import { memberStatusLabel } from '@/features/member/labels'
import { opsErrorMessage, useGraduate, useGraduationCandidates } from '@/features/ops/api'
import { formatDate } from '@/lib/time'
import { toApiError } from '@/lib/api'

/** 졸업 일괄 처리 (S73, 3월 · 9월) — 기수 · 학번으로 대상을 좁히고 골라서 졸업으로 바꾼다. 바뀐 부원에게 앱 내 알림 */
export function OpsGraduationPage() {
  const [generation, setGeneration] = useState<number | null>(null)
  const [studentNoMax, setStudentNoMax] = useState('')
  const validNo = /^\d{2}$/.test(studentNoMax) ? studentNoMax : null
  const candidates = useGraduationCandidates(generation, validNo)
  const graduate = useGraduate()
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [result, setResult] = useState<string | null>(null)

  const items = candidates.data ?? []
  const allPicked = items.length > 0 && items.every((m) => picked.has(m.id))

  function toggle(id: number) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function submit() {
    const ids = items.filter((m) => picked.has(m.id)).map((m) => m.id)
    if (ids.length === 0) return
    if (!window.confirm(`${ids.length}명을 졸업으로 바꿀까요? 바뀐 부원에게 알림이 가요.`)) return
    setResult(null)
    graduate.mutate(ids.slice(0, 200), {
      onSuccess: (r) => {
        setPicked(new Set())
        setResult(
          `${r.updatedCount}명을 졸업으로 바꿨어요.${r.skippedIds.length ? ` ${r.skippedIds.length}명은 이미 졸업했거나 처리할 수 없어 건너뛰었어요.` : ''}`,
        )
      },
    })
  }

  return (
    <div>
      <Link to="/ops/members" className="text-sm text-muted-foreground hover:text-foreground">
        ← 부원 목록
      </Link>
      <h2 className="mt-3 text-lg font-bold text-title">졸업 일괄 처리</h2>
      <p className="mt-1 text-sm text-muted-foreground">활동 중인 재학 · 휴학 부원이 대상이에요. 3월 · 9월에 처리해요.</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">기수</span>
          <select
            value={generation ?? ''}
            onChange={(e) => setGeneration(Number(e.target.value) || null)}
            className="h-10 rounded-md border bg-card px-2 text-sm"
          >
            <option value="">전체</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>
                {g}기
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">이 학번까지 (예: 21)</span>
          <input
            inputMode="numeric"
            maxLength={2}
            value={studentNoMax}
            onChange={(e) => setStudentNoMax(e.target.value.replace(/\D/g, ''))}
            placeholder="전체"
            className="h-10 w-24 rounded-md border bg-card px-2 text-base md:text-sm"
          />
        </label>
      </div>
      {validNo && <p className="mt-1 text-xs text-muted-foreground">학번을 적지 않은 부원은 빠져요.</p>}

      {result && (
        <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-text" role="status">
          {result}
        </p>
      )}
      {graduate.isError && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {opsErrorMessage(toApiError(graduate.error))}
        </p>
      )}

      <div className="mt-4 space-y-1.5">
        {candidates.isPending && <Skeleton className="h-32 w-full rounded-xl" />}
        {candidates.isError && <LoadError text="대상을 불러오지 못했어요." onRetry={() => candidates.refetch()} />}
        {candidates.isSuccess && items.length === 0 && <EmptyCard>조건에 맞는 대상이 없어요.</EmptyCard>}
        {items.length > 0 && (
          <label className="flex items-center gap-2.5 px-1 py-1 text-sm font-bold">
            <Checkbox
              checked={allPicked}
              onCheckedChange={(on) => setPicked(on === true ? new Set(items.map((m) => m.id)) : new Set())}
            />
            전체 선택 ({items.length}명)
          </label>
        )}
        {items.map((m) => (
          <label key={m.id} className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm">
            <Checkbox checked={picked.has(m.id)} onCheckedChange={() => toggle(m.id)} />
            <span className="min-w-0 flex-1">
              <span className="font-bold text-title">{m.nickname}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">{m.name}</span>
              <span className="block text-xs text-muted-foreground">
                {m.generation}기 · {m.studentNo ? `${m.studentNo}학번` : '학번 없음'} · {memberStatusLabel(m.status)} · 접속 {formatDate(m.lastSeenAt)}
              </span>
            </span>
          </label>
        ))}
      </div>

      {items.length > 0 && (
        <Button size="lg" className="sticky bottom-4 mt-4 h-12 w-full" disabled={picked.size === 0 || graduate.isPending} onClick={submit}>
          {graduate.isPending ? '처리하는 중…' : `${picked.size}명 졸업 처리`}
        </Button>
      )}
    </div>
  )
}

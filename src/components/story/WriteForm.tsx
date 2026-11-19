import type { FormEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Paper } from './Form'
import { IconSend } from './icons'

/**
 * 작성 화면 틀 (write-final '편지지') — 제목 · 설명 → 크림 종이(칸들) → 오른쪽 아래 둥근 보내기 + 아래 글자.
 * 오류가 있으면 아래 글자 자리에 붉게
 */
export function WriteForm({
  title,
  description,
  notice,
  submitLabel,
  pendingLabel,
  pending,
  disabled,
  error,
  onSubmit,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  /** 제목 아래 안내 (선배 지목 등) */
  notice?: ReactNode
  submitLabel: string
  pendingLabel?: string
  pending?: boolean
  disabled?: boolean
  error?: string | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="gh-wh">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {notice && <div className="px-4 pb-3">{notice}</div>}
      <Paper>
        {children}
        <button type="submit" className="gh-send is-big" disabled={disabled || pending} aria-label={submitLabel}>
          <IconSend />
        </button>
      </Paper>
      <p className={cn('gh-sendcap', error && 'is-err')} role={error ? 'alert' : undefined}>
        {error ?? (pending ? (pendingLabel ?? '보내는 중…') : submitLabel)}
      </p>
    </form>
  )
}

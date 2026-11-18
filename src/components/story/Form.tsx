import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Ghost } from './Ghost'
import { IconLock, IconPencil, IconSearch, IconX } from './icons'

/** 크림 종이 폼 (밤 위의 편지지). flat = 등불 빛 없이 */
export function Paper({ flat, className, children }: { flat?: boolean; className?: string; children: ReactNode }) {
  return <div className={cn('gh-paper', flat && 'is-flat', className)}>{children}</div>
}

/** 종이 위 항목 이름 + 오른쪽 작은 글자(글자 수 · "선택" 등) */
export function PaperLabel({ htmlFor, children, aside }: { htmlFor?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="gh-k">
      {htmlFor ? <label htmlFor={htmlFor}>{children}</label> : <span>{children}</span>}
      {aside && <span className="gh-aside">{aside}</span>}
    </div>
  )
}

/** 안내 문구 — 바꿀 수 없음 같은 무거운 말은 <b>로 붉게 */
export function Hint({ children }: { children: ReactNode }) {
  return <p className="gh-hint">{children}</p>
}

/** 오류 문구 — 붉은 ! 동그라미 */
export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  if (!children) return null
  return (
    <p id={id} className="gh-err" role="alert">
      {children}
    </p>
  )
}

/** 베이지 입력칸 */
export const PaperInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PaperInput({ className, ...props }, ref) {
  return <input ref={ref} className={cn('gh-field', className)} {...props} />
})

export const PaperTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function PaperTextarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('gh-field', className)} {...props} />
})

/** 편지지 큰 제목 입력 (밑줄) */
export const TitleInput = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TitleInput({ className, rows = 2, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn('gh-title-input', className)} {...props} />
})

/** 줄 그은 본문 */
export const LinedTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function LinedTextarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('gh-lined', className)} {...props} />
})

/** 밤 위 줄 그은 상자 (신고 이유 등) */
export const LinedBox = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }>(function LinedBox({ label, id, ...props }, ref) {
  return (
    <div className="gh-linedbox">
      <label htmlFor={id}>{label}</label>
      <textarea ref={ref} id={id} {...props} />
    </div>
  )
})

interface Choice<T> {
  value: T
  label: ReactNode
  disabled?: boolean
}

/** 종이 위 선택 칩 — 선택 = 밤색 + 앰버 점. 여러 개 고르기도 같은 모양 */
export function PaperChips<T extends string | number>({ options, isOn, onToggle, label }: { options: Choice<T>[]; isOn: (v: T) => boolean; onToggle: (v: T) => void; label: string }) {
  return (
    <div className="gh-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={isOn(o.value)} disabled={o.disabled && !isOn(o.value)} onClick={() => onToggle(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 연한 묶음 상자 (세부 기술 · 경험 그룹) */
export function ChipGroup({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="gh-grp">
      <h4>
        {title}
        {aside && <span className="gh-aside">{aside}</span>}
      </h4>
      {children}
    </div>
  )
}

/** 분류 우표 — 선택 = 금빛 + 기울어짐. error = 붉은 바탕 */
export function StampPicker<T extends string>({ options, value, onChange, error, label }: { options: Choice<T>[]; value: T | null; onChange: (v: T) => void; error?: boolean; label: string }) {
  return (
    <div className={cn('gh-stamps', error && 'is-error')} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 바꿀 수 없는 정보 — 점선 상자 + 자물쇠 */
export function LockedField({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="gh-fixed">
      <IconLock />
      <div>
        {children}
        {note && <small>{note}</small>}
      </div>
    </div>
  )
}

/** 둘 중 하나 (보낸 사람: 내 이름 / 익명 = 쉿 유령) */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: (Choice<T> & { ghost?: boolean })[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="gh-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.ghost && <Ghost pose="shh" />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 아래 고정 저장 — 바뀐 게 없으면 회색 "바꾼 내용이 없어요"는 버튼 쪽에서 */
export function SaveBar({ day, children }: { day?: boolean; children: ReactNode }) {
  return <div className={cn('gh-savebar', day && 'is-day')}>{children}</div>
}

/** 검색창 — 54px 둥근 유리, 입력 중 하늘색 테두리 + 지우기 */
export const SearchField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void; className?: string }>(function SearchField(
  { onClear, className, value, ...props },
  ref,
) {
  return (
    <div className={cn('gh-search', className)}>
      <IconSearch />
      <input ref={ref} type="search" value={value} {...props} />
      {onClear && value ? (
        <button type="button" className="gh-clear" aria-label="검색어 지우기" onClick={onClear}>
          <IconX />
        </button>
      ) : null}
    </div>
  )
})

/** 아래 고정 입력줄 — 둥근 입력 + 둥근 아이콘 보내기. note = 노란 쪽지 입력(공유 한 줄) */
export function InputBar({
  note,
  count,
  replying,
  children,
  send,
}: {
  note?: boolean
  count?: ReactNode
  /** 답글 대상 안내 줄 */
  replying?: ReactNode
  children: ReactNode
  send: ReactNode
}) {
  return (
    <div className="gh-inputbar">
      {replying && <div className="gh-replying">{replying}</div>}
      <div className={cn('gh-in', note && 'is-note')}>
        {note && <IconPencil />}
        {children}
        {count && !note && <span className="gh-count">{count}</span>}
      </div>
      {count && note && <span className="gh-count is-below">{count}</span>}
      {send}
    </div>
  )
}

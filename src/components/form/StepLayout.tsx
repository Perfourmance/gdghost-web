import type { ReactNode } from 'react'

/** 가입 단계 제목 — 작은 파란 단계 이름 → 큰 제목 → 짧은 설명 */
export function StepHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: ReactNode }) {
  return (
    <div className="mb-8">
      <p className="text-xs font-bold text-brand-text">{eyebrow}</p>
      <h2 className="mt-2 text-[22px] leading-snug font-bold text-title">{title}</h2>
      {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  )
}

/** 화면 아래에 붙는 버튼 자리. 내용이 길어도 버튼이 항상 보인다 */
export function StepFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-10 bg-gradient-to-t from-background via-background to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  )
}

/** 입력칸 이름 줄 — 왼쪽 이름, 오른쪽 개수 · 글자 수 */
export function FieldLabel({ htmlFor, children, aside }: { htmlFor?: string; children: ReactNode; aside?: ReactNode }) {
  const Tag = htmlFor ? 'label' : 'span'
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <Tag htmlFor={htmlFor} className="text-sm font-bold text-title">
        {children}
      </Tag>
      {aside && <span className="text-xs text-muted-foreground tabular-nums">{aside}</span>}
    </div>
  )
}

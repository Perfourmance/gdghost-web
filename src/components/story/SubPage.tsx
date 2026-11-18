import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/utils'
import { SubBar } from './Bars'

/**
 * 아래 탭이 없는 밤 화면의 틀 — 뒤로 · 가운데 로고 · 오른쪽 메뉴 + 본문.
 * 앱 안에서 온 게 아니면(주소 직접 입력 · 메일 링크) 뒤로 대신 fallback으로
 */
export function StorySubPage({
  fallback = '/',
  right,
  className,
  children,
}: {
  fallback?: string
  right?: ReactNode
  className?: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  function handleBack() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
  return (
    <div className={cn('gh-night min-h-dvh', className)}>
      <div className="mx-auto max-w-md">
        <SubBar onBack={handleBack} right={right} />
        {children}
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'

/** 하단 탭이 없는 화면의 틀 — 상단 뒤로 버튼 + 가운데 정렬 본문 */
export function SubPageLayout({ children, fallback = '/' }: { children: ReactNode; fallback?: string }) {
  const navigate = useNavigate()

  // 앱 안에서 온 게 아니면(주소 직접 입력 · 메일 링크) 뒤로 대신 fallback으로
  function handleBack() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 bg-background">
        <div className="mx-auto flex h-14 max-w-md items-center px-2">
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-lg hover:bg-accent"
            aria-label="뒤로"
            onClick={handleBack}
          >
            <ChevronLeft className="size-6" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pt-6">{children}</main>
    </div>
  )
}

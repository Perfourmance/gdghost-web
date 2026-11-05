import { MoreVertical } from 'lucide-react'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

/** 삭제 · 숨김 · 없는 글 — 안내 후 목록으로 (IA 2장) */
export function GoneNotice({
  title = '글을 찾을 수 없어요',
  text = '삭제됐거나 운영진이 숨긴 글이에요.',
  to,
  link,
}: {
  title?: string
  text?: string
  to: string
  link: string
}) {
  return (
    <div className="rounded-2xl bg-card px-6 py-10 text-center">
      <p className="text-lg font-bold text-title">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <Link to={to} replace className={buttonVariants({ size: 'lg', className: 'mt-6 h-12 w-full' })}>
        {link}
      </Link>
    </div>
  )
}

/** 불러오지 못했을 때 — 다시 시도 */
export function LoadError({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
      <p className="text-sm">{text}</p>
      <Button variant="secondary" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  )
}

export interface MenuItem {
  label: string
  onClick: () => void
  destructive?: boolean
}

/** 상단 오른쪽 ⋮ 메뉴 — 내 글은 수정 · 삭제, 남의 글은 신고 */
export function OverflowMenu({ label, items, disabled }: { label: string; items: MenuItem[]; disabled?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-10 items-center justify-center rounded-lg hover:bg-accent"
        aria-label={label}
        disabled={disabled}
      >
        <MoreVertical className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            variant={item.destructive ? 'destructive' : 'default'}
            onClick={item.onClick}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

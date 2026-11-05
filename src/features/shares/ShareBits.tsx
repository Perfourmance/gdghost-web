import { Bookmark, Image } from 'lucide-react'
import { Link } from 'react-router'
import type { CardTarget } from '@/features/content/Cards'
import { shareCategoryLabel } from '@/features/content/labels'
import { authorName } from '@/features/member/author'
import type { ShareSummary } from '@/features/shares/api'
import { formatRelative } from '@/lib/time'
import { cn } from '@/lib/utils'

const cardClass = 'block w-full rounded-xl bg-card px-4 py-3.5 text-left transition-colors hover:bg-accent'

/** 공유 목록 카드 — 분류 → 제목 → 태그 → 작성자 · 시간 · 저장 · 한 줄 수. 비회원은 제목까지만 오고 누르면 잠금 안내 */
export function ShareListCard({ share, target, now }: { share: ShareSummary; target: CardTarget; now: number }) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-brand-text">{shareCategoryLabel(share.category)}</p>
        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
          {share.hasPhoto && <Image className="size-3.5" aria-label="사진 있음" />}
          {share.saved && <Bookmark className="size-3.5 fill-current text-brand-text" aria-label="저장함" />}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-[15px] leading-snug font-bold text-title">{share.title}</p>
      {share.tags && share.tags.length > 0 && (
        <p className="mt-1 line-clamp-1 text-xs text-brand-text">{share.tags.map((t) => `#${t}`).join(' ')}</p>
      )}
      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        {[
          authorName(share.author),
          formatRelative(share.createdAt, now),
          share.saveCount != null && `저장 ${share.saveCount}`,
          share.noteCount != null && share.noteCount > 0 && `한 줄 ${share.noteCount}`,
        ]
          .filter(Boolean)
          .map((item, i) => (
            <span key={`${i}-${item}`} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>·</span>}
              {item}
            </span>
          ))}
      </p>
    </>
  )
  const to = `/shares/${share.id}`
  if (target.member) {
    return (
      <Link to={to} className={cardClass}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" className={cn(cardClass)} onClick={() => target.onLocked(to)}>
      {content}
    </button>
  )
}

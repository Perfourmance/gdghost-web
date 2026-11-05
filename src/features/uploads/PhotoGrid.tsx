import { cn } from '@/lib/utils'

interface GridPhoto {
  objectKey: string
  url: string
  sortOrder: number
}

/** 글에 붙은 사진 1–3장. 누르면 새 창에서 원본 크기로 (서명 주소는 1시간 뒤 만료) */
export function PhotoGrid({ photos, alt, className }: { photos: GridPhoto[]; alt: string; className?: string }) {
  if (photos.length === 0) return null
  const sorted = [...photos].sort((a, b) => a.sortOrder - b.sortOrder)
  const one = sorted.length === 1
  return (
    <div className={cn('grid gap-1.5', one ? 'grid-cols-1' : sorted.length === 2 ? 'grid-cols-2' : 'grid-cols-3', className)}>
      {sorted.map((p, i) => (
        <a key={p.objectKey} href={p.url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={p.url}
            alt={`${alt} ${i + 1}`}
            loading="lazy"
            className={cn('w-full rounded-lg bg-muted object-cover', one ? 'max-h-96' : 'aspect-square')}
          />
        </a>
      ))}
    </div>
  )
}

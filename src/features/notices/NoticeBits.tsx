export function MustReadBadge() {
  return <span className="shrink-0 rounded bg-brand px-1.5 py-0.5 text-[11px] font-bold text-white">필독</span>
}

export function PinnedBadge() {
  return (
    <span className="shrink-0 rounded bg-brand-soft px-1.5 py-0.5 text-[11px] font-bold text-brand-text">고정</span>
  )
}

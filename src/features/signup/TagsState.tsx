import { Button } from '@/components/ui/button'
import { useTags } from '@/features/tags/useTags'

/** GET /tags를 기다리는 동안 · 실패했을 때 */
export function TagsState({ tags }: { tags: ReturnType<typeof useTags> }) {
  if (tags.isPending) return <p className="text-sm text-muted-foreground">목록을 불러오는 중…</p>
  if (tags.isError)
    return (
      <div className="space-y-3 rounded-xl bg-card p-4" role="alert">
        <p className="text-sm text-destructive">목록을 불러오지 못했어요.</p>
        <Button type="button" variant="secondary" onClick={() => tags.refetch()}>
          다시 시도
        </Button>
      </div>
    )
  return null
}

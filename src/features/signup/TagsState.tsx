import { SignupRetry } from '@/features/signup/SignupParts'
import { useTags } from '@/features/tags/useTags'

/** GET /tags를 기다리는 동안 · 실패했을 때 */
export function TagsState({ tags }: { tags: ReturnType<typeof useTags> }) {
  if (tags.isPending) return <p className="gh-su-msg mt-5">목록을 불러오는 중…</p>
  if (tags.isError) return <SignupRetry message="목록을 불러오지 못했어요." onRetry={() => tags.refetch()} />
  return null
}

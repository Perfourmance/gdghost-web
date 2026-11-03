/**
 * 글 · 답변의 작성자 (백엔드 AuthorView). 비회원 응답은 nickname 또는 label만 온다.
 * 익명은 label(`익명` · `익명(글쓴이)` · `익명1`…), 탈퇴자는 withdrawn
 */
export interface Author {
  anonymous?: boolean
  id?: number
  nickname?: string | null
  label?: string
  generation?: number
  isStaff?: boolean
  withdrawn?: boolean
}

/** 작성자 자리에 보일 이름. 실명은 쓰지 않는다 */
export function authorName(author: Author | null | undefined): string {
  if (!author) return '알 수 없음'
  if (author.label) return author.label
  if (author.withdrawn) return '탈퇴한 부원'
  return author.nickname ?? '알 수 없음'
}

/** 프로필로 갈 수 있는 작성자인지 — 익명 · 탈퇴자는 링크 없음 (IA 2장) */
export function authorProfileId(author: Author | null | undefined): number | null {
  if (!author || author.anonymous || author.withdrawn || author.label || author.id == null) return null
  return author.id
}

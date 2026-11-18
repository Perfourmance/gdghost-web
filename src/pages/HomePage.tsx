import { useMe } from '@/features/auth/session'
import { GuestHome } from '@/features/home/GuestHome'
import { MemberHome } from '@/features/home/MemberHome'

/** 홈 (S10) — 모든 접속의 첫 화면. 비회원은 낮 마을 산책길(제목까지), 부원은 밤 별자리(전부) */
export function HomePage() {
  const { data: me } = useMe()
  return me ? <MemberHome me={me} /> : <GuestHome />
}

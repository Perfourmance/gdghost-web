// 유령 · 배경 그림 주소 (src/assets/scene, 시안 assets를 WebP로 줄인 것)
import ghostB from '@/assets/scene/ghost-b.webp'
import ghostDoor from '@/assets/scene/ghost-door.webp'
import ghostGlass from '@/assets/scene/ghost-glass.webp'
import ghostLantern from '@/assets/scene/ghost-lantern.webp'
import ghostShh from '@/assets/scene/ghost-shh.webp'
import ghostStar from '@/assets/scene/ghost-star.webp'
import ghostThread from '@/assets/scene/ghost-thread.webp'
import bgDay from '@/assets/scene/bg-day.webp'
import bgFull from '@/assets/scene/bg-full.webp'
import bgSky from '@/assets/scene/bg-sky.webp'
import bgVillage from '@/assets/scene/bg-village.webp'

/**
 * 유령 역할표 (가이드 3-3)
 * lantern 길 안내 · 진행 · 404 / door 입구 · 초대 / shh 비밀 · 기다림 · 익명 · 신고
 * glass 찾기 · 빈 결과 / star 환영 · 보상 / thread 잇기 · 연결 / b 기본 인사 · 나
 */
export const GHOSTS = {
  b: ghostB,
  door: ghostDoor,
  glass: ghostGlass,
  lantern: ghostLantern,
  shh: ghostShh,
  star: ghostStar,
  thread: ghostThread,
} as const

export type GhostPose = keyof typeof GHOSTS

/** 배경 그림: 밤 위쪽 sky, 끝 · 빈 상태 아래 village, 큰 장면 full, 낮 day */
export const SCENES = { day: bgDay, full: bgFull, sky: bgSky, village: bgVillage } as const

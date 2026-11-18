import type { ImgHTMLAttributes } from 'react'
import { GHOSTS, type GhostPose } from './scene'

interface GhostProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  pose: GhostPose
}

/** 망토 유령 — 장식이라 읽기 도구에는 숨긴다 */
export function Ghost({ pose, alt = '', ...props }: GhostProps) {
  return <img src={GHOSTS[pose]} alt={alt} aria-hidden={alt === '' || undefined} draggable={false} {...props} />
}

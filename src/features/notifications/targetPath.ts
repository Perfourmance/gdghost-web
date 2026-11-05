import type { AppNotification } from '@/features/notifications/api'

/**
 * 알림을 누르면 갈 화면 (IA 5장 딥링크 대응). 아직 없는 화면은 그 단위에서 이 주소로 만든다:
 * 공유 F17 · 피드 F18 · 일정 · 모집 F15 · 이벤트 F16 · 내 커피챗 F19 · 운영 페이지 F21.
 * 모르는 대상이면 null(읽음만 처리)
 */
export function notificationPath(notification: AppNotification, myId: number): string | null {
  const { type, id, subType, subId } = notification.target
  const hash = (prefix: string) => (subId != null ? `#${prefix}-${subId}` : '')

  switch (type) {
    case 'QUESTION':
      return `/questions/${id}${subType === 'ANSWER' ? hash('answer') : ''}`
    case 'NOTICE':
      return `/notices/${id}`
    case 'SHARE':
      return `/shares/${id}${subType === 'SHARE_NOTE' ? hash('note') : ''}`
    case 'FEED_POST':
      return `/feed/${id}${subType === 'FEED_COMMENT' ? hash('comment') : ''}`
    case 'SCHEDULE':
      return `/schedules/${id}`
    case 'RECRUIT':
      // 모집 목록 + 그 모집의 상세 시트
      return `/recruits?open=${id}`
    case 'EVENT':
      return `/events/${id}${subType === 'CERTIFICATION' ? hash('certification') : ''}`
    case 'COFFEE_CHAT':
      // 신청이 왔으면 받은 신청, 수락 · 거절 · 만료는 내가 보낸 신청의 결과
      return `/coffee-chats?tab=${notification.type === 'COFFEE_REQUESTED' ? 'received' : 'sent'}`
    case 'MEMBER':
      // 근황 업데이트 요청은 바로 고칠 수 있게 프로필 수정으로
      if (notification.type === 'STATUS_NOTE_REMINDER') return '/profile/edit'
      return `/members/${id > 0 ? id : myId}`
    case 'SETTINGS':
      // 운영진 지정 · 해제. 운영 페이지(S70)가 생기면 지정된 경우 그쪽으로 (F21)
      return '/settings'
    default:
      return null
  }
}

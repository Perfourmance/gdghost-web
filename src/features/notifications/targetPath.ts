// 서비스 워커(src/sw.ts)도 이 파일을 쓴다 — 다른 파일을 가져오지 않는다

/** 알림 · 웹 푸시가 주는 값 중 화면 주소에 필요한 것 */
export interface NotificationLike {
  type: string
  target: { type: string; id: number; subType: string | null; subId: number | null }
}

/**
 * 알림을 누르면 갈 화면 (IA 5장 딥링크 대응). 아직 없는 화면은 그 단위에서 이 주소로 만든다:
 * 공유 F17 · 피드 F18 · 일정 · 모집 F15 · 이벤트 F16 · 내 커피챗 F19 · 운영 페이지 F21.
 * 모르는 대상이면 null(읽음만 처리)
 */
export function notificationPath(notification: NotificationLike, myId: number, staff = false): string | null {
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
      // 푸시(서비스 워커)는 내 id를 모르므로 0 → 홈
      if (id <= 0 && myId <= 0) return '/'
      return `/members/${id > 0 ? id : myId}`
    case 'SETTINGS':
      // 운영진 지정 · 해제. 지금 운영진이면 운영 페이지(S70), 아니면 설정
      return staff ? '/ops' : '/settings'
    default:
      return null
  }
}

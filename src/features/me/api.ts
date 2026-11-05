import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { meQueryKey, switchSession, type Role } from '@/features/auth/session'
import type { ContactType } from '@/features/member/api'
import type { MemberStatus, Position } from '@/features/member/labels'
import { api, type ApiError } from '@/lib/api'
import { emailCodeErrorMessage } from '@/lib/emailErrors'
import { commonErrorMessage, formatWait } from '@/lib/errorMessage'

// 내 정보 · 설정 (백엔드 MyProfileController · PasswordChangeController · EmailChangeController · WithdrawalController)

export const COFFEE_MEMO_MAX = 60
export const CONTACT_VALUE_MAX = 100

export interface MyContact {
  type: ContactType
  value: string
  isPublic: boolean
}

export interface MySettings {
  acceptQuestion: boolean
  acceptCoffee: boolean
  /** 커피챗을 수락하면 신청자에게 보일 한 줄 */
  coffeeMemo: string | null
  hiddenFromList: boolean
  pushOn: boolean
}

/** 6항목 중 빠진 것: INTEREST · SKILL · EXPERIENCE · STATUS_NOTE · BIO · CONTACT */
export interface ProfileCompleteness {
  filled: number
  total: number
  missing: string[]
}

/** GET /me (MyProfileResponse) — 비공개 연락 수단도 온다 */
export interface MyProfile {
  id: number
  loginId: string
  email: string
  name: string
  nickname: string
  generation: number
  studentNo: string | null
  department: string
  position: Position
  status: MemberStatus
  role: Role
  interests: { id: number; name: string; skills: { id: number; name: string }[] }[]
  experiences: { id: number; name: string }[]
  statusNote: string | null
  statusNoteUpdatedAt: string | null
  bio: string | null
  contacts: MyContact[]
  settings: MySettings
  /** 지금 바꿀 수 있으면 null */
  nicknameChangeAvailableAt: string | null
  emailChangeAvailableAt: string | null
  profileCompleteness: ProfileCompleteness
}

export const myProfileKey = ['me', 'profile'] as const

export function useMyProfile(enabled: boolean) {
  return useQuery({
    queryKey: myProfileKey,
    queryFn: async () => (await api.get<MyProfile>('/me')).data,
    enabled,
  })
}

/** 보낸 필드만 바꾼다. statusNote · bio는 빈 문자열이면 지운다 */
export interface ProfileUpdateInput {
  nickname?: string
  department?: string
  position?: Position
  status?: MemberStatus
  interestTagIds?: number[]
  skillTagIds?: number[]
  experienceTagIds?: number[]
  statusNote?: string
  bio?: string
}

/** 내 정보가 바뀌면 상단 바(/auth/me) · 내 프로필 · 부원 목록도 새로 */
function refreshAfterProfileChange(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: meQueryKey })
  void queryClient.invalidateQueries({ queryKey: ['members'] })
}

/** 프로필 PATCH + 연락 수단 PUT을 한 번의 저장으로. 바뀐 것만 보낸다 */
export function useSaveProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ profile, contacts }: { profile: ProfileUpdateInput | null; contacts: MyContact[] | null }) => {
      if (profile) await api.patch<MyProfile>('/me/profile', profile)
      if (contacts) await api.put('/me/contacts', { contacts })
    },
    // 프로필만 저장되고 연락 수단에서 실패해도 화면을 서버 값으로 맞춘다
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: myProfileKey })
      refreshAfterProfileChange(queryClient)
    },
  })
}

export function profileSaveErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'NICKNAME_TAKEN':
      return '이미 쓰는 닉네임이에요.'
    case 'NICKNAME_RESERVED':
      return "'익명'으로 시작하는 닉네임은 쓸 수 없어요."
    case 'NICKNAME_CHANGE_TOO_SOON':
      return '닉네임은 30일에 한 번만 바꿀 수 있어요.'
    case 'VALIDATION_FAILED':
      return error.fieldErrors[0]?.message ?? '입력한 내용을 확인해 주세요.'
    case 'RATE_LIMITED':
      return '오늘은 프로필을 너무 많이 고쳤어요. 내일 다시 해 주세요.'
    default:
      return commonErrorMessage(error)
  }
}

/** 설정은 바꾸는 즉시 저장 (프로필과 달리 하루 한도 없음) */
export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<MySettings>) => (await api.patch<MySettings>('/me/settings', patch)).data,
    onSuccess: (settings) => {
      queryClient.setQueryData<MyProfile>(myProfileKey, (old) => (old ? { ...old, settings } : old))
      void queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}

/** 현재 비밀번호 확인이 있는 요청(비밀번호 · 이메일 변경 · 탈퇴) 공통 */
function currentPasswordError(error: ApiError): string | null {
  if (error.code === 'CURRENT_PASSWORD_WRONG') return '현재 비밀번호가 맞지 않아요.'
  if (error.code === 'RATE_LIMITED') {
    return `비밀번호를 여러 번 틀렸어요. ${formatWait(error.retryAfter ?? 600)} 뒤에 다시 해 주세요.`
  }
  return null
}

/** 지금 기기는 새 쿠키로 유지, 다른 기기는 로그아웃 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
      await api.put('/me/password', input)
    },
  })
}

export function passwordChangeErrorMessage(error: ApiError): string {
  if (error.code === 'PASSWORD_POLICY') return '새 비밀번호는 8자 이상, 영문 · 숫자 · 특수문자를 모두 넣어 주세요.'
  return currentPasswordError(error) ?? commonErrorMessage(error)
}

export function useSendEmailChangeCode() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newEmail: string }) =>
      (await api.post<{ expiresAt: string; resendAvailableAt: string }>('/me/email-change/codes', input)).data,
  })
}

/** 지금 기기는 새 쿠키로 유지, 다른 기기는 로그아웃 */
export function useConfirmEmailChange() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { newEmail: string; code: string }) => {
      await api.post('/me/email-change/confirm', input)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: myProfileKey }),
  })
}

/** sameAsCurrent: 지금 쓰는 메일을 넣었는지 (서버는 둘 다 EMAIL_ALREADY_USED) */
export function emailChangeErrorMessage(error: ApiError, sameAsCurrent: boolean): string {
  if (error.code === 'EMAIL_ALREADY_USED') {
    return sameAsCurrent ? '지금 쓰는 이메일이에요.' : '이미 다른 계정이 쓰는 이메일이에요.'
  }
  if (error.code === 'EMAIL_CHANGE_TOO_SOON') return '이메일은 30일에 한 번만 바꿀 수 있어요.'
  // 이메일 변경은 시간당 5회 한도도 있다 — 비밀번호 잠금과 같은 429라 retryAfter로만 안내
  if (error.code === 'CURRENT_PASSWORD_WRONG') return '현재 비밀번호가 맞지 않아요.'
  if (error.code === 'RATE_LIMITED') {
    return `요청이 많아 잠시 막혔어요. ${formatWait(error.retryAfter ?? 600)} 뒤에 다시 해 주세요.`
  }
  return emailCodeErrorMessage(error)
}

/** 성공하면 모든 기기 로그아웃 → 이 기기도 비회원으로 */
export function useWithdraw() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (password: string) => {
      await api.post('/me/withdrawal', { password })
    },
    onSuccess: () => switchSession(queryClient, null),
  })
}

export function withdrawalErrorMessage(error: ApiError): string {
  if (error.code === 'LAST_STAFF') return '혼자 남은 운영진은 탈퇴할 수 없어요. 다른 운영진을 먼저 지정해 주세요.'
  return currentPasswordError(error) ?? commonErrorMessage(error)
}

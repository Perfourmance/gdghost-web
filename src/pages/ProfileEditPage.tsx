import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Chip } from '@/components/Chip'
import { FieldLabel, StepFooter } from '@/components/form/StepLayout'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import {
  CONTACT_VALUE_MAX,
  profileSaveErrorMessage,
  useMyProfile,
  useSaveProfile,
  type MyContact,
  type MyProfile,
  type ProfileUpdateInput,
} from '@/features/me/api'
import type { ContactType } from '@/features/member/api'
import { CONTACT_TYPES, MEMBER_STATUSES, POSITIONS, type MemberStatus, type Position } from '@/features/member/labels'
import { ExperiencePicker, InterestPicker } from '@/features/member/TagPickers'
import { BIO_MAX, STATUS_NOTE_MAX } from '@/features/signup/answerableRules'
import { TagsState } from '@/features/signup/TagsState'
import { useNicknameCheck } from '@/features/signup/useNicknameCheck'
import { useTags } from '@/features/tags/useTags'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import { toApiError } from '@/lib/api'
import { formatMonthDay } from '@/lib/time'

const MISSING_LABELS: Record<string, string> = {
  INTEREST: '관심 분야',
  SKILL: '세부 기술',
  EXPERIENCE: '경험',
  STATUS_NOTE: '근황',
  BIO: '자기소개',
  CONTACT: '연락 수단',
}

const CONTACT_PLACEHOLDERS: Record<ContactType, string> = {
  KAKAO: '오픈채팅 링크나 아이디',
  INSTA: '@아이디',
  LINKEDIN: 'https://www.linkedin.com/in/…',
  PHONE: '010-0000-0000',
}

interface ContactRow {
  value: string
  isPublic: boolean
}

interface FormValues {
  nickname: string
  department: string
  position: Position
  status: MemberStatus
  interestTagIds: number[]
  skillTagIds: number[]
  experienceTagIds: number[]
  statusNote: string
  bio: string
  contacts: Record<ContactType, ContactRow>
}

function initialValues(p: MyProfile): FormValues {
  const contacts = Object.fromEntries(
    CONTACT_TYPES.map(({ value }) => {
      const c = p.contacts.find((x) => x.type === value)
      return [value, { value: c?.value ?? '', isPublic: c?.isPublic ?? false }]
    }),
  ) as Record<ContactType, ContactRow>
  return {
    nickname: p.nickname,
    department: p.department,
    position: p.position,
    status: p.status,
    interestTagIds: p.interests.map((i) => i.id),
    skillTagIds: p.interests.flatMap((i) => i.skills.map((s) => s.id)),
    experienceTagIds: p.experiences.map((e) => e.id),
    statusNote: p.statusNote ?? '',
    bio: p.bio ?? '',
    contacts,
  }
}

const sameIds = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x))

function contactList(contacts: Record<ContactType, ContactRow>): MyContact[] {
  return CONTACT_TYPES.flatMap(({ value: type }) => {
    const row = contacts[type]
    const value = row.value.trim()
    return value === '' ? [] : [{ type, value, isPublic: row.isPublic }]
  })
}

/** 바뀐 필드만 PATCH에 담는다 (보낸 필드만 바뀌는 API) */
function profileDiff(from: FormValues, to: FormValues): ProfileUpdateInput | null {
  const diff: ProfileUpdateInput = {}
  if (to.nickname.trim() !== from.nickname) diff.nickname = to.nickname.trim()
  if (to.department.trim() !== from.department) diff.department = to.department.trim()
  if (to.position !== from.position) diff.position = to.position
  if (to.status !== from.status) diff.status = to.status
  // 세부 기술은 관심 분야와 묶여 있어 둘 중 하나가 바뀌면 같이 보낸다
  if (!sameIds(to.interestTagIds, from.interestTagIds) || !sameIds(to.skillTagIds, from.skillTagIds)) {
    diff.interestTagIds = to.interestTagIds
    diff.skillTagIds = to.skillTagIds
  }
  if (!sameIds(to.experienceTagIds, from.experienceTagIds)) diff.experienceTagIds = to.experienceTagIds
  if (to.statusNote.trim() !== from.statusNote) diff.statusNote = to.statusNote.trim()
  if (to.bio.trim() !== from.bio) diff.bio = to.bio.trim()
  return Object.keys(diff).length > 0 ? diff : null
}

function contactsChanged(from: FormValues, to: FormValues): boolean {
  return JSON.stringify(contactList(from.contacts)) !== JSON.stringify(contactList(to.contacts))
}

/** 프로필 수정 (S26 · F3-03). 저장 버튼을 눌렀을 때만 저장 (하루 20회 한도) */
export function ProfileEditPage() {
  const { data: me } = useMe()
  const location = useLocation()
  const profile = useMyProfile(me != null)

  if (!me) {
    return (
      <SubPageLayout>
        <LockPanel next={location.pathname} title="프로필 수정은 로그인 후에 할 수 있어요" />
      </SubPageLayout>
    )
  }

  return (
    <SubPageLayout fallback={`/members/${me.id}`}>
      {profile.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}
      {profile.isError && (
        <div className="py-16 text-center">
          <p className="text-sm">프로필을 불러오지 못했어요.</p>
          <Button variant="secondary" className="mt-3" onClick={() => profile.refetch()}>
            다시 시도
          </Button>
        </div>
      )}
      {/* 처음 불러온 값으로 폼을 한 번만 채운다 (저장 뒤 다시 불러와도 입력 중인 값은 그대로) */}
      {profile.data && <ProfileForm key={profile.data.id} profile={profile.data} />}
    </SubPageLayout>
  )
}

function ProfileForm({ profile }: { profile: MyProfile }) {
  const navigate = useNavigate()
  const tags = useTags()
  const save = useSaveProfile()
  const [initial] = useState(() => initialValues(profile))
  const [values, setValues] = useState(initial)
  const [triedSubmit, setTriedSubmit] = useState(false)

  const nicknameChanged = values.nickname.trim() !== initial.nickname
  // 그대로면 확인하지 않는다 (내 닉네임은 '이미 쓰는 닉네임'으로 나온다)
  const nicknameCheck = useNicknameCheck(nicknameChanged ? values.nickname : '')
  const nicknameLockedUntil = profile.nicknameChangeAvailableAt

  const diff = profileDiff(initial, values)
  const contactsDirty = contactsChanged(initial, values)
  const dirty = diff != null || contactsDirty
  const allowLeave = useLeaveGuard(dirty && !save.isPending, '수정을 그만둘까요? 바꾼 내용은 사라져요.')

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }
  function setContact(type: ContactType, patch: Partial<ContactRow>) {
    setValues((v) => ({ ...v, contacts: { ...v.contacts, [type]: { ...v.contacts[type], ...patch } } }))
  }

  const phone = values.contacts.PHONE.value.trim()
  const errors = {
    nickname: nicknameChanged && nicknameCheck.state === 'invalid' ? nicknameCheck.message : null,
    department: values.department.trim() === '' ? '학과를 적어 주세요.' : null,
    interests: values.interestTagIds.length === 0 ? '관심 분야를 하나 이상 골라 주세요.' : null,
    phone: phone !== '' && !/^[0-9-]+$/.test(phone) ? '전화번호는 숫자와 하이픈(-)만 쓸 수 있어요.' : null,
  }
  const nicknamePending = nicknameChanged && nicknameCheck.state !== 'available'
  const hasError = Object.values(errors).some(Boolean)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTriedSubmit(true)
    if (!dirty || hasError || nicknamePending || save.isPending) return
    save.mutate(
      { profile: diff, contacts: contactsDirty ? contactList(values.contacts) : null },
      {
        onSuccess: () => {
          allowLeave()
          navigate(`/members/${profile.id}`, { replace: true })
        },
      },
    )
  }

  const { filled, total, missing } = profile.profileCompleteness

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 className="text-[22px] leading-snug font-bold text-title">프로필 수정</h1>
      {missing.length > 0 ? (
        <p className="mt-2 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-text">
          프로필을 {filled} / {total} 채웠어요. 채울수록 맞는 질문이 잘 찾아와요.
          <span className="mt-0.5 block text-xs text-brand-text/80">
            비어 있는 것: {missing.map((m) => MISSING_LABELS[m] ?? m).join(' · ')}
          </span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">프로필을 모두 채웠어요.</p>
      )}

      <div className="mt-8 space-y-8">
        <section>
          <FieldLabel htmlFor="nickname">닉네임</FieldLabel>
          <Input
            id="nickname"
            maxLength={12}
            className="h-12 bg-card"
            disabled={nicknameLockedUntil != null}
            aria-invalid={errors.nickname != null}
            value={values.nickname}
            onChange={(e) => set('nickname', e.target.value)}
          />
          <p className="mt-2 text-xs" aria-live="polite">
            {nicknameLockedUntil != null ? (
              <span className="text-muted-foreground">
                {formatMonthDay(nicknameLockedUntil)}부터 다시 바꿀 수 있어요. (30일에 한 번)
              </span>
            ) : !nicknameChanged ? (
              <span className="text-muted-foreground">2–12자. 바꾸면 30일 동안 다시 바꿀 수 없어요.</span>
            ) : nicknameCheck.state === 'checking' ? (
              <span className="text-muted-foreground">확인 중…</span>
            ) : nicknameCheck.state === 'available' ? (
              <span className="text-brand-text">사용할 수 있어요.</span>
            ) : nicknameCheck.state === 'invalid' ? (
              <span className="text-destructive">{nicknameCheck.message}</span>
            ) : nicknameCheck.state === 'error' ? (
              <span className="text-destructive">확인하지 못했어요. 잠시 뒤 다시 입력해 주세요.</span>
            ) : null}
          </p>
        </section>

        <section className="rounded-xl bg-card px-4 py-3 text-sm">
          <p className="text-foreground">
            {profile.name} · {profile.generation}기{profile.studentNo && ` · ${profile.studentNo}학번`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">이름 · 기수 · 학번은 바꿀 수 없어요.</p>
        </section>

        <section>
          <FieldLabel htmlFor="department">학과</FieldLabel>
          <Input
            id="department"
            maxLength={30}
            className="h-12 bg-card"
            aria-invalid={triedSubmit && errors.department != null}
            value={values.department}
            onChange={(e) => set('department', e.target.value)}
          />
          {triedSubmit && errors.department && <FieldError>{errors.department}</FieldError>}
        </section>

        <section>
          <FieldLabel>포지션</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map((p) => (
              <Chip key={p.value} selected={values.position === p.value} onClick={() => set('position', p.value)}>
                {p.label}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <FieldLabel>상태</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {MEMBER_STATUSES.map((s) => (
              <Chip key={s.value} selected={values.status === s.value} onClick={() => set('status', s.value)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </section>

        <TagsState tags={tags} />
        {tags.data && (
          <>
            <div>
              <InterestPicker
                tags={tags.data}
                value={values}
                onChange={(next) => setValues((v) => ({ ...v, ...next }))}
              />
              {triedSubmit && errors.interests && <FieldError>{errors.interests}</FieldError>}
            </div>
            <section>
              <FieldLabel>경험 (선택)</FieldLabel>
              <ExperiencePicker
                tags={tags.data}
                value={values.experienceTagIds}
                onChange={(ids) => set('experienceTagIds', ids)}
              />
            </section>
          </>
        )}

        <section>
          <FieldLabel htmlFor="statusNote" aside={`${values.statusNote.length} / ${STATUS_NOTE_MAX}`}>
            근황
          </FieldLabel>
          <Input
            id="statusNote"
            maxLength={STATUS_NOTE_MAX}
            placeholder="예) OO기업 백엔드 인턴 근무 중"
            className="h-12 bg-card"
            value={values.statusNote}
            onChange={(e) => set('statusNote', e.target.value)}
          />
        </section>

        <section>
          <FieldLabel htmlFor="bio" aside={`${values.bio.length} / ${BIO_MAX}`}>
            자기소개
          </FieldLabel>
          <p className="mb-3 text-xs text-muted-foreground">
            <b className="font-bold text-brand-text">어떤 질문에 답할 수 있는지</b> 적어 주세요. 후배들이 이걸 보고
            찾아와요
          </p>
          <textarea
            id="bio"
            maxLength={BIO_MAX}
            rows={4}
            className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            value={values.bio}
            onChange={(e) => set('bio', e.target.value)}
          />
        </section>

        <section>
          <FieldLabel>연락 수단 (선택)</FieldLabel>
          <p className="mb-3 text-xs text-muted-foreground">
            공개를 켠 것만 다른 부원 프로필에 보여요. 비워 두면 지워져요.
          </p>
          <ul className="space-y-3">
            {CONTACT_TYPES.map(({ value: type, label }) => {
              const row = values.contacts[type]
              const id = `contact-${type}`
              return (
                <li key={type} className="rounded-xl bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={id} className="text-sm font-bold text-title">
                      {label}
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Checkbox
                        checked={row.isPublic}
                        disabled={row.value.trim() === ''}
                        onCheckedChange={(checked) => setContact(type, { isPublic: checked === true })}
                      />
                      공개
                    </label>
                  </div>
                  <Input
                    id={id}
                    maxLength={CONTACT_VALUE_MAX}
                    inputMode={type === 'PHONE' ? 'tel' : undefined}
                    placeholder={CONTACT_PLACEHOLDERS[type]}
                    className="mt-2 h-11 bg-background"
                    aria-invalid={type === 'PHONE' && errors.phone != null}
                    value={row.value}
                    onChange={(e) => setContact(type, { value: e.target.value })}
                  />
                  {type === 'PHONE' && errors.phone && <FieldError>{errors.phone}</FieldError>}
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <StepFooter>
        {save.isError && (
          <p className="mb-2 text-sm text-destructive" role="alert">
            {profileSaveErrorMessage(toApiError(save.error))}
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 w-full" disabled={!dirty || save.isPending}>
          {save.isPending ? '저장하는 중…' : dirty ? '저장' : '바꾼 내용이 없어요'}
        </Button>
      </StepFooter>
    </form>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-xs text-destructive" role="alert">
      {children}
    </p>
  )
}

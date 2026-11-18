import { useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import {
  ChipGroup,
  EmptyState,
  FieldError,
  Hint,
  IconChevronDown,
  LanternRow,
  LockedField,
  Paper,
  PaperChips,
  PaperInput,
  PaperLabel,
  PaperTextarea,
  Pill,
  SaveBar,
  StoryButton,
  StorySubPage,
  Toggle,
} from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { DepartmentSelect } from '@/features/departments/DepartmentSelect'
import { isDepartment, useDepartments } from '@/features/departments/useDepartments'
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
import {
  CONTACT_TYPES,
  MEMBER_STATUSES,
  memberStatusLabel,
  POSITIONS,
  positionLabel,
  type MemberStatus,
  type Position,
} from '@/features/member/labels'
import {
  BIO_MAX,
  groupExperiences,
  MAX_EXPERIENCES,
  MAX_INTERESTS,
  MAX_SKILLS_PER_INTEREST,
  sortedInterests,
  STATUS_NOTE_MAX,
  toggleId,
  toggleInterestSelection,
} from '@/features/signup/answerableRules'
import { useNicknameCheck } from '@/features/signup/useNicknameCheck'
import { useTags } from '@/features/tags/useTags'
import { useLeaveGuard } from '@/hooks/useLeaveGuard'
import { toApiError } from '@/lib/api'
import { formatMonthDay } from '@/lib/time'
import { cn } from '@/lib/utils'
import '@/styles/members.css'

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
        <LockPanel next={location.pathname} title="프로필 수정은 로그인 후에 할 수 있어요." />
      </SubPageLayout>
    )
  }

  return (
    <StorySubPage fallback={`/members/${me.id}`} className="gh-pedit">
      {profile.isPending && <div className="gh-mskel mx-4 mt-6 !h-72" aria-label="불러오는 중" />}
      {profile.isError && (
        <div className="px-4 pt-6">
          <EmptyState
            row
            pose="shh"
            title="프로필을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => profile.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}
      {/* 처음 불러온 값으로 폼을 한 번만 채운다 (저장 뒤 다시 불러와도 입력 중인 값은 그대로) */}
      {profile.data && <ProfileForm key={profile.data.id} profile={profile.data} />}
    </StorySubPage>
  )
}

type FoldKey = 'basic' | 'field' | 'exp' | 'intro' | 'contact'

/** 접힌 칸 — 머리(등불 · 이름 · 요약 글)를 누르면 펼쳐진다. 접혀 있으면 요약 칩만 */
function Fold({
  id,
  open,
  onToggle,
  title,
  sub,
  lamps,
  error,
  summary,
  children,
}: {
  id: FoldKey
  open: boolean
  onToggle: () => void
  title: string
  sub: string
  lamps?: boolean[]
  error?: boolean
  summary: { text: string; empty?: boolean }[]
  children: ReactNode
}) {
  return (
    <section id={`fold-${id}`} className={cn('gh-fold', open && 'is-open')}>
      <button type="button" className="gh-fold-h" aria-expanded={open} aria-controls={`fold-${id}-body`} onClick={onToggle}>
        {lamps && (
          <span className="gh-lps" aria-hidden>
            {lamps.map((on, i) => (
              <i key={i} className={cn(!on && 'is-off')} />
            ))}
          </span>
        )}
        <b>{title}</b>
        <small>{sub}</small>
        {error && <span className="gh-err-dot" aria-label="고칠 곳이 있어요" />}
        <IconChevronDown />
      </button>
      {open ? (
        <div id={`fold-${id}-body`}>
          <Paper flat>{children}</Paper>
        </div>
      ) : (
        <div className="gh-sum">
          {summary.map((s, i) => (
            <span key={i} className={cn(s.empty && 'is-empty')}>
              {s.text}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

function ProfileForm({ profile }: { profile: MyProfile }) {
  const navigate = useNavigate()
  const tags = useTags()
  const departments = useDepartments()
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
  const allowLeave = useLeaveGuard(dirty && !save.isPending, '수정을 그만둘까요? 변경 사항은 저장되지 않아요.')

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }
  function setContact(type: ContactType, patch: Partial<ContactRow>) {
    setValues((v) => ({ ...v, contacts: { ...v.contacts, [type]: { ...v.contacts[type], ...patch } } }))
  }

  const phone = values.contacts.PHONE.value.trim()
  const errors = {
    nickname: nicknameChanged && nicknameCheck.state === 'invalid' ? nicknameCheck.message : null,
    department: isDepartment(departments.data, values.department) ? null : '학과를 골라 주세요.',
    interests: values.interestTagIds.length === 0 ? '관심 분야를 하나 이상 골라 주세요.' : null,
    phone: phone !== '' && !/^[0-9-]+$/.test(phone) ? '숫자와 하이픈(-)만 입력해 주세요.' : null,
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

  const [open, setOpen] = useState<Set<FoldKey>>(() => new Set())
  const toggle = (key: FoldKey) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  function jump(key: FoldKey) {
    setOpen((prev) => new Set(prev).add(key))
    requestAnimationFrame(() => document.getElementById(`fold-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  // 등불 6개 — 지금 입력한 값 기준으로 켠다
  const contactsFilled = contactList(values.contacts).length > 0
  const lamps: { key: string; label: string; on: boolean; fold: FoldKey }[] = [
    { key: 'INTEREST', label: '관심 분야', on: values.interestTagIds.length > 0, fold: 'field' },
    { key: 'SKILL', label: '세부 기술', on: values.skillTagIds.length > 0, fold: 'field' },
    { key: 'EXPERIENCE', label: '경험', on: values.experienceTagIds.length > 0, fold: 'exp' },
    { key: 'STATUS_NOTE', label: '근황', on: values.statusNote.trim() !== '', fold: 'intro' },
    { key: 'BIO', label: '자기소개', on: values.bio.trim() !== '', fold: 'intro' },
    { key: 'CONTACT', label: '연락 수단', on: contactsFilled, fold: 'contact' },
  ]
  const litCount = lamps.filter((l) => l.on).length
  const missing = lamps.filter((l) => !l.on)

  const interestNames = tags.data
    ? tags.data.interests.filter((i) => values.interestTagIds.includes(i.id)).map((i) => i.name)
    : []
  const skillNames = tags.data
    ? tags.data.interests.flatMap((i) => i.skills).filter((sk) => values.skillTagIds.includes(sk.id)).map((sk) => sk.name)
    : []
  const expNames = tags.data ? tags.data.experiences.filter((e) => values.experienceTagIds.includes(e.id)).map((e) => e.name) : []
  const deptLabel = isDepartment(departments.data, values.department) ? values.department : '학과 고르기 전'

  // 저장하려다 막히면 고칠 칸을 펼친다
  function submitWithReveal(event: FormEvent<HTMLFormElement>) {
    const reveal: FoldKey[] = []
    if (errors.nickname || errors.department) reveal.push('basic')
    if (errors.interests) reveal.push('field')
    if (errors.phone) reveal.push('contact')
    if (reveal.length) setOpen((prev) => new Set([...prev, ...reveal]))
    handleSubmit(event)
  }

  const interestsMax = values.interestTagIds.length >= MAX_INTERESTS
  const selectedInterests = tags.data
    ? sortedInterests(tags.data).filter((i) => values.interestTagIds.includes(i.id))
    : []
  const expFull = values.experienceTagIds.length >= MAX_EXPERIENCES

  return (
    <form onSubmit={submitWithReveal} noValidate>
      <div className="gh-pe-ttl">
        <h1>내 집 손보기</h1>
        <p>펼친 칸만 고치고, 한 번에 저장해요.</p>
      </div>

      <div className="gh-meter">
        <div className="gh-meter-t">
          <span>
            등불 {lamps.length}개 중 <em>{litCount}개</em>가 켜졌어요
          </span>
          <small>누르면 그 칸으로 가요</small>
        </div>
        <LanternRow items={lamps.map((l) => ({ label: l.label, on: l.on, onClick: () => jump(l.fold) }))} />
        {missing.length > 0 && (
          <p className="gh-miss">
            비어 있는 것: <b>{missing.map((m) => m.label).join(' · ')}</b> · 더 채우면 내 경험에 맞는 질문을 받아요
          </p>
        )}
      </div>

      <Fold
        id="basic"
        open={open.has('basic')}
        onToggle={() => toggle('basic')}
        title="기본 정보"
        sub="문패"
        error={triedSubmit && (errors.nickname != null || errors.department != null)}
        summary={[
          { text: values.nickname.trim() || '닉네임 없음' },
          { text: positionLabel(values.position) },
          { text: memberStatusLabel(values.status) },
          { text: deptLabel, empty: !isDepartment(departments.data, values.department) },
        ]}
      >
        <PaperLabel htmlFor="nickname" aside="2~12자">
          닉네임
        </PaperLabel>
        <PaperInput
          id="nickname"
          maxLength={12}
          disabled={nicknameLockedUntil != null}
          aria-invalid={errors.nickname != null}
          value={values.nickname}
          onChange={(e) => set('nickname', e.target.value)}
        />
        <p className={cn('gh-pe-msg', nicknameChanged && nicknameCheck.state === 'available' && 'is-good', errors.nickname && 'is-bad')} aria-live="polite">
          {nicknameLockedUntil != null
            ? `${formatMonthDay(nicknameLockedUntil)}부터 다시 바꿀 수 있어요. 30일에 한 번 바꿀 수 있어요.`
            : !nicknameChanged
              ? '바꾸면 30일 동안 다시 바꿀 수 없어요.'
              : nicknameCheck.state === 'checking'
                ? '확인하는 중…'
                : nicknameCheck.state === 'available'
                  ? '쓸 수 있어요'
                  : nicknameCheck.state === 'invalid'
                    ? nicknameCheck.message
                    : nicknameCheck.state === 'error'
                      ? '확인하지 못했어요. 잠시 뒤 다시 입력해 주세요.'
                      : ''}
        </p>

        <div className="mt-4">
          <LockedField note="이름 · 기수 · 학번은 바꿀 수 없어요">
            {profile.name} · {profile.generation}기{profile.studentNo && ` · ${profile.studentNo}학번`}
          </LockedField>
        </div>

        <PaperLabel htmlFor="department">학과</PaperLabel>
        <DepartmentSelect
          id="department"
          className="gh-field"
          value={values.department}
          invalid={triedSubmit && errors.department != null}
          onChange={(name) => set('department', name)}
        />
        {triedSubmit && <FieldError>{errors.department}</FieldError>}

        <PaperLabel>포지션</PaperLabel>
        <PaperChips label="포지션" options={POSITIONS} isOn={(v) => values.position === v} onToggle={(v) => set('position', v)} />

        <PaperLabel>상태</PaperLabel>
        <PaperChips label="상태" options={MEMBER_STATUSES} isOn={(v) => values.status === v} onToggle={(v) => set('status', v)} />
      </Fold>

      <Fold
        id="field"
        open={open.has('field')}
        onToggle={() => toggle('field')}
        title="분야와 기술"
        sub={`관심 분야 ${values.interestTagIds.length}/${MAX_INTERESTS}`}
        lamps={[lamps[0].on, lamps[1].on]}
        error={triedSubmit && errors.interests != null}
        summary={
          interestNames.length + skillNames.length > 0
            ? [...interestNames, ...skillNames].map((t) => ({ text: t }))
            : [{ text: '비어 있어요', empty: true }]
        }
      >
        {tags.isPending && <p className="gh-pe-msg">목록을 불러오는 중…</p>}
        {tags.isError && (
          <button type="button" className="gh-pe-msg is-bad underline" onClick={() => tags.refetch()}>
            목록을 불러오지 못했어요. 다시 시도
          </button>
        )}
        {tags.data && (
          <>
            <PaperLabel aside={`최대 ${MAX_INTERESTS}개 · ${values.interestTagIds.length} / ${MAX_INTERESTS}`}>관심 분야</PaperLabel>
            <PaperChips
              label="관심 분야"
              options={sortedInterests(tags.data).map((i) => ({ value: i.id, label: i.name, disabled: interestsMax }))}
              isOn={(id) => values.interestTagIds.includes(id)}
              onToggle={(id) => setValues((v) => ({ ...v, ...toggleInterestSelection(sortedInterests(tags.data!), v, id) }))}
            />
            {triedSubmit && <FieldError>{errors.interests}</FieldError>}

            {selectedInterests.length > 0 && (
              <>
                <PaperLabel aside="선택">세부 기술</PaperLabel>
                <Hint>써 본 기술만 골라 주세요. 고른 기술에 맞는 질문을 받아요.</Hint>
                {selectedInterests.map((interest) => {
                  const picked = interest.skills.filter((sk) => values.skillTagIds.includes(sk.id)).length
                  return (
                    <ChipGroup key={interest.id} title={interest.name} aside={`${picked} / ${MAX_SKILLS_PER_INTEREST}`}>
                      <PaperChips
                        label={`${interest.name} 세부 기술`}
                        options={interest.skills.map((sk) => ({ value: sk.id, label: sk.name, disabled: picked >= MAX_SKILLS_PER_INTEREST }))}
                        isOn={(id) => values.skillTagIds.includes(id)}
                        onToggle={(id) => set('skillTagIds', toggleId(values.skillTagIds, id))}
                      />
                    </ChipGroup>
                  )
                })}
              </>
            )}
          </>
        )}
      </Fold>

      <Fold
        id="exp"
        open={open.has('exp')}
        onToggle={() => toggle('exp')}
        title="걸어 온 길"
        sub={`경험 ${values.experienceTagIds.length}/${MAX_EXPERIENCES}`}
        lamps={[lamps[2].on]}
        summary={expNames.length > 0 ? expNames.map((t) => ({ text: t })) : [{ text: '비어 있어요', empty: true }]}
      >
        <PaperLabel aside={`선택 · 최대 ${MAX_EXPERIENCES}개 · ${values.experienceTagIds.length} / ${MAX_EXPERIENCES}`}>경험</PaperLabel>
        {tags.data &&
          groupExperiences(tags.data).map(([group, items]) => (
            <ChipGroup key={group} title={group}>
              <PaperChips
                label={group}
                options={items.map((t) => ({ value: t.id, label: t.name, disabled: expFull }))}
                isOn={(id) => values.experienceTagIds.includes(id)}
                onToggle={(id) => set('experienceTagIds', toggleId(values.experienceTagIds, id))}
              />
            </ChipGroup>
          ))}
      </Fold>

      <Fold
        id="intro"
        open={open.has('intro')}
        onToggle={() => toggle('intro')}
        title="근황 · 소개"
        sub="문 앞 쪽지"
        lamps={[lamps[3].on, lamps[4].on]}
        summary={[
          values.statusNote.trim() ? { text: values.statusNote.trim() } : { text: '근황 비어 있어요', empty: true },
          values.bio.trim() ? { text: `소개 ${values.bio.trim().length}자` } : { text: '소개 비어 있어요', empty: true },
        ]}
      >
        <PaperLabel htmlFor="statusNote" aside={`${values.statusNote.length} / ${STATUS_NOTE_MAX}`}>
          근황 · 문 앞 쪽지
        </PaperLabel>
        <PaperInput
          id="statusNote"
          maxLength={STATUS_NOTE_MAX}
          placeholder="예: OO기업 백엔드 인턴 근무 중"
          value={values.statusNote}
          onChange={(e) => set('statusNote', e.target.value)}
        />
        <PaperLabel htmlFor="bio" aside={`${values.bio.length} / ${BIO_MAX}`}>
          자기소개
        </PaperLabel>
        <Hint>
          <b>어떤 질문에 답할 수 있는지</b> 적어 주세요. 후배에게 보여요.
        </Hint>
        <PaperTextarea id="bio" maxLength={BIO_MAX} rows={4} value={values.bio} onChange={(e) => set('bio', e.target.value)} />
      </Fold>

      <Fold
        id="contact"
        open={open.has('contact')}
        onToggle={() => toggle('contact')}
        title="연락 수단"
        sub="우편함 · 선택"
        lamps={[lamps[5].on]}
        error={triedSubmit && errors.phone != null}
        summary={
          contactsFilled
            ? contactList(values.contacts).map((c) => ({ text: `${CONTACT_TYPES.find((t) => t.value === c.type)?.label}${c.isPublic ? ' · 공개' : ''}` }))
            : [{ text: '비어 있어요 · 공개한 것만 부원에게 보여요', empty: true }]
        }
      >
        <Hint>공개한 것만 부원에게 보여요. 비워 두면 지워져요.</Hint>
        {CONTACT_TYPES.map(({ value: type, label }) => {
          const row = values.contacts[type]
          const id = `contact-${type}`
          return (
            <div key={type} className="gh-cbox">
              <div className="gh-ct">
                <label htmlFor={id}>{label}</label>
                <span>
                  공개
                  <Toggle
                    small
                    label={`${label} 공개`}
                    checked={row.isPublic}
                    disabled={row.value.trim() === ''}
                    onChange={(on) => setContact(type, { isPublic: on })}
                  />
                </span>
              </div>
              <PaperInput
                id={id}
                maxLength={CONTACT_VALUE_MAX}
                inputMode={type === 'PHONE' ? 'tel' : undefined}
                placeholder={CONTACT_PLACEHOLDERS[type]}
                aria-invalid={type === 'PHONE' && errors.phone != null}
                value={row.value}
                onChange={(e) => setContact(type, { value: e.target.value })}
              />
              {type === 'PHONE' && <FieldError>{errors.phone}</FieldError>}
            </div>
          )
        })}
      </Fold>

      <SaveBar>
        <div className="mx-auto max-w-[420px]">
          {save.isError && (
            <p className="gh-pe-fail" role="alert">
              {profileSaveErrorMessage(toApiError(save.error))}
            </p>
          )}
          <StoryButton type="submit" tone={dirty ? 'blue' : 'glass'} disabled={!dirty || save.isPending}>
            {save.isPending ? '저장하는 중…' : dirty ? '저장하기' : '바꾼 내용이 없어요'}
          </StoryButton>
        </div>
      </SaveBar>
    </form>
  )
}

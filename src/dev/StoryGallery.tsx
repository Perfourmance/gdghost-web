// 개발용 견본 — 리디자인 공통 부품을 한 곳에 모아 시안 HTML과 나란히 비교한다 (npm run dev 에서만 /dev/story)
// 여기 예시 글은 견본용이다. 실제 화면은 API 데이터를 쓴다
import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import sampleCat from '@/assets/scene/bg-full.webp'
import {
  AnswerCard,
  Bookmark,
  BigTitle,
  Board,
  Calm,
  ChipGroup,
  ConfirmProvider,
  DotChips,
  EmptyState,
  Fab,
  FieldError,
  FilterSwitches,
  Ghost,
  HangingNote,
  Hint,
  House,
  IconCalendar,
  IconCamera,
  IconCheck,
  IconFlag,
  IconLock,
  IconPencil,
  IconTack,
  IconTrash,
  InputBar,
  Lab,
  LampGrid,
  LampStat,
  LanternRow,
  LineChips,
  LinedBox,
  LinedTextarea,
  LoadingDots,
  LockedField,
  Nums,
  Paper,
  PaperChips,
  PaperInput,
  PaperLabel,
  Pill,
  PopMenu,
  PostIt,
  ReplyBubble,
  RoundSend,
  SaveBar,
  Scrap,
  SearchField,
  SectionHead,
  Segmented,
  Shelf,
  SortLinks,
  StampPicker,
  StarItem,
  StarLine,
  StoryButton,
  StoryDayTopBar,
  StorySheet,
  StoryTabs,
  StoryTopBar,
  SubBar,
  SwitchRow,
  TextTabs,
  Ticket,
  TitleInput,
  Town,
  useConfirm,
} from '@/components/story'
import { FEED_COLORS, ROOF_COLORS, SCHEDULE_COLORS, SHARE_COLORS } from '@/lib/categoryColors'

const noop = () => {}

function Part({ id, title, from, children, day }: { id: string; title: string; from: string; children: ReactNode; day?: boolean }) {
  return (
    <section id={id} data-part className={day ? 'gh-day' : 'gh-night'} style={{ width: 390, paddingBottom: 20 }}>
      <p className="px-4 pt-4 pb-2 font-title text-[11px] text-gh-dim">
        {title} · <span className="text-gh-sky">{from}</span>
      </p>
      {children}
    </section>
  )
}

export function StoryGallery() {
  return (
    <ConfirmProvider>
      <Gallery />
    </ConfirmProvider>
  )
}

function Gallery() {
  const [params] = useSearchParams()
  const open = params.get('open')
  const [cat, setCat] = useState('ALL')
  const [chips, setChips] = useState<string[]>(['FE'])
  const [stamp, setStamp] = useState<string | null>('PATH')
  const [from, setFrom] = useState<'me' | 'anon'>('anon')
  const [on, setOn] = useState(true)
  const [q, setQ] = useState('프론트')
  const ask = useConfirm()

  return (
    <div className="gh-night min-h-dvh" style={{ width: 390 }}>
      <style>{`
        [data-part] .gh-tabs,[data-part] .gh-fab,[data-part] .gh-inputbar,[data-part] .gh-savebar{position:relative;inset:auto;right:auto;bottom:auto}
        [data-part] .gh-fab{margin-left:auto;width:max-content;right:0}
      `}</style>

      <Part id="top" title="상단(메인 탭)" from="members-final .n-top">
        <StoryTopBar unread={4} />
      </Part>
      <Part id="sub" title="상단(하위 화면)" from="detail-final .n-sub">
        <SubBar onBack={noop} right={<PopMenu actions={[{ label: '편지 고치기', icon: <IconPencil />, onSelect: noop }, { label: '삭제', icon: <IconTrash />, danger: true, onSelect: noop }]} />} />
      </Part>
      <Part id="tabs" title="아래 탭 (밤)" from="members-final .tabs">
        <StoryTabs current="/questions" />
      </Part>
      <Part id="tabs-day" title="아래 탭 (낮)" from="guest-final .dock" day>
        <StoryDayTopBar />
        <StoryTabs day current="/questions" />
      </Part>
      <Part id="big" title="큰 제목 전환 + 글자 탭 + 필터" from="questions-final .big .cats .filters">
        <BigTitle items={[{ to: '/questions', label: '질문', on: true }, { to: '/members', label: '부원' }]} />
        <TextTabs
          label="분류"
          value={cat}
          onChange={setCat}
          options={[
            { value: 'ALL', label: '전체' },
            { value: 'JOB', label: '취업·채용' },
            { value: 'CAREER', label: '커리어·이직' },
            { value: 'PATH', label: '진로 고민' },
            { value: 'CAMPUS', label: '학교생활' },
          ]}
        />
        <FilterSwitches items={[{ label: '내 질문', on: false, onToggle: noop }, { label: '답변 기다리는 질문만', on: true, onToggle: noop }]} />
      </Part>
      <Part id="dotchips" title="분류 칩 · 정렬 · 상태 칩" from="feed-final .cats / share-final .sort / members-final .states">
        <DotChips
          label="분류"
          value="ALL"
          onChange={noop}
          options={[
            { value: 'ALL', label: '전체' },
            { value: 'DAILY', label: '일상', color: FEED_COLORS.DAILY },
            { value: 'ACTIVITY', label: '활동', color: FEED_COLORS.ACTIVITY },
            { value: 'CERT', label: '인증', color: FEED_COLORS.CERT },
            { value: 'BRAG', label: '자랑', color: FEED_COLORS.BRAG },
          ]}
        />
        <SortLinks value="SAVED" onChange={noop} options={[{ value: 'SAVED', label: '저장 많은 순' }, { value: 'LATEST', label: '최신순' }]} />
        <LineChips label="상태" value={null} onChange={noop} options={[{ value: 'E', label: '재학' }, { value: 'L', label: '휴학' }, { value: 'G', label: '졸업' }]} />
      </Part>
      <Part id="paper" title="크림 종이 폼 · 우표 · 칩 · 보낸 사람" from="write-final .paper / find-final .chips">
        <Paper>
          <PaperLabel aside="하나 골라 주세요">어떤 이야기예요?</PaperLabel>
          <StampPicker
            label="분류"
            value={stamp}
            onChange={setStamp}
            options={[
              { value: 'JOB', label: '취업·채용' },
              { value: 'CAREER', label: '커리어·이직' },
              { value: 'PATH', label: '진로 고민' },
              { value: 'CAMPUS', label: '학교생활' },
              { value: 'STUDY', label: '기술·공부' },
            ]}
          />
          <PaperLabel htmlFor="t" aside="29 / 80">
            제목
          </PaperLabel>
          <TitleInput id="t" defaultValue="포트폴리오 프로젝트, 팀이랑 개인 중 뭐가 나을까요?" />
          <PaperLabel htmlFor="b" aside="선택 · 0 / 3000">
            하고 싶은 이야기
          </PaperLabel>
          <LinedTextarea id="b" placeholder="어떤 상황인지 구체적으로 적어 주세요." />
          <PaperLabel aside="하나만">어느 분야 선배요?</PaperLabel>
          <PaperChips
            label="분야"
            options={[
              { value: 'BE', label: '백엔드' },
              { value: 'FE', label: '프론트엔드' },
              { value: 'CL', label: '클라우드' },
              { value: 'IOS', label: 'iOS' },
            ]}
            isOn={(v) => chips.includes(v)}
            onToggle={(v) => setChips((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]))}
          />
          <PaperLabel>보낸 사람</PaperLabel>
          <Segmented
            label="보낸 사람"
            value={from}
            onChange={setFrom}
            options={[
              { value: 'me', label: '도윤' },
              { value: 'anon', label: '익명', ghost: true },
            ]}
          />
          <Hint>
            운영진에게도 이름이 보이지 않아요. <b>올린 뒤에는 바꿀 수 없어요.</b>
          </Hint>
        </Paper>
      </Part>
      <Part id="error" title="오류 상태" from="write-final #error">
        <Paper>
          <PaperLabel aside="하나 골라 주세요">어떤 이야기예요?</PaperLabel>
          <StampPicker label="분류" error value={null} onChange={noop} options={[{ value: 'JOB', label: '취업·채용' }, { value: 'CAREER', label: '커리어·이직' }, { value: 'PATH', label: '진로 고민' }]} />
          <FieldError>분류 우표를 하나 골라 주세요.</FieldError>
          <PaperLabel htmlFor="t2" aside="0 / 80">
            제목
          </PaperLabel>
          <TitleInput id="t2" aria-invalid placeholder="예: 신입 이력서에 학점을 꼭 써야 하나요?" />
          <FieldError>제목을 2자 이상 써 주세요.</FieldError>
        </Paper>
      </Part>
      <Part id="fixed" title="바꿀 수 없는 정보 · 입력칸 · 묶음" from="pedit-final .fixed .in .grp">
        <Paper flat>
          <PaperLabel htmlFor="nick" aside="2~12자">
            닉네임
          </PaperLabel>
          <PaperInput id="nick" defaultValue="민지" />
          <Hint>바꾸면 30일 동안 다시 바꿀 수 없어요.</Hint>
          <div className="mt-3">
            <LockedField note="이름 · 기수 · 학번은 바꿀 수 없어요">이민지 · 2기 · 23학번</LockedField>
          </div>
          <ChipGroup title="프론트엔드 세부 기술" aside="2 / 3">
            <PaperChips label="세부 기술" options={[{ value: 'R', label: 'React' }, { value: 'V', label: 'Vue' }, { value: 'T', label: 'TypeScript' }]} isOn={(v) => v !== 'V'} onToggle={noop} />
          </ChipGroup>
        </Paper>
      </Part>
      <Part id="cards" title="유리 카드(답장) · 답글 · 채택" from="detail-final .ans / mydetail-final .ans.pick">
        <div className="px-4">
          <SectionHead count={2} sub="· 답글 1" line>
            답장
          </SectionHead>
          <AnswerCard name="준호" date="11.2" pickLabel="내가 채택한 답장" actions={<><button type="button">답글</button><button type="button" className="is-dim">신고</button><button type="button" className="is-amber">채택 취소</button></>}>
            개수보다 하나를 깊게가 훨씬 좋아요.
          </AnswerCard>
          <AnswerCard name="서연" date="11.4" actions={<><button type="button">답글</button><button type="button" className="is-dim">신고</button></>}>
            전혀 늦지 않아요! 디자인을 아는 프론트엔드 개발자는 정말 귀해요.
          </AnswerCard>
          <AnswerCard name="지우" date="11.4" reply to="서연" actions={<button type="button">답글</button>}>
            피그마 시안 옮기기 좋네요.
          </AnswerCard>
        </div>
      </Part>
      <Part id="glow" title="앰버 빛 카드" from="admin-final .q">
        <div className="gh-glow mx-4 p-4">
          <div className="flex items-center gap-2 text-xs">
            <Lab>취업·채용</Lab>
            <Lab tone="amber">15일째</Lab>
          </div>
          <h3 className="mt-2 font-title text-base">코딩테스트 언어, 파이썬이랑 자바 중에 뭘로…</h3>
        </div>
      </Part>
      <Part id="starline" title="질문 줄 (별빛 타임라인)" from="questions-final .line">
        <StarLine>
          <StarItem to="#">
            <Lab>학교생활</Lab>
            <h3>저녁 메뉴 추천</h3>
            <div className="gh-meta">
              <span>익명 · 11.6</span>
              <Nums answers={1} views={2} />
            </div>
            <ReplyBubble names="익명1" />
          </StarItem>
          <StarItem kind="pick" to="#">
            <div className="flex items-center gap-2">
              <Lab>취업·채용</Lab>
              <span className="gh-state is-pick">채택 완료</span>
            </div>
            <h3>신입 백엔드 포트폴리오, 프로젝트 몇 개가 적당할까요?</h3>
            <div className="gh-meta">
              <span>민지 · 11.1</span>
              <Nums answers={2} views={44} />
            </div>
            <ReplyBubble names="준호 외 1명" />
          </StarItem>
          <StarItem kind="wait" to="#">
            <div className="flex items-center gap-2">
              <Lab>취업·채용</Lab>
              <span className="gh-state is-wait">답변 대기</span>
            </div>
            <h3>코딩테스트 언어, 파이썬이랑 자바 중에 뭘로 준비할까요?</h3>
            <div className="gh-meta">
              <span>지우 · 11.1</span>
              <Nums answers={0} views={12} />
            </div>
            <ReplyBubble names={null} />
          </StarItem>
        </StarLine>
      </Part>
      <Part id="houses" title="부원 = 집" from="members-final .house">
        <Town>
          {[
            <House key="1" to="#" roofColor={ROOF_COLORS.AI} track="AI" lit={false} generation="3기 · 재학" name="도윤" intro="파이썬 · SQL 공부 중" field="데이터·AI" answers={0} />,
            <House key="2" to="#" roofColor={ROOF_COLORS.DEV} track="DEV" lit={false} generation="2기 · 재학" name="민지" intro="백엔드 취업 준비 중" field="백엔드" answers={0} />,
            <House key="3" to="#" roofColor={ROOF_COLORS.DESIGN} track="DESIGN" lit generation="1기 · 졸업" name="서연" intro="프로덕트 디자이너 3년 차" field="디자인" answers={2} />,
            <House key="4" to="#" roofColor={ROOF_COLORS.DEV} track="DEV" staff lit generation="2기 · 재학" name="하늘" intro="GDGoC SMU 회장 · 4학년" field="백엔드" answers={1} />,
          ]}
        </Town>
      </Part>
      <Part id="shelf" title="공유 = 책갈피 + 선반" from="share-final .row .bk">
        <Shelf>
          {[
            <Bookmark key="1" to="#" color={SHARE_COLORS.CAREER_PREP} category="취업 준비" title="신입 백엔드 이력서 템플릿 공유 (노션)" tags={['백엔드', '이력서']} by="준호 · 10.30" saved saveCount={6} noteCount={1} />,
            <Bookmark key="2" to="#" color={SHARE_COLORS.PLACE} category="놀 곳" title="캠퍼스 뒤 산책로, 오리랑 새 보러 가요" tags={['산책']} by="서연 · 11.2" hasPhoto saveCount={5} noteCount={1} />,
          ]}
        </Shelf>
      </Part>
      <Part id="feed" title="피드 = 빨랫줄 쪽지" from="feed-final .hang">
        <HangingNote to="#" index={0} color={FEED_COLORS.DAILY} photo={sampleCat} text="학교 오는 길에 만난 고양이. 오늘 하루 버틸 힘 충전 완료" author="서연" date="11.5" category="일상" likes={7} liked comments={3} />
        <div className="h-7" />
        <HangingNote to="#" index={1} color={FEED_COLORS.ACTIVITY} text="정기 세션 3회차 끝! 발표해 주신 분들 고생 많았어요." author="하늘" date="11.4" category="활동" likes={4} comments={1} />
      </Part>
      <Part id="scrap" title="쪽지 댓글 (피드 · 공지)" from="fdetail-final .sc">
        <div className="px-4">
          <Scrap name="준호" meta="11.3" actions={<><button type="button">답글</button><button type="button" className="is-dim">신고</button></>}>
            축하해요!! 반려 사유는 뭐였어요?
          </Scrap>
          <Scrap name="태민" meta="11.4" mine reply actions={<button type="button">답글</button>}>
            개인정보 처리방침 링크랑 스크린샷 문제였어요
          </Scrap>
        </div>
      </Part>
      <Part id="ticket" title="일정 = 티켓 + D-day 그루터기" from="schedule-final .tk">
        <div className="px-4">
          <Ticket to="#" color={SCHEDULE_COLORS.CLUB} category="동아리" official title="GDGoC SMU 해커톤" when="11.21(토) ~ 11.22(일) · 학생회관 대강당" dday="D-5" ddayCaption="시작까지" />
        </div>
      </Part>
      <Part id="postit" title="공지 = 포스트잇 (밤 게시판 / 낮 게시판)" from="ndetail-final .post / guest-final .board">
        <div className="px-3">
          <Board>
            <PostIt mustRead>
              <span className="gh-tack">
                <IconTack />
                고정
              </span>
              <h3 className="mt-3 font-title text-[22px]">11월 정기 세션 안내 (11/12 목)</h3>
            </PostIt>
          </Board>
        </div>
        <div className="gh-day mt-4 px-4 py-4">
          <Board day>
            <PostIt small>11월 정기 세션 안내 (11/12 목)</PostIt>
            <PostIt small mint>
              GDGhost 이렇게 써 주세요
            </PostIt>
          </Board>
        </div>
      </Part>
      <Part id="buttons" title="버튼 · 알약 · 떠 있는 버튼 · 보내기" from="ndetail .ok / login .go / feed .fab / detail .bar button">
        <div className="space-y-3 px-4">
          <StoryButton>
            <IconCheck />
            확인했어요
          </StoryButton>
          <StoryButton tone="amber">시작하기</StoryButton>
          <StoryButton disabled>바꾼 내용이 없어요</StoryButton>
          <div className="flex items-center gap-3">
            <Pill>
              <IconCalendar />
              날 하나 띄우기
            </Pill>
            <Pill soft>저장한 공유</Pill>
            <RoundSend label="보내기" type="button" />
            <RoundSend label="보내기" type="button" disabled />
          </div>
          <Fab icon={<IconPencil />} onClick={noop}>
            하루 걸어 두기
          </Fab>
        </div>
        <div className="gh-day mt-4 space-y-3 px-4 py-4">
          <StoryButton tone="night">밤으로 들어가기</StoryButton>
          <StoryButton tone="night" disabled>
            가입하기
          </StoryButton>
        </div>
      </Part>
      <Part id="inputbar" title="아래 고정 입력줄 (밤 / 노란 쪽지)" from="detail-final .bar / shdetail-final .bar">
        <InputBar send={<RoundSend label="답장 보내기" type="button" />}>
          <input placeholder="선배의 경험을 나눠 주세요" />
        </InputBar>
        <div className="h-3" />
        <InputBar note count="0 / 100" send={<RoundSend label="보내기" type="button" disabled />}>
          <input placeholder="예: 주말엔 웨이팅 30분 있어요" />
        </InputBar>
      </Part>
      <Part id="search" title="검색창" from="search-final .find">
        <div className="px-4">
          <SearchField value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="제목이나 태그로 찾기" />
        </div>
      </Part>
      <Part id="empty" title="빈 상태 · 처리할 것 없음 · 기다림" from="coffee-final .empty / admin-final .calm">
        <div className="space-y-3 px-4">
          <EmptyState pose="glass" title="아직 두드린 창문이 없어요" action={<Pill>선배 찾기</Pill>}>
            불 켜진 집을 찾아 커피챗을 신청해 보세요.
          </EmptyState>
          <EmptyState row pose="glass" title="아직 붙은 쪽지가 없어요">
            아는 팁이 있다면 한 줄 보태 주세요.
          </EmptyState>
          <Calm>처리할 신고가 없어요.</Calm>
          <LoadingDots />
        </div>
      </Part>
      <Part id="switch" title="등불 스위치" from="settings-final .s">
        <div className="space-y-2 px-4">
          <SwitchRow title="질문 받기" description="질문 받기를 끄면 추천이나 지목으로 오는 질문을 받지 않아요." checked={on} onChange={setOn} />
          <SwitchRow title="이 기기에서 알림 받기" description="답변 · 댓글 · 커피챗 · 공지 알림" warning="이 주소에서는 알림을 켤 수 없어요." checked={false} onChange={noop} disabled />
        </div>
      </Part>
      <Part id="lanterns" title="등불 줄 (완성도) · 등불 지표" from="pedit-final .lrow / admin-final .lamps">
        <div className="px-4">
          <p className="font-title text-[13.5px]">
            등불 6개 중 <span className="text-gh-amber">5개</span>가 켜졌어요
          </p>
          <div className="mt-3">
            <LanternRow
              items={[
                { label: '관심 분야', on: true },
                { label: '세부 기술', on: true },
                { label: '경험', on: true, current: true },
                { label: '근황', on: true },
                { label: '자기소개', on: true },
                { label: '연락 수단', on: false },
              ]}
            />
          </div>
          <div className="mt-8">
            <LampGrid>
              <LampStat label="새 질문" value={0} />
              <LampStat label="답 없는 질문" value={0} />
              <LampStat label="추천 답변율" value={0} unit="%" />
            </LampGrid>
            <div className="mt-2.5">
              <LampGrid columns={2}>
                <LampStat label="확인 대기 인증" value={1} unit="건" lit />
                <LampStat label="미처리 신고" value={0} unit="건" />
              </LampGrid>
            </div>
          </div>
        </div>
      </Part>
      <Part id="ghosts" title="유령 7종" from="assets/ghost-*.png">
        <div className="grid grid-cols-4 gap-2 px-4">
          {(['b', 'door', 'glass', 'lantern', 'shh', 'star', 'thread'] as const).map((p) => (
            <Ghost key={p} pose={p} className="w-full" />
          ))}
        </div>
      </Part>
      <Part id="labels" title="라벨 · 잠금 표시" from="night.css .lab / guest .lock">
        <div className="flex flex-wrap gap-2 px-4">
          <Lab>학교생활</Lab>
          <Lab tone="amber">확인 대기</Lab>
          <Lab color={SHARE_COLORS.LECTURE}>강의</Lab>
          <span className="gh-kicker">
            <IconLock />
            부원 전용
          </span>
          <IconFlag className="size-5 text-gh-sub" />
          <IconCamera className="size-5 text-gh-sub" />
        </div>
      </Part>
      <Part id="savebar" title="아래 고정 저장" from="pedit-final .save">
        <SaveBar>
          <StoryButton disabled>바꾼 내용이 없어요</StoryButton>
        </SaveBar>
      </Part>

      <div className="space-y-2 p-4">
        <Pill onClick={() => void ask({ title: '이 질문을 삭제할까요?', description: '삭제하면 되돌릴 수 없어요.', confirmLabel: '삭제', danger: true })}>확인 창 열기</Pill>
      </div>

      {/* ?open=... 으로 겹치는 창을 바로 띄워 캡처한다 */}
      <StorySheet
        open={open === 'report'}
        onOpenChange={noop}
        ghost="shh"
        bubble="쉿, 운영진에게만 전할게요"
        title="이 답장을 신고할까요?"
        description={
          <>
            신고는 <b>운영진만</b> 볼 수 있어요. 답장을 쓴 사람에게는 알림이 가지 않아요.
          </>
        }
      >
        <div className="mt-[18px]">
          <LinedBox id="reason" label="신고 이유" placeholder="어떤 점이 불편했는지 적어 주세요." />
        </div>
        <div className="gh-foot">
          <small>0 / 200</small>
          <Pill disabled>
            <IconFlag />
            신고 보내기
          </Pill>
        </div>
      </StorySheet>
      <StorySheet
        open={open === 'lock'}
        onOpenChange={noop}
        day
        kicker={
          <>
            <IconLock />
            부원 전용
          </>
        }
        title={
          <>
            질문은 해가 진 뒤에
            <br />
            띄울 수 있어요
          </>
        }
        description={
          <>
            부원으로 들어오면 <b>선배에게 바로 질문</b>할 수 있어요.
          </>
        }
      >
        <StoryButton tone="night" className="mt-[26px]">
          로그인하고 밤으로 들어가기
        </StoryButton>
        <button type="button" className="gh-invite mt-3 w-full">
          <span>초대장을 받았나요?</span>
          <em>코드로 가입</em>
        </button>
      </StorySheet>
      {open === 'confirm' && <AutoConfirm />}
    </div>
  )
}

function AutoConfirm() {
  const ask = useConfirm()
  useEffect(() => {
    void ask({ title: '이 질문을 삭제할까요?', description: '삭제하면 되돌릴 수 없어요.', confirmLabel: '삭제', danger: true })
  }, [ask])
  return null
}

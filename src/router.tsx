import { createBrowserRouter } from 'react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { TabLayout } from '@/components/layout/TabLayout'
import { CoffeeChatsPage } from '@/pages/CoffeeChatsPage'
import { EmailChangeConfirmPage } from '@/pages/EmailChangeConfirmPage'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { EventsPage } from '@/pages/EventsPage'
import { ErrorPage } from '@/pages/ErrorPage'
import { FeedDetailPage } from '@/pages/FeedDetailPage'
import { FeedPage } from '@/pages/FeedPage'
import { FeedWritePage } from '@/pages/FeedWritePage'
import { FindLoginIdPage } from '@/pages/FindLoginIdPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { MemberProfilePage } from '@/pages/MemberProfilePage'
import { MembersPage } from '@/pages/MembersPage'
import { NoticeDetailPage } from '@/pages/NoticeDetailPage'
import { NoticesPage } from '@/pages/NoticesPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { PasswordResetPage } from '@/pages/PasswordResetPage'
import { ProfileEditPage } from '@/pages/ProfileEditPage'
import { QuestionDetailPage } from '@/pages/QuestionDetailPage'
import { QuestionEditPage } from '@/pages/QuestionEditPage'
import { QuestionsPage } from '@/pages/QuestionsPage'
import { QuestionWritePage } from '@/pages/QuestionWritePage'
import { RecruitsPage } from '@/pages/RecruitsPage'
import { RecruitWritePage } from '@/pages/RecruitWritePage'
import { ScheduleDetailPage } from '@/pages/ScheduleDetailPage'
import { ScheduleEditPage } from '@/pages/ScheduleEditPage'
import { SchedulesPage } from '@/pages/SchedulesPage'
import { ScheduleWritePage } from '@/pages/ScheduleWritePage'
import { SeniorFindPage } from '@/pages/SeniorFindPage'
import { SavedSharesPage } from '@/pages/SavedSharesPage'
import { SearchPage } from '@/pages/SearchPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ShareDetailPage } from '@/pages/ShareDetailPage'
import { ShareEditPage } from '@/pages/ShareEditPage'
import { SharesPage } from '@/pages/SharesPage'
import { ShareWritePage } from '@/pages/ShareWritePage'
import { SignupPage } from '@/pages/SignupPage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        // 첫 화면은 홈 (로그인 화면을 먼저 띄우지 않는다)
        element: <TabLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'questions', element: <QuestionsPage /> },
          // 질문 탭의 `부원` 세그먼트 (IA S23)
          { path: 'members', element: <MembersPage /> },
          { path: 'schedules', element: <SchedulesPage /> },
          // 일정 탭의 `모집` · `이벤트` 세그먼트 (IA S33 · S35)
          { path: 'recruits', element: <RecruitsPage /> },
          { path: 'events', element: <EventsPage /> },
          { path: 'shares', element: <SharesPage /> },
          { path: 'feed', element: <FeedPage /> },
        ],
      },
      // 상세 · 작성 화면은 하단 탭을 숨긴다 (IA 2장)
      { path: 'questions/new', element: <QuestionWritePage /> },
      { path: 'questions/:questionId', element: <QuestionDetailPage /> },
      { path: 'questions/:questionId/edit', element: <QuestionEditPage /> },
      { path: 'members/:memberId', element: <MemberProfilePage /> },
      // 일정 · 모집 (IA S31 · S32 · S34)
      { path: 'schedules/new', element: <ScheduleWritePage /> },
      { path: 'schedules/:scheduleId', element: <ScheduleDetailPage /> },
      { path: 'schedules/:scheduleId/edit', element: <ScheduleEditPage /> },
      { path: 'recruits/new', element: <RecruitWritePage /> },
      // 이벤트 상세 · 인증 (IA S36)
      { path: 'events/:eventId', element: <EventDetailPage /> },
      // 공유 (IA S41 · S42)
      { path: 'shares/new', element: <ShareWritePage /> },
      { path: 'shares/:shareId', element: <ShareDetailPage /> },
      { path: 'shares/:shareId/edit', element: <ShareEditPage /> },
      { path: 'saved-shares', element: <SavedSharesPage /> },
      // 피드 (IA S51 · S52)
      { path: 'feed/new', element: <FeedWritePage /> },
      { path: 'feed/:postId', element: <FeedDetailPage /> },
      // 홈 `운영진 공지` 더보기 (IA S11 · S12)
      { path: 'notices', element: <NoticesPage /> },
      { path: 'notices/:noticeId', element: <NoticeDetailPage /> },
      // 상단 종 아이콘 (IA S61)
      { path: 'notifications', element: <NotificationsPage /> },
      // 부원 목록 상단의 선배 찾기 (IA S25)
      { path: 'find-senior', element: <SeniorFindPage /> },
      // 상단 돋보기 (IA S60) · 내 커피챗 (S63)
      { path: 'search', element: <SearchPage /> },
      { path: 'coffee-chats', element: <CoffeeChatsPage /> },
      // 내 정보 (IA S62 · S26)
      { path: 'settings', element: <SettingsPage /> },
      { path: 'profile/edit', element: <ProfileEditPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      { path: 'find-login-id', element: <FindLoginIdPage /> },
      { path: 'password-reset', element: <PasswordResetPage /> },
      // 메일 링크 착지 (백엔드 StaffEmailChangeService가 만드는 주소)
      { path: 'email-change/confirm', element: <EmailChangeConfirmPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

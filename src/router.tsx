import { createBrowserRouter } from 'react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { TabLayout } from '@/components/layout/TabLayout'
import { EmailChangeConfirmPage } from '@/pages/EmailChangeConfirmPage'
import { ErrorPage } from '@/pages/ErrorPage'
import { FindLoginIdPage } from '@/pages/FindLoginIdPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PasswordResetPage } from '@/pages/PasswordResetPage'
import { QuestionDetailPage } from '@/pages/QuestionDetailPage'
import { QuestionsPage } from '@/pages/QuestionsPage'
import { SignupPage } from '@/pages/SignupPage'
import { TabPlaceholder } from '@/pages/TabPlaceholder'

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
          { path: 'schedules', element: <TabPlaceholder title="일정" /> },
          { path: 'shares', element: <TabPlaceholder title="공유" /> },
          { path: 'feed', element: <TabPlaceholder title="피드" /> },
        ],
      },
      // 상세 · 작성 화면은 하단 탭을 숨긴다 (IA 2장)
      { path: 'questions/:questionId', element: <QuestionDetailPage /> },
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

import { createBrowserRouter } from 'react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { TabLayout } from '@/components/layout/TabLayout'
import { ErrorPage } from '@/pages/ErrorPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
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
          { index: true, element: <TabPlaceholder title="홈" /> },
          { path: 'questions', element: <TabPlaceholder title="질문" /> },
          { path: 'schedules', element: <TabPlaceholder title="일정" /> },
          { path: 'shares', element: <TabPlaceholder title="공유" /> },
          { path: 'feed', element: <TabPlaceholder title="피드" /> },
        ],
      },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

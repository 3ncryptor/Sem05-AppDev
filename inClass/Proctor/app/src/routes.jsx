// Hash route table (end of SCREENS.md).
// RequireRole wraps each route tree; the server enforces the same rules.
import { Navigate, Outlet, createHashRouter } from 'react-router'
import { HomeRedirect, RequireRole } from './features/auth/RequireRole.jsx'
import { LoginPage } from './features/auth/LoginPage.jsx'
import { ServerPage } from './features/auth/ServerPage.jsx'
import { ExamWorkspace } from './features/admin/ExamWorkspace.jsx'
import { AnalyticsPage } from './features/admin/analytics/AnalyticsPage.jsx'
import { ExamsListPage } from './features/admin/exams/ExamsListPage.jsx'
import { AdminHomePage } from './features/admin/home/AdminHomePage.jsx'
import { ExamOverviewPage } from './features/admin/overview/ExamOverviewPage.jsx'
import { QuestionsPage } from './features/admin/questions/QuestionsPage.jsx'
import { ExamSettingsPage } from './features/admin/settings/ExamSettingsPage.jsx'
import { LivePage } from './features/admin/live/LivePage.jsx'
import { ResultsPage } from './features/admin/results/ResultsPage.jsx'
import { ReviewPage as AdminReviewPage } from './features/admin/review/ReviewPage.jsx'
import { StudentsPage } from './features/admin/students/StudentsPage.jsx'
import { DonePage } from './features/exam/DonePage.jsx'
import { ExamProvider } from './features/exam/ExamProvider.jsx'
import { ExamRoom } from './features/exam/ExamRoom.jsx'
import { ReviewPage } from './features/exam/ReviewPage.jsx'
import { BeginPage } from './features/pretest/BeginPage.jsx'
import { PhotoPage } from './features/pretest/PhotoPage.jsx'
import { PretestLayout } from './features/pretest/PretestLayout.jsx'
import { ResumePage } from './features/pretest/ResumePage.jsx'
import { RulesPage } from './features/pretest/RulesPage.jsx'
import { SystemCheckPage } from './features/pretest/SystemCheckPage.jsx'
import { ExamDetailPage } from './features/student/ExamDetailPage.jsx'
import { ExamsPage } from './features/student/ExamsPage.jsx'
import { MyAnalyticsPage } from './features/results/MyAnalyticsPage.jsx'
import { ResultPage } from './features/results/ResultPage.jsx'
import { ResultsListPage } from './features/results/ResultsListPage.jsx'
import { SelftestPage } from './features/selftest/SelftestPage.jsx'
import { SettingsPage } from './features/settings/SettingsPage.jsx'
import { AdminShell } from './features/shell/AdminShell.jsx'
import { RoleShell } from './features/shell/RoleShell.jsx'
import { StudentShell } from './features/shell/StudentShell.jsx'

const studentRoutes = {
  path: '/student',
  element: (
    <RequireRole role="student">
      <Outlet />
    </RequireRole>
  ),
  children: [
    {
      element: <StudentShell />,
      children: [
        { index: true, element: <Navigate to="exams" replace /> },
        { path: 'exams', element: <ExamsPage /> },
        { path: 'exams/:examId', element: <ExamDetailPage /> },
        { path: 'results', element: <ResultsListPage /> },
        { path: 'results/:attemptId', element: <ResultPage /> },
        { path: 'analytics', element: <MyAnalyticsPage /> },
      ],
    },
    // Quiet-room screens: no sidebar (SCREENS §0.2).
    {
      path: 'exams/:examId/start',
      element: <PretestLayout />,
      children: [
        { index: true, element: <Navigate to="check" replace /> },
        { path: 'check', element: <SystemCheckPage /> },
        { path: 'rules', element: <RulesPage /> },
        { path: 'photo', element: <PhotoPage /> },
        { path: 'begin', element: <BeginPage /> },
      ],
    },
    {
      path: 'attempts/:attemptId',
      children: [
        {
          element: <ExamProvider />,
          children: [
            { index: true, element: <ExamRoom /> },
            { path: 'review', element: <ReviewPage /> },
          ],
        },
        { path: 'resume', element: <ResumePage /> },
        { path: 'done', element: <DonePage /> },
      ],
    },
  ],
}

const examTabs = [
  { index: true, element: <ExamOverviewPage /> },
  { path: 'questions', handle: { crumb: 'Questions' }, element: <QuestionsPage /> },
  { path: 'settings', handle: { crumb: 'Settings' }, element: <ExamSettingsPage /> },
  { path: 'live', handle: { crumb: 'Live' }, element: <LivePage /> },
  { path: 'review', handle: { crumb: 'Review' }, element: <AdminReviewPage /> },
  { path: 'results', handle: { crumb: 'Results' }, element: <ResultsPage /> },
  { path: 'analytics', handle: { crumb: 'Analytics' }, element: <AnalyticsPage /> },
]

const adminRoutes = {
  path: '/admin',
  element: (
    <RequireRole role="admin">
      <AdminShell />
    </RequireRole>
  ),
  children: [
    { index: true, handle: { crumb: 'Home' }, element: <AdminHomePage /> },
    {
      path: 'exams',
      handle: { crumb: 'Exams' },
      children: [
        { index: true, element: <ExamsListPage /> },
        { path: ':examId', handle: { crumb: 'exam' }, element: <ExamWorkspace />, children: examTabs },
      ],
    },
    { path: 'students', handle: { crumb: 'Students' }, element: <StudentsPage /> },
  ],
}

export const router = createHashRouter([
  { path: '/', element: <HomeRedirect /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/server', element: <ServerPage /> },
  { path: '/selftest', element: <SelftestPage /> },
  {
    path: '/settings',
    element: (
      <RequireRole role="any">
        <RoleShell />
      </RequireRole>
    ),
    children: [{ index: true, handle: { crumb: 'Settings' }, element: <SettingsPage /> }],
  },
  studentRoutes,
  adminRoutes,
  { path: '*', element: <HomeRedirect /> },
])

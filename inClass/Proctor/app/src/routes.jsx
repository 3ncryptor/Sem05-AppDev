// Hash route table (end of SCREENS.md). Screens built in later phases are labelled placeholders.
// RequireRole wraps each route tree; the server enforces the same rules.
import { Navigate, Outlet, createHashRouter } from 'react-router'
import { HomeRedirect, RequireRole } from './features/auth/RequireRole.jsx'
import { LoginPage } from './features/auth/LoginPage.jsx'
import { ServerPage } from './features/auth/ServerPage.jsx'
import { ExamWorkspace } from './features/admin/ExamWorkspace.jsx'
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
import { Placeholder } from './features/placeholder/Placeholder.jsx'
import { SelftestPage } from './features/selftest/SelftestPage.jsx'
import { SettingsPage } from './features/settings/SettingsPage.jsx'
import { AdminShell } from './features/shell/AdminShell.jsx'
import { RoleShell } from './features/shell/RoleShell.jsx'
import { StudentShell } from './features/shell/StudentShell.jsx'

/** Shorthand for a placeholder route element. */
const later = (screen, title, phase, quiet = false) => <Placeholder screen={screen} title={title} phase={phase} quiet={quiet} />

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
        { path: 'results', element: later('C16', 'Results', 8) },
        { path: 'results/:attemptId', element: later('C15', 'Result', 8) },
        { path: 'analytics', element: later('C17', 'My analytics', 8) },
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
  { index: true, element: later('A3', 'Overview', 6) },
  { path: 'questions', handle: { crumb: 'Questions' }, element: later('A4', 'Questions', 6) },
  { path: 'settings', handle: { crumb: 'Settings' }, element: later('A5', 'Settings', 6) },
  { path: 'proctoring', handle: { crumb: 'Proctoring' }, element: later('A6', 'Proctoring', 6) },
  { path: 'live', handle: { crumb: 'Live' }, element: later('A9', 'Live', 7) },
  { path: 'review', handle: { crumb: 'Review' }, element: later('A10', 'Review', 7) },
  { path: 'results', handle: { crumb: 'Results' }, element: later('A11', 'Results', 8) },
  { path: 'analytics', handle: { crumb: 'Analytics' }, element: later('A12', 'Analytics', 8) },
]

const adminRoutes = {
  path: '/admin',
  element: (
    <RequireRole role="admin">
      <AdminShell />
    </RequireRole>
  ),
  children: [
    { index: true, handle: { crumb: 'Home' }, element: later('A1', 'Home', 6) },
    {
      path: 'exams',
      handle: { crumb: 'Exams' },
      children: [
        { index: true, element: later('A2', 'Exams', 6) },
        { path: ':examId', handle: { crumb: 'exam' }, element: <ExamWorkspace />, children: examTabs },
      ],
    },
    { path: 'students', handle: { crumb: 'Students' }, element: later('A8', 'Students', 6) },
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

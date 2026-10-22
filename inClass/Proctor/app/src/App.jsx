import { RouterProvider } from 'react-router/dom'
import { ToastProvider } from './components/Toast.jsx'
import { AuthProvider } from './features/auth/AuthProvider.jsx'
import { router } from './routes.jsx'

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  )
}

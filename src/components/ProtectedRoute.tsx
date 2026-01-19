import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import LoginPage from '../pages/LoginPage'
import { FirstTimePasswordSetup } from './FirstTimePasswordSetup'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, user, loading } = useAuth()

  // 로딩 중
  if (loading) {
    return (
      <div className="app-container">
        <div style={{ padding: 24, textAlign: 'center' }}>로딩중…</div>
      </div>
    )
  }

  // 세션이 없으면 로그인 페이지
  if (!session) {
    return <LoginPage />
  }

  // 비밀번호 미설정 유저 체크
  const needsPasswordSetup = user && !user.user_metadata?.has_password

  if (needsPasswordSetup) {
    return (
      <FirstTimePasswordSetup
        onComplete={async () => {
          // 비밀번호 설정 완료 후 페이지 새로고침하여 user_metadata 갱신
          window.location.reload()
        }}
      />
    )
  }

  return <>{children}</>
}


import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Toast } from '../components/Toast'

export function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URL에서 hash 파라미터 추출
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          // 세션 설정
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) throw sessionError

          // 성공 시 /app으로 이동
          window.location.href = '/app'
        } else {
          // URL 파라미터가 없으면 일반적인 콜백 처리
          const { data, error: callbackError } = await supabase.auth.getSession()
          if (callbackError) throw callbackError

          if (data.session) {
            window.location.href = '/app'
          } else {
            throw new Error('세션을 가져올 수 없습니다')
          }
        }
      } catch (e: any) {
        console.error('Auth callback error:', e)
        setError(e.message || '인증 처리 중 오류가 발생했습니다')
        setTimeout(() => {
          window.location.href = '/login'
        }, 3000)
      }
    }

    handleCallback()
  }, [])

  if (error) {
    return (
      <div className="page">
        <div style={{ maxWidth: 360, margin: '60px auto', padding: 16, textAlign: 'center' }}>
          <h2 className="page-title">인증 오류</h2>
          <p className="hint" style={{ marginTop: 8, marginBottom: 24 }}>
            {error}
          </p>
          <p className="hint" style={{ fontSize: 12 }}>
            잠시 후 로그인 페이지로 이동합니다...
          </p>
        </div>
        <Toast message={error} type="error" />
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 360, margin: '60px auto', padding: 16, textAlign: 'center' }}>
        <h2 className="page-title">인증 중...</h2>
        <p className="hint" style={{ marginTop: 8 }}>
          잠시만 기다려주세요.
        </p>
      </div>
    </div>
  )
}


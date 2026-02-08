import React from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function ProtectedRoute() {
  const location = useLocation()
  const [loading, setLoading] = React.useState(true)
  const [hasSession, setHasSession] = React.useState(false)

  React.useEffect(() => {
    let mounted = true

    const run = async () => {
      setLoading(true)
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setHasSession(!!data.session)
      setLoading(false)
    }

    run()

    // 세션 변경(로그인/로그아웃) 즉시 반영
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      run()
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>

  if (!hasSession) {
    return <Navigate to="/academy/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
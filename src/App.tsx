// src/App.tsx
import React from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { supabase } from "./lib/supabase"

import LoginPage from "./pages/LoginPage"
import SignupPage from "./pages/SignupPage"
import AcademyAppPage from "./pages/AcademyAppPage"
import AcademyTodayPage from "./pages/AcademyTodayPage"
import { SettingsPage } from "./pages/SettingsPage"
import ParentOverviewPage from "./pages/ParentOverviewPage"
import StudentDetailPage from "./pages/StudentDetailPage"

// ======================
// 1) Auth Guard
// ======================
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true)
  const [authed, setAuthed] = React.useState(false)
  const location = useLocation()

  React.useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) return
      if (error) {
        setAuthed(false)
        setLoading(false)
        return
      }
      setAuthed(!!data.session)
      setLoading(false)
    }

    void load()

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return
      setAuthed(!!session)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (loading) return <div style={{ padding: 16 }}>로딩중...</div>

  if (!authed) {
    return (
      <Navigate
        to="/academy/login"
        replace
        state={{ from: { pathname: location.pathname } }}
      />
    )
  }

  return <>{children}</>
}

// ======================
// 2) Academy Context
// ======================
type AcademyCtx = {
  academyId: string | null
  loading: boolean
  error: string | null
}

const AcademyContext = React.createContext<AcademyCtx>({
  academyId: null,
  loading: true,
  error: null,
})

function useAcademy() {
  return React.useContext(AcademyContext)
}

function AcademyProvider({ children }: { children: React.ReactNode }) {
  const [academyId, setAcademyId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true

    const run = async () => {
      setLoading(true)
      setError(null)

      const { data: sess, error: sessErr } = await supabase.auth.getSession()
      if (!mounted) return

      if (sessErr) {
        setError(sessErr.message)
        setLoading(false)
        return
      }

      const user = sess.session?.user
      if (!user) {
        setError("로그인이 필요합니다.")
        setLoading(false)
        return
      }

      const q = await supabase
        .from("academies")
        .select("id")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!mounted) return
      if (q.error) {
        setError(q.error.message)
        setLoading(false)
        return
      }

      if (q.data?.id) {
        setAcademyId(q.data.id)
        setLoading(false)
        return
      }

      const ins = await supabase
        .from("academies")
        .insert({ owner_user_id: user.id, name: "내 학원" })
        .select("id")
        .single()

      if (!mounted) return
      if (ins.error) {
        setError(ins.error.message)
        setLoading(false)
        return
      }

      setAcademyId(ins.data.id)
      setLoading(false)
    }

    void run()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <AcademyContext.Provider value={{ academyId, loading, error }}>
      {children}
    </AcademyContext.Provider>
  )
}

// ======================
// 3) Academy wrappers (academyId 주입)
// ======================
function AcademyAppPageWrapper() {
  const { academyId, loading, error } = useAcademy()
  if (loading) return <div style={{ padding: 16 }}>학원 로딩중...</div>
  if (error) return <div style={{ padding: 16, color: "red" }}>{error}</div>
  if (!academyId) return <div style={{ padding: 16 }}>academyId 없음</div>
  return <AcademyAppPage academyId={academyId} />
}

function SettingsPageWrapper() {
  const { academyId, loading, error } = useAcademy()
  if (loading) return <div style={{ padding: 16 }}>학원 로딩중...</div>
  if (error) return <div style={{ padding: 16, color: "red" }}>{error}</div>
  if (!academyId) return <div style={{ padding: 16 }}>academyId 없음</div>
  return <SettingsPage academyId={academyId} />
}

function AcademyTodayPageWrapper() {
  const { academyId } = useAcademy()
  return <AcademyTodayPage academyId={academyId!} />
}

// ======================
// 6) App Routes
// ======================
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/academy/login" replace />} />

        {/* 학원 */}
        <Route path="/academy" element={<Navigate to="/academy/login" replace />} />
        <Route path="/academy/login" element={<LoginPage />} />
        <Route path="/academy/signup" element={<SignupPage />} />

        <Route
          path="/academy/app"
          element={
            <ProtectedRoute>
              <AcademyProvider>
                <AcademyAppPageWrapper />
              </AcademyProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/academy/app/today"
          element={
            <ProtectedRoute>
              <AcademyProvider>
                <AcademyTodayPageWrapper />
              </AcademyProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/academy/app/today/:classId"
          element={
            <ProtectedRoute>
              <AcademyProvider>
                <AcademyTodayPageWrapper />
              </AcademyProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/academy/settings"
          element={
            <ProtectedRoute>
              <AcademyProvider>
                <SettingsPageWrapper />
              </AcademyProvider>
            </ProtectedRoute>
          }
        />

        {/* 학생 상세도 보호 + academy provider 안으로 */}
        <Route
          path="/academy/student/:studentId"
          element={
            <ProtectedRoute>
              <AcademyProvider>
                <StudentDetailPage />
              </AcademyProvider>
            </ProtectedRoute>
          }
        />

        {/* 학부모 리포트 */}
        <Route path="/p/:token" element={<ParentOverviewPage />} />
        <Route path="/p" element={<Navigate to="/academy/login" replace />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/academy/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
import React from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

type Mode = "academy" | "parent"

function extractToken(input: string) {
  const v = input.trim()
  if (!v) return ""

  // 링크 붙여넣기 지원: .../p/:token 또는 ?token=xxx
  try {
    if (v.startsWith("http://") || v.startsWith("https://")) {
      const u = new URL(v)
      const parts = u.pathname.split("/").filter(Boolean)
      // /p/:token
      const pIndex = parts.findIndex((x) => x === "p")
      if (pIndex >= 0 && parts[pIndex + 1]) return parts[pIndex + 1]
      // ?token=
      const q = u.searchParams.get("token")
      if (q) return q
    }
  } catch {}

  // 그냥 토큰만 입력한 경우
  return v
}

export default function LoginPage() {
  const nav = useNavigate()
  const [mode, setMode] = React.useState<Mode>("academy")

  // academy
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  // parent
  const [parentInput, setParentInput] = React.useState("")
  const [remember, setRemember] = React.useState(true)

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // 이미 학원 세션 있으면 바로 앱으로
  React.useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) nav("/academy/app", { replace: true })
    }
    void run()
  }, [nav])

  React.useEffect(() => {
    // 저장된 토큰 있으면 학부모로 바로 보낼지 선택
    const saved = localStorage.getItem("edulink_parent_token")
    if (!saved) return

    // ✅ 자동으로 학부모 리포트로 보내고 싶으면:
    // nav(`/p/${saved}`, { replace: true })

    // ✅ 자동이 싫으면: 학부모 탭만 켜두기(권장: 첫 주는 이게 덜 꼬임)
    setMode("parent")
  }, [nav])

  React.useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESH_FAILED") {
        supabase.auth.signOut()
        localStorage.clear()
        sessionStorage.clear()
        nav("/academy/login", { replace: true })
      }
    })

    return () => sub.data.subscription.unsubscribe()
  }, [nav])

  const onAcademyLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (err) throw err
      nav("/academy/app", { replace: true })
    } catch (e: any) {
      setError(e?.message ?? "로그인 실패")
    } finally {
      setLoading(false)
    }
  }

  const onParentEnter = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const token = extractToken(parentInput)
      if (!token) throw new Error("토큰 또는 초대 링크를 입력해주세요.")

      if (remember) {
        localStorage.setItem("edulink_parent_token", token)
      } else {
        localStorage.removeItem("edulink_parent_token")
      }

      nav(`/p/${token}`, { replace: true })
    } catch (e: any) {
      setError(e?.message ?? "토큰 처리 실패")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authBrand">
          <div className="authLogo">E</div>
          <div>
            <div className="authTitle">Edu-link</div>
            <div className="authSub">학원 운영 · 학부모 커뮤니케이션</div>
          </div>
        </div>

        <div className="authTabs">
          <button
            type="button"
            className={`authTab ${mode === "academy" ? "isActive" : ""}`}
            onClick={() => setMode("academy")}
          >
            학원
          </button>
          <button
            type="button"
            className={`authTab ${mode === "parent" ? "isActive" : ""}`}
            onClick={() => setMode("parent")}
          >
            학부모
          </button>
        </div>

        {mode === "academy" ? (
          <>
            <h1 className="authH1">학원 로그인</h1>
            <p className="authDesc">출결/피드백 관리를 위한 학원 전용 로그인</p>

            <form onSubmit={onAcademyLogin} className="authForm">
              <label className="authField">
                <span className="authLabel">이메일</span>
                <input
                  className="authInput"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>

              <label className="authField">
                <span className="authLabel">비밀번호</span>
                <input
                  className="authInput"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>

              {error && <div className="authError">{error}</div>}

              <button className="authPrimary" disabled={loading}>
                {loading ? "로그인 중..." : "로그인"}
              </button>

              <button type="button" className="authSecondary" onClick={() => nav("/academy/signup")}>
                회원가입
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="authH1">학부모 전용</h1>
            <p className="authDesc">
              학원에서 받은 초대 링크로 출결/피드백을 확인합니다.
            </p>

            <form onSubmit={onParentEnter} className="authForm">
              <label className="authField">
                <span className="authLabel">초대 링크 / 토큰</span>
                <input
                  className="authInput"
                  value={parentInput}
                  onChange={(e) => setParentInput(e.target.value)}
                  placeholder="초대 링크를 붙여넣거나 토큰만 입력"
                />
              </label>

              <label className="authCheck">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>이 기기에서 다음부터 자동으로 보기</span>
              </label>

              {error && <div className="authError">{error}</div>}

              <button className="authPrimary" disabled={loading}>
                {loading ? "확인 중..." : "확인"}
              </button>

              <div className="authHint">
                예) https://도메인/p/토큰 형태의 링크를 그대로 붙여넣어도 돼요.
              </div>
            </form>
          </>
        )}

        <div className="authFooter">© 2026 Edu-link MVP</div>
      </div>
    </div>
  )
}
import React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { loadAcademyContext } from "../lib/loadAcademyContext"

type Mode = "academy" | "parent"

function extractToken(input: string) {
  const v = input.trim()
  if (!v) return ""

  try {
    if (v.startsWith("http://") || v.startsWith("https://")) {
      const u = new URL(v)
      const parts = u.pathname.split("/").filter(Boolean)
      const pIndex = parts.findIndex((x) => x === "p")
      if (pIndex >= 0 && parts[pIndex + 1]) return parts[pIndex + 1]
      const q = u.searchParams.get("token")
      if (q) return q
    }
  } catch {}

  return v
}

export default function LoginPage() {
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()

  // ✅ sp 객체를 deps로 쓰지 말고 "값"을 뽑아서 deps로 써라
  const modeFromQuery = ((sp.get("mode") as Mode) || "academy") as Mode
  const [mode, setMode] = React.useState<Mode>(modeFromQuery)

  // academy
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  // parent
  const [parentInput, setParentInput] = React.useState("")
  const [remember, setRemember] = React.useState(true)

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // ✅ 쿼리가 바뀌면 탭도 동기화
  React.useEffect(() => {
    setMode(modeFromQuery)
  }, [modeFromQuery])

  // ✅ 저장된 토큰 있으면 자동 채우고 parent로 전환(원하면)
  React.useEffect(() => {
    const saved = localStorage.getItem("edulink_parent_token")
    if (saved) {
      setParentInput(saved)

      // 토큰이 있으면 자동으로 parent 탭으로 바꾸고 싶으면 아래 유지
      // (원치 않으면 이 블록 삭제)
      setMode("parent")
      setSp((prev) => {
        const next = new URLSearchParams(prev)
        next.set("mode", "parent")
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ✅ 탭 변경: state + URL 쿼리 동기화 (이게 핵심)
  const goMode = (m: Mode) => {
    setError(null)
    setMode(m)
    setSp((prev) => {
      const next = new URLSearchParams(prev)
      next.set("mode", m)
      return next
    })
  }

  const onAcademyLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
  
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (err) throw err
  
      const uid = data.user.id

      // ✅ 1. 내가 속한 academy_id 가져오기
      const { data: academyUsers, error: auErr } = await supabase
        .from("academy_users")
        .select("academy_id")
        .eq("user_id", uid)

      if (auErr) {
        throw new Error("학원 정보 조회 실패")
      }

      const academyId = academyUsers?.[0]?.academy_id

      if (!academyId) {
        throw new Error("소속된 학원을 찾을 수 없습니다.")
      }

      // ✅ 2. academy context 로드 (학생/수업 살아남)
      await loadAcademyContext(academyId)
  
      // ✅ 3. 이제 이동
      nav("/academy/home", { replace: true })
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
      if (!token) throw new Error("초대 링크(또는 코드)를 입력해주세요.")

      if (remember) localStorage.setItem("edulink_parent_token", token)
      else localStorage.removeItem("edulink_parent_token")

      nav(`/p/${token}`, { replace: true })
    } catch (e: any) {
      setError(e?.message ?? "토큰 처리 실패")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="loginBg">
      <div className="loginCard">
        {/* 탭 */}
        <div className="loginTabs">
          <button
            type="button"
            className={`loginTab ${mode === "academy" ? "isActive" : ""}`}
            onClick={() => goMode("academy")}
          >
            학원 로그인
          </button>

          <button
            type="button"
            className={`loginTab ${mode === "parent" ? "isActive" : ""}`}
            onClick={() => goMode("parent")}
          >
            학부모 로그인
          </button>
        </div>

        {/* 헤더 */}
        <div className="loginInner">
          <div className="loginHeader">
            <div className="loginLogoRow">
              <img className="loginLogo" src="/logo.png" alt="Edu-Link" />
            </div>

            <div className="loginSubtitle">
              {mode === "academy"
                ? "선생님을 위한 출결 관리 플랫폼"
                : "아이의 출결 소식을 가장 빠르게"}
            </div>
          </div>

          {mode === "academy" ? (
            <form onSubmit={onAcademyLogin} className="loginForm">
              <div className="field">
                <div className="label">이메일</div>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="example@email.com"
                />
              </div>

              <div className="field">
                <div className="label">비밀번호</div>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>

              {error && <div className="error">{error}</div>}

              <button className="primaryBtn" disabled={loading}>
                {loading ? "로그인 중..." : "학원 로그인"}
              </button>

              <button
                type="button"
                className="subBtn"
                onClick={() => nav("/academy/signup")}
              >
                회원가입 하러 가기
              </button>
            </form>
          ) : (
            <form onSubmit={onParentEnter} className="loginForm">
              <div className="field">
                <div className="label">초대 링크 또는 코드</div>
                <input
                  className="input"
                  value={parentInput}
                  onChange={(e) => setParentInput(e.target.value)}
                  placeholder="전송받은 코드를 입력하세요"
                />
              </div>

              <label className="rememberBox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>이 기기에서 다음부터 자동으로 보기</span>
              </label>

              {error && <div className="error">{error}</div>}

              <button className="primaryBtn" disabled={loading}>
                {loading ? "확인 중..." : "출결 확인하기"}
              </button>

              <button
                type="button"
                className="subBtn"
                onClick={() => goMode("academy")}
              >
                학원 로그인으로 돌아가기
              </button>

              <div className="hint">
                예) https://도메인/p/토큰 링크를 그대로 붙여넣어도 돼요.
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="copyright">© 2026 Edu-link MVP</div>
    </div>
  )
}
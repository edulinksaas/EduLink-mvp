import { useEffect, useMemo, useState, useCallback } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import "../../parent/pages/Parent.css"

type ParentOverview = {
  ok: boolean
  error?: string

  student?: {
    id: string
    name: string
    class_name?: string | null
  }

  today?: {
    id: string
    status?: string | null
    record_date?: string | null

    // ✅ RPC가 feedback_key로 주든 feedback_emoji로 주든 둘 다 대응
    feedback_key?: string | null
    feedback_emoji?: string | null

    feedback_text?: string | null
  } | null

  recent?: Array<{
    id: string
    date: string
    attendance?: "present" | "absent" | "late" | "unknown" | null

    // ✅ RPC가 status_emoji로 주든 feedback_key로 주든 둘 다 대응
    status_emoji?: string | null
    feedback_key?: string | null

    status_text?: string | null
    feedback_text?: string | null
  }>
}

function badgeFromAttendance(v?: string | null) {
  if (v === "present") return "출석"
  if (v === "absent") return "결석"
  if (v === "late") return "지각"
  return "기록"
}

// key -> emoji (네가 쓰던 key 기준)
function emojiFromKey(key?: string | null) {
  if (!key) return ""
  if (key === "good") return "😊"
  if (key === "ok") return "😐"
  if (key === "tired") return "😓"
  if (key === "great") return "🔥"
  if (key === "need") return "⚠️"
  // 이미 이모지로 들어오면 그대로
  if (["😊", "😐", "😓", "🔥", "⚠️"].includes(key)) return key
  return ""
}

// emoji -> label
function labelFromEmoji(e?: string | null) {
  if (!e) return ""
  if (e === "😊") return "집중 잘함"
  if (e === "😐") return "평범"
  if (e === "😓") return "컨디션 저조"
  if (e === "🔥") return "최고"
  if (e === "⚠️") return "지도 필요"
  return ""
}

export default function ParentPage() {
  const nav = useNavigate()
  const { token: tokenParam } = useParams<{ token?: string }>()
  const [sp] = useSearchParams()

  // ✅ 토큰 우선순위: /p/:token > /p?token=xxx > localStorage
  const token = useMemo(() => {
    const fromParam = tokenParam || ""
    const fromQuery = sp.get("token") || ""
    const fromLocal = localStorage.getItem("edulink_parent_token") || ""
    return (fromParam || fromQuery || fromLocal).trim()
  }, [tokenParam, sp])

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<ParentOverview | null>(null)

  const load = useCallback(async () => {
    // ✅ 콘솔이 “진짜로 찍히는지”부터 강제로 확인
    console.log("[ParentPage] load() called", { tokenPresent: !!token, tokenPreview: token?.slice(0, 6) })

    if (!token) {
      setErr("초대 링크(토큰)가 없어요. 학원에서 받은 링크로 접속해주세요.")
      setData(null)
      setLoading(false)
      return
    }

    // 토큰은 저장(다음 진입 편하게)
    localStorage.setItem("edulink_parent_token", token)

    setLoading(true)
    setErr(null)

    const res = await supabase.rpc("parent_overview", { p_token: token })

    console.log("[parent_overview] raw", res) // ✅ 이거 하나면 응답 구조 확정 가능

    if (res.error) {
      setErr(res.error.message)
      setData(null)
      setLoading(false)
      return
    }

    const payload = (res.data || null) as ParentOverview | null
    console.log("[parent_overview] data", payload)

    if (!payload?.ok) {
      setErr(payload?.error || "불러오기에 실패했어요.")
      setData(payload)
      setLoading(false)
      return
    }

    setData(payload)
    setLoading(false)
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  // ✅ Guard
  if (!token) {
    return (
      <div className="p-page">
        <div className="p-card">
          <h1 className="p-title">학부모 전용</h1>
          <p className="p-sub">학원에서 받은 초대 링크로 출결/피드백을 확인합니다.</p>
          <button className="p-btn" onClick={() => nav("/p", { replace: true })}>
            토큰 입력하러 가기
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-page">
        <div className="p-card">
          <h1 className="p-title">불러오는 중…</h1>
          <p className="p-sub">잠시만 기다려주세요.</p>
        </div>
      </div>
    )
  }

  if (err) {
    return (
      <div className="p-page">
        <div className="p-card">
          <h1 className="p-title">오류</h1>
          <p className="p-error">{err}</p>
          <div className="p-row">
            <button className="p-btn" onClick={() => load()}>
              다시 시도
            </button>
            <button
              className="p-btn p-btn--ghost"
              onClick={() => {
                localStorage.removeItem("edulink_parent_token")
                nav("/p", { replace: true })
              }}
            >
              토큰 다시 입력
            </button>
          </div>
        </div>
      </div>
    )
  }

  const student = data?.student
  const today = data?.today
  const recent = data?.recent || []

  // ✅ 오늘 이모지: feedback_emoji가 있으면 사용, 없으면 feedback_key를 key->emoji로 변환
  const todayEmoji = today?.feedback_emoji || emojiFromKey(today?.feedback_key) || "😊"

  // ✅ 오늘 코멘트: text 우선, 없으면 emoji 라벨
  const todayComment =
    (today?.feedback_text && today.feedback_text.trim()) || labelFromEmoji(todayEmoji) || "코멘트가 없어요."

  return (
    <div className="p-page">
      <div className="p-wrap">
        <header className="p-header">
          <div>
            <div className="p-kicker">학부모 전용</div>
            <h1 className="p-title">
              {student?.name || "학생"} <span className="p-title--sub">수업 리포트</span>
            </h1>
            <div className="p-meta">{student?.class_name ? `반: ${student.class_name}` : "반 정보 없음"}</div>
          </div>

          <button
            className="p-btn p-btn--ghost"
            onClick={() => {
              localStorage.removeItem("edulink_parent_token")
              nav("/p", { replace: true })
            }}
          >
            토큰 변경
          </button>
        </header>

        <section className="p-card p-card--today">
          <div className="p-section-title">오늘 수업</div>

          {!today ? (
            <div className="p-empty">
              아직 기록이 없어요. <span className="p-muted">수업 후에 업데이트됩니다.</span>
            </div>
          ) : (
            <div className="p-today">
              <div className="p-badge">{badgeFromAttendance(today.status || undefined)}</div>

              <div className="p-today-main">
                <div className="p-emoji">{todayEmoji}</div>
                <div className="p-text">
                  <div className="p-date">{today.record_date || ""}</div>
                  <div className="p-line">{todayComment}</div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="p-card">
          <div className="p-section-title">최근 기록</div>

          {recent.length === 0 ? (
            <div className="p-empty">최근 기록이 없습니다.</div>
          ) : (
            <ul className="p-list">
              {recent.slice(0, 5).map((r) => {
                // ✅ 최근 이모지: status_emoji가 있으면 그거, 없으면 feedback_key -> emoji 변환
                const e = r.status_emoji || emojiFromKey(r.feedback_key) || "😊"
                const t = (r.status_text && r.status_text.trim()) || (r.feedback_text && r.feedback_text.trim()) || labelFromEmoji(e) || "기록"

                return (
                  <li key={r.id} className="p-item">
                    <div className="p-item-left">
                      <div className="p-item-emoji">{e}</div>
                      <div>
                        <div className="p-item-date">{r.date}</div>
                        <div className="p-item-text">{t}</div>
                      </div>
                    </div>
                    <div className="p-item-badge">{badgeFromAttendance(r.attendance || undefined)}</div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <footer className="p-foot">문제가 계속되면 학원에 문의해주세요.</footer>
      </div>
    </div>
  )
}
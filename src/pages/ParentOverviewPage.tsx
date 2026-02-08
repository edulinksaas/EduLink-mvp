import React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import ParentHeader from "../components/ParentHeader"

type ParentOverviewRow = {
  // student
  student_id?: string | null
  student_name?: string | null
  class_name?: string | null

  // today/recent common
  id?: string | null
  record_date?: string | null
  status?: "present" | "absent" | "late" | string | null

  // feedback (DB column names may differ)
  feedback_key?: string | null
  feedback_code?: string | null
  feedback_emoji?: string | null
  status_emoji?: string | null
  feedback_text?: string | null
  status_text?: string | null

  // flags
  is_today?: boolean | null

  // sometimes RPC uses these names
  date?: string | null
  attendance?: "present" | "absent" | "late" | "unknown" | string | null
}

type ParentOverviewVM = {
  student: { id: string; name: string; class_name?: string | null } | null
  today: {
    id: string
    status?: string
    record_date?: string
    feedback_key?: string | null
    feedback_emoji?: string | null
    feedback_text?: string | null
  } | null
  recent: Array<{
    id: string
    date: string
    feedback_key?: string | null
    status_emoji?: string | null
    status_text?: string | null
    attendance?: "present" | "absent" | "late" | "unknown"
  }>
}

function badgeFromAttendance(v?: string | null) {
  if (v === "present") return "출석"
  if (v === "absent") return "결석"
  if (v === "late") return "지각"
  return "기록"
}

function fallbackEmojiByAttendance(att?: string | null) {
  if (att === "absent") return "❌"
  return "😊" // present/unknown
}

function fallbackTextByAttendance(att?: string | null) {
  if (att === "absent") return "결석"
  if (att === "present") return "출석"
  return "기록"
}

function labelFromEmoji(e?: string | null) {
  if (!e) return ""
  if (e === "😊") return "집중 잘함"
  if (e === "😐") return "평범"
  if (e === "😓") return "컨디션 저조"
  if (e === "🔥") return "최고"
  if (e === "⚠️") return "지도 필요"
  return ""
}

function labelFromKey(key?: string | null) {
  if (!key) return ""
  if (key === "good") return "집중 잘함"
  if (key === "ok") return "보통"
  if (key === "tired") return "컨디션 저조"
  if (key === "great") return "최고"
  if (key === "need") return "지도 필요"
  if (key === "need_focus") return "지도 필요"
  if (key === "normal") return "보통" // DB에 normal로 들어간 흔적 대응
  return ""
}

function emojiFromKey(key?: string | null) {
  if (!key) return ""
  if (key === "good") return "😊"
  if (key === "ok") return "😐"
  if (key === "tired") return "😓"
  if (key === "great") return "🔥"
  if (key === "need") return "⚠️"
  if (key === "need_focus") return "⚠️"
  if (key === "normal") return "😐"
  return ""
}

/**
 * RPC가 Array를 반환하든, {student,today,recent} Object를 반환하든
 * 둘 다 안전하게 화면에 그릴 수 있게 VM으로 정규화
 */
function normalizeParentOverview(raw: unknown): ParentOverviewVM {
  // 1) Object 형태면 (이미 정리된 RPC) 그대로 대응
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const anyObj = raw as any
    const student = anyObj.student
      ? {
          id: String(anyObj.student.id ?? ""),
          name: String(anyObj.student.name ?? ""),
          class_name: anyObj.student.class_name ?? anyObj.student.className ?? null,
        }
      : null

    const today = anyObj.today
      ? {
          id: String(anyObj.today.id ?? ""),
          status: anyObj.today.status ?? null,
          record_date: anyObj.today.record_date ?? anyObj.today.date ?? null,
          feedback_key: anyObj.today.feedback_key ?? anyObj.today.feedback_code ?? null,
          feedback_emoji: anyObj.today.feedback_emoji ?? anyObj.today.status_emoji ?? null,
          feedback_text: anyObj.today.feedback_text ?? anyObj.today.status_text ?? null,
        }
      : null

    const recent = Array.isArray(anyObj.recent)
      ? anyObj.recent.map((r: any) => ({
          id: String(r.id ?? ""),
          date: String(r.date ?? r.record_date ?? ""),
          feedback_key: r.feedback_key ?? r.feedback_code ?? null,
          status_emoji: r.status_emoji ?? r.feedback_emoji ?? null,
          status_text: r.status_text ?? r.feedback_text ?? null,
          attendance: (r.attendance ?? r.status ?? "unknown") as any,
        }))
      : []

    return { student, today, recent }
  }

  // 2) Array 형태면 (네 현재 상태) 행들에서 today/recent/student 추출
  const rows = (Array.isArray(raw) ? raw : []) as ParentOverviewRow[]

  const first = rows[0]
  const student =
    first?.student_id || first?.student_name
      ? {
          id: String(first.student_id ?? ""),
          name: String(first.student_name ?? ""),
          class_name: first.class_name ?? null,
        }
      : null

  const todayRow =
    rows.find((r) => r.is_today === true) ||
    rows.find((r) => (r.record_date || r.date) === new Date().toISOString().slice(0, 10)) ||
    null

  const today = todayRow
    ? {
        id: String(todayRow.id ?? `today-${todayRow.record_date ?? todayRow.date ?? "x"}`),
        status: (todayRow.status ?? todayRow.attendance ?? null) as any,
        record_date: String(todayRow.record_date ?? todayRow.date ?? ""),
        feedback_key: todayRow.feedback_key ?? todayRow.feedback_code ?? null,
        feedback_emoji: todayRow.feedback_emoji ?? todayRow.status_emoji ?? null,
        feedback_text: todayRow.feedback_text ?? todayRow.status_text ?? null,
      }
    : null

  const recent = rows
    .filter((r) => {
      if (!r) return false
      if (todayRow && r.id && todayRow.id && r.id === todayRow.id) return false
      const d1 = String(r.record_date ?? r.date ?? "")
      const d2 = String(todayRow?.record_date ?? todayRow?.date ?? "")
      if (todayRow && d1 && d2 && d1 === d2) return false
      return true
    })
    .map((r, idx) => {
      const date = String(r.date ?? r.record_date ?? "")
      const id = String(r.id ?? `${date || "row"}-${idx}`)
      return {
        id,
        date,
        feedback_key: r.feedback_key ?? r.feedback_code ?? null,
        status_emoji: r.status_emoji ?? r.feedback_emoji ?? null,
        status_text: r.status_text ?? r.feedback_text ?? null,
        attendance: (r.attendance ?? r.status ?? "unknown") as "present" | "absent" | "late" | "unknown",
      }
    })
    .filter((r) => r.date)

  return { student, today, recent }
}

export default function ParentOverviewPage() {
  const nav = useNavigate()
  const { token: tokenParam } = useParams<{ token?: string }>()
  const [sp] = useSearchParams()

  const tokenQuery = sp.get("token") || ""
  const token =
    tokenParam || tokenQuery || localStorage.getItem("edulink_parent_token") || ""

  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)
  const [vm, setVm] = React.useState<ParentOverviewVM | null>(null)

  const inflightRef = React.useRef(false)

  const load = React.useCallback(async () => {
    console.log("🔥 ParentOverviewPage load() start", { token })

    if (!token) {
      setErr("초대 링크(토큰)가 없어요. 학원에서 받은 링크로 접속해주세요.")
      setVm(null)
      setLoading(false)
      console.log("🟡 no token -> guard")
      return
    }

    if (inflightRef.current) {
      console.log("🟡 load() blocked: inflight")
      return
    }

    inflightRef.current = true
    setLoading(true)
    setErr(null)

    try {
      console.log("➡️ RPC parent_overview call", { p_token: token })
      const { data, error } = await supabase.rpc("parent_overview", { p_token: token })
      console.log("✅ RPC result", { data, error })

      if (error) {
        setErr(error.message)
        setVm(null)
        setLoading(false)
        return
      }

      // ✅ 여기 핵심: ok 같은 필드 체크 절대 하지 말고, data를 VM으로 정규화
      const normalized = normalizeParentOverview(data)

      // 토큰 저장
      if (!localStorage.getItem("edulink_parent_token")) {
        localStorage.setItem("edulink_parent_token", token)
      }

      setVm(normalized)
      setLoading(false)
    } catch (e: any) {
      console.error("❌ load() exception", e)
      setErr(e?.message || "알 수 없는 오류")
      setVm(null)
      setLoading(false)
    } finally {
      inflightRef.current = false
      console.log("🏁 ParentOverviewPage load() end")
    }
  }, [token])

  React.useEffect(() => {
    console.log("✅ ParentOverviewPage mounted")
    void load()
  }, [load])

  // Guard
  if (!token) {
    return (
      <>
        <ParentHeader studentName={undefined} onResetToken={() => { localStorage.removeItem("edulink_parent_token"); nav("/p", { replace: true }) }} />
        <div className="p-page" style={{ paddingTop: 72 }}>
        <div className="p-card">
          <h1 className="p-title">학부모 전용</h1>
          <p className="p-sub">학원에서 받은 초대 링크로 출결/피드백을 확인합니다.</p>
          <button className="p-btn" onClick={() => nav("/p", { replace: true })}>
            토큰 입력하러 가기
          </button>
        </div>
      </div>
      </>
    )
  }

  // Loading
  if (loading) {
    return (
      <>
        <ParentHeader studentName={undefined} onResetToken={() => { localStorage.removeItem("edulink_parent_token"); nav("/p", { replace: true }) }} />
        <div className="p-page" style={{ paddingTop: 72 }}>
        <div className="p-card">
          <h1 className="p-title">불러오는 중…</h1>
          <p className="p-sub">잠시만 기다려주세요.</p>
        </div>
      </div>
      </>
    )
  }

  // Error
  if (err) {
    return (
      <>
        <ParentHeader studentName={undefined} onResetToken={() => { localStorage.removeItem("edulink_parent_token"); nav("/p", { replace: true }) }} />
        <div className="p-page" style={{ paddingTop: 72 }}>
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
      </>
    )
  }

  const student = vm?.student
  const today = vm?.today
  const recent = vm?.recent ?? []

  const attendance = today?.status || null

  const todayComment =
    (today?.feedback_text && today.feedback_text.trim()) ||
    labelFromEmoji(today?.feedback_emoji) ||
    labelFromKey(today?.feedback_key) ||
    fallbackTextByAttendance(attendance)

  const todayEmoji =
    today?.feedback_emoji ||
    emojiFromKey(today?.feedback_key) ||
    fallbackEmojiByAttendance(attendance)

  return (
    <>
      <ParentHeader studentName={student?.name} onResetToken={() => { localStorage.removeItem("edulink_parent_token"); nav("/p", { replace: true }) }} />
      <div className="p-page" style={{ paddingTop: 72 }}>
        <div className="p-wrap">

        <section className="p-card p-card--today">
          <div className="p-section-title">오늘 수업</div>

          {!today ? (
            <div className="p-empty">
              아직 기록이 없어요. <span className="p-muted">수업 후에 업데이트됩니다.</span>
            </div>
          ) : (
            <div className="p-today">
              <div className="p-badge">{badgeFromAttendance(today.status || "")}</div>

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
                const recentText =
                  (r.status_text && r.status_text.trim()) ||
                  labelFromEmoji(r.status_emoji) ||
                  labelFromKey(r.feedback_key) ||
                  "기록"

                const recentEmoji =
                  r.status_emoji ||
                  emojiFromKey(r.feedback_key) ||
                  fallbackEmojiByAttendance(r.attendance)

                return (
                  <li key={r.id} className="p-item">
                    <div className="p-item-left">
                      <div className="p-item-emoji">{recentEmoji}</div>
                      <div>
                        <div className="p-item-date">{r.date}</div>
                        <div className="p-item-text">{recentText}</div>
                      </div>
                    </div>
                    <div className="p-item-badge">{badgeFromAttendance(r.attendance)}</div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <footer className="p-foot">문제가 계속되면 학원에 문의해주세요.</footer>
      </div>
    </div>
    </>
  )
}
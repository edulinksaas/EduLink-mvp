// src/pages/AcademyAppPage.tsx
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"
import StudentSearchPicker from "../components/StudentSearchPicker"
import AcademyHeader from "../components/AcademyHeader"

export type FeedbackCode = "good" | "normal" | "tired" | "need_focus"

const FEEDBACKS: Array<{ code: FeedbackCode; emoji: string; label: string }> = [
  { code: "good", emoji: "😊", label: "집중 잘함" },
  { code: "normal", emoji: "😐", label: "보통" },
  { code: "tired", emoji: "😓", label: "컨디션 저조" },
  { code: "need_focus", emoji: "⚠️", label: "지도 필요" },
]

type RecentRow = {
  id: string
  student_id: string
  record_date: string
  status: "present" | "absent"
  feedback_code: FeedbackCode | null
  created_at: string
}

function getTodayYYYYMMDD(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function makeToken(len = 32) {
  // 토큰 최소 구현(충분히 길게)
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let out = ""
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function statusToKorean(status: "present" | "absent"): string {
  if (status === "present") return "출석"
  if (status === "absent") return "결석"
  return status
}

export default function AcademyAppPage({ academyId }: { academyId: string }) {
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [status, setStatus] = useState<"present" | "absent">("present")
  const [feedbackCode, setFeedbackCode] = useState<FeedbackCode>("normal")

  const [recent, setRecent] = useState<RecentRow[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // ✅ 학부모 링크
  const [parentLink, setParentLink] = useState<string>("")

  const today = useMemo(() => getTodayYYYYMMDD(), [])
  const studentIdOk = useMemo(() => selectedStudentId.trim().length > 0, [selectedStudentId])

  const loadRecent = async (sidArg?: string) => {
    const sid = (sidArg ?? selectedStudentId).trim()
    if (!sid) {
      setRecent([])
      return
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .select("id, student_id, record_date, status, feedback_code, created_at")
      .eq("student_id", sid)
      .order("record_date", { ascending: false })
      .limit(20)

    if (error) throw error
    setRecent((data ?? []) as RecentRow[])
  }

  const saveTodayAttendance = async () => {
    const sid = selectedStudentId.trim()
    const cid = selectedClassId.trim()

    if (!sid) return setErr("학생을 선택해주세요.")
    if (!cid) return setErr("반 정보가 없습니다. 학생을 다시 선택해주세요.")

    setBusy(true)
    setErr(null)
    setMsg(null)

    try {
      const finalFeedbackCode: FeedbackCode | null = status === "absent" ? null : feedbackCode

      const { error } = await supabase
        .from("attendance_records")
        .upsert(
          {
            class_id: cid,
            student_id: sid,
            record_date: today,
            status,
            feedback_code: finalFeedbackCode,
          },
          { onConflict: "student_id,record_date" }
        )

      if (error) throw error
      setMsg("오늘 출결 저장 완료 ✅")
      await loadRecent(sid)
    } catch (e: any) {
      setErr(e?.message ?? "저장 실패")
    } finally {
      setBusy(false)
    }
  }

  // ✅ 학부모 토큰 로드/생성
  const ensureParentLink = async () => {
    const sid = selectedStudentId.trim()
    if (!sid) return setErr("학생을 먼저 선택해주세요.")

    setBusy(true)
    setErr(null)
    setMsg(null)

    try {
      // 1) 이미 토큰 있으면 가져오기(가장 최근 1개)
      const found = await supabase
        .from("parent_tokens")
        .select("token, created_at")
        .eq("student_id", sid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (found.error) throw found.error

      let token = found.data?.token as string | undefined

      // 2) 없으면 생성
      if (!token) {
        const newToken = makeToken(32)

        const ins = await supabase
          .from("parent_tokens")
          .insert({ token: newToken, student_id: sid })
          .select("token")
          .single()

        if (ins.error) throw ins.error
        token = ins.data.token
      }

      if (!token) {
        throw new Error("토큰 생성 실패")
      }

      const link = `${window.location.origin}/p/${token}`
      setParentLink(link)
      setMsg("학부모 링크 준비 완료 ✅")
    } catch (e: any) {
      setErr(e?.message ?? "학부모 링크 생성 실패")
    } finally {
      setBusy(false)
    }
  }

  const copyParentLink = async () => {
    if (!parentLink) return
    try {
      await navigator.clipboard.writeText(parentLink)
      setMsg("링크 복사 완료 ✅")
    } catch {
      setErr("복사 실패: 브라우저 권한을 확인해주세요.")
    }
  }

  // 학생 바뀌면 링크 초기화
  useEffect(() => {
    setParentLink("")
  }, [selectedStudentId])

  return (
    <>
      <AcademyHeader title="학원 출결 기록" />
      <div className="app-page">
        <div className="app-container">
          <div className="app-card">
            <h2 className="title">학원 출결 기록</h2>
          <p className="sub">오늘 출석/피드백을 빠르게 기록하고 학부모 링크로 공유합니다.</p>
          </div>
          
          <StudentSearchPicker
            academyId={academyId}
            valueStudentId={selectedStudentId}
            onSelect={(payload) => {
              setSelectedStudentId(payload.studentId)
              setSelectedClassId(payload.classId)
              setErr(null)
              void loadRecent(payload.studentId)
            }}
          />

          {/* ✅ 학부모 링크 생성/복사 */}
          <div className="reportSection">
            <div className="label">학부모 링크</div>

            <div className="row" style={{ flexWrap: "wrap", marginTop: "8px" }}>
              <button className="btn btnGhost" disabled={busy || !studentIdOk} onClick={ensureParentLink}>
                {busy ? "생성 중..." : parentLink ? "링크 다시 불러오기" : "링크 생성"}
              </button>

              <button className="btn btnPrimary" disabled={busy || !parentLink} onClick={copyParentLink}>
                링크 복사
              </button>
            </div>

            {parentLink && (
              <div style={{ marginTop: "8px" }}>
                <input className="input" readOnly value={parentLink} onFocus={(e) => e.currentTarget.select()} />
                <div className="help">
                  학부모에게 이 링크를 보내면 <b>로그인 없이</b> 출결을 확인할 수 있어요.
                </div>
              </div>
            )}
          </div>

          {/* 출석/결석 */}
          <div className="row reportSection">
            <button
              className={`btn btnGhost ${status === "present" ? "button--active" : ""}`}
              onClick={() => setStatus("present")}
              disabled={busy}
            >
              출석
            </button>
            <button
              className={`btn btnGhost ${status === "absent" ? "button--active" : ""}`}
              onClick={() => setStatus("absent")}
              disabled={busy}
            >
              결석
            </button>
          </div>

          {/* 피드백 */}
          <div className="reportSection">
            <div className="label">피드백</div>
            <div className="row" style={{ flexWrap: "wrap", marginTop: "8px" }}>
              {FEEDBACKS.map((f) => (
                <button
                  key={f.code}
                  className={`chip ${feedbackCode === f.code && status === "present" ? "on" : ""}`}
                  onClick={() => setFeedbackCode(f.code)}
                  disabled={busy || status === "absent"}
                >
                  {f.emoji} {f.label}
                </button>
              ))}
            </div>
            {status === "absent" && (
              <div className="help">
                결석일 때는 피드백이 저장되지 않습니다.
              </div>
            )}
          </div>

          {/* 저장 */}
          <div className="reportSection">
            <button className="btn btnPrimary" onClick={saveTodayAttendance} disabled={busy || !studentIdOk || !selectedClassId}>
              {busy ? "저장 중..." : "오늘 출결 저장"}
            </button>
            {!selectedClassId && studentIdOk && (
              <div className="error">
                반 정보가 없습니다. 학생을 다시 선택해주세요.
              </div>
            )}
          </div>

          {msg && <div className="toast">{msg}</div>}
          {err && <div className="error">{err}</div>}

          {/* 최근 기록 */}
          <div className="reportSection">
            <h3 className="title" style={{ fontSize: "16px", marginBottom: "8px" }}>
              최근 기록
            </h3>

            {!studentIdOk && <div className="help">학생을 선택하면 최근 기록이 표시됩니다.</div>}
            {studentIdOk && recent.length === 0 && <div className="help">아직 기록이 없습니다.</div>}

            <div className="list">
              {recent.map((r) => {
                const isToday = r.record_date === today
                const f =
                  r.status === "absent"
                    ? { emoji: "🚫", label: "결석" }
                    : FEEDBACKS.find((x) => x.code === (r.feedback_code ?? "normal")) ?? {
                        emoji: "😐",
                        label: "보통",
                      }

                return (
                  <div key={r.id} className="row" style={{ border: isToday ? "1px solid #111" : "1px solid #eee" }}>
                    <div className="rowTop" style={{ gridTemplateColumns: "1fr auto" }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="rowMain" style={{ flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                          <span>{f.emoji}</span>
                          <span className="name">{f.label}</span>
                          {isToday && <span className="badge" style={{ flexShrink: 0 }}>오늘</span>}
                        </div>
                        <div className="rowSub">날짜: {r.record_date}</div>
                      </div>
                      <div>
                        <span className="muted">{statusToKorean(r.status)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
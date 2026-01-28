import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

type FeedbackKey = "good" | "normal" | "tired" | "great" | "need"

const FEEDBACKS: { key: FeedbackKey; emoji: string; label: string }[] = [
  { key: "good", emoji: "😊", label: "집중 잘함" },
  { key: "normal", emoji: "😐", label: "보통" },
  { key: "tired", emoji: "😓", label: "컨디션 저조" },
  { key: "great", emoji: "🔥", label: "최고" },
  { key: "need", emoji: "⚠️", label: "지도 필요" },
]

type StudentLite = { id: string; name: string }

export default function AcademyTodayPage({ academyId }: { academyId: string }) {
  const nav = useNavigate()

  const [students, setStudents] = useState<StudentLite[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [status, setStatus] = useState<"present" | "absent" | "late">("present")
  const [feedback, setFeedback] = useState<FeedbackKey>("good")

  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // 학생 목록 로딩
  useEffect(() => {
    const loadStudents = async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,name")
        .eq("academy_id", academyId)
        .limit(50)

      if (!error && data) {
        setStudents(data)
        if (data[0]) setSelectedStudentId(data[0].id)
      }
    }

    void loadStudents()
  }, [academyId])

  const saveOne = async () => {
    if (!selectedStudentId) return

    setBusy(true)
    setMsg(null)
    setError(null)

    try {
      const { error } = await supabase
        .from("attendance_records")
        .upsert(
          {
            student_id: selectedStudentId,
            record_date: today,
            status,
            feedback_code: feedback,
          },
          { onConflict: "student_id,record_date" }
        )

      if (error) throw error
      setMsg("오늘 출결 저장 완료")
    } catch (e: any) {
      setError(e.message ?? "저장 실패")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 640, margin: "0 auto" }}>
      <button type="button" onClick={() => nav("/academy/settings")}>
        (반/학생 등록)
      </button>
      <h1>오늘 수업</h1>

      <select
        value={selectedStudentId}
        onChange={e => setSelectedStudentId(e.target.value)}
        style={{ width: "100%", padding: 8, marginTop: 12 }}
      >
        {students.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <div style={{ marginTop: 12 }}>
        <button onClick={() => setStatus("present")}>출석</button>
        <button onClick={() => setStatus("late")}>지각</button>
        <button onClick={() => setStatus("absent")}>결석</button>
      </div>

      <div style={{ marginTop: 12 }}>
        {FEEDBACKS.map(f => (
          <button
            key={f.key}
            onClick={() => setFeedback(f.key)}
            style={{ marginRight: 6 }}
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={saveOne}
        disabled={busy}
        style={{ marginTop: 16, padding: "10px 12px" }}
      >
        {busy ? "저장 중..." : "오늘 출결 저장"}
      </button>

      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  )
}
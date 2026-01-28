import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

type AttendanceRecord = {
  id: string
  record_date: string
  status: "present" | "absent" | "late"
  feedback_code: string | null
  created_at: string
}

const FEEDBACK_MAP: Record<string, { emoji: string; label: string }> = {
  good: { emoji: "😊", label: "집중 잘함" },
  normal: { emoji: "😐", label: "보통" },
  tired: { emoji: "😓", label: "컨디션 저조" },
  great: { emoji: "🔥", label: "최고" },
  need: { emoji: "⚠️", label: "지도 필요" },
}

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState("")
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) {
      setError("학생 ID가 없습니다.")
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const sRes = await supabase
          .from("students")
          .select("name")
          .eq("id", studentId)
          .single()

        if (sRes.error) throw sRes.error
        setStudentName(sRes.data?.name ?? "")

        const rRes = await supabase
          .from("attendance_records")
          .select("id, record_date, status, feedback_code, created_at")
          .eq("student_id", studentId)
          .order("record_date", { ascending: false })
          .limit(50)

        if (rRes.error) throw rRes.error
        setRecords(rRes.data ?? [])
      } catch (e: any) {
        setError(e.message ?? "데이터를 불러오지 못했습니다.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [studentId])

  if (loading) return <p>불러오는 중…</p>
  if (error) return <p style={{ color: "red" }}>{error}</p>

  return (
    <div style={{ padding: 24 }}>
      <button type="button" onClick={() => navigate(-1)}>← 뒤로</button>

      <h2 style={{ marginTop: 16 }}>{studentName} · 학생 상세</h2>

      {records.length === 0 ? (
        <p>출결 기록이 없습니다.</p>
      ) : (
        <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">날짜</th>
              <th align="left">출결</th>
              <th align="left">피드백</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => {
              const fb = r.feedback_code
                ? FEEDBACK_MAP[r.feedback_code]
                : null

              return (
                <tr key={r.id}>
                  <td>{r.record_date}</td>
                  <td>
                    {r.status === "present"
                      ? "출석"
                      : r.status === "late"
                      ? "지각"
                      : "결석"}
                  </td>
                  <td>
                    {fb ? `${fb.emoji} ${fb.label}` : "-"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
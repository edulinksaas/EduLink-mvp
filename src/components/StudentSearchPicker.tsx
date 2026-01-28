import React from "react"
import { supabase } from "../lib/supabase"

type Option = {
  studentId: string
  classId: string
  label: string
}

type Props = {
  academyId: string
  valueStudentId: string
  onSelect: (payload: { studentId: string; classId: string; label: string }) => void
}

export default function StudentSearchPicker({
  academyId,
  valueStudentId,
  onSelect,
}: Props) {
  const [q, setQ] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [opts, setOpts] = React.useState<Option[]>([])
  const [open, setOpen] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState<string>("")
  // 외부에서 값이 바뀌면(예: 초기화) 라벨도 초기화
  React.useEffect(() => {
    if (!valueStudentId) setSelectedLabel("")
  }, [valueStudentId])

  const search = React.useCallback(
    async (termRaw: string) => {
      const term = termRaw.trim()
      if (!academyId) return setOpts([])
      if (!term) return setOpts([])

      setLoading(true)
      try {
        // 1) 학생 이름으로 검색
        const studentsRes = await supabase
          .from("students")
          .select("id")
          .eq("academy_id", academyId)
          .ilike("name", `%${term}%`)
          .limit(50)

        // 2) 반 이름으로 검색
        const classesRes = await supabase
          .from("classes")
          .select("id")
          .eq("academy_id", academyId)
          .ilike("name", `%${term}%`)
          .limit(50)

        const studentIds = (studentsRes.data ?? []).map((s: any) => s.id)
        const classIds = (classesRes.data ?? []).map((c: any) => c.id)

        if (studentIds.length === 0 && classIds.length === 0) {
          setOpts([])
          return
        }

        // 3) class_students에서 student_id 또는 class_id로 필터링
        const conditions: string[] = []
        if (studentIds.length > 0) {
          conditions.push(`student_id.in.(${studentIds.join(",")})`)
        }
        if (classIds.length > 0) {
          conditions.push(`class_id.in.(${classIds.join(",")})`)
        }

        const csRes = await supabase
          .from("class_students")
          .select("student_id, class_id, students(name), classes(name)")
          .or(conditions.join(","))
          .limit(20)

        if (csRes.error) throw csRes.error

        const options: Option[] = (csRes.data ?? []).map((row: any) => {
          const studentName = row.students?.name || ""
          const className = row.classes?.name || ""
          return {
            studentId: row.student_id,
            classId: row.class_id,
            label: `${studentName} · ${className}`,
          }
        })

        // 중복 제거
        const uniqueOptions = Array.from(
          new Map(
            options.map((o) => [`${o.studentId}-${o.classId}`, o])
          ).values()
        ).slice(0, 20)

        setOpts(uniqueOptions)
      } catch (e: any) {
        console.error("[StudentSearchPicker] search error:", e)
        setOpts([])
      } finally {
        setLoading(false)
      }
    },
    [academyId]
  )

  // 디바운스 검색
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      void search(q)
    }, 200)
    return () => window.clearTimeout(t)
  }, [q, search])

  const pick = (o: Option) => {
    onSelect({ studentId: o.studentId, classId: o.classId, label: o.label })
    setSelectedLabel(o.label)
    setOpen(false)
  }

  return (
    <div style={{ position: "relative" }}>
      <label style={{ display: "block", fontSize: 12, marginBottom: 6, opacity: 0.8 }}>
        학생 이름 / 반 이름 검색
      </label>

      <input
        value={q}
        placeholder="학생 이름 / 반 이름 검색"
        onChange={(e) => {
          const v = e.target.value
          console.log("[input onChange]", v)
          setQ(v)
          search(v)
        }}
        onFocus={() => setOpen(true)}
      />

      {/* 선택 상태 */}
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
        {valueStudentId ? (
          <span>
            ✅ 선택됨: <b>{selectedLabel || valueStudentId}</b>
          </span>
        ) : (
          <span>아직 선택된 학생 없음</span>
        )}
      </div>

      {/* 드롭다운 */}
      {open && (q.trim().length > 0) && (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            top: 70,
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: 10,
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: 12, fontSize: 13, opacity: 0.75 }}>검색 중…</div>
          ) : opts.length === 0 ? (
            <div style={{ padding: 12, fontSize: 13, opacity: 0.75 }}>
              검색 결과 없음
            </div>
          ) : (
            opts.map((o, idx) => (
              <button
                key={`${o.studentId}-${o.classId}-${idx}`}
                type="button"
                onClick={() => pick(o)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {o.label}
                <div style={{ fontSize: 11, opacity: 0.6 }}>{o.studentId}</div>
              </button>
            ))
          )}

          <div style={{ padding: 10, borderTop: "1px solid #eee", textAlign: "right" }}>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setOpen(false)}
              style={{ fontSize: 12 }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
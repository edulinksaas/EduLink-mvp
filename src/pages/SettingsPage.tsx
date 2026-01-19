// src/pages/SettingsPage.tsx
import React from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type ClassRow = { id: string; academy_id: string; name: string; created_at: string }
type StudentRow = { id: string; academy_id: string; name: string; created_at: string }

export function SettingsPage({ academyId }: { academyId: string }) {
  const { logout } = useAuth()
  const [className, setClassName] = React.useState('')
  const [studentName, setStudentName] = React.useState('')
  const [totalSessions, setTotalSessions] = React.useState<number | ''>('')

  const [classes, setClasses] = React.useState<ClassRow[]>([])
  const [students, setStudents] = React.useState<StudentRow[]>([])

  const [selectedClassId, setSelectedClassId] = React.useState('')
  const [selectedStudentId, setSelectedStudentId] = React.useState('')

  const [msg, setMsg] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const toast = (text: string) => {
    setMsg(text)
    window.setTimeout(() => setMsg(null), 1200)
  }

  const load = async () => {
    if (!academyId) return

    // classes
    const c = await supabase
      .from('classes')
      .select('id, academy_id, name, created_at')
      .eq('academy_id', academyId)
      .order('created_at', { ascending: false })
      
    if (!c.error && c.data) setClasses(c.data as ClassRow[])

    // students
    const s = await supabase
      .from('students')
      .select('id, academy_id, name, created_at')
      .eq('academy_id', academyId)
      .order('created_at', { ascending: false })
     
    if (!s.error && s.data) setStudents(s.data as StudentRow[])
  }

  React.useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academyId])

  const createClass = async () => {
    const name = className.trim()
    if (!name) return toast('반 이름을 입력해줘')
    if (busy) return
    setBusy(true)
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({ academy_id: academyId, name: name })
        .select('id, academy_id, name, created_at')
        .single()

      if (error) throw error
      toast('반 생성됨')
      setClassName('')
      setClasses((prev) => [data as ClassRow, ...prev])
    } catch (e) {
      console.error(e)
      toast('반 생성 실패')
    } finally {
      setBusy(false)
    }
  }

  const createStudent = async () => {
    const name = studentName.trim()
    if (!name) return toast('학생 이름을 입력해줘')
    if (busy) return
    setBusy(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .insert({ academy_id: academyId, name: name })
        .select('id, academy_id, name, created_at')
        .single()

      if (error) throw error
      toast('학생 생성됨')
      setStudentName('')
      setStudents((prev) => [data as StudentRow, ...prev])
    } catch (e) {
      console.error(e)
      toast('학생 생성 실패')
    } finally {
      setBusy(false)
    }
  }

  const enroll = async () => {
    if (!selectedClassId) return toast('반을 선택해줘')
    if (!selectedStudentId) return toast('학생을 선택해줘')
    if (busy) return
    setBusy(true)
    try {
      const payload: any = {
        class_id: selectedClassId,
        student_id: selectedStudentId,
      }
      if (totalSessions !== '') payload.total_sessions = totalSessions

      const { error } = await supabase.from('class_students').insert(payload)
      if (error) throw error

      toast('배정 완료')
      // 배정 후 입력만 초기화
      setSelectedStudentId('')
      setTotalSessions('')
    } catch (e) {
      console.error(e)
      // 중복 배정이면 보통 unique 제약 걸려있어서 여기로 옴
      toast('배정 실패(중복일 수 있음)')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="settings-header">
        <h1 className="settings-title">세팅</h1>
        {msg && <div className="toast">{msg}</div>}
      </div>

      <div className="settings-card">
        <h2 className="settings-card-title">반 생성</h2>
        <div className="settings-form">
          <input
            className="input"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="예) 테스트반 / 1-1반"
          />
          <button className="btn on settings-btn" onClick={createClass} disabled={busy}>
            생성
          </button>
        </div>
      </div>

      <div className="settings-card">
        <h2 className="settings-card-title">학생 생성</h2>
        <div className="settings-form">
          <input
            className="input"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="예) 김학생"
          />
          <button className="btn on settings-btn" onClick={createStudent} disabled={busy}>
            생성
          </button>
        </div>
      </div>

      <div className="settings-card settings-card-highlight">
        <h2 className="settings-card-title">학생 → 반 배정</h2>
        <div className="settings-form">
          <select
            className="input"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">반 선택</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            <option value="">학생 선택</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            className="input"
            type="number"
            value={totalSessions}
            onChange={(e) => setTotalSessions(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="총 횟수(옵션) 예: 20"
            min={0}
          />
          <button className="btn on settings-btn" onClick={enroll} disabled={busy}>
            배정
          </button>
        </div>
        <div className="hint">
          수정/삭제 없음. 내일 데이터 넣는 용도만.
        </div>
      </div>

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #eee', textAlign: 'center' }}>
        <button className="btn" onClick={logout} style={{ fontSize: 12, padding: '6px 12px', color: '#666' }}>
          로그아웃
        </button>
      </div>
    </div>
  )
}
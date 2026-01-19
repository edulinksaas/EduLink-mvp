import React from 'react'
import { supabase } from '../lib/supabase'
import type { RollRow } from '../types'
import { StudentRow } from '../components/StudentRow'
import { Toast } from '../components/Toast'
import { StudentDetailPage } from './StudentDetailPage'

function getTodayYYYYMMDD() {
  return new Date().toISOString().slice(0, 10)
}

export function ClassRollPage({
  initialClassId = '',
  hideClassIdInput = false,
  className,
}: {
  initialClassId?: string
  hideClassIdInput?: boolean
  className?: string
}) {
  const [classId, setClassId] = React.useState(initialClassId)
  const [today, setToday] = React.useState(getTodayYYYYMMDD())
  const [roll, setRoll] = React.useState<RollRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [toast, setToast] = React.useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null)

  const showToast = (msg: string, type: 'success' | 'error', ms: number) => {
    setToast({ msg, type })
    window.setTimeout(() => setToast(null), ms)
  }

  const load = React.useCallback(async () => {
    const id = classId.trim()
    if (!id) {
      alert('class_id를 붙여넣어줘.')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_class_roll', {
        p_class_id: id,
        p_date: today,
      })
      if (error) throw error
      setRoll((data ?? []) as RollRow[])
    } catch (e: any) {
      console.error(e)
      alert(`불러오기 실패: ${e?.message ?? 'unknown error'}`)
    } finally {
      setLoading(false)
    }
  }, [classId, today])

  const onPatch = (studentId: string, partial: Partial<RollRow>) => {
    setRoll((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, ...partial } : r)))
  }

  React.useEffect(() => {
    if (hideClassIdInput && initialClassId) {
      load()
    }
  }, [hideClassIdInput, initialClassId, load])

  return (
    <div className="page">
      <div className="class-roll-header">
        <div>
          <h1 className="class-roll-title">반 상세 · 오늘 출결</h1>
          {className && <div className="class-roll-class-name">{className}</div>}
        </div>
      </div>

      <div className="class-roll-controls">
        {!hideClassIdInput ? (
          <>
            <input
              className="class-roll-input"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              placeholder="class_id (uuid) 붙여넣기"
            />
            <button className="btn" onClick={load} disabled={loading}>
              {loading ? '불러오는 중...' : '불러오기'}
            </button>
          </>
        ) : null}
        <div className="class-roll-date-controls">
          <input
            type="date"
            className="class-roll-date-input"
            value={today}
            onChange={(e) => setToday(e.target.value)}
          />
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? '불러오는 중...' : '새로고침'}
          </button>
        </div>
      </div>

      <div className="class-roll-list">
        {loading && roll.length === 0 && (
          <p style={{ color: '#666', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
            불러오는 중...
          </p>
        )}

        {!loading && roll.length === 0 && (
          <p className="class-roll-empty">
            학생이 안 뜨면 ① class_students에 배정됐는지 ② class_id가 classes.id가 맞는지 확인!
          </p>
        )}

        {roll.map((row) => (
          <StudentRow
            key={row.student_id}
            row={row}
            classId={classId.trim()}
            today={today}
            onPatch={onPatch}
            onReload={load}
            onSaved={() => showToast('저장됨', 'success', 500)}
            onError={() => showToast('저장 실패 · 재시도', 'error', 1200)}
            onOpenDetail={() => setSelectedStudentId(row.student_id)}
          />
        ))}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} />}

      {selectedStudentId ? (
        <StudentDetailPage
          classId={classId.trim()}
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      ) : null}
    </div>
  )
}

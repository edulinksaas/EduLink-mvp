import React from 'react'
import { supabase } from '../lib/supabase'

type Row = {
  record_date: string
  status: 'present' | 'absent'
  feedback_emoji: string | null
  feedback_text: string | null
}

export function StudentDetailPage({
  classId,
  studentId,
  onClose,
}: {
  classId: string
  studentId: string
  onClose: () => void
}) {
  const [items, setItems] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('attendance_records')
          .select('record_date,status,feedback_emoji,feedback_text')
          .eq('class_id', classId)
          .eq('student_id', studentId)
          .order('record_date', { ascending: false })
          .limit(10)

        if (error) throw error
        setItems((data ?? []) as Row[])
      } catch (e) {
        console.error(e)
        alert('불러오기 실패')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [classId, studentId])

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12, marginTop: 12, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b>학부모 뷰 · 최근 기록</b>
        <button onClick={onClose}>닫기</button>
      </div>

      {loading ? <p>불러오는 중...</p> : null}

      {!loading && items.length === 0 ? <p style={{ color: '#666' }}>기록 없음</p> : null}

      <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
        {items.map((it) => (
          <li key={`${it.record_date}-${it.status}`} style={{ padding: '8px 0', borderBottom: '1px solid #f3f3f3' }}>
            <div style={{ fontSize: 13 }}>
              <b>{it.record_date}</b> · {it.status === 'present' ? '출석' : '결석'}
            </div>
            {it.status === 'present' ? (
              <div style={{ marginTop: 4, color: '#111' }}>
                {it.feedback_emoji ?? '😐'} {it.feedback_text ?? ''}
              </div>
            ) : (
              <div style={{ marginTop: 4, color: '#666' }}>-</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

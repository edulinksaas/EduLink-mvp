import React from 'react'
import { supabase } from '../lib/supabase'
import { ClassRollPage } from './ClassRollPage'

type TodayClass = {
  class_id: string
  class_name: string
}

function getTodayYYYYMMDD() {
  return new Date().toISOString().slice(0, 10)
}

export function TodayClassesPage({
  academyId,
}: {
  academyId: string
}) {
  const [today] = React.useState(getTodayYYYYMMDD())
  const [items, setItems] = React.useState<TodayClass[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedClass, setSelectedClass] = React.useState<TodayClass | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_today_classes', {
        p_academy_id: academyId,
        p_date: today,
      })
      if (error) throw error
      setItems((data ?? []) as TodayClass[])
    } catch (e) {
      console.error(e)
      alert('오늘 수업 리스트 불러오기 실패')
    } finally {
      setLoading(false)
    }
  }, [academyId, today])

  React.useEffect(() => {
    load()
  }, [load])

  // 반 선택하면 출결 화면으로 진입
  if (selectedClass) {
    return (
      <div className="page">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => setSelectedClass(null)}>← 반 목록</button>
          <div style={{ fontSize: 12, color: '#666' }}>{today}</div>
        </div>
  
        <ClassRollPage
          initialClassId={selectedClass.class_id}
          className={selectedClass.class_name}
          hideClassIdInput
        />
      </div>
    )
  }
  

  return (
    <div className="page">
      <h1 className="page-title">오늘 수업 리스트</h1>
      <div className="page-date">{today}</div>

      {loading ? <p className="page-loading">불러오는 중...</p> : null}

      <div className="class-list">
        {items.map((c) => (
          <button
            key={c.class_id}
            onClick={() => setSelectedClass(c)}
            className="class-card"
          >
            <div className="class-card-content">
              <div className="class-card-name">{c.class_name}</div>
              <div className="class-card-subtitle">오늘 · 출결 진행</div>
            </div>
          </button>
        ))}
      </div>

      {!loading && items.length === 0 ? (
        <p className="page-empty">아직 오늘 수업이 없습니다. 설정에서 반을 추가해보세요.</p>
      ) : null}
    </div>
  )
}

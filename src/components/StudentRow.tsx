import React from 'react'
import { EMOJIS, PRESETS, type Emoji, type RollRow } from '../types'
import { supabase } from '../lib/supabase'

/**
 * PARENT_WEB_ORIGIN을 함수로 변경하여 빌드 시점 실행 방지
 * window.location.origin은 브라우저 환경에서만 접근 가능
 */
function getParentWebOrigin(): string {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_PARENT_WEB_ORIGIN as string || ''
  }
  return (import.meta.env.VITE_PARENT_WEB_ORIGIN as string) || window.location.origin
}

export async function copyParentLink(studentId: string) {
  const { data, error } = await supabase.rpc('create_or_get_parent_link', {
    p_student_id: studentId,
  })

  if (error) throw error

  const token = data as string
  const origin = getParentWebOrigin()
  const url = `${origin}/p/${token}`

  await navigator.clipboard.writeText(url)
  return url
}

export function StudentRow({
  row,
  classId,
  today,
  onPatch,
  onReload,
  onSaved,
  onError,
  onOpenDetail,
}: {
  row: RollRow
  classId: string
  today: string // YYYY-MM-DD
  onPatch: (studentId: string, partial: Partial<RollRow>) => void
  onReload: () => Promise<void>
  onSaved?: () => void
  onError?: () => void
  onOpenDetail: () => void
}) {
  const [isSaving, setIsSaving] = React.useState(false)
  const [expanded, setExpanded] = React.useState(false) // ✅ 추가

  const save = async (payload: {
    status: 'present' | 'absent'
    emoji?: Emoji | null
    text?: string | null
  }) => {
    if (isSaving) return
    setIsSaving(true)
    try {
      await supabase.rpc('set_attendance_with_feedback', {
        p_class_id: classId,
        p_student_id: row.student_id,
        p_date: today,
        p_status: payload.status,
        p_emoji: payload.emoji ?? null,
        p_text: payload.text ?? null,
      })
      // remaining_sessions까지 확실히 맞추려면 재조회가 가장 깔끔
      await onReload()
      onSaved?.()
    } catch (e) {
      console.error(e)
      await onReload()
      onError?.()
    } finally {
      setIsSaving(false)
    }
  }

  const onPresent = () => {
    const nextEmoji = row.feedback_emoji ?? '😐'
    onPatch(row.student_id, { status: 'present', feedback_emoji: nextEmoji })

    setExpanded(true) // ✅ 추가 (출석 누르면 패널 열기)

    save({ status: 'present', emoji: nextEmoji, text: row.feedback_text ?? null })
  }

  const onAbsent = () => {
    onPatch(row.student_id, { status: 'absent', feedback_emoji: null, feedback_text: null })

    setExpanded(false) // ✅ 추가 (결석 누르면 패널 닫기)

    save({ status: 'absent', emoji: null, text: null })
  }

  const onPickEmoji = (emoji: Emoji) => {
    if (row.status !== 'present') return
    onPatch(row.student_id, { feedback_emoji: emoji })
    save({ status: 'present', emoji, text: row.feedback_text ?? null })
  }

  const onPickPreset = (text: string) => {
    if (row.status !== 'present') return
    const emoji = row.feedback_emoji ?? '😐'
    onPatch(row.student_id, { feedback_emoji: emoji, feedback_text: text })
    save({ status: 'present', emoji, text })
  }

  const showPanel = row.status === 'present' && expanded

  return (
    <div className="row" style={{ opacity: isSaving ? 0.6 : 1 }}>
      <div className="rowTop">
        <div className="rowLeft">
          <div className="name">{row.student_name}</div>
          <div className="sub">남은 횟수: {row.remaining_sessions}</div>
          <div className="rowMetaActions">
            <button className="btn" onClick={onOpenDetail} disabled={isSaving}>
              학부모 뷰
            </button>
            <button
              className="btn"
              onClick={async () => {
                try {
                  const url = await copyParentLink(row.student_id)
                  alert('학부모 링크가 복사됐어요!\n' + url)
                } catch (e) {
                  console.error(e)
                  alert('링크 생성/복사 실패')
                }
              }}
              disabled={isSaving}
            >
              학부모 링크 복사
            </button>
          </div>
        </div>

        <div className="actions">
          <button
            className={`btn ${row.status === 'present' ? 'on' : ''}`}
            onClick={onPresent}
            disabled={isSaving}
          >
            {row.status === 'present' ? '✅ 출석됨' : '출석'}
          </button>
          <button
            className={`btn absent ${row.status === 'absent' ? 'on' : ''}`}
            onClick={onAbsent}
            disabled={isSaving}
          >
            {row.status === 'absent' ? '❌ 결석됨' : '결석'}
          </button>
        </div>
      </div>

      {showPanel && (
        <div className="panel">
          <div className="group">
            {EMOJIS.map((e) => (
              <button
                key={e}
                className={`chip ${row.feedback_emoji === e ? 'on' : ''}`}
                onClick={() => onPickEmoji(e)}
                disabled={isSaving}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="group">
            {PRESETS.map((t) => (
              <button
                key={t}
                className={`chip ${row.feedback_text === t ? 'on' : ''}`}
                onClick={() => onPickPreset(t)}
                disabled={isSaving}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



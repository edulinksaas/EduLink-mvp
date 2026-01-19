export type Emoji = '😊' | '😐' | '😓' | '🌀' | '💬'
export type Status = 'present' | 'absent' | null

export type RollRow = {
  student_id: string
  student_name: string
  status: Status
  feedback_emoji: Emoji | null
  feedback_text: string | null
  remaining_sessions: string
}

export const EMOJIS: Emoji[] = ['😊', '😐', '😓', '🌀', '💬']
export const PRESETS = ['집중 좋음', '보통', '컨디션 저조', '산만했음', '상담 필요']




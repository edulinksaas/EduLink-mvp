export type FeedbackCode =
  | "good"
  | "normal"
  | "tired"
  | "need_focus"
  | "absent"

export const FEEDBACK_MAP: Record<
  FeedbackCode,
  { emoji: string; text: string }
> = {
  good: {
    emoji: "😊",
    text: "집중 잘했어요",
  },
  normal: {
    emoji: "😐",
    text: "보통이에요",
  },
  tired: {
    emoji: "😓",
    text: "컨디션이 조금 저조해요",
  },
  need_focus: {
    emoji: "⚠️",
    text: "집중이 필요해요",
  },
  absent: {
    emoji: "🚫",
    text: "결석",
  },
}
// src/lib/loadAcademyContext.ts
import { supabase } from "./supabase"

export async function loadAcademyContext(academyId: string) {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("academy_id", academyId)

  if (error) throw error

  // 👉 여기서 Zustand / Context / 전역 store에 저장
  // 예:
  // useAcademyStore.getState().setStudents(data)

  return data
}
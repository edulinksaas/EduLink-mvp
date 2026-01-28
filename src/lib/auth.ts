// src/lib/auth.ts
import { supabase } from "./supabase"

export async function academyLogout() {
  await supabase.auth.signOut()
}
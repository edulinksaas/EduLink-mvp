import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client를 lazy initialization으로 생성합니다.
 * 
 * 문제: 파일 최상단에서 createClient를 호출하면 빌드 시점(Node 환경)에서 실행될 수 있습니다.
 * - Netlify 빌드 시 환경 변수가 제대로 주입되지 않을 수 있음
 * - import.meta.env는 런타임(브라우저)에서만 안전하게 동작함
 * 
 * 해결: 함수 내부에서만 client를 생성하도록 변경하여,
 * 실제로 사용될 때(브라우저 런타임)에만 실행되도록 보장합니다.
 */
let supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  // 이미 생성된 client가 있으면 재사용
  if (supabaseClient) {
    return supabaseClient
  }

  // 브라우저 환경에서만 실행되도록 보장
  if (typeof window === 'undefined') {
    throw new Error('Supabase client는 브라우저 환경에서만 생성할 수 있습니다.')
  }

  // 환경 변수는 런타임(브라우저)에서만 안전하게 접근 가능
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  if (!url || !key) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다. VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 확인하세요.')
  }

  // Client 생성 및 캐싱
  supabaseClient = createClient(url, key)
  return supabaseClient
}

// 기존 코드와의 호환성을 위해 export
// 실제 사용 시점에만 client가 생성됨
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient]
  },
})

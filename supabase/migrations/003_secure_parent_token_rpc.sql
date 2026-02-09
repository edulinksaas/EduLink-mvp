-- parent_tokens 테이블에 대한 anon/public 권한 취소
REVOKE ALL ON public.parent_tokens FROM anon;
REVOKE ALL ON public.parent_tokens FROM public;

-- RPC 함수 생성: 토큰으로 student_id 조회
CREATE OR REPLACE FUNCTION public.get_student_id_by_parent_token(p_token TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT student_id
  FROM parent_tokens
  WHERE token = p_token
  LIMIT 1;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.get_student_id_by_parent_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_id_by_parent_token(TEXT) TO authenticated;

-- RPC 함수 생성: 토큰으로 부모 답변 조회
CREATE OR REPLACE FUNCTION public.get_parent_replies_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  action_type TEXT,
  message TEXT,
  reply_message TEXT,
  replied_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pa.id,
    pa.created_at,
    pa.action_type,
    pa.message,
    pa.reply_message,
    pa.replied_at
  FROM parent_tokens pt
  INNER JOIN parent_actions pa ON pt.student_id = pa.student_id
  WHERE pt.token = TRIM(p_token)
    AND pa.reply_message IS NOT NULL
  ORDER BY pa.replied_at DESC NULLS LAST
  LIMIT 50;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.get_parent_replies_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_parent_replies_by_token(TEXT) TO authenticated;


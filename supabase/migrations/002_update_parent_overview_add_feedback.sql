-- parent_overview RPC 함수 업데이트: today에 feedback_emoji, feedback_text 포함
CREATE OR REPLACE FUNCTION parent_overview(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
  v_today_date DATE := CURRENT_DATE;
  v_today_record RECORD;
  v_recent_records JSONB[];
  v_result JSONB;
BEGIN
  -- 토큰으로 학생 찾기
  SELECT student_id INTO v_student_id
  FROM parent_tokens
  WHERE token = p_token
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Invalid token');
  END IF;

  -- 오늘 날짜의 attendance_records 1건 조회 (feedback 포함)
  SELECT 
    ar.id,
    ar.status,
    ar.class_id,
    ar.student_id,
    ar.record_date,
    ar.feedback_emoji,
    ar.feedback_text,
    ar.created_at
  INTO v_today_record
  FROM attendance_records ar
  WHERE ar.student_id = v_student_id
    AND ar.record_date = v_today_date
  ORDER BY ar.created_at DESC
  LIMIT 1;

  -- 최근 기록 (오늘 제외)
  SELECT COALESCE(
    ARRAY_AGG(
      jsonb_build_object(
        'id', ar.id,
        'status', ar.status,
        'class_id', ar.class_id,
        'student_id', ar.student_id,
        'record_date', ar.record_date,
        'feedback_emoji', ar.feedback_emoji,
        'feedback_text', ar.feedback_text,
        'created_at', ar.created_at
      )
      ORDER BY ar.record_date DESC, ar.created_at DESC
    ),
    ARRAY[]::jsonb[]
  )
  INTO v_recent_records
  FROM (
    SELECT ar.*
    FROM attendance_records ar
    WHERE ar.student_id = v_student_id
      AND ar.record_date < v_today_date
    ORDER BY ar.record_date DESC, ar.created_at DESC
    LIMIT 10
  ) ar;

  -- 학생 정보와 결과 조합
  SELECT jsonb_build_object(
    'ok', true,
    'student', jsonb_build_object(
      'id', s.id,
      'name', s.name
    ),
    'today', CASE 
      WHEN v_today_record.id IS NOT NULL THEN
        jsonb_build_object(
          'id', v_today_record.id,
          'status', v_today_record.status,
          'class_id', v_today_record.class_id,
          'student_id', v_today_record.student_id,
          'record_date', v_today_record.record_date,
          'feedback_emoji', v_today_record.feedback_emoji,
          'feedback_text', v_today_record.feedback_text,
          'created_at', v_today_record.created_at
        )
      ELSE NULL
    END,
    'recent', COALESCE(v_recent_records, ARRAY[]::jsonb[])
  )
  INTO v_result
  FROM students s
  WHERE s.id = v_student_id;

  RETURN v_result;
END;
$$;


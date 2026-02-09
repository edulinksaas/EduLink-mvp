-- academies 테이블 INSERT 정책 추가
-- 인증된 사용자는 academies를 생성할 수 있음
CREATE POLICY "Authenticated users can insert academies" ON academies
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);


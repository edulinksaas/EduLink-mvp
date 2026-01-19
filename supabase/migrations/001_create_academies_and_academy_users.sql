-- academies 테이블 생성
CREATE TABLE IF NOT EXISTS academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- academy_users 테이블 생성
CREATE TABLE IF NOT EXISTS academy_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, academy_id)
);

-- RLS 활성화
ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_users ENABLE ROW LEVEL SECURITY;

-- academies RLS 정책
-- 모든 사용자가 academies를 조회할 수 있음 (학원 목록 표시용)
CREATE POLICY "Anyone can view academies" ON academies
  FOR SELECT USING (true);

-- academy_users RLS 정책
-- 사용자는 자신의 row만 조회 가능
CREATE POLICY "Users can view their own academy_users" ON academy_users
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 user_id로만 insert 가능
CREATE POLICY "Users can insert their own academy_users" ON academy_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 row만 update 가능
CREATE POLICY "Users can update their own academy_users" ON academy_users
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 row만 delete 가능
CREATE POLICY "Users can delete their own academy_users" ON academy_users
  FOR DELETE USING (auth.uid() = user_id);


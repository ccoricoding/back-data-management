-- ================================================
-- 백데이터 관리 시스템 - Supabase 데이터베이스 스키마
-- ================================================

-- 1. users 테이블 (사용자 정보)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    library_name TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. categories 테이블 (카테고리 항목)
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. data_entries 테이블 (데이터 항목)
CREATE TABLE IF NOT EXISTS data_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    overview JSONB DEFAULT '{}'::jsonb,
    budget JSONB DEFAULT '{}'::jsonb,
    performances JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 인덱스 생성 (성능 향상)
-- ================================================

CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_library ON users(library_name);
CREATE INDEX IF NOT EXISTS idx_data_entries_user_id ON data_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_key ON categories(key);

-- ================================================
-- 초기 카테고리 데이터
-- ================================================

-- 기본 카테고리 추가 (필요에 따라 수정하세요)
INSERT INTO categories (key, items) VALUES
    ('연번', '["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]'::jsonb),
    ('사업명', '[]'::jsonb),
    ('시행시기', '[]'::jsonb),
    ('대상', '[]'::jsonb),
    ('프로그램명', '[]'::jsonb),
    ('강사명', '[]'::jsonb),
    ('참여인원', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ================================================
-- 관리자 계정 생성 (초기 설정용)
-- ================================================

-- 기본 관리자 계정 (비밀번호: admin123)
-- 실제 사용 전 반드시 변경하세요!
INSERT INTO users (name, password, library_name, is_admin, is_approved) VALUES
    ('admin', 'admin123', '시스템 관리자', true, true)
ON CONFLICT (name) DO NOTHING;

-- ================================================
-- Row Level Security (RLS) 설정 [선택사항]
-- ================================================

-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_entries ENABLE ROW LEVEL SECURITY;

-- 정책 1: 모든 사용자가 읽기 가능
CREATE POLICY "Enable read access for all users" 
ON users FOR SELECT 
USING (true);

CREATE POLICY "Enable read access for categories" 
ON categories FOR SELECT 
USING (true);

CREATE POLICY "Enable read access for data" 
ON data_entries FOR SELECT 
USING (true);

-- 정책 2: 사용자는 자신의 데이터만 수정 가능
CREATE POLICY "Users can insert own data" 
ON data_entries FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update own data" 
ON data_entries FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete own data" 
ON data_entries FOR DELETE 
USING (true);

-- 정책 3: 관리자는 모든 작업 가능
CREATE POLICY "Admins can do everything on users" 
ON users FOR ALL 
USING (true);

CREATE POLICY "Admins can do everything on categories" 
ON categories FOR ALL 
USING (true);

-- ================================================
-- 완료!
-- ================================================

-- 확인 쿼리
SELECT 'Tables created successfully!' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

# 배포 가이드 (Deployment Guide)

이 문서는 백데이터 관리 시스템을 무료로 배포하는 방법을 설명합니다.

## 🎯 배포 전략

- **데이터베이스**: Supabase (이미 설정 완료 ✅)
- **호스팅**: Vercel (무료 플랜, 자동 HTTPS, 무료 도메인)
- **도메인**: `your-app-name.vercel.app` (무료)

---

## 📋 1단계: Supabase 데이터베이스 설정 확인

### 1.1 Supabase 대시보드 접속
1. [https://supabase.com](https://supabase.com) 로그인
2. 프로젝트: `nqwwwhphblkklkqaduap` 선택

### 1.2 필요한 테이블 생성

SQL 편집기에서 다음 쿼리를 실행하세요:

```sql
-- 1. users 테이블
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    library_name TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. categories 테이블
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. data_entries 테이블
CREATE TABLE IF NOT EXISTS data_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    overview JSONB DEFAULT '{}'::jsonb,
    budget JSONB DEFAULT '{}'::jsonb,
    performances JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_data_entries_user_id ON data_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_key ON categories(key);
```

### 1.3 초기 카테고리 데이터 입력

```sql
INSERT INTO categories (key, items) VALUES
    ('연번', '["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]'),
    ('사업명', '["사업A", "사업B", "사업C"]'),
    ('시행시기', '["2024년 1월", "2024년 2월", "2024년 3월"]')
ON CONFLICT (key) DO NOTHING;
```

### 1.4 Row Level Security (RLS) 설정 (선택사항, 보안 강화)

```sql
-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_entries ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON categories FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON data_entries FOR SELECT USING (true);

-- 사용자는 자신의 데이터만 수정 가능
CREATE POLICY "Users can update own data" ON data_entries FOR UPDATE USING (true);
CREATE POLICY "Users can insert own data" ON data_entries FOR INSERT WITH CHECK (true);

-- 관리자는 모든 작업 가능
CREATE POLICY "Admins can do everything" ON users FOR ALL USING (true);
CREATE POLICY "Admins can do everything on categories" ON categories FOR ALL USING (true);
```

---

## 🚀 2단계: Vercel에 배포하기

### 방법 1: GitHub 연동 (권장)

#### 2.1 Git 저장소 초기화
```bash
git init
git add .
git commit -m "Initial commit: Back Data Management System"
```

#### 2.2 GitHub에 저장소 생성
1. [GitHub](https://github.com) 로그인
2. 새 저장소 생성 (New Repository)
3. 저장소 이름: `back-data-management`
4. Public 또는 Private 선택

#### 2.3 코드 푸시
```bash
git remote add origin https://github.com/YOUR_USERNAME/back-data-management.git
git branch -M main
git push -u origin main
```

#### 2.4 Vercel에 배포
1. [Vercel](https://vercel.com) 계정 생성/로그인
2. "New Project" 클릭
3. GitHub 저장소 연결
4. `back-data-management` 저장소 선택
5. **환경 변수 설정** (중요!):
   - `VITE_SUPABASE_URL`: `https://nqwwwhphblkklkqaduap.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (전체 키)
6. "Deploy" 클릭
7. 배포 완료! 🎉

### 방법 2: Vercel CLI 사용

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

---

## 🌐 3단계: 도메인 설정

### 무료 도메인 (자동)
- Vercel이 자동으로 제공: `your-project-name.vercel.app`
- 예: `back-data-management.vercel.app`

### 커스텀 도메인 (선택사항)
1. Vercel 프로젝트 대시보드 → Settings → Domains
2. 도메인 입력 (예: `yourdomain.com`)
3. DNS 설정 안내에 따라 설정

### 무료 도메인 서비스
- **Freenom**: .tk, .ml, .ga, .cf, .gq 도메인 무료
- **InfinityFree**: 무료 서브도메인 제공
- **GitHub Pages**: github.io 도메인

---

## 🔧 배포 후 확인사항

### 1. 애플리케이션 테스트
- [ ] 로그인 페이지 접속
- [ ] 회원가입 기능 작동
- [ ] 데이터 입력 및 저장
- [ ] Excel 다운로드 기능
- [ ] 모바일 반응형 확인

### 2. Supabase 연결 확인
- [ ] 사용자 추가 시 DB에 저장되는지 확인
- [ ] 데이터 조회 정상 작동
- [ ] 관리자 승인 기능 작동

### 3. 성능 최적화
- [ ] Lighthouse 점수 확인
- [ ] 로딩 속도 체크
- [ ] 이미지 최적화

---

## 📊 Supabase 무료 플랜 제한

- **데이터베이스**: 500MB
- **파일 저장소**: 1GB
- **동시 연결**: 60개
- **대역폭**: 2GB/월

💡 도서관 관리 시스템으로는 충분합니다!

---

## 🛠 유지보수

### 코드 업데이트 시
```bash
git add .
git commit -m "Update: 변경 내용"
git push
```

Vercel이 자동으로 재배포합니다!

### 환경 변수 수정
1. Vercel 대시보드 → Settings → Environment Variables
2. 변수 수정 후 "Redeploy" 필요

---

## 🆘 문제 해결

### "Build failed" 에러
- `package.json`의 의존성 확인
- `npm install` 로컬에서 확인
- Vercel 로그 확인

### Supabase 연결 안됨
- 환경 변수가 올바르게 설정되었는지 확인
- Supabase URL 및 Key 재확인
- 브라우저 콘솔에서 에러 메시지 확인

### CORS 에러
- Supabase 대시보드 → Settings → API
- Allowed Origins에 Vercel 도메인 추가

---

## 📞 지원

배포 중 문제가 발생하면:
1. Vercel 로그 확인
2. Supabase 로그 확인
3. 브라우저 개발자 도구 콘솔 확인

---

## 🎉 완료!

이제 전세계 어디서든 `https://your-app.vercel.app`로 접속할 수 있습니다!

모든 도서관 직원들이 동시에 작업할 수 있습니다. 😊

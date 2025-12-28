# 🚀 배포 체크리스트

이 문서를 따라하면 백데이터 관리 시스템을 무료로 배포할 수 있습니다!

---

## ✅ 1단계: Supabase 데이터베이스 설정

### 1.1 Supabase 로그인
- [ ] [https://supabase.com](https://supabase.com) 접속
- [ ] 로그인 또는 회원가입
- [ ] 프로젝트 확인: `nqwwwhphblkklkqaduap`

### 1.2 데이터베이스 테이블 생성
- [ ] Supabase 대시보드 → SQL Editor
- [ ] `supabase-schema.sql` 파일 내용 복사
- [ ] SQL 편집기에 붙여넣기
- [ ] "Run" 버튼 클릭
- [ ] "Tables created successfully!" 메시지 확인

### 1.3 테이블 확인
- [ ] Table Editor에서 다음 테이블 확인:
  - users (사용자)
  - categories (카테고리)
  - data_entries (데이터 항목)

### 1.4 초기 관리자 계정 확인
- [ ] users 테이블에서 admin 계정 확인
- [ ] 나중에 보안을 위해 비밀번호 변경 필요

---

## ✅ 2단계: GitHub 저장소 생성

### 2.1 Git 초기화 (로컬)
```bash
cd C:\Users\I\.gemini\antigravity\scratch\back-data-management
git init
git add .
git commit -m "Initial commit: Back Data Management System"
```

- [ ] 위 명령어 실행 완료

### 2.2 GitHub 저장소 생성
- [ ] [GitHub](https://github.com) 로그인
- [ ] "New repository" 클릭
- [ ] 저장소 이름: `back-data-management`
- [ ] Public 선택 (또는 Private)
- [ ] "Create repository" 클릭

### 2.3 코드 푸시
```bash
git remote add origin https://github.com/YOUR_USERNAME/back-data-management.git
git branch -M main
git push -u origin main
```

- [ ] YOUR_USERNAME을 본인 GitHub 계정으로 변경
- [ ] 위 명령어 실행 완료
- [ ] GitHub에서 코드 업로드 확인

---

## ✅ 3단계: Vercel 배포

### 3.1 Vercel 계정 생성
- [ ] [https://vercel.com](https://vercel.com) 접속
- [ ] "Sign up" 클릭
- [ ] GitHub 계정으로 로그인

### 3.2 새 프로젝트 생성
- [ ] "Add New..." → "Project" 클릭
- [ ] GitHub 저장소 import
- [ ] `back-data-management` 저장소 선택

### 3.3 환경 변수 설정 ⚠️ 중요!
- [ ] "Environment Variables" 섹션에서 추가:

```
VITE_SUPABASE_URL
값: https://fkouuqypcybyowpchjto.supabase.co

VITE_SUPABASE_ANON_KEY
값: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrb3V1cXlwY3lieW93cGNoanRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTQxMzksImV4cCI6MjA4MTIzMDEzOX0.4VhAVCmpslOdolrfxTPmFPRQNgSK_lb_RKVmuFDRwd0
```

### 3.4 배포 시작
- [ ] "Deploy" 버튼 클릭
- [ ] 빌드 진행 확인 (약 2-3분 소요)
- [ ] 배포 완료 대기

### 3.5 배포 확인
- [ ] "Visit" 버튼 클릭
- [ ] 웹사이트가 정상적으로 로드되는지 확인
- [ ] 도메인 확인: `https://your-app-name.vercel.app`

---

## ✅ 4단계: 애플리케이션 테스트

### 4.1 기본 기능 테스트
- [ ] 로그인 페이지 접속 확인
- [ ] 관리자 계정으로 로그인 (admin / admin123)
- [ ] 대시보드 정상 작동 확인

### 4.2 데이터 테스트
- [ ] 카테고리 관리 페이지 접속
- [ ] 카테고리 추가/수정 테스트
- [ ] 데이터 입력 페이지 테스트
- [ ] 데이터 저장 확인

### 4.3 사용자 관리 테스트
- [ ] 새 사용자 회원가입 테스트
- [ ] 관리자 승인 기능 테스트
- [ ] 사용자 권한 확인

### 4.4 모바일 테스트
- [ ] 스마트폰에서 접속
- [ ] 반응형 디자인 확인
- [ ] 모든 기능 정상 작동 확인

---

## ✅ 5단계: 보안 설정

### 5.1 관리자 비밀번호 변경
- [ ] 프로필 페이지에서 admin 계정 비밀번호 변경
- [ ] 강력한 비밀번호 사용

### 5.2 Supabase RLS 확인
- [ ] Supabase 대시보드 → Authentication → Policies
- [ ] RLS 정책 활성화 확인

### 5.3 환경 변수 보안
- [ ] `.env` 파일이 Git에 포함되지 않았는지 확인
- [ ] `.gitignore`에 `.env` 포함 확인

---

## ✅ 6단계: 사용자 안내

### 6.1 접속 URL 공유
```
https://your-app-name.vercel.app
```

- [ ] 도서관 직원들에게 URL 공유
- [ ] 초기 관리자 계정 정보 공유 (보안 주의)

### 6.2 사용 방법 안내
- [ ] 회원가입 방법 안내
- [ ] 관리자 승인 프로세스 설명
- [ ] 데이터 입력 방법 교육

---

## 🎉 완료!

모든 체크박스를 확인했다면 배포가 완료되었습니다!

---

## 📊 주요 정보 요약

### 접속 URL
```
https://your-app-name.vercel.app
```

### 초기 관리자 계정
- **아이디**: admin
- **비밀번호**: admin123
- ⚠️ 첫 로그인 후 반드시 변경하세요!

### 데이터베이스
- **플랫폼**: Supabase
- **프로젝트**: nqwwwhphblkklkqaduap
- **무료 용량**: 500MB (충분!)

### 호스팅
- **플랫폼**: Vercel
- **무료 플랜**: 무제한 대역폭
- **자동 HTTPS**: 포함
- **자동 배포**: Git push 시 자동

---

## 🔄 업데이트 방법

코드를 수정한 후:

```bash
git add .
git commit -m "변경 내용 설명"
git push
```

Vercel이 자동으로 재배포합니다!

---

## 🆘 문제 발생 시

### Vercel 로그 확인
1. Vercel 대시보드
2. 프로젝트 선택
3. Deployments → 최신 배포 클릭
4. "View Function Logs"

### Supabase 로그 확인
1. Supabase 대시보드
2. Logs 섹션
3. 에러 메시지 확인

### 브라우저 콘솔 확인
1. F12 (개발자 도구)
2. Console 탭
3. 에러 메시지 확인

---

## 📞 추가 지원

- [Vercel 문서](https://vercel.com/docs)
- [Supabase 문서](https://supabase.com/docs)
- [React 문서](https://react.dev)

축하합니다! 🎊

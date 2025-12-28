# 🚀 빠른 배포 가이드 (5분 완성!)

가장 빠르게 배포하는 방법을 안내합니다.

---

## 📋 준비물

- GitHub 계정
- Vercel 계정 (GitHub로 로그인 가능)
- Supabase 프로젝트 (이미 있음 ✅)

---

## ⚡ 5분 배포 (GitHub + Vercel)

### 1️⃣ GitHub에 코드 올리기 (2분)

터미널에서 실행:

```bash
cd C:\Users\I\.gemini\antigravity\scratch\back-data-management
git init
git add .
git commit -m "Initial commit"
```

GitHub에서:
1. [github.com/new](https://github.com/new)
2. 저장소 이름: `back-data-management`
3. Create repository

다시 터미널에서:

```bash
git remote add origin https://github.com/YOUR_USERNAME/back-data-management.git
git branch -M main
git push -u origin main
```

### 2️⃣ Supabase 테이블 생성 (1분)

1. [supabase.com](https://supabase.com) 로그인
2. 프로젝트 선택
3. SQL Editor 클릭
4. `supabase-schema.sql` 파일 내용 복사 → 붙여넣기 → Run

### 3️⃣ Vercel에 배포 (2분)

1. [vercel.com](https://vercel.com) → GitHub로 로그인
2. "New Project" 클릭
3. `back-data-management` Import
4. **Environment Variables 추가**:

```
VITE_SUPABASE_URL
https://fkouuqypcybyowpchjto.supabase.co

VITE_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrb3V1cXlwY3lieW93cGNoanRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NTQxMzksImV4cCI6MjA4MTIzMDEzOX0.4VhAVCmpslOdolrfxTPmFPRQNgSK_lb_RKVmuFDRwd0
```

5. "Deploy" 클릭!

---

## 🎉 완료!

2-3분 후 배포 완료!

접속 URL: `https://your-app-name.vercel.app`

### 초기 로그인 정보
- **아이디**: admin
- **비밀번호**: admin123

⚠️ 첫 로그인 후 비밀번호 변경하세요!

---

## 📱 모바일에서도 접속 가능

- iPhone, Android 모두 지원
- 브라우저에서 바로 접속
- 반응형 디자인 자동 적용

---

## 🔄 코드 수정 시

```bash
git add .
git commit -m "업데이트 내용"
git push
```

→ Vercel이 자동으로 재배포! (약 1-2분)

---

## 💰 비용

**완전 무료!** 🎉

- Supabase: 500MB 무료
- Vercel: 무제한 대역폭 무료
- 비용 걱정 없음!

---

## 🆘 문제가 생겼다면?

자세한 가이드 참고:
- `CHECKLIST.md` - 단계별 체크리스트
- `DEPLOYMENT.md` - 상세 배포 가이드

---

**축하합니다! 이제 전세계 어디서든 접속 가능합니다!** 🌍

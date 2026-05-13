# 주소모음(picks) 확장 작업 플랜

> 이 문서는 다음 세션이 한눈에 보고 바로 이어 작업할 수 있도록 작성한 실행 플랜입니다. 추측이 아닌 코드/데이터 측정값 기준입니다.

## 작업 브랜치

`claude/improve-address-search-engagement-HMBcH`

## 핵심 파일

| 파일 | 용도 |
|---|---|
| `src/lib/picks.ts` | 카테고리·항목 데이터 (현 ~16,000줄) |
| `src/app/picks/page.tsx` | 허브 (4개 카테고리 카드) |
| `src/app/picks/[slug]/page.tsx` | 카테고리 페이지 (그룹별 카드 + FAQ) |
| `src/app/picks/[slug]/[hub]/page.tsx` | 개별 항목 상세 페이지 |
| `src/app/picks/layout.tsx` | **알약버튼·상단바로가기 자동 적용** (PicksFloatingButtons 렌더) |
| `src/components/PicksFloatingButtons.tsx` | 우측하단 플로팅 (사주데이 알약 + 상단바로가기) |
| `src/components/Header.tsx` | 상단 네비게이션 (NAV_SECONDARY 에 `/picks` 등록됨) |
| `src/app/sitemap.ts` | listHubs 로 자동 등록 |

## 자동 적용 사실 (별도 작업 불필요)

새 카테고리·항목을 `PICK_CATEGORIES` 에 추가하기만 하면 자동으로:
- `/picks/[slug]` 라우트 생성 (generateStaticParams)
- `/picks/[slug]/[hub]` 라우트 생성 (listHubs)
- sitemap.xml 등록
- 상단 Header "주소모음" 메뉴 active 처리 (pathname startsWith 매칭)
- 우측하단 알약버튼 + 상단바로가기 (picks/layout.tsx 에서 PicksFloatingButtons 렌더)
- JSON-LD (BreadcrumbList, CollectionPage, ItemList, FAQ) 자동 생성
- "🔗 같은 카테고리의 다른 도구" 자동 6개 추천

## 측정 표준 (현 108개 detailContent 항목 기준)

| 필드 | min | median | 새 항목 미니멈 |
|---|---|---|---|
| blurb | 0 | 22 | 18+ 자 |
| details | 0 | 122 | 108+ 자 |
| longIntro | 307 | 399 | **3+ 문단, 307+ 자** |
| features | 161 | 257 | **5+ 항목, 161+ 자** |
| faq | 2,845 | 5,338 | **12+ 항목, 2,845+ 자** |
| startingGuide | 140 | 231 | **정확히 5단계, 140+ 자** |
| koreanContext | 77 | 158 | 77+ 자 |
| pros | 55 | 89 | **4+ 항목, 55+ 자** |
| cons | 49 | 83 | **3+ 항목, 49+ 자** |
| relatedKeywords | 10 | 10 | **정확히 10개** (108/108 항목 동일) |
| pricingPlans | 1 | 1~2 | 1+ 항목 |
| **페이지 총합** | **4,335** | **6,641** | **4,300+ 자** |

## 카테고리 추가 큐 (Phase 1 — 미등록 토픽)

PickItem 0개로 확인된 토픽들. 우선순위 = (검색 의도 강도) × (한국 사용자 활동 빈도) 기준 정성 판단.

### 1. JOBS — 취업·이직 (slug: `jobs`, emoji: 💼)
- 잡코리아 jobkorea.co.kr
- 사람인 saramin.co.kr
- 원티드 wanted.co.kr
- 인크루트 incruit.com
- 리멤버 커리어 rememberapp.co.kr
- 점핏 jumpit.saramin.co.kr (개발자 채용)
- (옵션) HRD-Net hrd.go.kr (국비교육)
- 그룹: 종합 채용 / IT·개발 / 헤드헌팅·경력
- relatedKeywords 후보: "취업 사이트 추천", "이직 사이트 모음", "개발자 채용", "헤드헌팅", "신입 채용", "경력 이직", "이력서 등록", "연봉 조회", "기업 정보", "퇴사 이직"

### 2. REALESTATE — 부동산 (slug: `realestate`, emoji: 🏠)
- 호갱노노 hogangnono.com
- 아실 asil.kr
- 부동산플래닛 bdsplanet.com
- 직방 zigbang.com
- 다방 dabangapp.com
- 네이버 부동산 land.naver.com
- 국토교통부 실거래가 rt.molit.go.kr
- 그룹: 시세·실거래 / 매물 검색 / 공식 공시
- relatedKeywords: "아파트 시세", "실거래가 조회", "부동산 매물", "전세 매물", "월세 매물", "재건축 정보", "청약 정보", "공동주택 공시가격", "부동산 데이터", "동 단위 시세"

### 3. TRAVEL — 여행·항공 (slug: `travel`, emoji: ✈️)
- 스카이스캐너 skyscanner.co.kr
- 구글 플라이트 google.com/travel/flights
- 호텔스컴바인 hotelscombined.co.kr
- 트리바고 trivago.co.kr
- 마이리얼트립 myrealtrip.com
- 와그 waug.com
- 그룹: 항공권 / 호텔 / 투어·액티비티
- relatedKeywords: "최저가 항공권", "호텔 가격 비교", "해외여행 준비", "여행 일정", "현지 투어", "공항버스 예약", "여행자 보험", "환전 우대", "여권 신청", "비자 정보"

### 4. STUDY — 공부·강의 (slug: `study`, emoji: 📚)
- 인프런 inflearn.com
- 패스트캠퍼스 fastcampus.co.kr
- 클래스101 class101.net
- K-MOOC kmooc.kr
- EBS 무료 강의 ebs.co.kr
- Udemy (한국어) udemy.com
- Coursera coursera.org
- 그룹: 한국 강의 플랫폼 / 공공·무료 / 글로벌 MOOC
- relatedKeywords: "온라인 강의 추천", "코딩 강의 무료", "인강 사이트", "자기계발 강의", "K-MOOC 강의", "데이터 분석 강의", "디자인 강의", "직무 교육", "강의 무료 다운", "프로그래밍 인강"

### 5. DATA — 공공데이터·통계 (slug: `data`, emoji: 📊)
- KOSIS 국가통계포털 kosis.kr
- 공공데이터포털 data.go.kr
- 한국은행 ECOS ecos.bok.or.kr
- 통계청 통계로 stat.kostat.go.kr
- e-나라지표 index.go.kr
- 그룹: 통계 포털 / 경제 데이터 / 공공 API
- relatedKeywords: "공공데이터 다운", "KOSIS 통계", "ECOS 데이터", "한국 경제 지표", "통계청 자료", "정부 통계", "공공 API 무료", "데이터 분석 자료", "GDP 자료", "물가 통계"

### 6. LAW — 법률 (slug: `law`, emoji: ⚖️)
- 국가법령정보센터 law.go.kr
- 찾기쉬운 생활법령정보 easylaw.go.kr
- 대법원 종합법률정보 glaw.scourt.go.kr
- 대한법률구조공단 klac.or.kr
- 헌법재판소 ccourt.go.kr
- 그룹: 법령·판례 / 무료 법률상담 / 헌법·행정
- relatedKeywords: "법령 검색 무료", "판례 검색", "무료 법률 상담", "민사소송 절차", "임대차 분쟁", "근로기준법", "교통사고 합의", "이혼 절차", "상속법", "내용증명 양식"

### 7. HEALTH — 의료·병원 조회 (slug: `health`, emoji: 🏥)
- 건강보험심사평가원 병원찾기 hira.or.kr
- 약학정보원 health.kr
- 식약처 의약품안전나라 nedrug.mfds.go.kr
- 굿닥 goodoc.co.kr
- 똑닥 ddocdoc.com
- 그룹: 공식 의료 정보 / 병원 예약 / 의약품 검색
- relatedKeywords: "병원 검색", "약 정보 검색", "비급여 진료비", "건강검진 결과 조회", "예방접종 기록", "병원 예약 앱", "응급실 위치", "의료비 환급", "건강iN", "의약품 안전성"

### 8. DEV — 개발자 도구 (slug: `dev`, emoji: 💻)
- Stack Overflow stackoverflow.com
- MDN Web Docs developer.mozilla.org
- DevDocs devdocs.io
- Figma figma.com
- Photopea photopea.com
- TinyPNG tinypng.com
- remove.bg remove.bg
- Pixlr pixlr.com
- Vercel vercel.com
- Netlify netlify.com
- Cloudflare cloudflare.com
- 그룹: 학습·레퍼런스 / 디자인 무료 / 이미지 유틸리티 / 호스팅·배포
- relatedKeywords: "개발자 도구", "Figma 무료", "이미지 압축 무료", "배경 제거 무료", "포토샵 무료 대안", "정적 사이트 호스팅", "MDN 한국어", "프로그래밍 레퍼런스", "디자인 협업", "무료 SSL"

## Phase 2 — 기존 카테고리 보강 (각 카테고리 PickItem 추가)

### AI (+4)
- Microsoft Copilot (copilot.microsoft.com) → 챗봇 그룹
- NotebookLM (notebooklm.google.com) → 번역/문서 그룹
- Luma Dream Machine (lumalabs.ai) → 영상 생성 그룹
- Mistral Le Chat (chat.mistral.ai) → 챗봇 그룹

### COIN (+4)
- Nansen (nansen.ai) → 온체인 그룹
- Messari (messari.io) → 시세/데이터 그룹
- Arkham (arkhamintelligence.com) → 온체인 그룹
- Lookonchain (lookonchain.com) → 온체인 그룹

### FREE (+4)
- Figma (figma.com) → PPT/디자인 도구
- Photopea (photopea.com) → PPT/디자인 도구
- remove.bg → 사진/영상
- TinyPNG → 사진/영상

### MONEY (+3)
- 손택스 (모바일 홈택스) m.hometax.go.kr
- 통신요금 정보포털 미환급금 wise.msit.go.kr
- 휴면계좌 통합조회 (전국은행연합회) sleepmoney.kfb.or.kr

## 작업 절차 (카테고리당)

1. `picks.ts` 에 `PickCategorySlug` 타입에 새 슬러그 추가
2. 새 카테고리 객체 작성: title, metaTitle, shortTitle, emoji, oneLiner, description, longIntro(3+문단), selectionCriteria(3+개), groups(2~4개), faq(8+개), relatedKeywords(10개), updatedAt
3. 각 PickItem 작성:
   - name, url, blurb, details, useCases(3+), pricing, alternatives, founded, korean, hubSlug
   - detailContent: longIntro(3문단), features(5+), pricingPlans(1+), pros(4+), cons(3+), koreanContext, startingGuide(5), faq(12+), relatedKeywords(10)
4. `PICK_CATEGORIES` 배열에 추가
5. `PICK_BY_SLUG` 객체에 추가
6. `npm run build` 로 타입체크 + 정적 빌드 확인
7. 커밋 + push to `claude/improve-address-search-engagement-HMBcH`

## 가독성·동선 강화 추가 작업 (Phase 3 — 선택)

데이터 추가 외에 페이지 구조 개선이 필요한 경우만:
- 카테고리 페이지(`/picks/[slug]`) 의 그룹 목차 nav 가 그룹 1개면 숨겨짐 — 새 카테고리도 그룹 2개 이상으로 설계해 목차 노출
- 개별 페이지(`/picks/[slug]/[hub]`) 의 "같은 카테고리 다른 도구" 6개 추천은 같은 그룹 내에서만 → 그룹이 작으면 추천 적음. 그룹 항목 4개 이상 권장
- `tip` 필드 0개 — 새 항목에 채워서 hub 페이지 `TipSection` 활용

## 빌드/배포 노트

- `next.config.mjs` 에 `output: "export"` 없음. README 는 GitHub Pages 정적 배포 명시. 현재 Vercel SSR 가능성 — push 전 동작 확인 필요
- `/picks` 와 `/picks/[slug]` 에 `dynamic = "force-dynamic"` + `revalidate = 0` 적용. SSR 환경 기준. 정적 export 라면 빌드 실패할 수 있음

## 진행 상태 (다음 세션이 이어받을 때 체크)

- [ ] Phase 1.1 JOBS
- [ ] Phase 1.2 REALESTATE
- [ ] Phase 1.3 TRAVEL
- [ ] Phase 1.4 STUDY
- [ ] Phase 1.5 DATA
- [ ] Phase 1.6 LAW
- [ ] Phase 1.7 HEALTH
- [ ] Phase 1.8 DEV
- [ ] Phase 2.1 AI 보강 (+4)
- [ ] Phase 2.2 COIN 보강 (+4)
- [ ] Phase 2.3 FREE 보강 (+4)
- [ ] Phase 2.4 MONEY 보강 (+3)

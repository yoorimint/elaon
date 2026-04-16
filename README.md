# eloan — 코인 백테스트 & 커뮤니티

업비트 공개 데이터로 코인 전략을 백테스트하고, 결과를 공유·토론하는 플랫폼.

## 스택

- Next.js 14 (App Router, static export)
- TypeScript + Tailwind CSS
- Recharts
- Supabase (예정: 커뮤니티)
- GitHub Pages 배포 (CNAME: `eloan.kr`)

## 개발

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인.

## 빌드

```bash
npm run build
```

`out/` 디렉토리에 정적 파일 생성. `main` 브랜치에 푸시하면 GitHub Actions가
자동으로 GitHub Pages에 배포합니다.

## 구조

```
src/
├── app/
│   ├── page.tsx              # 랜딩
│   ├── backtest/page.tsx     # 백테스트 입력/실행
│   └── layout.tsx, globals.css
├── components/
│   └── ResultView.tsx        # 결과 차트 + 거래 내역
└── lib/
    ├── upbit.ts              # 업비트 REST API 래퍼
    ├── strategies.ts         # SMA/RSI 계산, 시그널 생성
    ├── backtest.ts           # 엔진 (수수료, MDD, 승률)
    └── cn.ts
```

## 로드맵

- [x] MVP: 업비트 KRW 마켓 + 3개 전략(바이홀드/이평크로스/RSI)
- [ ] 결과 공유 링크 (Supabase에 저장 후 슬러그 URL)
- [ ] 사용자 로그인 (Supabase Auth)
- [ ] 커뮤니티 게시판 (결과 임베드)
- [ ] 전략 랭킹, 복수 코인 비교

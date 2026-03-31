# 정부 지원금 블로그 자동화 (eloan.kr)

## 전체 흐름

```
키워드 수집 → 글 생성(Gemini, 섹션별 5000자+) → AI 탐지 검사 → 팩트체크 → 링크 체크 → 썸네일 생성 → GitHub push → 자동 배포
```

## 설치

```bash
pip install -r requirements.txt
```

## 사전 준비

`config.py`를 열고 아래 항목 입력:

### 1. Gemini API 키 (필수)
- https://aistudio.google.com/apikey 에서 무료 발급
- `GEMINI_API_KEY`에 입력

### 2. GitHub Personal Access Token (필수)
- GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
- 권한: `repo` 체크
- `GITHUB_TOKEN`에 입력
- `GITHUB_REPO`에 "유저명/레포명" 입력

### 3. Google Custom Search API (선택 - 팩트체크용)
- https://console.cloud.google.com 에서 Custom Search API 활성화
- 없으면 팩트체크 건너뛰어짐

### 4. 정부24 API (선택 - 자동 키워드 수집)
- https://www.data.go.kr 에서 API 신청
- 없으면 수동 키워드 리스트 사용

## 사용법

```bash
# 로컬 테스트 (GitHub push 없이)
python main.py --no-upload

# 특정 키워드
python main.py --keyword "2026 디딤돌대출 조건" --no-upload

# 5개 글 한번에
python main.py --count 5 --no-upload

# 실제 GitHub push (config.py 설정 완료 후)
python main.py --keyword "2026 디딤돌대출 조건"

# 정부24 API로 키워드 자동 수집
python main.py --api --count 3
```

## 파일 구조

```
blog_automation/
├── config.py              # API 키, 설정값
├── keyword_fetcher.py     # 키워드 수집
├── content_generator.py   # Gemini 섹션별 글 생성 (5000자+)
├── fact_checker.py        # 팩트체크
├── link_checker.py        # 링크 상태 확인
├── thumbnail.py           # Pillow 썸네일 생성
├── github_uploader.py     # GitHub API push + 블로그 목록 관리
├── main.py                # 전체 파이프라인 실행
└── requirements.txt       # 패키지 목록
```

## 사이트 구조 (push 후)

```
eloan.kr/
├── index.html              (계산기)
├── didimdol.html           (디딤돌 계산기)
├── blog/
│   ├── index.html          (글 목록 - 자동 생성)
│   ├── posts.json          (글 데이터 - 자동 관리)
│   ├── images/             (썸네일)
│   └── 2026-디딤돌대출-조건-총정리.html
```

## 커스터마이징

- **키워드 추가**: `keyword_fetcher.py` → `get_manual_keywords()`
- **글 톤/스타일**: `content_generator.py` → 프롬프트 수정
- **썸네일 디자인**: `config.py` → `THUMBNAIL_*` 값
- **블로그 디자인**: `github_uploader.py` → `build_blog_html()` 수정

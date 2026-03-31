"""
자동 글 작성 스크립트 (GitHub Actions용)
- Gemini API로 주제 추천 → 글 생성 → GitHub 커밋
- 카테고리별 순차 작성
- 중복 체크 (posts.json 기반)
"""

import requests
import json
import re
import os
import base64
from datetime import datetime

# 환경변수에서 키 읽기
GEMINI_KEY = os.environ.get('GEMINI_API_KEY', '')
GITHUB_TOKEN = os.environ.get('GH_TOKEN', '')
GITHUB_REPO = os.environ.get('GH_REPO', 'yoorimint/elaon')
BLOG_DIR = 'blog'
SITE_URL = 'https://eloan.kr'
SITE_NAME = '지원금 가이드 | eloan.kr'

# 설정 파일에서 읽기
def load_settings():
    path = os.path.join(os.path.dirname(__file__), 'auto_settings.json')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'count': 3, 'cats': ['지원금', '절약', '재테크']}


def call_gemini(prompt):
    """Gemini API 호출"""
    models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest']
    for model in models:
        try:
            resp = requests.post(
                f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                params={'key': GEMINI_KEY},
                json={
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {'temperature': 0.8, 'topP': 0.95, 'maxOutputTokens': 8192}
                },
                timeout=60
            )
            if resp.status_code == 429:
                print(f'  {model} 429 rate limit, trying next...')
                continue
            if resp.status_code == 404:
                print(f'  {model} 404, trying next...')
                continue
            resp.raise_for_status()
            data = resp.json()
            text = data['candidates'][0]['content']['parts'][0]['text']
            usage = data.get('usageMetadata', {})
            print(f'  {model} OK (tokens: {usage.get("totalTokenCount", "?")})')
            return text
        except Exception as e:
            print(f'  {model} error: {e}')
            continue
    raise Exception('All models failed')


def github_get(path):
    """GitHub API GET"""
    resp = requests.get(
        f'https://api.github.com/repos/{GITHUB_REPO}/contents/{path}',
        headers={'Authorization': f'token {GITHUB_TOKEN}', 'Accept': 'application/vnd.github.v3+json'},
        timeout=10
    )
    if resp.ok:
        data = resp.json()
        content = base64.b64decode(data['content']).decode('utf-8')
        return {'content': content, 'sha': data['sha']}
    return None


def github_put(path, content, message, sha=None):
    """GitHub API PUT"""
    body = {
        'message': message,
        'content': base64.b64encode(content.encode('utf-8')).decode('utf-8'),
        'branch': 'main'
    }
    if sha:
        body['sha'] = sha
    resp = requests.put(
        f'https://api.github.com/repos/{GITHUB_REPO}/contents/{path}',
        headers={'Authorization': f'token {GITHUB_TOKEN}', 'Content-Type': 'application/json'},
        json=body,
        timeout=15
    )
    resp.raise_for_status()
    print(f'  GitHub PUT {path} OK')


def load_posts():
    """posts.json 로드"""
    result = github_get(f'{BLOG_DIR}/posts.json')
    if result:
        return json.loads(result['content']), result['sha']
    return [], None


def is_duplicate(posts, keyword):
    """중복 체크 (같은 연도)"""
    year = str(datetime.now().year)
    for p in posts:
        if p.get('keyword') and (keyword in p['keyword'] or p['keyword'] in keyword):
            if p.get('title') and year in p['title']:
                return True
    return False


def make_slug(title):
    slug = re.sub(r'[^\w가-힣\s-]', '', title)
    slug = re.sub(r'\s+', '-', slug.strip())
    return slug[:80]


def get_topic(cat, existing_titles):
    """Gemini로 주제 추천 (카테고리별)"""
    year = datetime.now().year

    cat_context = {
        '지원금': f'정부 지원금, 보조금, 수당, 급여, 장려금 등 실제 존재하는 제도. "{year} OOO 자격조건 신청방법 총정리" 형태.',
        '절약': f'생활비 절약, 세금 줄이기, 통신비/보험료/구독료 절감, 할인 꿀팁 등. "{year} OOO 방법 꿀팁 비교 총정리" 형태. 정부 제도가 아닌 실생활 팁.',
        '재테크': f'적금, ETF, 주식, 부업, 저축 등 재테크 정보. "{year} OOO 비교 추천 수익률 총정리" 형태. 없는 정부 프로그램 금지. 실제 금융 상품/방법만.',
    }

    prompt = f"""한국에서 "{cat}" 분야로 사람들이 많이 검색하는 주제를 5개 추천해줘.
{cat_context.get(cat, '')}
각 주제는 블로그 글 제목으로 쓸 수 있는 롱테일 키워드 형태로.
이미 작성된 주제는 제외: {', '.join(existing_titles[-20:])}
연도는 {year}년 기준.
반드시 JSON 배열로만 응답: ["주제1","주제2","주제3","주제4","주제5"]"""

    resp = call_gemini(prompt)
    clean = re.sub(r'```json\s*', '', resp)
    clean = re.sub(r'```\s*', '', clean).strip()
    topics = json.loads(clean)
    return topics


def generate_post(keyword, cat):
    """글 생성"""
    year = datetime.now().year
    today = datetime.now().strftime('%Y-%m-%d')

    # 카테고리별 프롬프트
    cat_config = {
        '지원금': {
            'role': '정부 지원금/공공서비스 전문 블로거',
            'title_pattern': f'{year} {keyword} 자격조건 신청방법 지원금액 총정리',
            'structure': '1) 이 제도란? (개요+핵심 수치) 2) 지원대상 및 자격조건 (<table>) 3) 지원내용 및 금액 4) 신청방법 및 필요서류 5) FAQ 5개 이상',
            'extra': f'글 마지막에 "문의 및 신청" 섹션: 공식 사이트 URL+전화번호.\n정보 출처는 기관명으로만 언급.'
        },
        '절약': {
            'role': '생활 절약/살림 전문 블로거',
            'title_pattern': f'{year} {keyword} 방법 꿀팁 비교 총정리',
            'structure': '1) 핵심 요약 (얼마나 절약 가능한지) 2) 구체적 실천 방법 (단계별, 숫자로) 3) 실제 사례/비교 (Before vs After) 4) 주의점 및 흔한 실수 5) 추가 팁+FAQ',
            'extra': '글 마지막에 "핵심 요약" 섹션: 효과 큰 실천법 3가지.\n이 주제는 정부 제도가 아님. "신청방법","자격조건","지원금액" 표현 금지.\n구체적 금액 제시 (예: "월 15만원 절약").'
        },
        '재테크': {
            'role': '재테크/투자 정보 전문 블로거',
            'title_pattern': f'{year} {keyword} 비교 추천 수익률 총정리',
            'structure': '1) 핵심 개념 (초보도 이해) 2) 상품/방법 비교 (<table>) 3) 수익률/장단점 분석 4) 시작 방법 (단계별) 5) 리스크+FAQ',
            'extra': '글 마지막에 "시작 가이드": 초보자 1-2-3 단계.\n이 주제는 정부 제도가 아님. "신청방법","자격조건" 금지.\n투자 위험 고지 필수. 실존 상품명만 사용.'
        }
    }
    cc = cat_config.get(cat, cat_config['지원금'])

    prompt = f"""당신은 한국 {cc['role']}이자 SEO 전문가입니다.

[중요] 오늘 날짜: {today}. 현재 연도는 {year}년입니다. 과거 연도가 아닌 {year}년 기준으로 작성하세요.

주제: {keyword}
카테고리: {cat}

===JSON_START===
{{
  "title": "SEO 롱테일 키워드 제목 (40~60자, {year}년 포함, 예: '{cc['title_pattern']}')",
  "meta_description": "155자 이내 메타 설명",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]
}}
===JSON_END===
===HTML_START===
본문 HTML
===HTML_END===

[본문 규칙]
1. HTML 태그 (<h2>, <h3>, <p>, <ul>, <li>, <table>) 사용
2. 섹션 구조: {cc['structure']}
3. 6000자 이상
4. 구어체 ("~해요", "~거든요"). 과하게 친절하거나 감탄하지 말 것
5. 첫 문장에서 바로 핵심 정보. 서론 인사/자기소개 금지
6. 절대 금지: "알아보겠습니다", "이는", "또한,", "아울러,", "결론적으로", "마무리하며", "도움이 되셨기를", "~하는 것이 중요합니다", 블로거 캐릭터. "이는" 절대 금지.
7. <table>: <thead>+<tbody> 필수, <th>에 인라인 스타일 금지, overflow-x:auto 래퍼
8. 시각적 요소 5~8개 자유 배치 (그라데이션 카드, 프로그레스 바, 도넛 차트, 타임라인, 비교 카드 등). 매번 다른 조합/색상. 인라인 style 사용.
9. {year}년 기준. 과거 기준이면 "({year}년 확인 필요)" 표기
10. 실존하지 않는 제도/기관/URL 절대 금지
{cc['extra']}"""

    resp = call_gemini(prompt)

    # 파싱
    json_match = re.search(r'===JSON_START===(.*?)===JSON_END===', resp, re.DOTALL)
    html_match = re.search(r'===HTML_START===(.*?)===HTML_END===', resp, re.DOTALL)

    if json_match:
        meta = json.loads(json_match.group(1).strip())
        title = meta.get('title', keyword)
        meta_desc = meta.get('meta_description', keyword)
        tags = meta.get('tags', [])
    else:
        title = f'{year} {keyword}'
        meta_desc = keyword
        tags = [keyword]

    content = html_match.group(1).strip() if html_match else re.sub(r'===JSON_START===.*?===JSON_END===', '', resp, flags=re.DOTALL).strip()
    content = re.sub(r'```html\s*', '', content)
    content = re.sub(r'```\s*', '', content)

    return {
        'title': title,
        'content': content,
        'meta_description': meta_desc,
        'tags': tags,
        'keyword': keyword,
        'category': cat
    }


def build_post_html(article):
    """글 HTML 생성"""
    t = article['title']
    c = article['content']
    md = article['meta_description']
    kw = article['keyword']
    tags_html = '\n'.join([f'<span class="article-tag">{tag}</span>' for tag in article.get('tags', [])])
    now = datetime.now()
    date_str = now.strftime('%Y.%m.%d')
    slug = make_slug(t)
    text_only = re.sub(r'<[^>]+>', '', c)
    read_min = max(1, len(text_only) // 500)

    html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{t} | {SITE_NAME}</title>
<meta name="description" content="{md}">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{md}">
<meta property="og:type" content="article">
<link rel="canonical" href="{SITE_URL}/{BLOG_DIR}/{slug}.html">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-SDY3EXP31H"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-SDY3EXP31H');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{{--navy:#0D1B3E;--blue:#2563EB;--gold:#B8860B;--gold-light:#D4A933;--bg:#FAFBFC;--white:#FFF;--text:#1F2937;--text-sub:#4B5563;--text-muted:#9CA3AF;--border:#E5E7EB;--border-light:#F3F4F6}}*{{margin:0;padding:0;box-sizing:border-box}}body{{font-family:"Noto Sans KR",-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.8}}.topbar{{background:var(--navy);padding:10px 0;border-bottom:2px solid var(--gold)}}.topbar-inner{{max-width:800px;margin:0 auto;padding:0 24px;display:flex;justify-content:space-between;align-items:center}}.topbar-logo{{color:#fff;text-decoration:none;font-size:16px;font-weight:700}}.topbar-logo span{{color:var(--gold-light);font-weight:300;font-size:11px;margin-left:8px}}.topbar-nav a{{color:rgba(255,255,255,.7);text-decoration:none;font-size:12px;margin-left:16px}}.breadcrumb{{max-width:800px;margin:0 auto;padding:14px 24px;font-size:12px;color:var(--text-muted)}}.breadcrumb a{{color:var(--text-muted);text-decoration:none}}.breadcrumb span{{margin:0 6px}}.article-header{{max-width:800px;margin:0 auto;padding:8px 24px 32px}}.article-category{{display:inline-block;font-size:12px;font-weight:600;color:var(--blue);background:#EFF6FF;padding:3px 10px;border-radius:3px;margin-bottom:14px}}.article-header h1{{font-size:28px;font-weight:700;color:var(--navy);line-height:1.4;margin-bottom:16px}}.article-meta-bar{{display:flex;align-items:center;gap:16px;padding-top:16px;border-top:1px solid var(--border);font-size:13px;color:var(--text-muted)}}.dot{{width:3px;height:3px;border-radius:50%;background:var(--text-muted)}}.article-layout{{max-width:800px;margin:0 auto;padding:0 24px 60px}}.article-content h2{{font-size:20px;font-weight:700;color:var(--navy);margin:40px 0 16px;padding-bottom:10px;border-bottom:1px solid var(--border)}}.article-content h2:first-child{{margin-top:0}}.article-content h3{{font-size:16px;font-weight:600;margin:28px 0 10px}}.article-content p{{font-size:15px;color:var(--text-sub);margin-bottom:16px;line-height:1.9;word-break:keep-all}}.article-content strong{{color:var(--navy);font-weight:600}}.article-content ul,.article-content ol{{margin:14px 0 18px;padding:0;list-style:none}}.article-content ul li{{position:relative;padding-left:16px;margin-bottom:8px;font-size:15px;color:var(--text-sub)}}.article-content ul li::before{{content:"—";position:absolute;left:0;color:var(--gold);font-weight:700}}.article-content ol{{counter-reset:item}}.article-content ol li{{counter-increment:item;position:relative;padding-left:28px;margin-bottom:12px;font-size:15px;color:var(--text-sub)}}.article-content ol li::before{{content:counter(item);position:absolute;left:0;top:3px;width:20px;height:20px;border:1.5px solid var(--navy);border-radius:50%;font-size:11px;font-weight:600;color:var(--navy);display:flex;align-items:center;justify-content:center}}.article-content table{{width:100%;border-collapse:collapse;margin:16px 0 20px;font-size:14px}}.article-content thead{{background:#0D1B3E!important}}.article-content th{{background:#0D1B3E!important;color:#ffffff!important;font-weight:600;padding:11px 16px;text-align:left;font-size:13px}}.article-content td{{padding:11px 16px;border-bottom:1px solid var(--border-light);color:var(--text-sub)}}.article-content tr:nth-child(even) td{{background:#F9FAFB}}.article-tags{{display:flex;flex-wrap:wrap;gap:6px;margin-top:40px;padding-top:20px;border-top:1px solid var(--border)}}.article-tag{{font-size:12px;color:var(--text-muted);background:var(--border-light);padding:3px 10px;border-radius:3px}}.footer{{background:var(--navy);padding:32px 0;margin-top:40px}}.footer-inner{{max-width:800px;margin:0 auto;padding:0 24px;text-align:center}}.footer p{{font-size:12px;color:rgba(255,255,255,.5);line-height:1.9}}.footer a{{color:rgba(255,255,255,.7);text-decoration:none}}
</style>
</head>
<body>
<div class="topbar"><div class="topbar-inner"><a href="{SITE_URL}" class="topbar-logo">eloan.kr<span>지원금 가이드</span></a><nav class="topbar-nav"><a href="{SITE_URL}">홈</a><a href="{SITE_URL}/{BLOG_DIR}/">가이드</a></nav></div></div>
<div class="breadcrumb"><a href="{SITE_URL}">홈</a><span>›</span><a href="{SITE_URL}/{BLOG_DIR}/">가이드</a><span>›</span>{kw}</div>
<div class="article-header"><div class="article-category">{article.get('category', '지원금')}</div><h1>{t}</h1><div class="article-meta-bar"><span>{date_str}</span><div class="dot"></div><span>eloan.kr</span><div class="dot"></div><span>읽는 시간 약 {read_min}분</span></div></div>
<div class="article-layout"><article class="article-content">
{c}
<div class="article-tags">{tags_html}</div>
<div style="margin-top:32px;padding:16px 18px;background:#FEF3C7;border-radius:8px;font-size:12px;color:#92400E;line-height:1.7;">이 글은 공공데이터와 AI를 활용해 작성되었습니다. 실제 조건·금액·신청방법은 변경될 수 있으니, 반드시 해당 기관의 공식 사이트에서 최신 정보를 확인하세요.</div>
</article></div>
<footer class="footer"><div class="footer-inner"><p><a href="{SITE_URL}"><strong>eloan.kr</strong></a> · 지원금 가이드</p><p>정부 공공데이터 기반 · 정확한 조건은 해당 기관에 확인하세요<br><br>&copy; {now.year} eloan.kr</p></div></footer>
</body>
</html>"""
    return html


def run():
    """메인 실행"""
    if not GEMINI_KEY:
        print('GEMINI_API_KEY not set')
        return
    if not GITHUB_TOKEN:
        print('GH_TOKEN not set')
        return

    settings = load_settings()
    cats = settings.get('cats', ['지원금', '절약', '재테크'])
    count = settings.get('count', 3)

    print(f'=== Auto Writer Start ===')
    print(f'Categories: {cats}, Count: {count}')

    posts, posts_sha = load_posts()
    existing_titles = [p.get('title', '') for p in posts]
    written = 0

    for i in range(count):
        cat = cats[i % len(cats)]
        print(f'\n--- [{i+1}/{count}] Category: {cat} ---')

        # 1. 주제 추천
        print('Getting topic...')
        try:
            topics = get_topic(cat, existing_titles)
        except Exception as e:
            print(f'Topic generation failed: {e}')
            continue

        # 중복 아닌 첫 번째 주제 선택
        keyword = None
        for t in topics:
            if not is_duplicate(posts, t):
                keyword = t
                break

        if not keyword:
            print('All topics are duplicates, skipping')
            continue

        print(f'Topic: {keyword}')

        # 2. 글 생성
        print('Generating post...')
        try:
            article = generate_post(keyword, cat)
        except Exception as e:
            print(f'Post generation failed: {e}')
            continue

        print(f'Title: {article["title"]} ({len(article["content"])} chars)')

        # 3. GitHub에 발행
        slug = make_slug(article['title'])
        post_html = build_post_html(article)
        post_path = f'{BLOG_DIR}/{slug}.html'

        try:
            existing = github_get(post_path)
            sha = existing['sha'] if existing else None
            github_put(post_path, post_html, f'글 추가: {article["title"]}', sha=sha)

            # posts.json 업데이트
            now = datetime.now()
            new_post = {
                'title': article['title'],
                'slug': slug,
                'date': now.strftime('%Y년 %m월 %d일'),
                'date_iso': now.strftime('%Y-%m-%d'),
                'meta_description': article['meta_description'],
                'tags': article['tags'],
                'keyword': article['keyword'],
                'category': cat
            }
            posts = [p for p in posts if p.get('slug') != slug]
            posts.insert(0, new_post)
            existing_titles.append(article['title'])

            # posts.json 다시 가져와서 최신 sha 확보
            _, posts_sha = load_posts()
            github_put(
                f'{BLOG_DIR}/posts.json',
                json.dumps(posts, ensure_ascii=False, indent=2),
                f'글 목록 업데이트: {article["title"]}',
                sha=posts_sha
            )

            written += 1
            print(f'Published! {SITE_URL}/{BLOG_DIR}/{slug}.html')

        except Exception as e:
            print(f'Upload failed: {e}')
            continue

        # API 쿨다운
        import time
        time.sleep(10)

    print(f'\n=== Done: {written}/{count} posts written ===')


if __name__ == '__main__':
    run()

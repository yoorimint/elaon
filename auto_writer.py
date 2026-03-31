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
SITE_NAME = 'AI 도구 가이드 | eloan.kr'

# 설정 파일에서 읽기
def load_settings():
    path = os.path.join(os.path.dirname(__file__), 'auto_settings.json')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'count': 3, 'cats': ['AI챗봇', '생산성', '비교']}


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
        'AI챗봇': f'ChatGPT, Gemini, Claude, Copilot 등 AI 챗봇/LLM 도구 리뷰 및 비교. "{year} OOO 비교 리뷰 가격 총정리" 형태.',
        '이미지': f'Midjourney, DALL-E, Stable Diffusion 등 AI 이미지/영상 생성 도구. "{year} OOO 사용법 비교 추천 총정리" 형태.',
        '생산성': f'Notion AI, Otter, 번역 도구 등 업무 생산성 AI 도구. "{year} OOO 활용법 추천 비교 총정리" 형태.',
        '개발': f'Cursor, GitHub Copilot, v0 등 AI 개발 도구. "{year} OOO 리뷰 사용법 비교 총정리" 형태.',
        '비교': f'AI 도구 카테고리별 TOP 비교/추천. "{year} OOO TOP 비교 추천 순위 총정리" 형태.',
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
        'AI챗봇': {
            'role': 'AI 도구 전문 리뷰어/테크 블로거',
            'title_pattern': f'{year} {keyword} 비교 리뷰 기능 가격 총정리',
            'structure': '1) 이 도구는? (한줄 요약+핵심) 2) 주요 기능 상세 리뷰 3) 요금제/가격 비교 (<table>) 4) 장단점 정리 5) 추천 대상+대안 도구',
            'extra': '글 마지막에 "결론: 이런 사람에게 추천" 섹션.\n실존 도구명만 사용. 가격은 공식 사이트 기준.\n도구 공식 URL 반드시 포함.'
        },
        '이미지': {
            'role': 'AI 이미지/영상 도구 전문 리뷰어',
            'title_pattern': f'{year} {keyword} 사용법 비교 추천 총정리',
            'structure': '1) 이 도구는? (차별점) 2) 사용법 단계별 가이드 3) 무료 vs 유료 비교 (<table>) 4) 퀄리티/속도/편의성 평가 5) 대안 도구+FAQ',
            'extra': '실존 도구명만 사용. 공식 URL 포함.'
        },
        '생산성': {
            'role': '업무 생산성/자동화 전문 블로거',
            'title_pattern': f'{year} {keyword} 활용법 추천 비교 총정리',
            'structure': '1) 이 도구로 뭘 할 수 있나? 2) 핵심 활용법 5가지 3) 무료/유료 플랜 비교 (<table>) 4) 활용 시나리오 5) 비슷한 도구 비교+FAQ',
            'extra': '실존 도구명만 사용. 공식 URL 포함.'
        },
        '개발': {
            'role': 'AI 개발 도구/코딩 전문 리뷰어',
            'title_pattern': f'{year} {keyword} 리뷰 사용법 비교 총정리',
            'structure': '1) 이 도구는? (핵심 기능) 2) 설치/시작 가이드 3) 주요 기능 심층 리뷰 4) 가격 및 플랜 비교 (<table>) 5) 다른 도구와 비교+추천',
            'extra': '실존 도구명만 사용. 공식 URL 포함.'
        },
        '비교': {
            'role': 'AI 도구 비교/추천 전문가',
            'title_pattern': f'{year} {keyword} TOP 비교 추천 순위 총정리',
            'structure': '1) 비교 기준 2) 도구별 상세 비교 (<table>) 3) 용도별 추천 4) 선택 가이드 5) FAQ',
            'extra': '실존 도구명만 사용. 객관적 비교. 공식 URL 포함.'
        }
    }
    cc = cat_config.get(cat, cat_config['AI챗봇'])

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
8. 시각적 요소는 정보 전달에 필요한 경우만 사용 (비교 테이블, 장단점 리스트 등). 그라데이션 카드, PPT 스타일 장식은 금지. 깔끔하고 읽기 편한 텍스트 중심 레이아웃. 인라인 style 최소화.
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
    cat = article.get('category', 'AI 도구')
    tags_html = '\n'.join([f'<span class="tag">{tag}</span>' for tag in article.get('tags', [])])
    now = datetime.now()
    date_str = now.strftime('%Y.%m.%d')
    slug = make_slug(t)
    text_only = re.sub(r'<[^>]+>', '', c)
    read_min = max(1, len(text_only) // 500)

    cat_colors = {
        'AI챗봇': ('#2563EB', '#EFF6FF'),
        '이미지': ('#7C3AED', '#F5F3FF'),
        '생산성': ('#059669', '#ECFDF5'),
        '개발': ('#EA580C', '#FFF7ED'),
        '비교': ('#B45309', '#FEF3C7'),
    }
    cat_color, cat_bg = cat_colors.get(cat, ('#2563EB', '#EFF6FF'))

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
<script async src="https://www.googletagmanager.com/gtag/js?id=G-SDY3EXP31H"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-SDY3EXP31H');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{{--navy:#0F172A;--navy-light:#1E293B;--accent:#2563EB;--accent-bg:#EFF6FF;--bg:#F8F9FB;--surface:#FFF;--text:#111827;--text-sub:#4B5563;--text-muted:#9CA3AF;--border:#E5E7EB;--border-light:#F3F4F6}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:"Noto Sans KR","Inter",-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.8;-webkit-font-smoothing:antialiased}}
a{{text-decoration:none;color:inherit}}
.nav{{background:var(--navy);position:sticky;top:0;z-index:100}}
.nav-inner{{max-width:760px;margin:0 auto;padding:0 24px;height:52px;display:flex;align-items:center;justify-content:space-between}}
.nav-logo{{color:#fff;font-size:18px;font-weight:800;letter-spacing:-0.5px}}
.nav-logo span{{color:#60A5FA;font-weight:400;font-size:12px;margin-left:6px}}
.nav-links a{{color:rgba(255,255,255,.6);font-size:13px;margin-left:16px}}
.nav-links a:hover{{color:#fff}}
.breadcrumb{{max-width:760px;margin:0 auto;padding:14px 24px;font-size:12px;color:var(--text-muted)}}
.breadcrumb a{{color:var(--text-muted)}}
.breadcrumb a:hover{{color:var(--accent)}}
.breadcrumb span{{margin:0 6px;opacity:.5}}
.post-header{{max-width:760px;margin:0 auto;padding:0 24px 32px}}
.post-cat{{display:inline-block;font-size:12px;font-weight:700;padding:4px 10px;border-radius:4px;margin-bottom:14px;background:{cat_bg};color:{cat_color}}}
.post-header h1{{font-size:28px;font-weight:800;color:var(--navy);line-height:1.4;letter-spacing:-0.5px;margin-bottom:16px}}
.post-meta{{display:flex;align-items:center;gap:12px;padding-top:16px;border-top:1px solid var(--border);font-size:13px;color:var(--text-muted)}}
.post-meta .sep{{width:3px;height:3px;border-radius:50%;background:var(--text-muted)}}
.post-body{{max-width:760px;margin:0 auto;padding:0 24px 60px}}
.post-body h2{{font-size:20px;font-weight:800;color:var(--navy);margin:44px 0 16px;padding-bottom:10px;border-bottom:2px solid var(--border)}}
.post-body h2:first-child{{margin-top:0}}
.post-body h3{{font-size:16px;font-weight:700;color:var(--navy-light);margin:28px 0 10px}}
.post-body p{{font-size:15px;color:var(--text-sub);margin-bottom:16px;line-height:1.9;word-break:keep-all}}
.post-body strong{{color:var(--navy);font-weight:600}}
.post-body a{{color:var(--accent);font-weight:500;border-bottom:1px solid transparent}}
.post-body a:hover{{border-bottom-color:var(--accent)}}
.post-body ul,.post-body ol{{margin:14px 0 18px;padding:0;list-style:none}}
.post-body ul li{{position:relative;padding-left:18px;margin-bottom:8px;font-size:15px;color:var(--text-sub);line-height:1.8}}
.post-body ul li::before{{content:"";position:absolute;left:2px;top:11px;width:6px;height:6px;border-radius:50%;background:var(--accent);opacity:.5}}
.post-body ol{{counter-reset:item}}
.post-body ol li{{counter-increment:item;position:relative;padding-left:32px;margin-bottom:12px;font-size:15px;color:var(--text-sub)}}
.post-body ol li::before{{content:counter(item);position:absolute;left:0;top:2px;width:22px;height:22px;background:var(--navy);border-radius:50%;font-size:11px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center}}
.post-body table{{width:100%;border-collapse:collapse;margin:16px 0 20px;font-size:14px;border-radius:8px;overflow:hidden}}
.post-body thead{{background:var(--navy)}}
.post-body th{{background:var(--navy);color:#fff;font-weight:600;padding:12px 16px;text-align:left;font-size:13px}}
.post-body td{{padding:12px 16px;border-bottom:1px solid var(--border-light);color:var(--text-sub)}}
.post-body tr:nth-child(even) td{{background:#F9FAFB}}
.post-body tr:hover td{{background:var(--accent-bg)}}
.post-tags{{display:flex;flex-wrap:wrap;gap:6px;margin-top:44px;padding-top:20px;border-top:1px solid var(--border)}}
.tag{{font-size:12px;color:var(--text-muted);background:var(--border-light);padding:4px 10px;border-radius:4px}}
.notice{{margin-top:32px;padding:16px 20px;background:#FEF3C7;border-radius:10px;font-size:13px;color:#92400E;line-height:1.7}}
.footer{{background:var(--navy);padding:32px 0;margin-top:48px}}
.footer-inner{{max-width:760px;margin:0 auto;padding:0 24px;text-align:center}}
.footer p{{font-size:12px;color:rgba(255,255,255,.4);line-height:1.9}}
.footer a{{color:rgba(255,255,255,.6)}}
@media(max-width:640px){{.post-header h1{{font-size:22px}}.post-body h2{{font-size:18px}}}}
</style>
</head>
<body>
<nav class="nav"><div class="nav-inner"><a href="{SITE_URL}" class="nav-logo">eloan.kr<span>AI TOOL GUIDE</span></a><div class="nav-links"><a href="{SITE_URL}">홈</a><a href="{SITE_URL}">리뷰</a></div></div></nav>
<div class="breadcrumb"><a href="{SITE_URL}">홈</a><span>›</span><a href="{SITE_URL}">리뷰</a><span>›</span>{kw}</div>
<header class="post-header"><span class="post-cat">{cat}</span><h1>{t}</h1><div class="post-meta"><span>{date_str}</span><div class="sep"></div><span>eloan.kr</span><div class="sep"></div><span>읽는 시간 약 {read_min}분</span></div></header>
<article class="post-body">
{c}
<div class="post-tags">{tags_html}</div>
<div class="notice">이 글은 AI를 활용해 작성되었으며, 도구의 기능·가격은 변경될 수 있습니다. 최신 정보는 각 도구의 공식 사이트에서 확인하세요.</div>
</article>
<footer class="footer"><div class="footer-inner"><p><a href="{SITE_URL}"><strong>eloan.kr</strong></a> &middot; AI 도구 리뷰 가이드</p><p>&copy; {now.year} eloan.kr</p></div></footer>
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

"""
GitHub 업로드 모듈
- 글을 전문 금융 사이트 디자인 HTML로 생성
- 블로그 목록 페이지(blog/index.html) 자동 업데이트
- GitHub API로 자동 push
"""

import requests
import base64
import json
import re
import os
from datetime import datetime
from config import GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, BLOG_DIR, SITE_URL, SITE_NAME


def build_blog_html(article, thumbnail_filename=None):
    """
    글 데이터를 전문 금융 사이트 스타일 HTML로 변환
    """
    title = article.get("title", "제목 없음")
    content = article.get("content", "")
    meta_desc = article.get("meta_description", "")
    tags = article.get("tags", [])
    keyword = article.get("keyword", "")
    date_str = datetime.now().strftime("%Y.%m.%d")
    date_iso = datetime.now().strftime("%Y-%m-%d")
    slug = make_slug(title)

    tags_html = "\n".join([f'      <span class="article-tag">{t}</span>' for t in tags])

    thumbnail_meta = ""
    if thumbnail_filename:
        thumbnail_meta = f'\n    <meta property="og:image" content="{SITE_URL}/{BLOG_DIR}/images/{thumbnail_filename}">'

    # 글 읽는 시간 추정 (한글 기준 분당 500자)
    text_only = re.sub(r'<[^>]+>', '', content)
    read_min = max(1, len(text_only) // 500)

    html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | {SITE_NAME}</title>
<meta name="description" content="{meta_desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{meta_desc}">
<meta property="og:type" content="article">{thumbnail_meta}
<link rel="canonical" href="{SITE_URL}/{BLOG_DIR}/{slug}.html">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {{
  --navy: #0D1B3E;
  --navy-light: #1A2D5A;
  --blue: #2563EB;
  --gold: #B8860B;
  --gold-light: #D4A933;
  --bg: #FAFBFC;
  --white: #FFFFFF;
  --text: #1F2937;
  --text-sub: #4B5563;
  --text-muted: #9CA3AF;
  --border: #E5E7EB;
  --border-light: #F3F4F6;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{
  font-family: 'Noto Sans KR', -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.8;
  -webkit-font-smoothing: antialiased;
}}

/* Top Bar */
.topbar {{
  background: var(--navy);
  padding: 10px 0;
  border-bottom: 2px solid var(--gold);
}}
.topbar-inner {{
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}}
.topbar-logo {{
  color: #fff;
  text-decoration: none;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
}}
.topbar-logo span {{
  color: var(--gold-light);
  font-weight: 300;
  font-size: 11px;
  margin-left: 8px;
  letter-spacing: 0;
}}
.topbar-nav {{
  display: flex;
  gap: 20px;
}}
.topbar-nav a {{
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  font-size: 12px;
  transition: color 0.2s;
}}
.topbar-nav a:hover {{ color: #fff; }}

/* Breadcrumb */
.breadcrumb {{
  max-width: 800px;
  margin: 0 auto;
  padding: 14px 24px;
  font-size: 12px;
  color: var(--text-muted);
}}
.breadcrumb a {{
  color: var(--text-muted);
  text-decoration: none;
}}
.breadcrumb a:hover {{ color: var(--blue); }}
.breadcrumb span {{ margin: 0 6px; }}

/* Article Header */
.article-header {{
  max-width: 800px;
  margin: 0 auto;
  padding: 8px 24px 32px;
}}
.article-category {{
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: var(--blue);
  background: #EFF6FF;
  padding: 3px 10px;
  border-radius: 3px;
  margin-bottom: 14px;
  letter-spacing: 0.5px;
}}
.article-header h1 {{
  font-size: 28px;
  font-weight: 700;
  color: var(--navy);
  line-height: 1.4;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
}}
.article-meta-bar {{
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-muted);
}}
.dot {{
  width: 3px; height: 3px;
  border-radius: 50%;
  background: var(--text-muted);
}}

/* Layout */
.article-layout {{
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px 60px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}}
@media (min-width: 768px) {{
  .article-layout {{
    grid-template-columns: 1fr 220px;
    gap: 40px;
  }}
}}

/* Content */
.article-content {{ min-width: 0; }}
.article-content h2 {{
  font-size: 20px;
  font-weight: 700;
  color: var(--navy);
  margin: 40px 0 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  letter-spacing: -0.3px;
}}
.article-content h2:first-child {{ margin-top: 0; }}
.article-content h3 {{
  font-size: 16px;
  font-weight: 600;
  color: var(--navy-light);
  margin: 28px 0 10px;
}}
.article-content p {{
  font-size: 15px;
  color: var(--text-sub);
  margin-bottom: 16px;
  line-height: 1.9;
  word-break: keep-all;
}}
.article-content strong {{
  color: var(--navy);
  font-weight: 600;
}}
.article-content ul, .article-content ol {{
  margin: 14px 0 18px 0;
  padding: 0;
  list-style: none;
}}
.article-content ul li {{
  position: relative;
  padding-left: 16px;
  margin-bottom: 8px;
  font-size: 15px;
  color: var(--text-sub);
  line-height: 1.8;
}}
.article-content ul li::before {{
  content: '—';
  position: absolute;
  left: 0;
  color: var(--gold);
  font-weight: 700;
}}
.article-content ol {{
  counter-reset: item;
}}
.article-content ol li {{
  counter-increment: item;
  position: relative;
  padding-left: 28px;
  margin-bottom: 12px;
  font-size: 15px;
  color: var(--text-sub);
  line-height: 1.8;
}}
.article-content ol li::before {{
  content: counter(item);
  position: absolute;
  left: 0; top: 3px;
  width: 20px; height: 20px;
  border: 1.5px solid var(--navy);
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  color: var(--navy);
  display: flex;
  align-items: center;
  justify-content: center;
}}

/* Table */
.article-content table {{
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0 20px;
  font-size: 14px;
}}
.article-content thead {{ background: var(--navy); }}
.article-content th {{
  color: #fff;
  font-weight: 500;
  padding: 11px 16px;
  text-align: left;
  font-size: 13px;
}}
.article-content td {{
  padding: 11px 16px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-sub);
}}
.article-content tr:nth-child(even) td {{ background: #F9FAFB; }}
.article-content td strong {{ color: var(--blue); }}

/* Tags */
.article-tags {{
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}}
.article-tag {{
  font-size: 12px;
  color: var(--text-muted);
  background: var(--border-light);
  padding: 3px 10px;
  border-radius: 3px;
}}

/* Sidebar */
.sidebar {{ display: none; }}
@media (min-width: 768px) {{ .sidebar {{ display: block; }} }}
.sidebar-card {{
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}}
.sidebar-title {{
  font-size: 13px;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}}
.sidebar-item {{
  display: block;
  font-size: 13px;
  color: var(--text-sub);
  text-decoration: none;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light);
  transition: color 0.2s;
}}
.sidebar-item:last-child {{ border-bottom: none; }}
.sidebar-item:hover {{ color: var(--blue); }}
.sidebar-cta {{
  display: block;
  background: var(--navy);
  color: #fff;
  text-align: center;
  padding: 14px;
  border-radius: 6px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.2s;
  margin-top: 6px;
}}
.sidebar-cta:hover {{ background: var(--navy-light); }}

/* Footer */
.footer {{
  background: var(--navy);
  padding: 32px 0;
  margin-top: 40px;
}}
.footer-inner {{
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
  text-align: center;
}}
.footer p {{
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  line-height: 1.9;
}}
.footer a {{
  color: rgba(255,255,255,0.7);
  text-decoration: none;
}}
.footer a:hover {{ color: #fff; }}
.footer-divider {{
  width: 40px; height: 1px;
  background: rgba(255,255,255,0.15);
  margin: 16px auto;
}}

@media print {{
  .topbar, .sidebar, .footer {{ display: none; }}
  .article-layout {{ display: block; }}
  body {{ background: #fff; }}
}}
</style>
<script type="application/ld+json">
{{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "{title}",
    "datePublished": "{date_iso}",
    "description": "{meta_desc}"
}}
</script>
</head>
<body>

<div class="topbar">
  <div class="topbar-inner">
    <a href="{SITE_URL}" class="topbar-logo">eloan.kr<span>정책대출 가이드</span></a>
    <nav class="topbar-nav">
      <a href="{SITE_URL}">계산기</a>
      <a href="{SITE_URL}/{BLOG_DIR}/">가이드</a>
    </nav>
  </div>
</div>

<div class="breadcrumb">
  <a href="{SITE_URL}">홈</a><span>›</span>
  <a href="{SITE_URL}/{BLOG_DIR}/">가이드</a><span>›</span>
  {keyword}
</div>

<div class="article-header">
  <div class="article-category">정책대출</div>
  <h1>{title}</h1>
  <div class="article-meta-bar">
    <span>{date_str}</span>
    <div class="dot"></div>
    <span>정책대출 가이드</span>
    <div class="dot"></div>
    <span>읽는 시간 약 {read_min}분</span>
  </div>
</div>

<div class="article-layout">
  <article class="article-content">
{content}
    <div class="article-tags">
{tags_html}
    </div>
  </article>

  <aside class="sidebar">
    <div class="sidebar-card">
      <div class="sidebar-title">관련 계산기</div>
      <a href="{SITE_URL}/didimdol.html" class="sidebar-item">디딤돌대출 계산기</a>
      <a href="{SITE_URL}/buteommok.html" class="sidebar-item">버팀목 전세대출 계산기</a>
      <a href="{SITE_URL}/baby.html" class="sidebar-item">신생아 특례대출 계산기</a>
      <a href="{SITE_URL}/bogeumjari.html" class="sidebar-item">보금자리론 계산기</a>
      <a href="{SITE_URL}/{BLOG_DIR}/" class="sidebar-cta">전체 가이드 보기 →</a>
    </div>
  </aside>
</div>

<footer class="footer">
  <div class="footer-inner">
    <p><a href="{SITE_URL}"><strong>eloan.kr</strong></a></p>
    <div class="footer-divider"></div>
    <p>
      본 사이트는 참고용 정보를 제공하며 금융 자문을 제공하지 않습니다.<br>
      정확한 대출 조건은 <a href="https://www.hf.go.kr">한국주택금융공사</a> 또는 취급은행에 문의하세요.<br><br>
      &copy; 2026 eloan.kr
    </p>
  </div>
</footer>

</body>
</html>"""
    return html


def build_blog_index(posts):
    """블로그 목록 페이지 - 전문 금융 사이트 스타일"""
    posts_html = ""
    for post in posts:
        tags_html = "".join([f'<span class="idx-tag">{t}</span>' for t in post.get("tags", [])[:3]])
        posts_html += f"""
    <a href="{post['slug']}.html" class="idx-card">
      <div class="idx-date">{post['date']}</div>
      <h2 class="idx-title">{post['title']}</h2>
      <p class="idx-desc">{post.get('meta_description', '')}</p>
      <div class="idx-tags">{tags_html}</div>
    </a>
"""

    html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>정책대출 가이드 | {SITE_NAME}</title>
<meta name="description" content="정부 지원금, 정책대출, 보조금 조건·신청방법 가이드.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {{
  --navy: #0D1B3E;
  --navy-light: #1A2D5A;
  --blue: #2563EB;
  --gold: #B8860B;
  --gold-light: #D4A933;
  --bg: #FAFBFC;
  --white: #FFFFFF;
  --text: #1F2937;
  --text-sub: #4B5563;
  --text-muted: #9CA3AF;
  --border: #E5E7EB;
  --border-light: #F3F4F6;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{
  font-family: 'Noto Sans KR', -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}}
.topbar {{
  background: var(--navy);
  padding: 10px 0;
  border-bottom: 2px solid var(--gold);
}}
.topbar-inner {{
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}}
.topbar-logo {{
  color: #fff;
  text-decoration: none;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
}}
.topbar-logo span {{
  color: var(--gold-light);
  font-weight: 300;
  font-size: 11px;
  margin-left: 8px;
  letter-spacing: 0;
}}
.topbar-nav a {{
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  font-size: 12px;
  margin-left: 20px;
}}
.topbar-nav a:hover {{ color: #fff; }}
.container {{
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px 60px;
}}
.page-header {{
  margin-bottom: 40px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}}
.page-header h1 {{
  font-size: 26px;
  font-weight: 700;
  color: var(--navy);
  letter-spacing: -0.5px;
  margin-bottom: 8px;
}}
.page-header p {{
  font-size: 14px;
  color: var(--text-muted);
}}
.home-link {{
  display: inline-block;
  margin-bottom: 20px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 13px;
}}
.home-link:hover {{ color: var(--blue); }}
.idx-card {{
  display: block;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 12px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}}
.idx-card:hover {{
  border-color: var(--blue);
  box-shadow: 0 2px 12px rgba(37,99,235,0.08);
}}
.idx-date {{
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
}}
.idx-title {{
  font-size: 18px;
  font-weight: 600;
  color: var(--navy);
  margin-bottom: 6px;
  letter-spacing: -0.3px;
  line-height: 1.4;
}}
.idx-desc {{
  font-size: 14px;
  color: var(--text-sub);
  line-height: 1.6;
  margin-bottom: 10px;
}}
.idx-tag {{
  display: inline-block;
  font-size: 11px;
  color: var(--text-muted);
  background: var(--border-light);
  padding: 2px 8px;
  border-radius: 3px;
  margin-right: 4px;
}}
.footer {{
  background: var(--navy);
  padding: 32px 0;
  margin-top: 40px;
  text-align: center;
}}
.footer p {{
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  line-height: 1.9;
}}
.footer a {{
  color: rgba(255,255,255,0.7);
  text-decoration: none;
}}
</style>
</head>
<body>

<div class="topbar">
  <div class="topbar-inner">
    <a href="{SITE_URL}" class="topbar-logo">eloan.kr<span>정책대출 가이드</span></a>
    <nav class="topbar-nav">
      <a href="{SITE_URL}">계산기</a>
      <a href="{SITE_URL}/{BLOG_DIR}/">가이드</a>
    </nav>
  </div>
</div>

<div class="container">
  <a href="{SITE_URL}" class="home-link">← 계산기로 돌아가기</a>
  <div class="page-header">
    <h1>정책대출 가이드</h1>
    <p>정부 지원금, 정책대출, 보조금 조건과 신청방법을 정리합니다.</p>
  </div>
{posts_html}
</div>

<footer class="footer">
  <p>
    <a href="{SITE_URL}"><strong>eloan.kr</strong></a><br><br>
    &copy; 2026 eloan.kr
  </p>
</footer>

</body>
</html>"""
    return html


def make_slug(title):
    """제목을 URL 슬러그로 변환"""
    slug = re.sub(r'[^\w가-힣\s-]', '', title)
    slug = re.sub(r'\s+', '-', slug.strip())
    slug = slug[:80]
    return slug


def github_get_file(filepath):
    """GitHub에서 파일 가져오기"""
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{filepath}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    params = {"ref": GITHUB_BRANCH}
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            content = base64.b64decode(data["content"]).decode("utf-8")
            return {"content": content, "sha": data["sha"]}
        return None
    except requests.RequestException:
        return None


def github_put_file(filepath, content, message, sha=None):
    """GitHub에 파일 생성 또는 업데이트"""
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{filepath}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    body = {
        "message": message,
        "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
        "branch": GITHUB_BRANCH,
    }
    if sha:
        body["sha"] = sha
    try:
        response = requests.put(url, headers=headers, json=body, timeout=15)
        response.raise_for_status()
        print(f"  ✅ {filepath} → push 완료")
        return True
    except requests.RequestException as e:
        print(f"  ❌ {filepath} → push 실패: {e}")
        return False


def load_posts_data():
    """GitHub에서 posts.json 로드"""
    result = github_get_file(f"{BLOG_DIR}/posts.json")
    if result:
        try:
            return json.loads(result["content"]), result["sha"]
        except json.JSONDecodeError:
            return [], None
    return [], None


def upload_post(article, thumbnail_path=None):
    """
    GitHub에 글 업로드 (메인 함수)
    1. 글 HTML push
    2. posts.json 업데이트
    3. blog/index.html 재생성
    4. (선택) 썸네일 push
    """
    title = article.get("title", "제목 없음")
    print(f"[GitHub 업로드] 시작 - {title}")

    slug = make_slug(title)
    date_str = datetime.now().strftime("%Y년 %m월 %d일")
    date_iso = datetime.now().strftime("%Y-%m-%d")

    # 1. 글 HTML push
    post_html = build_blog_html(article)
    post_path = f"{BLOG_DIR}/{slug}.html"
    existing = github_get_file(post_path)
    sha = existing["sha"] if existing else None
    success = github_put_file(post_path, post_html, f"글 추가: {title}", sha=sha)

    if not success:
        return {"success": False, "post_url": None}

    # 2. 썸네일 push
    if thumbnail_path and os.path.exists(thumbnail_path):
        with open(thumbnail_path, "rb") as f:
            img_data = f.read()
        img_path = f"{BLOG_DIR}/images/{slug}.png"
        img_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{img_path}"
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
        }
        body = {
            "message": f"썸네일: {title}",
            "content": base64.b64encode(img_data).decode("utf-8"),
            "branch": GITHUB_BRANCH,
        }
        try:
            requests.put(img_url, headers=headers, json=body, timeout=15)
            print(f"  ✅ 썸네일 push 완료")
        except requests.RequestException:
            print(f"  ⚠️ 썸네일 push 실패 (글은 정상 업로드됨)")

    # 3. posts.json 업데이트
    posts, posts_sha = load_posts_data()
    new_post = {
        "title": title,
        "slug": slug,
        "date": date_str,
        "date_iso": date_iso,
        "meta_description": article.get("meta_description", ""),
        "tags": article.get("tags", []),
        "keyword": article.get("keyword", ""),
    }
    posts = [p for p in posts if p.get("slug") != slug]
    posts.insert(0, new_post)
    github_put_file(
        f"{BLOG_DIR}/posts.json",
        json.dumps(posts, ensure_ascii=False, indent=2),
        f"글 목록 업데이트: {title}",
        sha=posts_sha,
    )

    # 4. blog/index.html 재생성
    index_html = build_blog_index(posts)
    existing_index = github_get_file(f"{BLOG_DIR}/index.html")
    index_sha = existing_index["sha"] if existing_index else None
    github_put_file(f"{BLOG_DIR}/index.html", index_html, "블로그 목록 업데이트", sha=index_sha)

    post_url = f"{SITE_URL}/{BLOG_DIR}/{slug}.html"
    print(f"[GitHub 업로드] 완료 - {post_url}")
    return {"success": True, "post_url": post_url, "slug": slug}


# 테스트
if __name__ == "__main__":
    test_article = {
        "title": "2026 디딤돌대출 조건 총정리",
        "content": "<h2>디딤돌대출이란?</h2><p>테스트 글이에요.</p>",
        "meta_description": "2026년 디딤돌대출 조건, 금리, 신청방법 총정리",
        "tags": ["디딤돌대출", "정책대출", "주택구입"],
        "keyword": "디딤돌대출 조건",
    }
    print("GitHub 업로드 테스트")
    print("실제 업로드하려면 config.py에 GitHub 정보를 입력하세요.")
    print(f"슬러그: {make_slug(test_article['title'])}")

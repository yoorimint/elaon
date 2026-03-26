"""
공공서비스 게시판 자동 생성
- 정부24 API에서 공공서비스 목록/상세/지원조건 조회
- 게시판 목록 페이지(services.html) + 개별 상세 페이지 자동 생성
- GitHub push 또는 로컬 저장

사용법:
    python fetch_services.py                    # 로컬에 HTML 생성
    python fetch_services.py --upload           # GitHub에도 push
    python fetch_services.py --count 50         # 50개 서비스 가져오기
    python fetch_services.py --search "대출"    # 키워드 검색
"""

import requests
import json
import os
import re
import argparse
from datetime import datetime
from config import GOV24_API_KEY, SITE_URL, SITE_NAME

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "services")
BASE_URL = "https://api.odcloud.kr/api"


def fetch_service_list(page=1, per_page=100):
    """공공서비스 목록 조회"""
    url = f"{BASE_URL}/gov24/v3/serviceList"
    params = {
        "serviceKey": GOV24_API_KEY,
        "page": page,
        "perPage": per_page,
        "returnType": "JSON",
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        print(f"[API] 서비스 목록 {len(data.get('data', []))}건 조회")
        return data.get("data", [])
    except requests.RequestException as e:
        print(f"[API 오류] 서비스 목록 조회 실패: {e}")
        return []


def fetch_service_detail(svc_id):
    """공공서비스 상세내용 조회"""
    url = f"{BASE_URL}/gov24/v3/serviceDetail"
    params = {
        "serviceKey": GOV24_API_KEY,
        "svc_id": svc_id,
        "returnType": "JSON",
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("data", [])
        return items[0] if items else {}
    except requests.RequestException as e:
        print(f"[API 오류] 상세 조회 실패 ({svc_id}): {e}")
        return {}


def fetch_support_conditions(svc_id):
    """공공서비스 지원조건 조회"""
    url = f"{BASE_URL}/gov24/v3/supportConditions"
    params = {
        "serviceKey": GOV24_API_KEY,
        "svc_id": svc_id,
        "returnType": "JSON",
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", [])
    except requests.RequestException as e:
        print(f"[API 오류] 지원조건 조회 실패 ({svc_id}): {e}")
        return []


def make_safe_filename(text):
    """파일명에 사용할 수 있는 문자만 남기기"""
    safe = re.sub(r'[^\w가-힣\s-]', '', text)
    safe = re.sub(r'\s+', '-', safe.strip())
    return safe[:80]


def build_service_detail_html(service, detail, conditions):
    """개별 서비스 상세 페이지 HTML 생성"""
    name = service.get("서비스명", "서비스명 없음")
    summary = service.get("서비스목적요약", "")
    department = service.get("소관기관명", "")
    contact = detail.get("문의처전화번호", "")
    website = detail.get("온라인신청사이트URL", "")

    # 상세 정보
    purpose = detail.get("서비스목적", summary)
    target = detail.get("지원대상", service.get("지원대상", ""))
    content_info = detail.get("지원내용", "")
    method = detail.get("신청방법", service.get("신청방법", ""))
    docs = detail.get("구비서류", "")
    selection = detail.get("선정기준", "")
    period = detail.get("신청기한", "")

    # 지원조건
    conditions_html = ""
    if conditions:
        conditions_html = '<div class="detail-section"><h2>지원조건 상세</h2><div class="conditions-grid">'
        for cond in conditions:
            cond_name = cond.get("지원조건명", "")
            cond_val = cond.get("지원조건내용", "")
            if cond_name and cond_val:
                conditions_html += f'<div class="cond-item"><div class="cond-label">{cond_name}</div><div class="cond-value">{cond_val}</div></div>'
        conditions_html += '</div></div>'

    # 웹사이트 링크
    website_html = ""
    if website and website.strip():
        website_html = f'<a href="{website}" target="_blank" rel="noopener" class="apply-btn">온라인 신청하기 →</a>'

    html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{name} - 공공서비스 상세정보 | eloan.kr</title>
<meta name="description" content="{summary}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root {{
  --primary: #1B65E3;
  --primary-dark: #0F4ABF;
  --primary-light: #E8F0FE;
  --accent: #00C48C;
  --bg: #F5F6FA;
  --card: #FFFFFF;
  --text: #1A1D26;
  --text-sub: #6B7280;
  --text-light: #9CA3AF;
  --border: #E5E7EB;
  --shadow: 0 2px 12px rgba(27,101,227,0.08);
  --radius: 16px;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family: 'Noto Sans KR', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }}
.container {{ max-width: 640px; margin: 0 auto; padding: 0 20px; }}

.header {{ background: var(--primary); padding: 16px 0; position: sticky; top: 0; z-index: 100; }}
.header-inner {{ display: flex; align-items: center; gap: 12px; }}
.back-btn {{ color: #fff; text-decoration: none; font-size: 20px; padding: 4px; }}
.header-title {{ color: #fff; font-size: 16px; font-weight: 700; flex: 1; letter-spacing: -0.3px; }}
.header-badge {{ background: rgba(255,255,255,0.2); color: #fff; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px; }}

.summary-card {{
  background: linear-gradient(135deg, var(--primary) 0%, #6366F1 100%);
  border-radius: var(--radius);
  padding: 24px;
  color: #fff;
  margin: 20px 0 16px;
}}
.summary-card h1 {{ font-size: 20px; font-weight: 800; margin-bottom: 8px; line-height: 1.4; letter-spacing: -0.5px; }}
.summary-card p {{ font-size: 14px; opacity: 0.9; line-height: 1.6; }}
.summary-meta {{ display: flex; gap: 16px; margin-top: 16px; flex-wrap: wrap; }}
.summary-meta-item {{ font-size: 12px; opacity: 0.8; }}
.summary-meta-item strong {{ opacity: 1; font-weight: 600; }}

.card {{
  background: var(--card);
  border-radius: var(--radius);
  padding: 22px 20px;
  box-shadow: var(--shadow);
  margin-bottom: 14px;
}}

.detail-section {{ margin-bottom: 14px; }}
.detail-section h2 {{
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--primary-light);
  letter-spacing: -0.3px;
  color: var(--primary-dark);
}}
.detail-text {{
  font-size: 14px;
  color: var(--text-sub);
  line-height: 1.8;
  white-space: pre-line;
  word-break: keep-all;
}}

.info-row {{
  display: flex;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}}
.info-row:last-child {{ border-bottom: none; }}
.info-label {{
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  min-width: 80px;
  flex-shrink: 0;
}}
.info-value {{
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.7;
  word-break: keep-all;
}}

.conditions-grid {{ display: flex; flex-direction: column; gap: 10px; }}
.cond-item {{
  background: var(--bg);
  border-radius: 10px;
  padding: 14px 16px;
}}
.cond-label {{ font-size: 12px; font-weight: 600; color: var(--primary); margin-bottom: 4px; }}
.cond-value {{ font-size: 13px; color: var(--text-sub); line-height: 1.6; }}

.apply-btn {{
  display: block;
  background: var(--primary);
  color: #fff;
  text-align: center;
  padding: 16px;
  border-radius: var(--radius);
  text-decoration: none;
  font-size: 15px;
  font-weight: 700;
  margin: 20px 0;
  transition: background 0.2s;
}}
.apply-btn:hover {{ background: var(--primary-dark); }}

.contact-card {{
  background: var(--primary-light);
  border-radius: var(--radius);
  padding: 16px 20px;
  margin-bottom: 14px;
}}
.contact-card-title {{ font-size: 13px; font-weight: 600; color: var(--primary-dark); margin-bottom: 6px; }}
.contact-card-value {{ font-size: 14px; color: var(--text); }}

.footer {{ padding: 32px 0; text-align: center; border-top: 1px solid var(--border); margin-top: 16px; }}
.footer p {{ font-size: 11px; color: var(--text-light); line-height: 1.8; }}
.footer a {{ color: var(--text-sub); text-decoration: none; }}
</style>
</head>
<body>

<header class="header">
  <div class="container">
    <div class="header-inner">
      <a href="/services.html" class="back-btn">←</a>
      <div class="header-title">공공서비스 상세</div>
      <span class="header-badge">{department}</span>
    </div>
  </div>
</header>

<main class="container">

  <div class="summary-card">
    <h1>{name}</h1>
    <p>{summary}</p>
    <div class="summary-meta">
      <div class="summary-meta-item"><strong>소관기관</strong> {department}</div>
    </div>
  </div>

  {"" if not contact else f'<div class="contact-card"><div class="contact-card-title">문의전화</div><div class="contact-card-value">{contact}</div></div>'}

  {website_html}

  <div class="card detail-section">
    <h2>서비스 목적</h2>
    <div class="detail-text">{purpose}</div>
  </div>

  {"" if not target else f'<div class="card detail-section"><h2>지원대상</h2><div class="detail-text">{target}</div></div>'}

  {"" if not content_info else f'<div class="card detail-section"><h2>지원내용</h2><div class="detail-text">{content_info}</div></div>'}

  {"" if not selection else f'<div class="card detail-section"><h2>선정기준</h2><div class="detail-text">{selection}</div></div>'}

  {"" if not method else f'<div class="card detail-section"><h2>신청방법</h2><div class="detail-text">{method}</div></div>'}

  {"" if not period else f'<div class="card detail-section"><h2>신청기한</h2><div class="detail-text">{period}</div></div>'}

  {"" if not docs else f'<div class="card detail-section"><h2>구비서류</h2><div class="detail-text">{docs}</div></div>'}

  {conditions_html if conditions_html else ""}

</main>

<footer class="footer">
  <div class="container">
    <p>
      eloan.kr | 정책대출 공공정보<br>
      출처: 정부24 공공서비스 API (행정안전부)<br>
      <a href="/">홈으로</a> · <a href="/services.html">서비스 목록</a>
    </p>
  </div>
</footer>

</body>
</html>"""
    return html


def build_services_list_html(services, total_count):
    """게시판 목록 페이지 HTML 생성"""
    now = datetime.now().strftime("%Y.%m.%d %H:%M")

    rows_html = ""
    for i, svc in enumerate(services, 1):
        name = svc.get("서비스명", "")
        summary = svc.get("서비스목적요약", "")
        dept = svc.get("소관기관명", "")
        svc_id = svc.get("서비스ID", "")
        target = svc.get("지원대상", "")
        filename = make_safe_filename(name)

        # 지원대상 줄이기
        short_target = target[:60] + "..." if len(target) > 60 else target

        rows_html += f"""
      <a href="/services/{filename}.html" class="board-row" data-dept="{dept}">
        <div class="board-num">{i}</div>
        <div class="board-content">
          <div class="board-title">{name}</div>
          <div class="board-summary">{summary}</div>
          <div class="board-meta">
            <span class="board-dept">{dept}</span>
            <span class="board-target">{short_target}</span>
          </div>
        </div>
        <div class="board-arrow">›</div>
      </a>
"""

    html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>공공서비스 게시판 - 정부지원 혜택 목록 | eloan.kr</title>
<meta name="description" content="정부24 공공서비스 {total_count}건의 지원 혜택 정보를 게시판 형태로 제공합니다. 대출, 보조금, 지원금 조건과 신청방법을 확인하세요.">
<meta name="keywords" content="공공서비스, 정부지원, 보조금, 지원금, 정책대출, 정부24">
<meta property="og:title" content="공공서비스 게시판 - eloan.kr">
<meta property="og:description" content="정부 지원 혜택 {total_count}건을 한눈에 확인하세요.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root {{
  --primary: #1B65E3;
  --primary-dark: #0F4ABF;
  --primary-light: #E8F0FE;
  --accent: #00C48C;
  --bg: #F5F6FA;
  --card: #FFFFFF;
  --text: #1A1D26;
  --text-sub: #6B7280;
  --text-light: #9CA3AF;
  --border: #E5E7EB;
  --shadow: 0 2px 12px rgba(27,101,227,0.08);
  --radius: 16px;
  --radius-sm: 10px;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family: 'Noto Sans KR', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }}
.container {{ max-width: 640px; margin: 0 auto; padding: 0 20px; }}

/* Header */
.header {{
  background: linear-gradient(135deg, var(--primary) 0%, #3B82F6 50%, #6366F1 100%);
  padding: 48px 0 56px;
  position: relative;
  overflow: hidden;
}}
.header::after {{
  content: '';
  position: absolute;
  bottom: -30px; left: 0; right: 0;
  height: 60px;
  background: var(--bg);
  border-radius: 30px 30px 0 0;
}}
.header .container {{ position: relative; z-index: 1; }}
.header-nav {{ margin-bottom: 20px; }}
.header-nav a {{ color: rgba(255,255,255,0.8); text-decoration: none; font-size: 13px; }}
.header-nav a:hover {{ color: #fff; }}
.header-badge {{
  display: inline-block;
  background: rgba(255,255,255,0.2);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  margin-bottom: 12px;
  backdrop-filter: blur(4px);
}}
.header h1 {{ color: #fff; font-size: 24px; font-weight: 800; line-height: 1.35; margin-bottom: 8px; letter-spacing: -0.5px; }}
.header p {{ color: rgba(255,255,255,0.85); font-size: 14px; }}
.header-stats {{
  display: flex;
  gap: 24px;
  margin-top: 20px;
}}
.header-stat {{ color: #fff; }}
.header-stat-num {{ font-size: 22px; font-weight: 800; }}
.header-stat-label {{ font-size: 11px; opacity: 0.7; }}

/* Search */
.search-bar {{
  margin-top: -28px;
  position: relative;
  z-index: 2;
  margin-bottom: 20px;
}}
.search-input {{
  width: 100%;
  padding: 16px 20px 16px 48px;
  border: none;
  border-radius: var(--radius);
  font-size: 15px;
  font-family: inherit;
  background: var(--card);
  box-shadow: 0 4px 20px rgba(27,101,227,0.12);
  outline: none;
  transition: box-shadow 0.2s;
}}
.search-input:focus {{ box-shadow: 0 4px 20px rgba(27,101,227,0.25); }}
.search-input::placeholder {{ color: var(--text-light); }}
.search-icon {{
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-light);
  font-size: 18px;
}}

/* Filter */
.filter-bar {{
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}}
.filter-btn {{
  flex-shrink: 0;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--card);
  font-size: 13px;
  font-family: inherit;
  color: var(--text-sub);
  cursor: pointer;
  transition: all 0.2s;
}}
.filter-btn:hover, .filter-btn.active {{
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}}

/* Board */
.board-count {{
  font-size: 13px;
  color: var(--text-sub);
  margin-bottom: 12px;
  padding-left: 2px;
}}
.board-count strong {{ color: var(--primary); }}

.board-row {{
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--card);
  border-radius: var(--radius-sm);
  padding: 16px;
  margin-bottom: 8px;
  text-decoration: none;
  color: inherit;
  box-shadow: var(--shadow);
  transition: all 0.2s;
  border: 1px solid transparent;
}}
.board-row:hover {{
  border-color: var(--primary-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(27,101,227,0.12);
}}
.board-num {{
  width: 32px; height: 32px;
  border-radius: 8px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}}
.board-content {{ flex: 1; min-width: 0; }}
.board-title {{
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.3px;
  margin-bottom: 4px;
  line-height: 1.4;
}}
.board-summary {{
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.5;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}}
.board-meta {{
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}}
.board-dept {{
  font-size: 11px;
  font-weight: 600;
  color: var(--primary);
  background: var(--primary-light);
  padding: 2px 8px;
  border-radius: 4px;
}}
.board-target {{
  font-size: 11px;
  color: var(--text-light);
}}
.board-arrow {{
  color: var(--text-light);
  font-size: 20px;
  flex-shrink: 0;
}}

/* Empty state */
.empty-state {{
  text-align: center;
  padding: 60px 20px;
  color: var(--text-light);
}}
.empty-state-icon {{ font-size: 48px; margin-bottom: 12px; }}
.empty-state-text {{ font-size: 15px; }}

.footer {{ padding: 32px 0; text-align: center; border-top: 1px solid var(--border); margin-top: 24px; }}
.footer p {{ font-size: 11px; color: var(--text-light); line-height: 1.8; }}
.footer a {{ color: var(--text-sub); text-decoration: none; }}

.update-info {{
  text-align: center;
  font-size: 11px;
  color: var(--text-light);
  margin: 16px 0;
}}
</style>
</head>
<body>

<header class="header">
  <div class="container">
    <nav class="header-nav"><a href="/">← eloan.kr 홈</a></nav>
    <div class="header-badge">정부24 공공데이터 API</div>
    <h1>공공서비스 게시판</h1>
    <p>정부 지원 혜택·보조금·대출 정보를 한눈에</p>
    <div class="header-stats">
      <div class="header-stat">
        <div class="header-stat-num">{total_count}</div>
        <div class="header-stat-label">전체 서비스</div>
      </div>
    </div>
  </div>
</header>

<main class="container">

  <div class="search-bar">
    <span class="search-icon">&#128269;</span>
    <input type="text" class="search-input" id="searchInput" placeholder="서비스명, 기관명, 지원대상 검색..." oninput="filterServices()">
  </div>

  <div class="filter-bar" id="filterBar">
    <button class="filter-btn active" onclick="setFilter('전체')">전체</button>
  </div>

  <div class="board-count" id="boardCount">총 <strong>{total_count}</strong>건의 공공서비스</div>

  <div id="boardList">
{rows_html}
  </div>

  <div class="update-info">최종 업데이트: {now} | 출처: 정부24 (행정안전부)</div>

</main>

<footer class="footer">
  <div class="container">
    <p>
      eloan.kr | 정책대출 공공정보<br>
      본 데이터는 정부24 공공서비스 API에서 제공됩니다.<br>
      <a href="/">홈</a> · <a href="/guide.html">정책대출 안내</a>
    </p>
  </div>
</footer>

<script>
// 검색 필터
function filterServices() {{
  const query = document.getElementById('searchInput').value.toLowerCase();
  const rows = document.querySelectorAll('.board-row');
  let count = 0;

  rows.forEach(row => {{
    const text = row.textContent.toLowerCase();
    const show = !query || text.includes(query);
    row.style.display = show ? 'flex' : 'none';
    if (show) count++;
  }});

  document.getElementById('boardCount').innerHTML =
    '검색 결과 <strong>' + count + '</strong>건';
}}

// 기관 필터
function setFilter(dept) {{
  const btns = document.querySelectorAll('.filter-btn');
  btns.forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  const rows = document.querySelectorAll('.board-row');
  let count = 0;

  rows.forEach(row => {{
    const rowDept = row.getAttribute('data-dept');
    const show = dept === '전체' || rowDept === dept;
    row.style.display = show ? 'flex' : 'none';
    if (show) count++;
  }});

  document.getElementById('boardCount').innerHTML =
    (dept === '전체' ? '총 ' : dept + ' ') + '<strong>' + count + '</strong>건';
}}

// 기관 필터 버튼 자동 생성
(function() {{
  const rows = document.querySelectorAll('.board-row');
  const depts = new Set();
  rows.forEach(row => {{
    const dept = row.getAttribute('data-dept');
    if (dept) depts.add(dept);
  }});

  const bar = document.getElementById('filterBar');
  const sorted = [...depts].sort();
  sorted.slice(0, 10).forEach(dept => {{
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = dept;
    btn.onclick = function() {{ setFilter(dept); }};
    bar.appendChild(btn);
  }});
}})();
</script>

</body>
</html>"""
    return html


def run(count=100, search=None, upload=False):
    """메인 실행"""
    print(f"\n{'='*60}")
    print(f"공공서비스 게시판 생성")
    print(f"{'='*60}")

    # 1. 서비스 목록 가져오기
    print(f"\n[1단계] 서비스 목록 조회 (최대 {count}건)...")
    all_services = []
    pages_needed = (count + 99) // 100

    for page in range(1, pages_needed + 1):
        per_page = min(100, count - len(all_services))
        services = fetch_service_list(page=page, per_page=per_page)
        if not services:
            break
        all_services.extend(services)
        if len(services) < per_page:
            break

    if not all_services:
        print("서비스 목록을 가져올 수 없습니다. API 키를 확인하세요.")
        return

    print(f"  → {len(all_services)}건 조회 완료")

    # 검색어 필터
    if search:
        all_services = [
            s for s in all_services
            if search in s.get("서비스명", "") or search in s.get("서비스목적요약", "") or search in s.get("지원대상", "")
        ]
        print(f"  → '{search}' 검색 결과: {len(all_services)}건")

    # 2. 개별 상세 페이지 생성
    print(f"\n[2단계] 개별 상세 페이지 생성...")
    os.makedirs(os.path.join(OUTPUT_DIR), exist_ok=True)

    for i, svc in enumerate(all_services, 1):
        name = svc.get("서비스명", "")
        svc_id = svc.get("서비스ID", "")
        print(f"  [{i}/{len(all_services)}] {name}...")

        # 상세 + 지원조건 조회
        detail = fetch_service_detail(svc_id) if svc_id else {}
        conditions = fetch_support_conditions(svc_id) if svc_id else []

        # HTML 생성
        detail_html = build_service_detail_html(svc, detail, conditions)
        filename = make_safe_filename(name)
        filepath = os.path.join(OUTPUT_DIR, f"{filename}.html")

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(detail_html)

    # 3. 게시판 목록 페이지 생성
    print(f"\n[3단계] 게시판 목록 페이지 생성...")
    list_html = build_services_list_html(all_services, len(all_services))
    list_path = os.path.join(os.path.dirname(__file__), "services.html")

    with open(list_path, "w", encoding="utf-8") as f:
        f.write(list_html)
    print(f"  → {list_path} 저장 완료")

    # 4. GitHub push
    if upload:
        print(f"\n[4단계] GitHub push...")
        from github_uploader import github_put_file, github_get_file

        # services.html push
        existing = github_get_file("services.html")
        sha = existing["sha"] if existing else None
        github_put_file("services.html", list_html, "공공서비스 게시판 업데이트", sha=sha)

        # 개별 페이지 push
        for svc in all_services:
            name = svc.get("서비스명", "")
            filename = make_safe_filename(name)
            filepath = os.path.join(OUTPUT_DIR, f"{filename}.html")

            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            gh_path = f"services/{filename}.html"
            existing = github_get_file(gh_path)
            sha = existing["sha"] if existing else None
            github_put_file(gh_path, content, f"공공서비스: {name}", sha=sha)

    # 완료
    print(f"\n{'='*60}")
    print(f"완료! {len(all_services)}건 생성")
    print(f"  목록: services.html")
    print(f"  상세: services/ 폴더")
    if not upload:
        print(f"  (GitHub push: --upload 옵션 사용)")
    print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description="공공서비스 게시판 생성")
    parser.add_argument("--count", type=int, default=100, help="가져올 서비스 수 (기본: 100)")
    parser.add_argument("--search", type=str, help="서비스명/대상 검색어")
    parser.add_argument("--upload", action="store_true", help="GitHub에 push")
    args = parser.parse_args()

    run(count=args.count, search=args.search, upload=args.upload)


if __name__ == "__main__":
    main()

"""
링크 체크 모듈
- 글 본문에 포함된 모든 URL의 상태를 확인
- 죽은 링크(404 등)는 제거하거나 경고
"""

import re
import requests
from urllib.parse import urlparse


def extract_urls(content):
    """
    HTML 본문에서 모든 URL 추출
    - <a href="..."> 태그와 본문 텍스트 내 URL 모두 추출
    """
    urls = set()

    # href 속성에서 추출
    href_pattern = re.findall(r'href=["\']([^"\']+)["\']', content)
    urls.update(href_pattern)

    # 본문 텍스트에서 URL 추출
    url_pattern = re.findall(r'https?://[^\s<>"\']+', content)
    urls.update(url_pattern)

    # 유효한 URL만 필터링
    valid_urls = []
    for url in urls:
        parsed = urlparse(url)
        if parsed.scheme in ("http", "https") and parsed.netloc:
            valid_urls.append(url)

    return valid_urls


def check_url(url, timeout=5):
    """
    단일 URL 상태 확인
    - 200: 정상
    - 301/302: 리다이렉트 (보통 괜찮음)
    - 404: 죽은 링크
    - 기타: 문제 있을 수 있음
    """
    try:
        response = requests.head(url, timeout=timeout, allow_redirects=True)
        return {
            "url": url,
            "status": response.status_code,
            "ok": response.status_code < 400,
        }
    except requests.RequestException as e:
        return {
            "url": url,
            "status": 0,
            "ok": False,
            "error": str(e),
        }


def remove_dead_links(content, dead_urls):
    """
    죽은 링크를 본문에서 제거
    - <a> 태그는 텍스트만 남기고 태그 제거
    - 단독 URL은 "[링크 확인 필요]"로 교체
    """
    modified = content

    for url in dead_urls:
        # <a href="url">텍스트</a> → 텍스트
        a_pattern = re.compile(
            rf'<a[^>]*href=["\']?{re.escape(url)}["\']?[^>]*>(.*?)</a>',
            re.DOTALL,
        )
        modified = a_pattern.sub(r'\1', modified)

        # 단독 URL 제거
        modified = modified.replace(url, "")

    return modified


def check_links(article):
    """
    글 전체 링크 체크 (메인 함수)
    - 반환: {"passed": True/False, "dead_links": [...], "fixed_content": "..."}
    """
    content = article.get("content", "")
    title = article.get("title", "")

    print(f"[링크 체크] 시작 - {title}")

    urls = extract_urls(content)
    print(f"[링크 체크] URL {len(urls)}개 발견")

    if not urls:
        return {
            "passed": True,
            "dead_links": [],
            "all_links": [],
            "fixed_content": content,
        }

    dead_links = []
    all_results = []

    for url in urls:
        result = check_url(url)
        all_results.append(result)

        if not result["ok"]:
            dead_links.append(url)
            print(f"  ❌ {url} (상태: {result['status']})")
        else:
            print(f"  ✅ {url}")

    # 죽은 링크 제거된 본문
    fixed_content = content
    if dead_links:
        fixed_content = remove_dead_links(content, dead_links)

    passed = len(dead_links) == 0

    print(f"[링크 체크] 완료 - 죽은 링크: {len(dead_links)}개")

    return {
        "passed": passed,
        "dead_links": dead_links,
        "all_links": all_results,
        "fixed_content": fixed_content,
    }


# 테스트
if __name__ == "__main__":
    test_article = {
        "title": "테스트",
        "content": """
        <p>자세한 내용은 <a href="https://www.gov.kr">정부24</a>에서 확인하세요.</p>
        <p>신청은 https://www.bokjiro.go.kr 에서 가능해요.</p>
        <p>없는 페이지: <a href="https://www.example.com/없는페이지123">여기</a></p>
        """,
    }
    result = check_links(test_article)
    print(f"\n통과: {result['passed']}")
    print(f"죽은 링크: {result['dead_links']}")

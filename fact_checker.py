"""
팩트체크 모듈
- 생성된 글에서 금액, 날짜, 조건 등을 추출해서 웹 검색으로 교차검증
- 틀린 정보가 있으면 경고 반환
"""

import re
import requests
from config import GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_CX


def extract_claims(content):
    """
    글 본문에서 팩트체크 대상 항목을 추출
    - 금액 (예: 300만원, 5000만원)
    - 날짜 (예: 2026년 3월, 3월 31일까지)
    - 퍼센트 (예: 연 3.5%, 최대 90%)
    """
    claims = []

    # 금액 패턴
    money_patterns = re.findall(r'\d+[,.]?\d*\s*(?:만원|억원|원|만\s*원)', content)
    for m in money_patterns:
        claims.append({"type": "금액", "value": m.strip()})

    # 날짜 패턴
    date_patterns = re.findall(r'\d{4}년\s*\d{1,2}월(?:\s*\d{1,2}일)?', content)
    for d in date_patterns:
        claims.append({"type": "날짜", "value": d.strip()})

    # 퍼센트 패턴
    percent_patterns = re.findall(r'(?:연\s*)?\d+\.?\d*\s*%', content)
    for p in percent_patterns:
        claims.append({"type": "비율", "value": p.strip()})

    return claims


def search_google(query, num_results=3):
    """
    Google Custom Search API로 검색
    - 무료 티어: 하루 100회
    - 반환: 검색 결과 스니펫 리스트
    """
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": GOOGLE_SEARCH_API_KEY,
        "cx": GOOGLE_SEARCH_CX,
        "q": query,
        "num": num_results,
        "lr": "lang_ko",  # 한국어 결과만
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get("items", []):
            results.append({
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "url": item.get("link", ""),
            })
        return results

    except requests.RequestException as e:
        print(f"[팩트체크 오류] 구글 검색 실패: {e}")
        return []


def verify_claim(keyword, claim):
    """
    하나의 주장을 검증
    - 키워드 + 주장 값으로 구글 검색
    - 검색 결과 스니펫에 해당 값이 있는지 확인
    """
    query = f"{keyword} {claim['value']}"
    results = search_google(query)

    if not results:
        return {
            "claim": claim,
            "status": "확인불가",
            "reason": "검색 결과 없음",
        }

    # 검색 결과 스니펫에서 비슷한 값이 있는지 체크
    all_snippets = " ".join([r["snippet"] for r in results])
    
    # 숫자만 추출해서 비교 (단위 무시)
    claim_numbers = re.findall(r'\d+', claim["value"])
    
    found = False
    for num in claim_numbers:
        if num in all_snippets:
            found = True
            break

    if found:
        return {
            "claim": claim,
            "status": "일치",
            "reason": "검색 결과에서 유사한 수치 확인됨",
            "sources": [r["url"] for r in results[:2]],
        }
    else:
        return {
            "claim": claim,
            "status": "불일치",
            "reason": f"검색 결과에서 '{claim['value']}' 확인 안 됨",
            "sources": [r["url"] for r in results[:2]],
        }


def fact_check(article):
    """
    글 전체 팩트체크 (메인 함수)
    - 반환: {"passed": True/False, "results": [...], "warnings": [...]}
    """
    keyword = article.get("keyword", "")
    content = article.get("content", "")

    print(f"[팩트체크] 시작 - {article.get('title', '')}")

    claims = extract_claims(content)
    print(f"[팩트체크] 검증 대상 {len(claims)}개 발견")

    if not claims:
        return {
            "passed": True,
            "results": [],
            "warnings": ["검증 대상 항목이 없음 (금액/날짜 미포함)"],
        }

    results = []
    warnings = []

    for claim in claims:
        result = verify_claim(keyword, claim)
        results.append(result)

        if result["status"] == "불일치":
            warnings.append(
                f"⚠️ {claim['type']} '{claim['value']}' - 검색 결과와 불일치"
            )

    # 불일치가 전체의 50% 이상이면 실패
    mismatches = sum(1 for r in results if r["status"] == "불일치")
    passed = mismatches < len(results) * 0.5

    print(f"[팩트체크] 완료 - 통과: {passed}, 경고: {len(warnings)}개")

    return {
        "passed": passed,
        "results": results,
        "warnings": warnings,
    }


# 테스트
if __name__ == "__main__":
    test_article = {
        "title": "2026 청년 전세대출 조건",
        "keyword": "청년 전세대출",
        "content": """
        <p>청년 전세대출 한도는 최대 2억원이에요.</p>
        <p>금리는 연 1.5%~2.1% 수준이고, 2026년 3월부터 신청 가능해요.</p>
        <p>보증금 3억원 이하 주택이 대상이에요.</p>
        """,
    }
    result = fact_check(test_article)
    print(f"\n통과: {result['passed']}")
    for w in result["warnings"]:
        print(f"  {w}")

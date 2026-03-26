"""
키워드 수집 모듈
- 정부 지원금/보조금 관련 새 정책을 감지하고 키워드를 뽑아냄
- 소스: 정부24 API, 복지로, 구글 트렌드
"""

import requests
import json
from datetime import datetime, timedelta
from config import GOV24_API_KEY


def fetch_gov24_policies(page=1, per_page=10):
    """
    정부24 API에서 최근 지원금/보조금 정책을 가져옴
    - 공공데이터포털(data.go.kr)에서 '정부24 보조금24' API 신청 필요
    - 반환: 정책 리스트 [{title, description, target, deadline, url}, ...]
    """
    url = "https://api.odcloud.kr/api/gov24/v3/serviceList"
    params = {
        "serviceKey": GOV24_API_KEY,
        "page": page,
        "perPage": per_page,
        "returnType": "JSON",
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        policies = []
        for item in data.get("data", []):
            policies.append({
                "title": item.get("서비스명", ""),
                "description": item.get("서비스목적요약", ""),
                "target": item.get("지원대상", ""),
                "method": item.get("신청방법", ""),
                "url": item.get("상세조회URL", ""),
                "department": item.get("소관기관명", ""),
            })
        return policies

    except requests.RequestException as e:
        print(f"[키워드 수집 오류] 정부24 API 호출 실패: {e}")
        return []


def generate_keywords_from_policy(policy):
    """
    정책 하나에서 블로그 키워드를 생성
    - 예: "2026 청년 전세대출 조건 신청방법"
    """
    title = policy["title"]
    year = datetime.now().year

    keywords = [
        f"{year} {title} 조건",
        f"{year} {title} 신청방법",
        f"{year} {title} 대상",
        f"{title} 자격요건 총정리",
        f"{title} 신청기간 {year}",
    ]
    return keywords


def get_manual_keywords():
    """
    수동으로 관리하는 키워드 리스트
    - API가 안 될 때 백업용
    - 직접 추가/삭제 가능
    """
    return [
        "2026 청년 전세대출 조건 신청방법",
        "2026 청년도약계좌 가입조건 혜택",
        "2026 근로장려금 신청기간 지급일",
        "2026 육아휴직 급여 인상 변경사항",
        "2026 소상공인 정책자금 대출 조건",
        "2026 기초연금 수급자격 금액",
        "2026 주거급여 신청자격 지급액",
        "2026 국민취업지원제도 신청방법",
        "2026 자녀장려금 조건 지급일",
        "2026 청년월세 지원금 신청방법",
    ]


def get_keywords(use_api=True):
    """
    키워드를 가져오는 메인 함수
    - use_api=True: 정부24 API에서 자동 수집
    - use_api=False: 수동 키워드 리스트 사용
    """
    if use_api:
        policies = fetch_gov24_policies(per_page=20)
        if policies:
            all_keywords = []
            for policy in policies:
                all_keywords.extend(generate_keywords_from_policy(policy))
            return all_keywords

    # API 실패 시 또는 수동 모드
    return get_manual_keywords()


# 테스트
if __name__ == "__main__":
    print("=== 수동 키워드 목록 ===")
    for kw in get_manual_keywords():
        print(f"  - {kw}")

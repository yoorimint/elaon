"""
글 생성 모듈 (섹션별 생성 방식)
- Gemini API를 사용해서 블로그 글을 섹션별로 나눠 생성
- 섹션 4개 × 1500자 = 총 6000자 이상
- 이전 섹션을 컨텍스트로 넘겨서 문맥 연결
"""

import requests
import json
import re
from config import GEMINI_API_KEY, GEMINI_MODEL, SECTION_LENGTH


# ============================================================
# 섹션 정의
# ============================================================
SECTIONS = [
    {
        "name": "도입 + 자격조건",
        "instruction": """
첫 번째 섹션을 작성해주세요.

[내용]
- 첫 문장에서 바로 핵심 정보 (누가, 얼마, 언제)
- 이 제도가 뭔지 2~3문장으로 설명
- 자격 조건 상세 (나이, 소득, 자산, 주택 조건 등)
- 조건별로 해당/비해당 사례 예시

[분량] {length}자 이상
""",
    },
    {
        "name": "지원 내용 + 금액 상세",
        "instruction": """
두 번째 섹션을 작성해주세요.

[내용]
- 지원 금액 (최소~최대)
- 금리 또는 지원 비율
- 지원 기간
- 기존 제도와 달라진 점 (올해 변경사항)
- 구체적 계산 예시 (예: "연소득 3000만원인 A씨의 경우...")

[분량] {length}자 이상

[이전 섹션 - 문맥 이어서 작성]
{prev_content}
""",
    },
    {
        "name": "신청 방법 단계별",
        "instruction": """
세 번째 섹션을 작성해주세요.

[내용]
- 신청 방법 단계별 설명 (1단계, 2단계...)
- 온라인 신청 경로 (어떤 사이트, 어떤 메뉴)
- 오프라인 신청 가능 여부
- 필요 서류 목록
- 서류 준비 팁 (어디서 발급, 유효기간 등)

[분량] {length}자 이상

[이전 섹션 - 문맥 이어서 작성]
{prev_content}
""",
    },
    {
        "name": "주의사항 + 자주 묻는 질문",
        "instruction": """
마지막 섹션을 작성해주세요.

[내용]
- 신청 시 흔한 실수 3~5가지
- 거절 사유 Top 3
- 자주 묻는 질문 5개 (Q&A 형식)
- 관련 제도 안내 (이것도 해당되면 같이 신청할 것)
- 마무리는 실용적 팁으로 (뻔한 "도움이 되셨길" 금지)

[분량] {length}자 이상

[이전 섹션 - 문맥 이어서 작성]
{prev_content}
""",
    },
]


def build_section_prompt(keyword, section, prev_content=""):
    """섹션별 프롬프트 생성"""
    instruction = section["instruction"].format(
        length=SECTION_LENGTH,
        prev_content=prev_content[-2000:] if prev_content else "(첫 번째 섹션이므로 없음)",
    )

    prompt = f"""
당신은 한국 정부 지원금/정책대출 전문 블로거입니다.
아래 키워드로 블로그 글의 한 섹션을 작성해주세요.

키워드: {keyword}
현재 섹션: {section['name']}

[필수 규칙]
1. HTML 태그로 작성 (<h2>, <h3>, <p>, <ul>, <li> 사용)
2. "~에 대해 알아보겠습니다", "~할 수 있습니다" 같은 AI 투 표현 금지
3. 구어체로 작성 ("~해요", "~이에요", "~거든요")
4. 구체적인 금액, 날짜, 조건 반드시 포함
5. "결론적으로", "마무리하며" 같은 뻔한 표현 금지
6. "또한,", "아울러,", "뿐만 아니라" 같은 AI 연결어 금지
7. 이전 섹션과 자연스럽게 이어지도록 작성
8. HTML 코드만 반환 (다른 설명 없이)

{instruction}
"""
    return prompt


def build_meta_prompt(keyword, full_content):
    """제목, 메타디스크립션, 태그 생성 프롬프트"""
    prompt = f"""
아래 블로그 글의 제목, 메타디스크립션, 태그를 만들어주세요.

키워드: {keyword}

[글 내용 요약]
{full_content[:1500]}

[규칙]
1. 반드시 아래 JSON 형식으로만 응답 (다른 텍스트 없이)
2. 제목: 키워드 포함, 클릭 유도형, 30자 이내
3. 메타디스크립션: 155자 이내, 키워드 포함
4. 태그: 관련 태그 5개

[JSON 형식]
{{
    "title": "글 제목",
    "meta_description": "메타 디스크립션",
    "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]
}}
"""
    return prompt


def call_gemini_api(prompt):
    """Gemini API 호출"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

    params = {"key": GEMINI_API_KEY}

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.8,
            "topP": 0.95,
            "maxOutputTokens": 4096,
        },
    }

    try:
        response = requests.post(url, params=params, json=body, timeout=30)
        response.raise_for_status()
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return text

    except requests.RequestException as e:
        print(f"[글 생성 오류] Gemini API 호출 실패: {e}")
        return None
    except (KeyError, IndexError) as e:
        print(f"[글 생성 오류] 응답 파싱 실패: {e}")
        return None


def clean_html(text):
    """Gemini 응답에서 불필요한 마크다운 래퍼 제거"""
    if not text:
        return ""
    cleaned = re.sub(r'```html\s*', '', text)
    cleaned = re.sub(r'```\s*', '', cleaned)
    return cleaned.strip()


def generate_article(keyword):
    """
    키워드로 블로그 글 생성 (메인 함수)
    - 4개 섹션을 순차 생성 → 합침
    - 반환: {"title", "content", "meta_description", "tags", "keyword"}
    """
    print(f"[글 생성] 키워드: {keyword}")
    print(f"[글 생성] 섹션 {len(SECTIONS)}개 순차 생성 시작")

    all_sections = []
    accumulated_content = ""

    for i, section in enumerate(SECTIONS, 1):
        print(f"  [{i}/{len(SECTIONS)}] {section['name']} 생성 중...")

        prompt = build_section_prompt(keyword, section, accumulated_content)
        response = call_gemini_api(prompt)

        if not response:
            print(f"  → {section['name']} 생성 실패")
            return None

        section_html = clean_html(response)
        all_sections.append(section_html)
        accumulated_content += "\n" + section_html

        print(f"  → {section['name']} 완료 ({len(section_html)}자)")

    # 섹션 합치기
    full_content = "\n\n".join(all_sections)
    total_length = len(full_content)
    print(f"[글 생성] 전체 본문: {total_length}자")

    # 제목 + 메타 생성
    print("[글 생성] 제목/메타 생성 중...")
    meta_response = call_gemini_api(build_meta_prompt(keyword, full_content))

    if not meta_response:
        title = keyword
        meta_description = keyword
        tags = []
    else:
        cleaned = re.sub(r'```json\s*', '', meta_response)
        cleaned = re.sub(r'```\s*', '', cleaned).strip()
        try:
            meta = json.loads(cleaned)
            title = meta.get("title", keyword)
            meta_description = meta.get("meta_description", keyword)
            tags = meta.get("tags", [])
        except json.JSONDecodeError:
            title = keyword
            meta_description = keyword
            tags = []

    article = {
        "title": title,
        "content": full_content,
        "meta_description": meta_description,
        "tags": tags,
        "keyword": keyword,
    }

    print(f"[글 생성] 완료 - 제목: {title} ({total_length}자)")
    return article


# 테스트
if __name__ == "__main__":
    test_keyword = "2026 디딤돌대출 조건 신청방법"
    result = generate_article(test_keyword)
    if result:
        print(f"\n제목: {result['title']}")
        print(f"메타: {result['meta_description']}")
        print(f"태그: {result['tags']}")
        print(f"본문 길이: {len(result['content'])}자")
    else:
        print("글 생성 실패")

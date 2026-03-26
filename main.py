"""
메인 파이프라인
- 전체 자동화 흐름 실행
- 키워드 수집 → 글 생성(섹션별) → AI 탐지 → 팩트체크 → 링크 체크 → 썸네일 → GitHub push

사용법:
    python main.py                    # 수동 키워드 1개로 테스트 (업로드 없이)
    python main.py --count 5          # 5개 글 생성
    python main.py --keyword "키워드"  # 특정 키워드로 글 생성
    python main.py --api              # 정부24 API에서 키워드 자동 수집
    python main.py --no-upload        # GitHub push 없이 로컬 테스트
"""

import argparse
import json
import os
from datetime import datetime

from keyword_fetcher import get_keywords
from content_generator import generate_article
from fact_checker import fact_check
from ai_detector import detect_ai
from link_checker import check_links
from thumbnail import create_thumbnail
from github_uploader import upload_post
from config import MAX_RETRY


LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")


def save_log(keyword, result):
    """처리 결과를 로그 파일로 저장"""
    os.makedirs(LOG_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_kw = keyword[:20].replace(" ", "_")
    filepath = os.path.join(LOG_DIR, f"{timestamp}_{safe_kw}.json")

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    return filepath


def save_local_html(article):
    """GitHub push 없이 로컬에 HTML 저장 (테스트용)"""
    from github_uploader import build_blog_html, make_slug

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    slug = make_slug(article["title"])
    filepath = os.path.join(OUTPUT_DIR, f"{slug}.html")

    html = build_blog_html(article)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"[로컬 저장] {filepath}")
    return filepath


def process_one_keyword(keyword, upload=True):
    """
    키워드 하나에 대해 전체 파이프라인 실행

    1. 글 생성 (Gemini, 섹션별)
    2. AI 탐지 검사 → 실패 시 재생성
    3. 팩트체크 → 경고만 (발행은 함)
    4. 링크 체크 → 죽은 링크 자동 제거
    5. 썸네일 생성
    6. GitHub push (또는 로컬 저장)
    """
    print("\n" + "=" * 60)
    print(f"📝 키워드: {keyword}")
    print("=" * 60)

    result = {
        "keyword": keyword,
        "timestamp": datetime.now().isoformat(),
        "steps": {},
        "final_status": "실패",
    }

    # ── 1단계: 글 생성 ──────────────────────────────────
    article = None
    for attempt in range(1, MAX_RETRY + 1):
        print(f"\n[1단계] 글 생성 (시도 {attempt}/{MAX_RETRY})")
        article = generate_article(keyword)

        if not article:
            print("  → 글 생성 실패, 재시도...")
            continue

        # ── 2단계: AI 탐지 검사 ─────────────────────────
        print(f"\n[2단계] AI 탐지 검사")
        ai_result = detect_ai(article)
        result["steps"]["ai_detection"] = ai_result

        if ai_result["passed"]:
            print("  → AI 탐지 통과!")
            break
        else:
            print(f"  → AI 탐지 실패 (점수: {ai_result['score']}), 재생성...")
            article = None

    if not article:
        print("\n❌ 글 생성 실패 (최대 시도 횟수 초과)")
        result["final_status"] = "글 생성 실패"
        save_log(keyword, result)
        return result

    result["steps"]["content_generation"] = {
        "title": article["title"],
        "content_length": len(article["content"]),
    }

    # ── 3단계: 팩트체크 ─────────────────────────────────
    print(f"\n[3단계] 팩트체크")
    fc_result = fact_check(article)
    result["steps"]["fact_check"] = {
        "passed": fc_result["passed"],
        "warnings": fc_result["warnings"],
    }

    if not fc_result["passed"]:
        print("  ⚠️ 팩트체크 경고 있음 (발행 시 확인 필요)")
        for w in fc_result["warnings"]:
            print(f"    {w}")

    # ── 4단계: 링크 체크 ────────────────────────────────
    print(f"\n[4단계] 링크 체크")
    lc_result = check_links(article)
    result["steps"]["link_check"] = {
        "passed": lc_result["passed"],
        "dead_links": lc_result["dead_links"],
    }

    if not lc_result["passed"]:
        article["content"] = lc_result["fixed_content"]
        print("  → 죽은 링크 자동 제거 완료")

    # ── 5단계: 썸네일 생성 ──────────────────────────────
    print(f"\n[5단계] 썸네일 생성")
    thumbnail_path = create_thumbnail(article["title"])
    result["steps"]["thumbnail"] = {"path": thumbnail_path}

    # ── 6단계: 업로드 또는 로컬 저장 ────────────────────
    if upload:
        print(f"\n[6단계] GitHub push")
        gh_result = upload_post(article, thumbnail_path)
        result["steps"]["github_upload"] = gh_result

        if gh_result["success"]:
            result["final_status"] = "성공"
            print(f"\n✅ 완료! 글 URL: {gh_result['post_url']}")
        else:
            result["final_status"] = "GitHub push 실패"
    else:
        local_path = save_local_html(article)
        result["steps"]["local_save"] = {"path": local_path}
        result["final_status"] = "성공 (로컬 저장)"
        print(f"\n✅ 로컬 저장 완료!")

    log_path = save_log(keyword, result)
    print(f"📋 로그: {log_path}")

    return result


def main():
    """메인 실행"""
    parser = argparse.ArgumentParser(description="블로그 자동화 파이프라인")
    parser.add_argument("--keyword", type=str, help="특정 키워드로 글 생성")
    parser.add_argument("--count", type=int, default=1, help="생성할 글 수 (기본: 1)")
    parser.add_argument("--api", action="store_true", help="정부24 API에서 키워드 자동 수집")
    parser.add_argument("--no-upload", action="store_true", help="GitHub push 건너뛰기 (테스트용)")
    args = parser.parse_args()

    print("🚀 블로그 자동화 파이프라인 시작")
    print(f"   시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   모드: {'로컬 테스트' if args.no_upload else 'GitHub push'}")

    if args.keyword:
        keywords = [args.keyword]
    else:
        keywords = get_keywords(use_api=args.api)

    keywords = keywords[:args.count]
    print(f"   키워드: {len(keywords)}개")

    results = []
    for i, keyword in enumerate(keywords, 1):
        print(f"\n{'━' * 60}")
        print(f"  [{i}/{len(keywords)}] 처리 중...")
        print(f"{'━' * 60}")

        result = process_one_keyword(keyword, upload=not args.no_upload)
        results.append(result)

    # 최종 요약
    print(f"\n{'═' * 60}")
    print("📊 최종 결과")
    print(f"{'═' * 60}")

    success = sum(1 for r in results if "성공" in r["final_status"])
    failed = len(results) - success

    print(f"  전체: {len(results)}개 | 성공: {success}개 | 실패: {failed}개")

    for r in results:
        icon = "✅" if "성공" in r["final_status"] else "❌"
        print(f"  {icon} {r['keyword']} → {r['final_status']}")


if __name__ == "__main__":
    main()

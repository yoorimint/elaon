"""
썸네일 생성 모듈
- Pillow로 텍스트 기반 썸네일 자동 생성
- 정부 지원금 블로그에 맞는 깔끔한 디자인
"""

from PIL import Image, ImageDraw, ImageFont
import os
import re
from config import (
    THUMBNAIL_WIDTH,
    THUMBNAIL_HEIGHT,
    THUMBNAIL_BG_COLOR,
    THUMBNAIL_TEXT_COLOR,
    THUMBNAIL_FONT_SIZE,
)


# 썸네일 저장 경로
THUMBNAIL_DIR = os.path.join(os.path.dirname(__file__), "thumbnails")


def hex_to_rgb(hex_color):
    """HEX 색상을 RGB 튜플로 변환"""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def get_font(size):
    """
    시스템에서 한글 폰트 찾기
    - 리눅스/맥/윈도우 각각 다른 경로
    """
    font_paths = [
        # 리눅스
        "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansKR-Bold.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
        # 맥
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "/Library/Fonts/NanumGothicBold.ttf",
        # 윈도우
        "C:/Windows/Fonts/malgunbd.ttf",
        "C:/Windows/Fonts/NanumGothicBold.ttf",
    ]

    for path in font_paths:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)

    # 폰트 못 찾으면 기본 폰트 (한글 깨질 수 있음)
    print("[썸네일 경고] 한글 폰트를 찾을 수 없어 기본 폰트 사용")
    return ImageFont.load_default()


def wrap_text(text, font, max_width, draw):
    """
    텍스트를 썸네일 너비에 맞게 줄바꿈
    """
    words = list(text)  # 한글은 글자 단위로 분리
    lines = []
    current_line = ""

    for char in words:
        test_line = current_line + char
        bbox = draw.textbbox((0, 0), test_line, font=font)
        width = bbox[2] - bbox[0]

        if width <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = char

    if current_line:
        lines.append(current_line)

    return lines


def create_thumbnail(title, output_path=None):
    """
    썸네일 생성 (메인 함수)
    - title: 글 제목
    - output_path: 저장 경로 (없으면 자동 생성)
    - 반환: 저장된 파일 경로
    """
    # 저장 디렉토리 생성
    os.makedirs(THUMBNAIL_DIR, exist_ok=True)

    if not output_path:
        # 파일명: 제목에서 특수문자 제거
        safe_name = re.sub(r'[^\w가-힣]', '_', title)[:50]
        output_path = os.path.join(THUMBNAIL_DIR, f"{safe_name}.png")

    # 이미지 생성
    bg_color = hex_to_rgb(THUMBNAIL_BG_COLOR)
    text_color = hex_to_rgb(THUMBNAIL_TEXT_COLOR)

    img = Image.new("RGB", (THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT), bg_color)
    draw = ImageDraw.Draw(img)

    # 상단에 얇은 포인트 라인
    accent_color = (255, 200, 50)  # 노란색 포인트
    draw.rectangle(
        [(0, 0), (THUMBNAIL_WIDTH, 8)],
        fill=accent_color,
    )

    # 제목 텍스트
    font = get_font(THUMBNAIL_FONT_SIZE)
    padding = 80
    max_text_width = THUMBNAIL_WIDTH - (padding * 2)

    lines = wrap_text(title, font, max_text_width, draw)

    # 텍스트 세로 중앙 정렬
    line_height = THUMBNAIL_FONT_SIZE + 15
    total_text_height = len(lines) * line_height
    start_y = (THUMBNAIL_HEIGHT - total_text_height) // 2

    for i, line in enumerate(lines):
        y = start_y + (i * line_height)
        draw.text((padding, y), line, font=font, fill=text_color)

    # 하단에 블로그명 (선택)
    small_font = get_font(24)
    blog_name = "정부지원금 가이드"  # 원하는 블로그명으로 변경
    draw.text(
        (padding, THUMBNAIL_HEIGHT - 60),
        blog_name,
        font=small_font,
        fill=(200, 200, 200),
    )

    # 저장
    img.save(output_path, "PNG", quality=95)
    print(f"[썸네일] 생성 완료: {output_path}")

    return output_path


# 테스트
if __name__ == "__main__":
    test_titles = [
        "2026 청년 전세대출 조건 총정리",
        "근로장려금 신청기간 놓치면 끝!",
        "소상공인 정책자금, 이것만 알면 됨",
    ]

    for title in test_titles:
        create_thumbnail(title)
        print()

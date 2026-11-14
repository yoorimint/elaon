-- 노션 연동 (2026-11-14): 노션 "쇼핑 글" 데이터베이스 → 사이트 쇼핑 글
-- Supabase SQL Editor 에서 한 번 실행 (여러 번 실행해도 안전). supabase/shop.sql 에도 같은 내용이 반영돼 있다.
--
-- 1) 노션 토큰(NOTION_TOKEN)을 관리자 화면에서 저장할 수 있게 허용 키 이름에 추가
--    (저장 방식은 기존 API 키와 같음: 화면에는 끝 4자리만, 원문은 서버·GitHub Actions 만 service role 로 읽음)
create or replace function public.shop_secret_names()
returns text[] language sql immutable as $$
  select array[
    'COUPANG_ACCESS_KEY', 'COUPANG_SECRET_KEY',
    'GEMINI_API_KEY', 'ANTHROPIC_API_KEY',
    'NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET',
    'YOUTUBE_API_KEY',
    'NOTION_TOKEN'
  ];
$$;

-- 2) 동기화 상태: 노션 데이터베이스 id, 같은 이유로 실패한 페이지 기억, 마지막 실행 결과(관리자 화면 표시)
--    읽기·쓰기 권한은 shop_config 의 기존 정책 그대로 (관리자 읽기, 스크립트는 service role)
alter table public.shop_config add column if not exists notion_sync jsonb not null default '{}'::jsonb;

-- 노션 → 사이트 예약 실행 (2026-11-14, 사장님 결정 B안 → 발행 시각·편수는 관리자 화면에서 설정)
-- Supabase SQL Editor 에 통째로 붙여넣어 한 번 실행 (여러 번 실행해도 안전 — 비밀값·발행 일정은 유지, 작업은 다시 등록).
-- 먼저 supabase/shop.sql·supabase/shop-notion.sql 이 실행돼 있어야 한다 (shop_secrets 표·notion_sync 칸).
--
-- 왜: GitHub Actions 예약 실행이 이 저장소에서 수시간씩 누락돼(2026-11-13 18:48Z 이후 7시간 동안 0회),
--     예약 실행을 Supabase 안(pg_cron)으로 옮긴다. pg_net 으로 사이트 API 를 부르면 사이트(Vercel)가 동기화를 돌린다.
-- 언제: 매시 정각 (pg_cron "0 * * * *"). 사이트가 매번 이미 공개된 글의 수정·내림을 반영하고,
--       지금이 "발행 시각"이면(관리자 /admin/shop → 📒 노션 탭 "발행 일정", 한국시간) 새 글을 정한 편수만큼 공개한다.
--       발행 시각·편수를 바꿀 때는 이 SQL 을 다시 실행할 필요 없음 — 화면에서 저장하면 다음 정각부터 반영.
--       같은 시에 실행이 두 번 와도 그 시의 편수를 넘지 않는다 (사이트가 기록).
-- 인증: 아래 3)이 DB 안에서 랜덤 비밀값을 만들어 shop_secrets 에 넣는다 (service role·DB 안에서만 읽힘, 사장님이 복사할 필요 없음).
--       작업이 실행될 때마다 그 값을 x-notion-cron-secret 헤더로 보내고, API 는 같은 값인지 확인한다.
--       관리자 화면의 키 저장 허용 목록(shop_secret_names)에는 넣지 않는다 — 화면에서 덮어쓰거나 지울 수 없게.

-- 1) 확장 켜기 (Supabase 공식 문서의 SQL 그대로. 대시보드 Integrations → Cron / Database → Extensions → pg_net 에서 켜도 같다)
-- 확장은 SQL 대신 대시보드에서 켠다: Integrations → Cron (pg_cron), Database → Extensions → pg_net.
-- (2026-11-14 실제 실행 결과: SQL 로 pg_cron 을 켜면서 cron 스키마 권한을 직접 grant 하면 Supabase 의 권한 설정 트리거와
--  충돌해 "2BP01: dependent privileges exist" 로 전체가 실패했다. 대시보드에서 켜면 Supabase 가 권한을 알아서 맞춘다.)
-- 이미 켜져 있으면 아래 두 줄은 아무 일도 안 한다 (권한 grant 는 하지 않는다).
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 2) 발행 일정 저장 칸 (기본: 한국시간 새벽 1시·오전 9시·오후 5시, 한 번에 1편 — 예전 8시간마다 1편과 같음)
--    hours = 한국시간 0~23 목록(비우면 자동 발행 안 함), perRun = 한 번에 공개할 글 수(1~5). 이미 있으면 그대로 둔다
--    읽기·쓰기 권한은 shop_config 의 기존 정책 그대로 (관리자만 읽기·수정, 사이트 서버는 service role 로 읽기)
alter table public.shop_config add column if not exists notion_schedule jsonb not null
  default '{"hours": [1, 9, 17], "perRun": 1}'::jsonb;

-- 3) 예약 실행 비밀값 (이미 있으면 그대로 둔다). gen_random_uuid() 2개 = 64자, 추측 불가능한 난수
insert into public.shop_secrets (name, value, updated_at)
values (
  'NOTION_CRON_SECRET',
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  now()
)
on conflict (name) do nothing;

-- 4) 예약 작업 등록 (같은 이름이 있으면 지우고 다시). 비밀값은 작업 내용에 적지 않고 실행할 때마다 표에서 읽는다
select cron.unschedule(jobid) from cron.job where jobname = 'shop-notion-sync';
select cron.schedule(
  'shop-notion-sync',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://www.eloan.kr/api/shop/notion-sync',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-notion-cron-secret', (select value from public.shop_secrets where name = 'NOTION_CRON_SECRET')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- 5) 확인: 작업 1줄(schedule = 0 * * * *, active = true), 비밀값 끝 4자리, 발행 일정이 보이면 끝
select jobid, jobname, schedule, active from cron.job where jobname = 'shop-notion-sync';
select name, '••••' || right(value, 4) as hint, updated_at from public.shop_secrets where name = 'NOTION_CRON_SECRET';
select notion_schedule from public.shop_config where id = 1;

-- (나중에 실행 결과 보기 — 필요할 때만 따로 실행)
-- select status, return_message, start_time from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'shop-notion-sync') order by start_time desc limit 5;
-- select id, status_code, timed_out, error_msg, left(content, 300), created from net._http_response order by created desc limit 5;
--   status_code 200 = 실행됨 (결과는 관리자 화면 노션 탭 "마지막 예약 실행"), 403 = 비밀값 불일치, 400 = 노션 토큰 없음.
--   매시간 실행이라 기록이 하루 24줄씩 쌓인다 (cron.job_run_details — 많아지면 Supabase 문서의 정리 방법 참고).
--   응답 기록은 6시간만 남는다.
-- (멈추기) select cron.unschedule('shop-notion-sync');

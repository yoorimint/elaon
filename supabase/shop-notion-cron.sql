-- 노션 → 사이트 예약 실행 (2026-11-14, 사장님 결정 B안)
-- Supabase SQL Editor 에 통째로 붙여넣어 한 번 실행 (여러 번 실행해도 안전 — 비밀값은 유지, 작업은 다시 등록).
-- 먼저 supabase/shop.sql·supabase/shop-notion.sql 이 실행돼 있어야 한다 (shop_secrets 표·notion_sync 칸).
--
-- 왜: GitHub Actions 예약 실행이 이 저장소에서 수시간씩 누락돼(2026-11-13 18:48Z 이후 7시간 동안 0회),
--     예약 실행을 Supabase 안(pg_cron)으로 옮긴다. pg_net 으로 사이트 API 를 부르면 사이트(Vercel)가 동기화를 돌린다.
-- 언제: 8시간마다 — UTC 0·8·16시 = 한국시간 오전 9시·오후 5시·새벽 1시 (pg_cron 시각은 UTC).
--       시각을 바꾸면 src/lib/notion-sync.ts 의 SCHEDULE_UTC_HOURS 도 같이 바꾼다 (대기 글 "예정 약 …" 계산용).
-- 인증: 아래 2)가 DB 안에서 랜덤 비밀값을 만들어 shop_secrets 에 넣는다 (service role·DB 안에서만 읽힘, 사장님이 복사할 필요 없음).
--       작업이 실행될 때마다 그 값을 x-notion-cron-secret 헤더로 보내고, API 는 같은 값인지 확인한다.
--       관리자 화면의 키 저장 허용 목록(shop_secret_names)에는 넣지 않는다 — 화면에서 덮어쓰거나 지울 수 없게.

-- 1) 확장 켜기 (Supabase 공식 문서의 SQL 그대로. 대시보드 Integrations → Cron / Database → Extensions → pg_net 에서 켜도 같다)
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
create extension if not exists pg_net with schema extensions;

-- 2) 예약 실행 비밀값 (이미 있으면 그대로 둔다). gen_random_uuid() 2개 = 64자, 추측 불가능한 난수
insert into public.shop_secrets (name, value, updated_at)
values (
  'NOTION_CRON_SECRET',
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  now()
)
on conflict (name) do nothing;

-- 3) 예약 작업 등록 (같은 이름이 있으면 지우고 다시). 비밀값은 작업 내용에 적지 않고 실행할 때마다 표에서 읽는다
select cron.unschedule(jobid) from cron.job where jobname = 'shop-notion-sync';
select cron.schedule(
  'shop-notion-sync',
  '0 0,8,16 * * *',
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

-- 4) 확인: 작업 1줄(active = true)과 비밀값 끝 4자리가 보이면 끝
select jobid, jobname, schedule, active from cron.job where jobname = 'shop-notion-sync';
select name, '••••' || right(value, 4) as hint, updated_at from public.shop_secrets where name = 'NOTION_CRON_SECRET';

-- (나중에 실행 결과 보기 — 필요할 때만 따로 실행)
-- select status, return_message, start_time from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'shop-notion-sync') order by start_time desc limit 5;
-- select id, status_code, timed_out, error_msg, left(content, 300), created from net._http_response order by created desc limit 5;
--   status_code 200 = 실행됨 (결과는 관리자 화면 노션 탭 "마지막 예약 실행"), 403 = 비밀값 불일치, 400 = 노션 토큰 없음.
--   응답 기록은 6시간만 남는다.
-- (멈추기) select cron.unschedule('shop-notion-sync');

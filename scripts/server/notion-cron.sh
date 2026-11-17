#!/usr/bin/env bash
# 매시 노션 → 사이트 동기화를 서버 안에서 직접 부른다 (배포 계정 eloan 의 crontab, 매시 2분).
# 설치·갱신은 배포가 한다 (.github/workflows/deploy.yml "Install schedule") — 서버에서 손으로 고치지 않는다.
#
# 왜 서버 안에서: 2026-11-16 iwinv 로 옮긴 뒤 Supabase pg_cron(net.http_post)의 매시 요청이 사이트에 오지 않았다
# (옛 Vercel 주소를 기억하는 DNS 로 추정 — Supabase 쪽 기록은 SQL 로만 볼 수 있어 확인 못 함).
# 같은 서버의 127.0.0.1 로 부르면 DNS·인증서·외부 서비스 상태와 상관없이 돈다.
# pg_cron 이 다시 닿아도(정각) 이 실행(2분)과 겹치지 않고, 같은 시 발행 편수는 사이트가 한 번만 센다.
#
# 비밀값: 배포가 .env 에 NOTION_CRON_SECRET(= shop_secrets 의 값)을 적어 둔다. 명령줄에 안 보이게 curl 설정으로 넘긴다.
# 기록: 시각·응답코드·걸린 시간만 notion-cron.log 에 (최근 500줄). 운영 점검(ops-check)이 끝부분을 보여 준다.
#       서버 송신 누적 바이트를 traffic.log 에 (최근 9일, 아래 record_traffic) — 관리자 화면 사용량 카드가 읽는다.
set -u

APP_DIR="${ELOAN_APP_DIR:-/srv/eloan/app}"
LOG="${ELOAN_CRON_LOG:-/srv/eloan/notion-cron.log}"
URL="${ELOAN_SYNC_URL:-http://127.0.0.1:3100/api/shop/notion-sync}"

now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ---- 서버 바깥 트래픽 기록 (관리자 화면 "사용량" 카드 — src/lib/server-traffic.ts) ----
# /proc/net/dev 의 송신 바이트는 부팅 뒤 누적값이라, 매시 `<UTC 시각> <tx 바이트>` 를 남겨 두면 "오늘·어제"를 낼 수 있다.
# 동기화 성공·실패와 상관없이 맨 먼저 기록한다. 최근 9일치만 남긴다.
# 인터페이스 고르는 규칙은 server-traffic.ts parseProcNetDev 와 같다: lo 제외, en·eth 로 시작하는 것 중 송신 최대 (없으면 전체 중 최대)
TRAFFIC_LOG="${ELOAN_TRAFFIC_LOG:-/srv/eloan/traffic.log}"
PROC_NET_DEV="${ELOAN_PROC_NET_DEV:-/proc/net/dev}"
record_traffic() {
  local tx cutoff
  tx="$(awk '
    NR > 2 {
      line = $0; sub(/:/, " ", line); n = split(line, f, " ")
      if (n < 10 || f[1] == "lo") next
      pref = (f[1] ~ /^(en|eth)/)
      if (pref && (!bestPref || f[10] + 0 > bestPrefTx + 0)) { bestPref = 1; bestPrefTx = f[10] }
      if (!seen || f[10] + 0 > bestTx + 0) { seen = 1; bestTx = f[10] }
    }
    END { if (bestPref) print bestPrefTx; else if (seen) print bestTx }
  ' "$PROC_NET_DEV" 2>/dev/null)"
  case "$tx" in '' | *[!0-9]*) return 0 ;; esac
  echo "$now $tx" >> "$TRAFFIC_LOG" || return 0
  # 9일 넘은 줄 정리 (시각이 같은 형식이라 글자 비교로 충분). date -d 가 안 되면 줄 수로만 자른다
  cutoff="$(date -u -d '9 days ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null)"
  awk -v cut="$cutoff" 'cut == "" || $1 >= cut' "$TRAFFIC_LOG" | tail -n 1000 > "$TRAFFIC_LOG.tmp" && mv "$TRAFFIC_LOG.tmp" "$TRAFFIC_LOG"
}
record_traffic || true

secret="$(grep -m1 '^NOTION_CRON_SECRET=' "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)"
if [ -z "$secret" ]; then
  echo "$now 실패: .env 에 NOTION_CRON_SECRET 없음" >> "$LOG"
  exit 1
fi

# 동기화는 30~40초 걸린다 (노션 조회·사진 복사). 넉넉히 3분까지 기다린다
result="$(printf 'header = "x-notion-cron-secret: %s"\n' "$secret" | curl -s -m 180 -K - \
  -o /dev/null -w '%{http_code} %{time_total}s' \
  -X POST "$URL" -H 'content-type: application/json' -d '{}')" || true
echo "$now ${result:-응답 없음}" >> "$LOG"

tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
case "$result" in 200*) exit 0 ;; *) exit 1 ;; esac

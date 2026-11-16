#!/usr/bin/env python3
# GitHub Secrets 의 IWINV_SSH_KEY 를 ~/.ssh/deploy_key 로 쓴다 (deploy.yml·ops-check.yml 공용).
# 휴대폰·웹 콘솔에서 복사하면 줄바꿈이 빠지거나 공백·\r 이 섞여 "error in libcrypto" 로 실패한다
# (2026-11-16 첫 배포에서 실제로 겪음) → 공백을 모두 지우고 70자씩 다시 줄을 맞춰 원래 모양으로 되살린다.
# 키 파일을 base64 한 줄로 넣어도 받는다.
import base64, os, re, textwrap
# 공백·줄바꿈을 전부 지운 뒤 찾는다 (BEGIN/END 표시 줄 안에서 줄이 끊겨도 찾게)
pat = r"-----BEGINOPENSSHPRIVATEKEY-----(.*?)-----ENDOPENSSHPRIVATEKEY-----"
compact = re.sub(r"\s", "", os.environ["IWINV_SSH_KEY"])
m = re.search(pat, compact)
if not m:
    try:
        m = re.search(pat, re.sub(r"\s", "", base64.b64decode(compact).decode()))
    except Exception:
        m = None
if not m:
    raise SystemExit("IWINV_SSH_KEY 형식이 아니에요: -----BEGIN OPENSSH PRIVATE KEY----- 부터 END 줄까지 전부 넣어 주세요")
body = "\n".join(textwrap.wrap(m.group(1), 70))
path = os.path.expanduser("~/.ssh/deploy_key")
with open(path, "w") as f:
    f.write(f"-----BEGIN OPENSSH PRIVATE KEY-----\n{body}\n-----END OPENSSH PRIVATE KEY-----\n")
os.chmod(path, 0o600)

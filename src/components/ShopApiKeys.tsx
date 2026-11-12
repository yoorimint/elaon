"use client";

// 쿠팡 자동글 API 키 입력. 저장된 키 원문은 서버가 돌려주지 않으므로
// 화면에는 끝 4자리만 보이고, 수정은 "새 값으로 덮어쓰기" 방식이다.

import { useCallback, useEffect, useState } from "react";
import { timeAgo } from "@/lib/community";
import {
  API_KEY_GROUPS,
  getSecretStatus,
  setSecret,
  type SecretName,
  type SecretStatus,
} from "@/lib/shop-config";

type StatusMap = Partial<Record<SecretName, SecretStatus>>;

export function ShopApiKeys() {
  const [status, setStatus] = useState<StatusMap>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setStatus(await getSecretStatus());
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
      <h2 className="font-bold">API 키</h2>
      <p className="mt-1 text-xs text-neutral-500">
        저장한 키는 다시 볼 수 없고 끝 4자리만 표시됩니다. 바꾸려면 새 값을 입력해 저장하세요.
      </p>
      {loadError && (
        <p className="mt-3 text-sm text-red-600">키 상태 불러오기 실패: {loadError}</p>
      )}

      <div className="mt-4 space-y-5">
        {API_KEY_GROUPS.map((g) => (
          <div key={g.label}>
            <div className="text-sm font-semibold">
              {g.label}
              <span className="ml-2 text-xs font-normal text-neutral-500">
                {g.required ? "필수" : "선택"}
              </span>
            </div>
            <div className="text-xs text-neutral-500">{g.where}</div>
            <div className="mt-2 space-y-2">
              {g.fields.map((f) => (
                <SecretRow
                  key={f.name}
                  name={f.name}
                  label={f.label}
                  status={status[f.name]}
                  onSaved={reload}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SecretRow({
  name,
  label,
  status,
  onSaved,
}: {
  name: SecretName;
  label: string;
  status?: SecretStatus;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string) {
    setBusy(true);
    setError(null);
    try {
      await setSecret(name, next);
      setValue("");
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    if (confirm(`${label} 키를 삭제할까요?`)) save("");
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="shrink-0 font-medium">{label}</span>
        {status ? (
          <span className="text-right text-green-700 dark:text-green-400">
            등록됨 <span className="font-mono">{status.hint}</span> · {timeAgo(status.updated_at)}
          </span>
        ) : (
          <span className="text-red-600 dark:text-red-400">미등록</span>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={status ? "새 값으로 변경" : "키 붙여넣기"}
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm font-mono"
        />
        <button
          onClick={() => save(value)}
          disabled={busy || value.trim() === ""}
          className="shrink-0 rounded-full bg-brand text-white px-4 py-2 text-xs font-semibold hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? "…" : "저장"}
        </button>
        {status && (
          <button
            onClick={remove}
            disabled={busy}
            className="shrink-0 rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-xs disabled:opacity-50"
          >
            삭제
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

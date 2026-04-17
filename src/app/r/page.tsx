"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Redirector() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");

  useEffect(() => {
    if (id && /^[a-z0-9]{4,16}$/i.test(id)) {
      router.replace(`/r/${id}`);
    } else {
      router.replace("/");
    }
  }, [id, router]);

  return <div className="mx-auto max-w-2xl px-5 py-12 text-neutral-500">이동 중…</div>;
}

export default function LegacyShareRedirect() {
  return (
    <Suspense>
      <Redirector />
    </Suspense>
  );
}

"use client";

import { useEffect } from "react";
import { logVisit } from "@/lib/analytics";

// 마운트 시 한 번만 방문 로그. 6시간 쿨다운은 logVisit 내부에서 처리.
export function VisitLogger() {
  useEffect(() => {
    logVisit();
  }, []);
  return null;
}

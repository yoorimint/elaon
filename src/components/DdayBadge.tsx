"use client";

import { useEffect, useState } from "react";
import { daysUntil } from "@/lib/checklists";

type Props = { deadline: string };

export function DdayBadge({ deadline }: Props) {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    setDays(daysUntil(deadline));
  }, [deadline]);

  if (days === null) return null;

  const tone =
    days < 0
      ? "text-neutral-500 dark:text-neutral-500"
      : days <= 7
        ? "text-rose-600 dark:text-rose-400"
        : days <= 30
          ? "text-amber-600 dark:text-amber-400"
          : "text-neutral-700 dark:text-neutral-300";

  const label =
    days < 0
      ? "마감 종료"
      : days === 0
        ? "오늘 마감"
        : `D-${days}`;

  return (
    <span className={`font-extrabold ${tone}`}>
      {label}
    </span>
  );
}

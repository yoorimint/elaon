// "3분 전"·"2일 전" 같은 상대 시간 표시 (관리자 화면·건의함 등에서 공통으로 쓴다).
export function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  // 서버(UTC)에서 렌더되는 호출부가 있어 반드시 KST 로 고정.
  return d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

// 챗GPT 도구 토큰 (서버 전용). 챗GPT 의 사용자 지정 MCP 서버 주소(/api/mcp/<도구 토큰>)에 들어가거나,
// 도구 API(/api/tools/coupang/*)·/api/mcp 를 부를 때 "Authorization: Bearer <도구 토큰>" 으로 보내는 값. 쿠팡 키와는 다른 별도 비밀값이라, 챗GPT 쪽에 새어도 쿠팡 키는 안전하고
// 관리자 화면에서 새로 만들면 예전 토큰은 바로 못 쓰게 된다.
// 저장: shop_secrets.CHATGPT_TOOL_TOKEN — 서버가 service role 로 직접 쓴다 (관리자 RPC 허용 목록 shop_secret_names() 는 거치지 않음
// → SQL 변경 없음. 관리자 화면의 키 상태 목록(admin_shop_secret_status)에는 끝 4자리·만든 시각이 보인다).

import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sameSecretValue } from "./secret-compare";

export const TOOL_TOKEN_NAME = "CHATGPT_TOOL_TOKEN";
const TOOL_TOKEN_PREFIX = "eloan_tool_";
const TOOL_TOKEN_MIN_LENGTH = 32;

// 무작위 32바이트 (256비트) → base64url. 앞부분은 무슨 토큰인지 알아보기 쉽게
export function generateToolToken(): string {
  return `${TOOL_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function sameToolToken(given: string, expected: string): boolean {
  return sameSecretValue(given.trim(), expected.trim(), TOOL_TOKEN_MIN_LENGTH);
}

// 없으면 null (아직 안 만듦). 읽기 실패도 null — 도구 API 는 "토큰 없음"(503)으로 안내한다
export async function loadToolToken(sb: SupabaseClient): Promise<string | null> {
  const { data, error } = await sb.from("shop_secrets").select("value").eq("name", TOOL_TOKEN_NAME).maybeSingle();
  if (error || !data) return null;
  const v = String((data as { value?: unknown }).value ?? "").trim();
  return v || null;
}

export async function saveToolToken(sb: SupabaseClient, token: string): Promise<string> {
  const updatedAt = new Date().toISOString();
  const { error } = await sb.from("shop_secrets").upsert({ name: TOOL_TOKEN_NAME, value: token, updated_at: updatedAt }, { onConflict: "name" });
  if (error) throw new Error(`토큰 저장 실패: ${error.message}`);
  return updatedAt;
}

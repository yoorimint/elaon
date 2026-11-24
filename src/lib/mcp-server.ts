// MCP(Model Context Protocol) Streamable HTTP 서버의 뼈대 — 도구(tools)만, 상태 없음(stateless), 응답은 언제나 application/json 한 번.
// 무슨 도구를 내놓을지·토큰 검사는 부르는 쪽(src/lib/mcp-coupang.ts)이 정한다. 여기는 JSON-RPC·버전·헤더 규칙만.
//
// 확인한 공식 스펙 (modelcontextprotocol.io/specification, 2026-11-24 확인)
//  - 최신 2026-07-28 ("modern" — 이 파일에서 MODERN_VERSIONS):
//    initialize 가 없다. 요청마다 params._meta 에 "io.modelcontextprotocol/protocolVersion"·"io.modelcontextprotocol/clientCapabilities" 를 싣고
//    HTTP 헤더 MCP-Protocol-Version·Mcp-Method(tools/call 은 Mcp-Name 도)를 본문과 같게 보낸다.
//    헤더가 빠지거나 다르면 400 + -32020(HeaderMismatch), 모르는 버전 400 + -32022(UnsupportedProtocolVersion, data.supported),
//    _meta 필수 칸 빠짐 400 + -32602, 모르는 메서드 404 + -32601. 결과에는 resultType: "complete". server/discover 는 필수.
//  - 예전 2025-11-25·2025-06-18·2025-03-26·2024-11-05 ("legacy" — LEGACY_VERSIONS):
//    initialize → notifications/initialized → tools/list·tools/call. initialize 의 protocolVersion 이 아는 버전이면 그대로,
//    아니면 우리가 아는 최신 legacy 버전으로 답한다 (클라이언트가 못 알아들으면 스스로 끊는다).
//  - 두 시대를 다 받는 "dual-era" 서버: modern _meta 가 실린 요청은 modern 규칙으로, 그 밖(initialize 포함)은 legacy 규칙으로 답한다.
//    (dual-era 클라이언트는 modern 요청을 먼저 보내고, 400 이면서 modern 오류가 아닐 때만 initialize 로 내려간다 — 우리는 modern 도 받으므로 그대로 붙는다)
//  - 공통: 알림(id 없음)·클라이언트 응답만 온 POST 는 202 빈 응답. GET(SSE 스트림)·DELETE(세션 끝)는 405 + Allow: POST.
//    세션 id(Mcp-Session-Id)는 만들지 않고, 와도 무시한다. 서버가 먼저 보내는 요청(sampling 등)은 쓰지 않는다.
//    Origin 헤더가 있는데 허용 목록 밖이면 403 (DNS rebinding 방지 — 스펙 MUST). 서버끼리 부를 때는 Origin 이 없다.
//  - JSON-RPC 배치(배열)는 2025-03-26 에만 있던 기능 — legacy 요청으로만 받는다 (2025-06-18 부터는 빠짐, 받아 줘도 해롭지 않음).
//  - 오류 코드 -32000~-32019 는 새 구현이 쓰지 말라고 되어 있어, 우리 쪽 오류(토큰 등)는 그 범위 밖(McpAppErrorCode)을 쓴다.

export const MODERN_VERSIONS = ["2026-07-28"] as const;
export const LEGACY_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"] as const; // 앞이 최신
export const SUPPORTED_VERSIONS: readonly string[] = [...MODERN_VERSIONS, ...LEGACY_VERSIONS];

const META_VERSION = "io.modelcontextprotocol/protocolVersion";
const META_CLIENT_CAPS = "io.modelcontextprotocol/clientCapabilities";
const META_SERVER_INFO = "io.modelcontextprotocol/serverInfo";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_BATCH = 20;

// JSON-RPC 2.0 기본 오류 + MCP 가 정한 오류
export const RpcCode = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
  headerMismatch: -32020,
  unsupportedProtocolVersion: -32022,
} as const;

// 우리 쪽 오류 — JSON-RPC 예약 범위(-32768~-32000) 밖 (스펙 권고)
export const McpAppErrorCode = { unauthorized: -31001, notConfigured: -31003, tooManyRequests: -31029, forbiddenOrigin: -31004 } as const;

export type JsonSchema = Record<string, unknown>;

export type McpTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: { title?: string; readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean };
};

export type McpToolResult = { content: { type: "text"; text: string }[]; structuredContent?: unknown; isError?: boolean };

export type McpServerSpec = {
  name: string;
  version: string;
  instructions?: string;
  tools: readonly McpTool[];
  // 도구 안에서 생긴 오류(입력 틀림·외부 API 실패)는 던지지 말고 isError: true 결과로 돌려준다. 던지면 -32603
  callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult>;
};

type RpcId = string | number;
type RpcResponse = { jsonrpc: "2.0"; id: RpcId | null; result?: unknown; error?: { code: number; message: string; data?: unknown } };

const JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" };

export function rpcErrorResponse(status: number, code: number, message: string, headers: Record<string, string> = {}, id: RpcId | null = null): Response {
  const body: RpcResponse = { jsonrpc: "2.0", id, error: { code, message } };
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
}

export function mcpMethodNotAllowed(): Response {
  return rpcErrorResponse(405, RpcCode.invalidRequest, "이 주소는 POST(JSON-RPC)만 받아요", { allow: "POST" });
}

// Origin 이 없으면(서버 간 호출) 통과. 있으면 허용 목록과 맞아야 한다
export function originAllowed(origin: string | null, allowed: RegExp): boolean {
  return !origin || allowed.test(origin.trim());
}

export function negotiateLegacyVersion(requested: unknown): string {
  return typeof requested === "string" && (LEGACY_VERSIONS as readonly string[]).includes(requested) ? requested : LEGACY_VERSIONS[0];
}

// Mcp-Name 등은 ASCII 로 못 쓰는 값이면 "=?base64?…?=" 로 온다
export function decodeHeaderValue(v: string): string {
  const m = /^=\?base64\?([A-Za-z0-9+/=]*)\?=$/.exec(v);
  return m ? Buffer.from(m[1], "base64").toString("utf8") : v;
}

class RpcFailure extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly status = 200,
    readonly data?: unknown,
  ) {
    super(message);
  }
}

type Msg = Record<string, unknown>;
type Outcome = { status: number; body: RpcResponse } | null; // null = 알림 → 답 없음

const isObj = (v: unknown): v is Msg => !!v && typeof v === "object" && !Array.isArray(v);
const isId = (v: unknown): v is RpcId => typeof v === "string" || (typeof v === "number" && Number.isFinite(v));

function ok(id: RpcId, result: unknown): Outcome {
  return { status: 200, body: { jsonrpc: "2.0", id, result } };
}

function fail(id: RpcId | null, e: RpcFailure): Outcome {
  return { status: e.status, body: { jsonrpc: "2.0", id, error: { code: e.code, message: e.message, ...(e.data !== undefined ? { data: e.data } : {}) } } };
}

async function callTool(spec: McpServerSpec, params: Msg): Promise<McpToolResult> {
  const name = params.name;
  if (typeof name !== "string" || !spec.tools.some((t) => t.name === name)) {
    throw new RpcFailure(RpcCode.invalidParams, `알 수 없는 도구예요: ${String(name).slice(0, 64)}`);
  }
  if (params.arguments !== undefined && !isObj(params.arguments)) throw new RpcFailure(RpcCode.invalidParams, "arguments 는 객체여야 해요");
  try {
    return await spec.callTool(name, (params.arguments as Msg | undefined) ?? {});
  } catch {
    // 내용은 내보내지 않는다 (키·내부 정보가 섞일 수 있음)
    console.error("[MCP] 도구 처리 중 오류", name);
    throw new RpcFailure(RpcCode.internalError, "서버 오류예요 — 잠시 뒤 다시 해 주세요");
  }
}

// ---------- legacy (initialize 방식) ----------

async function legacyResult(spec: McpServerSpec, method: string, params: Msg): Promise<unknown> {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: negotiateLegacyVersion(params.protocolVersion),
        capabilities: { tools: {} },
        serverInfo: { name: spec.name, version: spec.version },
        ...(spec.instructions ? { instructions: spec.instructions } : {}),
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: spec.tools };
    case "tools/call":
      return callTool(spec, params);
    default:
      throw new RpcFailure(RpcCode.methodNotFound, `모르는 메서드예요: ${method.slice(0, 64)}`);
  }
}

// ---------- modern (2026-07-28, 요청마다 _meta) ----------

function checkModernHeaders(req: Request, method: string, params: Msg, version: string) {
  const mismatch = (what: string) => new RpcFailure(RpcCode.headerMismatch, `헤더가 본문과 맞지 않아요: ${what}`, 400);
  if (req.headers.get("mcp-protocol-version")?.trim() !== version) throw mismatch("MCP-Protocol-Version");
  if (req.headers.get("mcp-method")?.trim() !== method) throw mismatch("Mcp-Method");
  if (method === "tools/call") {
    const name = req.headers.get("mcp-name");
    if (name === null || decodeHeaderValue(name.trim()) !== params.name) throw mismatch("Mcp-Name");
  }
}

async function modernResult(spec: McpServerSpec, method: string, params: Msg): Promise<unknown> {
  switch (method) {
    case "server/discover":
      return { supportedVersions: SUPPORTED_VERSIONS, capabilities: { tools: {} }, ...(spec.instructions ? { instructions: spec.instructions } : {}) };
    case "ping":
      return {};
    case "tools/list":
      return { tools: spec.tools };
    case "tools/call":
      return callTool(spec, params);
    default:
      throw new RpcFailure(RpcCode.methodNotFound, `모르는 메서드예요: ${method.slice(0, 64)}`, 404);
  }
}

// ---------- 메시지 하나 ----------

type Era = { kind: "legacy" } | { kind: "modern"; version: string };

// initialize 는 언제나 legacy. _meta 에 버전이 있거나, 헤더 버전이 legacy 목록 밖이면 modern 규칙으로 판단한다
function eraOf(req: Request, method: string, params: Msg): Era {
  if (method === "initialize") return { kind: "legacy" };
  const meta = isObj(params._meta) ? params._meta : null;
  const metaVersion = meta?.[META_VERSION];
  const headerVersion = req.headers.get("mcp-protocol-version")?.trim() || null;
  const requested = typeof metaVersion === "string" ? metaVersion : headerVersion;
  if (requested === null || (LEGACY_VERSIONS as readonly string[]).includes(requested)) return { kind: "legacy" };
  if (!(MODERN_VERSIONS as readonly string[]).includes(requested)) {
    throw new RpcFailure(RpcCode.unsupportedProtocolVersion, "지원하지 않는 프로토콜 버전이에요", 400, { supported: SUPPORTED_VERSIONS, requested: requested.slice(0, 32) });
  }
  if (typeof metaVersion !== "string" || !isObj(meta?.[META_CLIENT_CAPS])) {
    throw new RpcFailure(RpcCode.invalidParams, `params._meta 에 ${META_VERSION}·${META_CLIENT_CAPS} 가 있어야 해요`, 400);
  }
  return { kind: "modern", version: requested };
}

async function handleOne(req: Request, spec: McpServerSpec, raw: unknown, inBatch: boolean): Promise<Outcome> {
  if (!isObj(raw) || raw.jsonrpc !== "2.0") return fail(isObj(raw) && isId(raw.id) ? raw.id : null, new RpcFailure(RpcCode.invalidRequest, "JSON-RPC 2.0 요청이 아니에요", 400));
  // 클라이언트가 보낸 응답(예전 방식에서 서버 요청에 대한 답) — 우리는 서버 요청을 보내지 않으니 받고 끝
  if (raw.method === undefined && ("result" in raw || "error" in raw)) return null;
  if (typeof raw.method !== "string") return fail(isId(raw.id) ? raw.id : null, new RpcFailure(RpcCode.invalidRequest, "method 가 없어요", 400));
  if (raw.id === undefined) return null; // 알림 (notifications/initialized 등) — 받기만 한다
  if (!isId(raw.id)) return fail(null, new RpcFailure(RpcCode.invalidRequest, "id 는 문자열이나 숫자여야 해요", 400));
  const id = raw.id;
  const method = raw.method;
  const params = isObj(raw.params) ? raw.params : {};
  try {
    const era: Era = inBatch ? { kind: "legacy" } : eraOf(req, method, params);
    if (era.kind === "legacy") return ok(id, await legacyResult(spec, method, params));
    checkModernHeaders(req, method, params, era.version);
    const result = (await modernResult(spec, method, params)) as Msg;
    return ok(id, { resultType: "complete", ...result, _meta: { [META_SERVER_INFO]: { name: spec.name, version: spec.version } } });
  } catch (e) {
    if (e instanceof RpcFailure) return fail(id, e);
    throw e;
  }
}

// ---------- HTTP POST 한 번 ----------

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

const accepted = () => new Response(null, { status: 202, headers: { "cache-control": "no-store" } });

// 토큰 검사·Origin 검사를 마친 요청만 넘길 것
export async function handleMcpPost(req: Request, spec: McpServerSpec): Promise<Response> {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return rpcErrorResponse(413, RpcCode.invalidRequest, "요청이 너무 커요");
  const text = await req.text().catch(() => "");
  if (text.length > MAX_BODY_BYTES) return rpcErrorResponse(413, RpcCode.invalidRequest, "요청이 너무 커요");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return rpcErrorResponse(400, RpcCode.parseError, "JSON 을 읽지 못했어요");
  }

  if (Array.isArray(parsed)) {
    if (!parsed.length || parsed.length > MAX_BATCH) return rpcErrorResponse(400, RpcCode.invalidRequest, `배치 요청은 1~${MAX_BATCH}개여야 해요`);
    const outs: RpcResponse[] = [];
    for (const m of parsed) {
      const o = await handleOne(req, spec, m, true);
      if (o) outs.push(o.body);
    }
    return outs.length ? jsonResponse(200, outs) : accepted();
  }

  const o = await handleOne(req, spec, parsed, false);
  return o ? jsonResponse(o.status, o.body) : accepted();
}

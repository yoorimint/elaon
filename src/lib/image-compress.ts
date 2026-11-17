// 사진 압축 (서버 전용 — sharp). 노션 → 사이트 동기화가 사진을 저장소에 올리기 전에 부른다 (src/lib/notion-sync.ts publishPage).
// 목적: Supabase 무료 한도(사진 저장 1GB·전송량 월 약 10GB) 안에서 오래 버티기 (2026-11 사장님 결정)
//
// 규칙
//  - 가로 최대 MAX_WIDTH 로 줄이고(작은 사진은 키우지 않음) WebP(품질 WEBP_QUALITY)로 바꾼다
//  - 바꾼 결과가 원본보다 크거나 같으면 원본 그대로
//  - 움직이는 사진(GIF·여러 장짜리 WebP·APNG)과 SVG 는 바꾸지 않는다 (움직임·벡터가 사라지므로)
//  - 어떤 오류든(깨진 파일·너무 큰 사진·sharp 를 못 불러옴) 던지지 않고 원본을 돌려준다 → 발행을 막지 않음
//
// 서버 메모리가 작다 (systemd MemoryMax=450M, 다른 사이트와 함께 씀)
//  - sharp.concurrency(1)·sharp.cache(false): 변환 스레드 1개, 변환 결과를 메모리에 쌓아 두지 않음
//  - limitInputPixels: 이보다 큰 사진은 풀지 않고 원본 그대로 (풀면 픽셀당 3~4바이트를 먹는다)
//  - 한 프로세스 안에서 한 번에 한 장씩 (예약 실행·관리자 버튼이 겹쳐도 줄을 세운다)
//  - sharp 는 처음 변환할 때만 불러온다 (사진을 올리지 않는 요청은 네이티브 모듈을 메모리에 올리지 않게)
//
// 변환 규칙(크기·품질·형식)을 바꾸면 COMPRESS_VERSION 을 올린다 — 저장소 파일 이름에 들어가서,
// 같은 이름에는 언제나 같은 내용만 들어간다 (그래야 브라우저 캐시 1년이 안전하다 — src/lib/notion-sync-store.ts uploadImage)

// sharp 함수 자체의 타입 (값은 loadSharp 가 처음 변환할 때 불러온다)
type SharpFn = typeof import("sharp");

export const COMPRESS_VERSION = "w1"; // w = WebP, 1 = 가로 1200px·품질 80
export const MAX_WIDTH = 1200;
export const WEBP_QUALITY = 80;
export const MAX_INPUT_PIXELS = 40_000_000; // 4천만 픽셀 (예: 8000×5000)

// 바꾸지 않는 형식 (원본 그대로)
const KEEP_AS_IS = new Set(["image/gif", "image/svg+xml"]);
// 바꿀 수 있는 형식 (그 밖의 형식도 원본 그대로)
const CONVERTIBLE = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export type ImageFile = { bytes: Uint8Array; contentType: string };

// converted = WebP 로 바꿔서 돌려줌. 아니면 원본 그대로 — kept 에 이유, 오류 때문이면 error 에도 (로그용)
export type CompressResult = ImageFile & { converted: boolean; kept?: string; error?: string; width?: number };

let sharpLoaded: Promise<SharpFn> | null = null;

function loadSharp(): Promise<SharpFn> {
  sharpLoaded ??= import("sharp").then((m) => {
    // CommonJS 모듈이라 실행 환경(tsx·Next 서버)에 따라 default 아래에 오기도, 바로 오기도 한다
    const sharp = (m as unknown as { default?: SharpFn }).default ?? (m as unknown as SharpFn);
    sharp.concurrency(1);
    sharp.cache(false);
    return sharp;
  });
  // 불러오기 실패는 기억하지 않는다 (다음 사진에서 다시 시도)
  sharpLoaded.catch(() => (sharpLoaded = null));
  return sharpLoaded;
}

// 한 번에 한 장씩: 앞의 변환이 끝난 뒤 다음 변환을 시작한다
let queue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

// APNG(움직이는 PNG): 첫 그림 자료(IDAT) 앞에 acTL 묶음이 있다. sharp 는 첫 장만 읽어 움직임이 사라지므로 바꾸지 않는다
export function isAnimatedPng(bytes: Uint8Array): boolean {
  const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 8 || PNG_SIGNATURE.some((b, i) => bytes[i] !== b)) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let at = 8; at + 8 <= bytes.length; ) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(bytes[at + 4], bytes[at + 5], bytes[at + 6], bytes[at + 7]);
    if (type === "acTL") return true;
    if (type === "IDAT" || type === "IEND") return false;
    at += 12 + length; // 길이(4) + 종류(4) + 자료 + CRC(4)
  }
  return false;
}

const original = (img: ImageFile, kept: string): CompressResult => ({ ...img, converted: false, kept });
const failed = (img: ImageFile, e: unknown): CompressResult => {
  const error = (e instanceof Error ? e.message : String(e)).slice(0, 200);
  return { ...img, converted: false, kept: "변환 실패", error };
};

// 사진 하나를 줄여 WebP 로. 절대 던지지 않는다 (실패하면 원본 + 이유)
export function compressImage(img: ImageFile): Promise<CompressResult> {
  const type = img.contentType.toLowerCase();
  if (KEEP_AS_IS.has(type)) return Promise.resolve(original(img, `${type} 는 바꾸지 않음`));
  if (!CONVERTIBLE.has(type)) return Promise.resolve(original(img, `${type || "형식 모름"} 은 바꾸지 않음`));
  if (type === "image/png" && isAnimatedPng(img.bytes)) return Promise.resolve(original(img, "움직이는 PNG"));

  return oneAtATime(async () => {
    try {
      const sharp = await loadSharp();
      // 복사 없이 같은 메모리를 Buffer 로 본다
      const input = Buffer.from(img.bytes.buffer, img.bytes.byteOffset, img.bytes.byteLength);
      const meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
      if ((meta.pages ?? 1) > 1) return original(img, "움직이는 사진");
      const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate() // 휴대폰 사진의 방향 정보(EXIF)를 실제 방향으로 (WebP 로 바꾸면 방향 정보가 빠진다)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer({ resolveWithObject: true });
      if (data.byteLength >= img.bytes.byteLength) return original(img, "바꾼 결과가 원본보다 큼");
      return { bytes: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), contentType: "image/webp", converted: true, width: info.width };
    } catch (e) {
      return failed(img, e);
    }
  });
}

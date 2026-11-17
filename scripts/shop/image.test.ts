// 사진 압축 회귀 테스트 (src/lib/image-compress.ts) — 외부 호출 없음. 테스트 사진은 sharp 로 그 자리에서 만든다.
// 실행: npm run test:shop. 고친 문제마다 여기에 테스트를 하나씩 추가한다.

import assert from "node:assert/strict";
import sharp from "sharp";
import { COMPRESS_VERSION, MAX_INPUT_PIXELS, MAX_WIDTH, compressImage, isAnimatedPng } from "@/lib/image-compress";

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

// 무늬가 있는 사진 (단색이면 PNG 도 아주 작아져 크기 비교가 의미 없다)
async function photo(width: number, height: number, format: "png" | "jpeg"): Promise<Uint8Array> {
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      raw[i] = (x * 7 + y * 3) & 0xff;
      raw[i + 1] = (x * y) & 0xff;
      raw[i + 2] = ((x ^ y) * 5) & 0xff;
    }
  const img = sharp(raw, { raw: { width, height, channels: 3 } });
  return new Uint8Array(await (format === "png" ? img.png() : img.jpeg({ quality: 92 })).toBuffer());
}

async function main() {
  console.log("사진 압축");

  await test("큰 PNG(2400×1600) → 가로 1200px WebP 로 줄고 파일도 작아진다", async () => {
    const bytes = await photo(2400, 1600, "png");
    const r = await compressImage({ bytes, contentType: "image/png" });
    assert.equal(r.converted, true);
    assert.equal(r.contentType, "image/webp");
    assert.ok(r.bytes.byteLength < bytes.byteLength, `${r.bytes.byteLength} < ${bytes.byteLength}`);
    const meta = await sharp(Buffer.from(r.bytes)).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, MAX_WIDTH);
    assert.equal(meta.height, 800); // 비율 유지
    assert.equal(COMPRESS_VERSION, "w1"); // 규칙을 바꾸면 버전을 올려야 같은 파일 이름에 다른 내용이 안 들어간다
  });

  await test("작은 사진은 키우지 않는다 (가로 그대로, WebP 로만)", async () => {
    const bytes = await photo(400, 300, "jpeg");
    const r = await compressImage({ bytes, contentType: "image/jpeg" });
    assert.equal(r.converted, true);
    const meta = await sharp(Buffer.from(r.bytes)).metadata();
    assert.equal(meta.width, 400);
    assert.equal(meta.height, 300);
    assert.ok(r.bytes.byteLength < bytes.byteLength);
  });

  await test("바꾼 결과가 원본보다 크면 원본 그대로", async () => {
    // 흑백 바둑판 PNG(2색 팔레트) — PNG 는 수백 바이트, 손실 WebP 는 수십 KB 가 된다
    const side = 600;
    const raw = Buffer.alloc(side * side);
    for (let i = 0; i < raw.length; i++) raw[i] = ((i % side) ^ Math.floor(i / side)) & 1 ? 255 : 0;
    const bytes = new Uint8Array(await sharp(raw, { raw: { width: side, height: side, channels: 1 } }).png({ palette: true, colours: 2 }).toBuffer());
    const r = await compressImage({ bytes, contentType: "image/png" });
    assert.equal(r.converted, false);
    assert.equal(r.bytes, bytes);
    assert.equal(r.contentType, "image/png");
  });

  await test("GIF·SVG·움직이는 PNG 는 원본 그대로", async () => {
    const gif = new Uint8Array(await sharp(await photo(1600, 1000, "png")).gif().toBuffer());
    const g = await compressImage({ bytes: gif, contentType: "image/gif" });
    assert.equal(g.converted, false);
    assert.equal(g.bytes, gif);
    assert.equal(g.contentType, "image/gif");

    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="10"/>');
    const s = await compressImage({ bytes: svg, contentType: "image/svg+xml" });
    assert.equal(s.converted, false);
    assert.equal(s.bytes, svg);

    // APNG: 신호 + IHDR + acTL + ... (acTL 이 IDAT 앞에 있으면 움직이는 PNG)
    const png = await photo(1600, 1000, "png");
    const ihdrEnd = 8 + 12 + 13;
    const actl = new Uint8Array([0, 0, 0, 8, 0x61, 0x63, 0x54, 0x4c, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0]);
    const apng = new Uint8Array([...png.slice(0, ihdrEnd), ...actl, ...png.slice(ihdrEnd)]);
    assert.equal(isAnimatedPng(apng), true);
    assert.equal(isAnimatedPng(png), false);
    const a = await compressImage({ bytes: apng, contentType: "image/png" });
    assert.equal(a.converted, false);
    assert.equal(a.bytes, apng);
  });

  await test("깨진 바이트·너무 큰 사진은 던지지 않고 원본 그대로 (오류 이유를 남김)", async () => {
    const broken = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);
    const r = await compressImage({ bytes: broken, contentType: "image/jpeg" });
    assert.equal(r.converted, false);
    assert.equal(r.bytes, broken);
    assert.equal(r.contentType, "image/jpeg");
    assert.ok(r.error);

    // 픽셀 수 상한을 넘는 사진(머리말만 큼): 풀지 않고 원본
    assert.ok(8000 * 6000 > MAX_INPUT_PIXELS);
    const huge = new Uint8Array(await sharp({ create: { width: 8000, height: 6000, channels: 3, background: "#888" } }).png({ compressionLevel: 9 }).toBuffer());
    const h = await compressImage({ bytes: huge, contentType: "image/png" });
    assert.equal(h.converted, false);
    assert.equal(h.bytes, huge);
    assert.ok(h.error);
  });

  await test("여러 장을 한꺼번에 불러도 순서대로 하나씩 처리하고 모두 결과를 돌려준다", async () => {
    const big = await photo(1800, 900, "jpeg");
    const out = await Promise.all([
      compressImage({ bytes: big, contentType: "image/jpeg" }),
      compressImage({ bytes: new Uint8Array([1, 2, 3]), contentType: "image/png" }),
      compressImage({ bytes: big, contentType: "image/jpeg" }),
    ]);
    assert.deepEqual(out.map((r) => r.converted), [true, false, true]);
  });

  console.log(`\n${passed}개 통과`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

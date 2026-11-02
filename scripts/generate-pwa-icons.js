import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, "../public");

// Precompute CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, "ascii");
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function encodePng(width, height, getPixel) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const rowBytes = width * 4;
  const raw = Buffer.alloc(height * (rowBytes + 1));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", idat),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Distance to rounded rectangle (signed distance field)
function sdRoundedRect(px, py, rx, ry, radius) {
  const qx = Math.abs(px) - rx + radius;
  const qy = Math.abs(py) - ry + radius;
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  const outsideDist = Math.hypot(ax, ay);
  const insideDist = Math.min(Math.max(qx, qy), 0);
  return outsideDist + insideDist - radius;
}

function renderBlurbbiIcon(size, isMaskable = false) {
  // Normalize coordinates into 0..64 space matching favicon.svg
  const scale = 64 / size;
  const contentScale = isMaskable ? 0.76 : 0.94;
  const offset = 32 * (1 - contentScale);

  // Super-sampling 2x2 grid for anti-aliased edges
  const SAMPLES = 2;
  const subStep = 1 / SAMPLES;

  return encodePng(size, size, (px, py) => {
    let accR = 0;
    let accG = 0;
    let accB = 0;
    let accA = 0;

    for (let sy = 0; sy < SAMPLES; sy++) {
      for (let sx = 0; sx < SAMPLES; sx++) {
        const subX = (px + (sx + 0.5) * subStep) * scale;
        const subY = (py + (sy + 0.5) * subStep) * scale;

        // Gradient calculation: top-left #FF6B4A to bottom-right #E03E1A
        const gradT = Math.min(Math.max((subX + subY) / 128, 0), 1);
        const bgR = Math.round(255 + (224 - 255) * gradT);
        const bgG = Math.round(107 + (62 - 107) * gradT);
        const bgB = Math.round(74 + (26 - 74) * gradT);

        let finalR = 0;
        let finalG = 0;
        let finalB = 0;
        let finalA = 0;

        if (isMaskable) {
          // Full background fill for maskable
          finalR = bgR;
          finalG = bgG;
          finalB = bgB;
          finalA = 255;
        } else {
          // Squircle with radius 16 in 64x64
          const dist = sdRoundedRect(subX - 32, subY - 32, 32, 32, 16);
          if (dist <= 0) {
            finalR = bgR;
            finalG = bgG;
            finalB = bgB;
            finalA = 255;
          } else if (dist < 1) {
            const alpha = 1 - dist;
            finalR = bgR;
            finalG = bgG;
            finalB = bgB;
            finalA = Math.round(255 * alpha);
          }
        }

        // Now overlay the white Blurbbi symbol inside
        // Map (subX, subY) into the scaled content space
        const cx = (subX - offset) / contentScale;
        const cy = (subY - offset) / contentScale;

        let isSymbol = false;

        // Circle at center (35, 40), radius = 13 (outer loop of "b")
        const dx = cx - 35;
        const dy = cy - 40;
        const distOuter = Math.hypot(dx, dy);

        // Inner cutout radius = 9
        const distInner = distOuter;

        // Vertical stem of "b": x between 22 and 26, y between 14 and 40
        const isStem = cx >= 22 && cx <= 26 && cy >= 14 && cy <= 40;

        // Stem top rounded cap
        const isStemCap = cx >= 22 && cx <= 26 && Math.hypot(cx - 24, cy - 14) <= 2;

        // Outer loop (right of stem)
        const isLoop = distOuter <= 13 && cx >= 25 && distInner >= 9;

        // Central inner dot/sparkle at (35, 40) radius 4.5
        const isCenterDot = distOuter <= 4.5;

        // Small bottom-right connect
        if (isStem || isStemCap || isLoop || isCenterDot) {
          isSymbol = true;
        }

        if (isSymbol && finalA > 0) {
          finalR = 255;
          finalG = 255;
          finalB = 255;
        }

        accR += finalR;
        accG += finalG;
        accB += finalB;
        accA += finalA;
      }
    }

    const totalSamples = SAMPLES * SAMPLES;
    return [
      Math.round(accR / totalSamples),
      Math.round(accG / totalSamples),
      Math.round(accB / totalSamples),
      Math.round(accA / totalSamples),
    ];
  });
}

// Generate all standard PWA icons
console.log("Generating PWA icons...");
fs.writeFileSync(path.join(PUBLIC_DIR, "icon-192.png"), renderBlurbbiIcon(192, false));
fs.writeFileSync(path.join(PUBLIC_DIR, "icon-512.png"), renderBlurbbiIcon(512, false));
fs.writeFileSync(path.join(PUBLIC_DIR, "icon-maskable-192.png"), renderBlurbbiIcon(192, true));
fs.writeFileSync(path.join(PUBLIC_DIR, "icon-maskable-512.png"), renderBlurbbiIcon(512, true));
fs.writeFileSync(path.join(PUBLIC_DIR, "apple-touch-icon.png"), renderBlurbbiIcon(180, false));
console.log("PWA icons generated successfully in public/ directory!");


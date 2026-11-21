/**
 * qr.ts
 * Self-contained, zero-dependency QR Code matrix and SVG generator.
 * Implements ISO/IEC 18004 QR Code (Versions 1-4, Byte Encoding, Error Correction M/L).
 */

// Galois field tables for GF(256) with primitive polynomial 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
let gfX = 1;
for (let i = 0; i < 255; i++) {
  GF_EXP[i] = gfX;
  GF_LOG[gfX] = i;
  gfX <<= 1;
  if (gfX & 256) gfX ^= 0x11d;
}
for (let i = 255; i < 512; i++) {
  GF_EXP[i] = GF_EXP[i - 255];
}

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function reedSolomonCompute(data: Uint8Array, ecCount: number): Uint8Array {
  // Generate generator polynomial
  let gen = new Uint8Array([1]);
  for (let i = 0; i < ecCount; i++) {
    const next = new Uint8Array(gen.length + 1);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gfMul(gen[j], GF_EXP[i]);
      next[j + 1] ^= gen[j];
    }
    gen = next;
  }

  // Polynomial division
  const res = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const coef = data[i] ^ res[0];
    for (let j = 0; j < ecCount - 1; j++) {
      res[j] = res[j + 1] ^ gfMul(gen[j], coef);
    }
    res[ecCount - 1] = gfMul(gen[ecCount - 1], coef);
  }
  return res;
}

// Version capacities (Version 3, ECC-M: 29x29, total data codewords: 44, EC: 26)
// Version 4, ECC-M: 33x33, total data codewords: 64, EC: 36
interface QrVersionSpec {
  version: number;
  size: number;
  dataCodewords: number;
  ecCodewords: number;
  alignPos: number[];
}

const VERSIONS: QrVersionSpec[] = [
  { version: 2, size: 25, dataCodewords: 28, ecCodewords: 16, alignPos: [6, 18] },
  { version: 3, size: 29, dataCodewords: 44, ecCodewords: 26, alignPos: [6, 22] },
  { version: 4, size: 33, dataCodewords: 64, ecCodewords: 36, alignPos: [6, 26] },
];

/**
 * Generates a 2D boolean matrix for a given URL string.
 */
export function generateQrMatrix(text: string): boolean[][] {
  const textBytes = new TextEncoder().encode(text);

  // Pick appropriate version
  let spec = VERSIONS[0];
  for (const v of VERSIONS) {
    if (textBytes.length + 3 <= v.dataCodewords) {
      spec = v;
      break;
    }
    spec = v;
  }

  // 1. Bitstream encoding: Byte Mode (0100) + Char Count (8 bits) + Data + Terminator
  const bits: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode
  pushBits(textBytes.length, 8); // Character count indicator
  for (const b of textBytes) {
    pushBits(b, 8);
  }

  // Terminator (up to 4 zeroes)
  const maxBits = spec.dataCodewords * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  pushBits(0, termLen);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad bytes: 0xEC, 0x11 alternating
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to byte codewords
  const dataCodewords = new Uint8Array(spec.dataCodewords);
  for (let i = 0; i < spec.dataCodewords; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i * 8 + j];
    }
    dataCodewords[i] = b;
  }

  // Compute Reed-Solomon EC bytes
  const ecBytes = reedSolomonCompute(dataCodewords, spec.ecCodewords);

  // Combine data + EC into allCodewords
  const allCodewords = new Uint8Array(spec.dataCodewords + spec.ecCodewords);
  allCodewords.set(dataCodewords, 0);
  allCodewords.set(ecBytes, spec.dataCodewords);

  // Initialize Matrix
  const N = spec.size;
  const matrix: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));
  const isReserved: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));

  function setModule(r: number, c: number, val: boolean) {
    matrix[r][c] = val;
    isReserved[r][c] = true;
  }

  // 1. Finder patterns (7x7) + separators
  function drawFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr >= 0 && mr < N && mc >= 0 && mc < N) {
          const inRing = (r === 0 || r === 6 || c === 0 || c === 6);
          const inCore = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          const val = inRing || inCore;
          setModule(mr, mc, val);
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, N - 7);
  drawFinder(N - 7, 0);

  // 2. Timing patterns
  for (let i = 8; i < N - 8; i++) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }

  // 3. Alignment patterns
  for (const r of spec.alignPos) {
    for (const c of spec.alignPos) {
      if (isReserved[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const val = (Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0));
          setModule(r + dr, c + dc, val);
        }
      }
    }
  }

  // Dark module
  setModule(N - 8, 8, true);

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (!isReserved[8][i]) isReserved[8][i] = true;
    if (!isReserved[i][8]) isReserved[i][8] = true;
    if (!isReserved[8][N - 1 - i]) isReserved[8][N - 1 - i] = true;
    if (!isReserved[N - 1 - i][8]) isReserved[N - 1 - i][8] = true;
  }

  // 4. Place data bits
  const allBits: number[] = [];
  for (const byte of allCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((byte >> i) & 1);
    }
  }

  let bitIdx = 0;
  let upward = true;
  for (let c = N - 1; c > 0; c -= 2) {
    if (c === 6) c--; // Skip vertical timing line
    const rows = upward
      ? Array.from({ length: N }, (_, idx) => N - 1 - idx)
      : Array.from({ length: N }, (_, idx) => idx);

    for (const r of rows) {
      for (const colOffset of [0, 1]) {
        const mc = c - colOffset;
        if (!isReserved[r][mc]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx] : 0;
          // Apply Mask Pattern 0: (row + col) % 2 === 0
          const mask = (r + mc) % 2 === 0;
          matrix[r][mc] = Boolean(bit ^ (mask ? 1 : 0));
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  // 5. Draw Format Information (ECC: M = 00, Mask: 000 -> 00000 + BCH -> 101010000010010 ^ 101010000010010 = 0b101010000010010)
  // For ECC M and Mask 0: format bits = 0x5412 (standard format code for M/Mask 0)
  const formatVal = 0x5412;
  for (let i = 0; i < 15; i++) {
    const bit = Boolean((formatVal >> i) & 1);
    if (i < 6) {
      matrix[8][i] = bit;
    } else if (i < 8) {
      matrix[8][i + 1] = bit;
    } else {
      matrix[7 - (i - 8)][8] = bit;
    }

    if (i < 8) {
      matrix[N - 1 - i][8] = bit;
    } else {
      matrix[8][N - 15 + i] = bit;
    }
  }

  return matrix;
}

/**
 * Generates an SVG path string from a QR boolean matrix.
 */
export function matrixToSvgPath(matrix: boolean[][]): string {
  const paths: string[] = [];
  const N = matrix.length;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (matrix[r][c]) {
        // Quiet zone margin offset +4
        paths.push(`M${c + 4},${r + 4}h1v1h-1z`);
      }
    }
  }
  return paths.join(' ');
}

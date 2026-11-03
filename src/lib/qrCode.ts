/**
 * Zero-dependency ISO/IEC 18004 QR Code Matrix Generator (Byte Mode, ECC Level L, Versions 1–7).
 * Supports URLs up to 154 bytes (more than enough for all Plawza listing & shop links).
 */

interface VersionSpec {
  version: number;
  size: number;
  totalDataCodewords: number;
  ecCodewordsPerBlock: number;
  numBlocks: number;
  alignmentCenters: number[];
}

// ECC Level L specifications for Versions 1 to 7
const VERSION_SPECS: VersionSpec[] = [
  { version: 1, size: 21, totalDataCodewords: 19, ecCodewordsPerBlock: 7, numBlocks: 1, alignmentCenters: [] },
  { version: 2, size: 25, totalDataCodewords: 34, ecCodewordsPerBlock: 10, numBlocks: 1, alignmentCenters: [6, 18] },
  { version: 3, size: 29, totalDataCodewords: 55, ecCodewordsPerBlock: 15, numBlocks: 1, alignmentCenters: [6, 22] },
  { version: 4, size: 33, totalDataCodewords: 80, ecCodewordsPerBlock: 20, numBlocks: 1, alignmentCenters: [6, 26] },
  { version: 5, size: 37, totalDataCodewords: 108, ecCodewordsPerBlock: 26, numBlocks: 1, alignmentCenters: [6, 30] },
  { version: 6, size: 41, totalDataCodewords: 136, ecCodewordsPerBlock: 18, numBlocks: 2, alignmentCenters: [6, 34] },
  { version: 7, size: 45, totalDataCodewords: 156, ecCodewordsPerBlock: 20, numBlocks: 2, alignmentCenters: [6, 22, 38] }
];

// GF(256) tables with primitive polynomial 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255] ?? 0;
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a] ?? 0) + (GF_LOG[b] ?? 0)] ?? 0;
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i] ?? 0;
    for (let j = 0; j < poly.length; j++) {
      const pj = poly[j] ?? 0;
      next[j] = (next[j] ?? 0) ^ pj;
      next[j + 1] = (next[j + 1] ?? 0) ^ gfMul(pj, factor);
    }
    poly = next;
  }
  return poly;
}

function rsComputeRemainder(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLen);
  const rem = new Uint8Array(ecLen);
  for (let i = 0; i < data.length; i++) {
    const factor = (data[i] ?? 0) ^ (rem[0] ?? 0);
    rem.copyWithin(0, 1);
    rem[ecLen - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecLen; j++) {
        rem[j] = (rem[j] ?? 0) ^ gfMul(gen[j + 1] ?? 0, factor);
      }
    }
  }
  return rem;
}

// Precomputed BCH(15,5) format bits for ECC Level L (01) and mask patterns 0..7
const FORMAT_BITS_LEVEL_L = [
  0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976
];

/**
 * Generates a 2D boolean matrix (`true` = dark module, `false` = light module)
 * representing the QR code for `text`.
 */
export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);

  // Pick smallest version that fits: 4 bits mode + 8 bits length + 8*N bits <= totalDataCodewords*8
  const spec = VERSION_SPECS.find((s) => bytes.length + 2 <= s.totalDataCodewords);
  if (!spec) {
    throw new Error(`QR payload too long (${bytes.length} bytes, max 154 bytes)`);
  }

  // 1. Build bit stream: Mode 0100 (Byte), 8-bit byte count, payload bytes, terminator, pad bytes
  const bitBuffer: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bitBuffer.push((val >>> i) & 1);
    }
  };

  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  for (const b of bytes) {
    pushBits(b, 8);
  }

  const maxDataBits = spec.totalDataCodewords * 8;
  const terminatorLen = Math.min(4, maxDataBits - bitBuffer.length);
  pushBits(0, terminatorLen);

  while (bitBuffer.length % 8 !== 0) {
    bitBuffer.push(0);
  }

  const dataCodewords = new Uint8Array(spec.totalDataCodewords);
  for (let i = 0; i < bitBuffer.length / 8; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | (bitBuffer[i * 8 + b] ?? 0);
    }
    dataCodewords[i] = byte;
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  for (let i = bitBuffer.length / 8; i < spec.totalDataCodewords; i++) {
    dataCodewords[i] = padBytes[padIdx % 2] ?? 0xec;
    padIdx++;
  }

  // 2. Split into blocks and compute Reed-Solomon EC codewords
  const blockSize = spec.totalDataCodewords / spec.numBlocks;
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  for (let b = 0; b < spec.numBlocks; b++) {
    const block = dataCodewords.slice(b * blockSize, (b + 1) * blockSize);
    dataBlocks.push(block);
    ecBlocks.push(rsComputeRemainder(block, spec.ecCodewordsPerBlock));
  }

  // Interleave data and EC blocks
  const finalCodewords: number[] = [];
  for (let i = 0; i < blockSize; i++) {
    for (let b = 0; b < spec.numBlocks; b++) {
      finalCodewords.push(dataBlocks[b]?.[i] ?? 0);
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (let b = 0; b < spec.numBlocks; b++) {
      finalCodewords.push(ecBlocks[b]?.[i] ?? 0);
    }
  }

  // 3. Initialize grid
  const size = spec.size;
  const modules: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const setModule = (r: number, c: number, dark: boolean) => {
    const row = modules[r];
    if (row && c >= 0 && c < size) {
      row[c] = dark;
    }
  };

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    const mRow = modules[r];
    const fRow = isFunction[r];
    if (mRow && fRow && c >= 0 && c < size) {
      mRow[c] = dark;
      fRow[c] = true;
    }
  };

  const isFunc = (r: number, c: number): boolean => Boolean(isFunction[r]?.[c]);

  // Finder patterns + separators
  const drawFinder = (topR: number, leftC: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = topR + dr;
        const c = leftC + dc;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, inOuter && (onBorder || inInner));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const centers = spec.alignmentCenters;
  for (const cr of centers) {
    for (const cc of centers) {
      if (
        (cr === 6 && cc === 6) ||
        (cr === 6 && cc === size - 7) ||
        (cr === size - 7 && cc === 6)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFunctionModule(cr + dr, cc + dc, dark);
        }
      }
    }
  }

  // Dark module and reserved format areas
  setFunctionModule(size - 8, 8, true);
  for (let i = 0; i < 9; i++) {
    if (!isFunc(8, i)) setFunctionModule(8, i, false);
    if (!isFunc(i, 8)) setFunctionModule(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunc(8, size - 1 - i)) setFunctionModule(8, size - 1 - i, false);
    if (!isFunc(size - 1 - i, 8)) setFunctionModule(size - 1 - i, 8, false);
  }

  // 4. Place data bits in upward/downward 2-column zig-zag
  let bitIdx = 0;
  const totalBits = finalCodewords.length * 8;
  let upward = true;

  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5; // Skip vertical timing column
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let dc = 0; dc < 2; dc++) {
        const c = rightCol - dc;
        if (!isFunc(r, c)) {
          let dark = false;
          if (bitIdx < totalBits) {
            const byte = finalCodewords[bitIdx >>> 3] ?? 0;
            dark = ((byte >>> (7 - (bitIdx & 7))) & 1) === 1;
            bitIdx++;
          }
          setModule(r, c, dark);
        }
      }
    }
    upward = !upward;
  }

  // 5. Apply Mask 0 ((r + c) % 2 === 0) and write format bits
  const maskPattern = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunc(r, c) && (r + c) % 2 === 0) {
        setModule(r, c, !Boolean(modules[r]?.[c]));
      }
    }
  }

  const formatBits = FORMAT_BITS_LEVEL_L[maskPattern] ?? 0x77c4;
  const getFormatBit = (idx: number) => ((formatBits >>> idx) & 1) === 1;

  // Top-left format info
  for (let i = 0; i <= 5; i++) setModule(8, i, getFormatBit(14 - i));
  setModule(8, 7, getFormatBit(8));
  setModule(8, 8, getFormatBit(7));
  setModule(7, 8, getFormatBit(6));
  for (let i = 9; i < 15; i++) setModule(14 - i, 8, getFormatBit(14 - i));

  // Top-right and bottom-left format info
  for (let i = 0; i < 8; i++) setModule(8, size - 1 - i, getFormatBit(i));
  for (let i = 8; i < 15; i++) setModule(size - 15 + i, 8, getFormatBit(i));
  setModule(size - 8, 8, true);

  return modules;
}

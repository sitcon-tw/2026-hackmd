export function parseHHMMToMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm?.trim() ?? "");
  if (!m) return null;

  const hh = Number(m[1]);
  const mm = Number(m[2]);

  if (
    !Number.isFinite(hh) ||
    !Number.isFinite(mm) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59
  ) {
    return null;
  }

  return hh * 60 + mm;
}

/**
 * Check if nowMin is within [start, end)
 * Supports cross-midnight ranges.
 */
export function isInRangeMinutes(nowMin, startMin, endMin) {
  if (startMin === endMin) return true; // whole day

  if (startMin < endMin) {
    return nowMin >= startMin && nowMin < endMin;
  }

  // Cross midnight
  return nowMin >= startMin || nowMin < endMin;
}

/**
 * Decide whether to use current color
 */
export function shouldUseCurrentColor(nowMin, startMin, endMin) {
  return isInRangeMinutes(nowMin, startMin, endMin);
}

/**
 * Parse 6-digit hex RGB
 */
export function parseHexRGB(hex) {
  const h = hex?.trim().replace(/^#/, "").toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(h)) return null;

  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Get current minutes in Asia/Taipei
 */
export function getTaipeiMinutes(date = new Date()) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = dtf.formatToParts(date);
  const hh = Number(parts.find((p) => p.type === "hour")?.value);
  const mm = Number(parts.find((p) => p.type === "minute")?.value);

  return hh * 60 + mm;
}

/**
 * ============================
 * PNG Generator (1x1 RGBA)
 * ============================
 */

export function makePng1x1RGBA(r, g, b, a = 255) {
  const raw = new Uint8Array([0x00, r & 255, g & 255, b & 255, a & 255]);

  const len = raw.length;
  const nlen = (~len) & 0xffff;
  const ad = adler32(raw);

  const z = new Uint8Array(2 + 1 + 2 + 2 + len + 4);
  let o = 0;

  z[o++] = 0x78;
  z[o++] = 0x01;
  z[o++] = 0x01;
  z[o++] = len & 0xff;
  z[o++] = (len >> 8) & 0xff;
  z[o++] = nlen & 0xff;
  z[o++] = (nlen >> 8) & 0xff;

  z.set(raw, o);
  o += len;

  z[o++] = (ad >>> 24) & 0xff;
  z[o++] = (ad >>> 16) & 0xff;
  z[o++] = (ad >>> 8) & 0xff;
  z[o++] = ad & 0xff;

  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = new Uint8Array(13);
  ihdrData.set([0, 0, 0, 1, 0, 0, 0, 1], 0);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = makeChunk("IHDR", ihdrData);
  const idat = makeChunk("IDAT", z);
  const iend = makeChunk("IEND", new Uint8Array(0));

  return concatBytes(sig, ihdr, idat, iend);
}

function makeChunk(type4, data) {
  const type = ascii4(type4);
  const len = data.length;

  const out = new Uint8Array(8 + len + 4);

  out[0] = (len >>> 24) & 0xff;
  out[1] = (len >>> 16) & 0xff;
  out[2] = (len >>> 8) & 0xff;
  out[3] = len & 0xff;

  out.set(type, 4);
  out.set(data, 8);

  const crc = crc32(concatBytes(type, data));
  const p = 8 + len;

  out[p] = (crc >>> 24) & 0xff;
  out[p + 1] = (crc >>> 16) & 0xff;
  out[p + 2] = (crc >>> 8) & 0xff;
  out[p + 3] = crc & 0xff;

  return out;
}

function ascii4(s) {
  return new Uint8Array([
    s.charCodeAt(0),
    s.charCodeAt(1),
    s.charCodeAt(2),
    s.charCodeAt(3),
  ]);
}

function concatBytes(...arrs) {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let o = 0;

  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }

  return out;
}

function adler32(bytes) {
  let a = 1,
    b = 0;
  const MOD = 65521;

  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]) % MOD;
    b = (b + a) % MOD;
  }

  return ((b << 16) | a) >>> 0;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * ============================
 * Worker Entry
 * ============================
 */

export default {
  async fetch(request) {
    const url = new URL(request.url);

    const s = url.searchParams.get("s") ?? "12:00";
    const e = url.searchParams.get("e") ?? "13:00";
    const d = url.searchParams.get("d") ?? "D4D4D4";
    const c = url.searchParams.get("c") ?? "FF9000";

    const startMin = parseHHMMToMinutes(s);
    const endMin = parseHHMMToMinutes(e);

    if (startMin == null || endMin == null) {
      return new Response("Invalid time format", { status: 400 });
    }

    const defRGB = parseHexRGB(d);
    const curRGB = parseHexRGB(c);

    if (!defRGB || !curRGB) {
      return new Response("Invalid color format", { status: 400 });
    }

    const nowMin = getTaipeiMinutes();
    const useCurrent = shouldUseCurrentColor(
      nowMin,
      startMin,
      endMin
    );

    const [r, g, b] = useCurrent ? curRGB : defRGB;

    return new Response(makePng1x1RGBA(r, g, b), {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
      },
    });
  },
};

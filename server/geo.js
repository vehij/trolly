// تشخیص IP ایران از روی فهرست بازه‌های server/geo/ir-*.txt (بدون سرویس خارجی، تا در قطعی هم کار کند)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isIP } from 'node:net';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'geo');

function v4ToBig(ip) {
  return ip.split('.').reduce((n, part) => (n << 8n) + BigInt(part), 0n);
}

function v6ToBig(ip) {
  let [head, tail] = ip.split('::');
  const h = head ? head.split(':') : [];
  const t = tail !== undefined ? (tail ? tail.split(':') : []) : [];
  // آدرس IPv4 در انتهای IPv6 (مثل ::ffff:1.2.3.4)
  const last = (tail !== undefined ? t : h).at(-1);
  if (last && last.includes('.')) {
    const v4 = v4ToBig(last);
    const arr = tail !== undefined ? t : h;
    arr.splice(-1, 1, (v4 >> 16n).toString(16), (v4 & 0xffffn).toString(16));
  }
  const groups = tail !== undefined ? [...h, ...Array(8 - h.length - t.length).fill('0'), ...t] : h;
  return groups.reduce((n, g) => (n << 16n) + BigInt(parseInt(g || '0', 16)), 0n);
}

function loadRanges(file, bits, toBig) {
  const out = [];
  for (const line of readFileSync(join(DIR, file), 'utf8').split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const [addr, len] = s.split('/');
    const start = toBig(addr);
    const size = 1n << BigInt(bits - Number(len));
    out.push([start, start + size - 1n]);
  }
  out.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return out;
}

function inRanges(ranges, n) {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [a, b] = ranges[mid];
    if (n < a) hi = mid - 1;
    else if (n > b) lo = mid + 1;
    else return true;
  }
  return false;
}

const PRIVATE_V4 = [['10.0.0.0', 8], ['127.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16], ['169.254.0.0', 16], ['100.64.0.0', 10], ['0.0.0.0', 8]]
  .map(([a, l]) => { const s = v4ToBig(a); return [s, s + (1n << BigInt(32 - l)) - 1n]; });

let V4;
let V6;

/** 'IR' | 'other' | 'unknown' (برای IPهای خصوصی/محلی یا نامعتبر) */
export function countryOf(rawIp) {
  V4 ??= loadRanges('ir-ipv4.txt', 32, v4ToBig);
  V6 ??= loadRanges('ir-ipv6.txt', 128, v6ToBig);
  let ip = String(rawIp || '').trim().replace(/^\[|\]$/g, '').split('%')[0];
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) ip = mapped[1];
  const kind = isIP(ip);
  if (kind === 4) {
    const n = v4ToBig(ip);
    if (PRIVATE_V4.some(([a, b]) => n >= a && n <= b)) return 'unknown';
    return inRanges(V4, n) ? 'IR' : 'other';
  }
  if (kind === 6) {
    const n = v6ToBig(ip);
    if (n <= 1n || n >> 121n === 0x7en || n >> 118n === 0x3fan) return 'unknown'; // ::، ::1، fc00::/7، fe80::/10
    return inRanges(V6, n) ? 'IR' : 'other';
  }
  return 'unknown';
}

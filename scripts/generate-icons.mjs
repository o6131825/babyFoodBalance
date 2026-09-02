import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const publicDir = join(dir, '..', 'public')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const payload = Buffer.concat([t, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(payload))
  return Buffer.concat([len, payload, crc])
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y, size)
      const i = row + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function roundedRect(px, py, size) {
  const radius = size * 0.22
  const sage = [91, 143, 122, 255]
  const cream = [247, 243, 236, 255]
  const terra = [196, 92, 38, 255]
  const insideRound = (x, y, x0, y0, x1, y1, r) => {
    if (x >= x0 + r && x < x1 - r && y >= y0 && y < y1) return true
    if (y >= y0 + r && y < y1 - r && x >= x0 && x < x1) return true
    const corners = [
      [x0 + r, y0 + r],
      [x1 - r, y0 + r],
      [x0 + r, y1 - r],
      [x1 - r, y1 - r],
    ]
    return corners.some(([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r)
  }

  if (!insideRound(px, py, 0, 0, size, size, radius)) return [0, 0, 0, 0]

  const cx = size / 2
  const bowlY = size * 0.56
  const bowlR = size * 0.22
  const neckW = size * 0.08
  const neckH = size * 0.16
  const inBowl = (px - cx) ** 2 + (py - bowlY) ** 2 <= bowlR * bowlR
  const inNeck =
    px >= cx - neckW &&
    px <= cx + neckW &&
    py >= size * 0.24 &&
    py <= size * 0.42
  const accent =
    (px - size * 0.7) ** 2 + (py - size * 0.32) ** 2 <= (size * 0.06) ** 2

  if (accent) return terra
  if (inBowl || inNeck) return cream
  return sage
}

for (const size of [192, 512, 180]) {
  const buf = png(size, (x, y, s) => roundedRect(x, y, s))
  const name =
    size === 180 ? 'apple-touch-icon.png' : `pwa-${size}x${size}.png`
  writeFileSync(join(publicDir, name), buf)
  console.log('wrote', name)
}

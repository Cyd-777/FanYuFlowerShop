/**
 * 生成底部 TabBar 占位图标（81×81 PNG，白底 RGB）
 * 用法：node scripts/generate-tab-icons.js
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SIZE = 81
const OUT_DIRS = [
  path.join(__dirname, '../src/images/tab'),
  path.join(__dirname, '../images/tab'),
]

const COLORS = {
  normal: { r: 153, g: 153, b: 153 },
  active: { r: 229, g: 57, b: 53 },
}

const ICONS = [
  { name: 'home', draw: drawHome },
  { name: 'category', draw: drawCategory },
  { name: 'wiki', draw: drawWiki },
  { name: 'cart', draw: drawCart },
  { name: 'mine', draw: drawMine },
]

function createBuffer() {
  const buf = Buffer.alloc(SIZE * SIZE * 3, 255)
  return buf
}

function setPixel(buf, x, y, color) {
  const px = Math.round(x)
  const py = Math.round(y)
  if (px < 0 || py < 0 || px >= SIZE || py >= SIZE) return
  const idx = (py * SIZE + px) * 3
  buf[idx] = color.r
  buf[idx + 1] = color.g
  buf[idx + 2] = color.b
}

function fillRect(buf, x, y, w, h, color) {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      setPixel(buf, px, py, color)
    }
  }
}

function fillCircle(buf, cx, cy, r, color) {
  for (let y = -r; y <= r; y += 1) {
    for (let x = -r; x <= r; x += 1) {
      if (x * x + y * y <= r * r) {
        setPixel(buf, cx + x, cy + y, color)
      }
    }
  }
}

function fillEllipse(buf, cx, cy, rx, ry, color) {
  for (let y = -ry; y <= ry; y += 1) {
    for (let x = -rx; x <= rx; x += 1) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) {
        setPixel(buf, cx + x, cy + y, color)
      }
    }
  }
}

function strokeRect(buf, x, y, w, h, color, stroke = 5) {
  fillRect(buf, x, y, w, stroke, color)
  fillRect(buf, x, y + h - stroke, w, stroke, color)
  fillRect(buf, x, y, stroke, h, color)
  fillRect(buf, x + w - stroke, y, stroke, h, color)
}

function fillTriangle(buf, x1, y1, x2, y2, x3, y3, color) {
  const minY = Math.min(y1, y2, y3)
  const maxY = Math.max(y1, y2, y3)
  for (let y = minY; y <= maxY; y += 1) {
    const xs = []
    const edges = [[x1, y1, x2, y2], [x2, y2, x3, y3], [x3, y3, x1, y1]]
    for (const [ax, ay, bx, by] of edges) {
      if (ay === by) {
        if (y === ay) xs.push(ax, bx)
      } else if (y >= Math.min(ay, by) && y <= Math.max(ay, by)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay))
      }
    }
    if (xs.length >= 2) {
      xs.sort((a, b) => a - b)
      for (let x = Math.ceil(xs[0]); x <= Math.floor(xs[xs.length - 1]); x += 1) {
        setPixel(buf, x, y, color)
      }
    }
  }
}

function drawHome(buf, color) {
  fillTriangle(buf, 40, 16, 18, 40, 62, 40, color)
  fillRect(buf, 24, 40, 33, 24, color)
  fillRect(buf, 34, 48, 13, 16, { r: 255, g: 255, b: 255 })
}

function drawCategory(buf, color) {
  const cells = [[20, 20], [44, 20], [20, 44], [44, 44]]
  for (const [x, y] of cells) {
    strokeRect(buf, x, y, 17, 17, color, 5)
  }
}

function drawWiki(buf, color) {
  strokeRect(buf, 18, 18, 20, 44, color, 5)
  strokeRect(buf, 43, 18, 20, 44, color, 5)
  for (let y = 24; y <= 56; y += 9) {
    fillRect(buf, 23, y, 12, 3, color)
    fillRect(buf, 48, y, 12, 3, color)
  }
}

function drawCart(buf, color) {
  fillRect(buf, 20, 24, 40, 5, color)
  fillRect(buf, 18, 29, 5, 20, color)
  fillRect(buf, 58, 29, 5, 20, color)
  fillRect(buf, 22, 49, 36, 5, color)
  fillTriangle(buf, 18, 29, 63, 29, 58, 49, color)
  fillCircle(buf, 28, 58, 5, color)
  fillCircle(buf, 52, 58, 5, color)
}

function drawMine(buf, color) {
  fillCircle(buf, 40, 26, 11, color)
  fillRect(buf, 20, 40, 40, 22, color)
}

/** 铃兰：弯曲花茎 + 串铃小花 + 基叶（与默认「我的」人形区分） */
function drawLilyBell(buf, x, y, color) {
  fillCircle(buf, x, y - 2, 3, color)
  fillRect(buf, x - 3, y - 1, 6, 6, color)
  fillTriangle(buf, x - 3, y + 5, x + 3, y + 5, x, y + 8, color)
}

function drawMineNotify(buf, color) {
  fillRect(buf, 39, 30, 4, 44, color)
  fillEllipse(buf, 27, 66, 11, 5, color)
  fillEllipse(buf, 53, 64, 11, 5, color)
  const bells = [
    [40, 22],
    [33, 32],
    [47, 40],
    [35, 48],
    [45, 54],
  ]
  for (const [x, y] of bells) {
    drawLilyBell(buf, x, y, color)
  }
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([length, typeBuf, data, crcBuf])
}

function encodePng(rgb) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0)
  ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const stride = SIZE * 3 + 1
  const raw = Buffer.alloc(stride * SIZE)
  for (let y = 0; y < SIZE; y += 1) {
    raw[y * stride] = 0
    rgb.copy(raw, y * stride + 1, y * SIZE * 3, (y + 1) * SIZE * 3)
  }

  return Buffer.concat([
    signature,
    writeChunk('IHDR', ihdr),
    writeChunk('IDAT', zlib.deflateSync(raw)),
    writeChunk('IEND', Buffer.alloc(0)),
  ])
}

function renderIcon(drawFn, color) {
  const buf = createBuffer()
  drawFn(buf, color)
  return encodePng(buf)
}

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const name of fs.readdirSync(srcDir)) {
    if (!name.endsWith('.png')) continue
    fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name))
  }
}

function main() {
  const primaryDir = OUT_DIRS[0]
  fs.mkdirSync(primaryDir, { recursive: true })

  for (const icon of ICONS) {
    const normal = renderIcon(icon.draw, COLORS.normal)
    const active = renderIcon(icon.draw, COLORS.active)
    fs.writeFileSync(path.join(primaryDir, `${icon.name}.png`), normal)
    fs.writeFileSync(path.join(primaryDir, `${icon.name}-active.png`), active)
    console.log(`[tab-icons] ${icon.name}.png / ${icon.name}-active.png`)
  }

  const notifyNormal = renderIcon(drawMineNotify, COLORS.normal)
  const notifyActive = renderIcon(drawMineNotify, COLORS.active)
  fs.writeFileSync(path.join(primaryDir, 'mine-notify.png'), notifyNormal)
  fs.writeFileSync(path.join(primaryDir, 'mine-notify-active.png'), notifyActive)
  console.log('[tab-icons] mine-notify.png / mine-notify-active.png')

  for (const dir of OUT_DIRS.slice(1)) {
    copyDir(primaryDir, dir)
    console.log(`[tab-icons] synced -> ${dir}`)
  }

  const distDir = path.join(__dirname, '../dist/images/tab')
  if (fs.existsSync(path.join(__dirname, '../dist'))) {
    copyDir(primaryDir, distDir)
    console.log(`[tab-icons] synced -> ${distDir}`)
  }

  console.log('[tab-icons] done')
}

main()

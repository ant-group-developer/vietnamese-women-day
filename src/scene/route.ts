import * as THREE from 'three'
import { STATION_COUNT } from '../data/departments'
import { insideMain, layout, loop, PATH_Y } from './path'
import { skyIslands, type SkyIsland } from './landmarks'

/**
 * Đường đi của nhân vật: chính là vòng elip của cả hành trình (path.ts), thêm độ cao:
 * đoạn nằm trên đảo chính hoặc đảo phụ thì đi trên mặt đảo, đoạn giữa hai đảo là cầu treo chạy theo đúng cung vòng
 * (võng nhẹ ở giữa). Nhờ vậy đi một chiều là quay về chỗ cũ như đi một vòng tròn, không có khúc gãy.
 * Vị trí trên đường là u ∈ [0, 1), u = 0 là điểm xuất phát.
 */

/** Nửa bề rộng đường (viền ngoài), dùng chung cho mọi đoạn. */
export const PATH_HALF_WIDTH = 1.0
/** Đầu cầu lùi vào trong mép đảo. */
const BRIDGE_INSET = 0.7
/** Khoảng cách giữa các điểm lấy mẫu khi dựng đường. */
const SPACING = 0.4

/** Cầu treo: đoạn vòng [s0, s1] (theo chiều dài vòng), độ cao hai đầu và độ võng. */
export interface Bridge {
  s0: number
  s1: number
  y0: number
  y1: number
  sag: number
}

const L = loop.length
const loopAt = (s: number, out = new THREE.Vector3()) => loop.getPointAt((((s / L) % 1) + 1) % 1, out)
const loopTan = (s: number, out = new THREE.Vector3()) => loop.getTangentAt((((s / L) % 1) + 1) % 1, out).setY(0).normalize()

function onSky(x: number, z: number, margin: number): SkyIsland | null {
  for (const d of skyIslands)
    if (((x - d.center.x) / (d.rx - margin)) ** 2 + ((z - d.center.z) / (d.rz - margin)) ** 2 < 1) return d
  return null
}

/** Mặt đất dưới điểm (x, z) của vòng: độ cao mặt đảo, hoặc null nếu đang ở giữa hai đảo. */
function groundTop(x: number, z: number): number | null {
  if (insideMain(x, z, BRIDGE_INSET)) return 0
  const d = onSky(x, z, BRIDGE_INSET)
  return d ? d.center.y : null
}

/** Điểm trên cầu (u từ 0 tới 1), theo đúng cung vòng; lift > 0 để lấy điểm treo dây tay vịn. */
export function bridgePoint(b: Bridge, u: number, lift = 0): THREE.Vector3 {
  return loopAt(b.s0 + (b.s1 - b.s0) * u).setY(THREE.MathUtils.lerp(b.y0, b.y1, u) - b.sag * 4 * u * (1 - u) * (1 - lift * 0.4) + lift)
}

/** Hướng (xz) dọc cầu tại u. */
export function bridgeTangent(b: Bridge, u: number): THREE.Vector3 {
  return loopTan(b.s0 + (b.s1 - b.s0) * u)
}

// Dò dọc vòng: đánh dấu đoạn mặt đất / đoạn cầu.
type Kind = 'ground' | 'bridge'
const N = Math.ceil(L / SPACING)
const samples = Array.from({ length: N }, (_, i) => {
  const s = (i / N) * L
  const p = loopAt(s)
  const top = groundTop(p.x, p.z)
  return { s, p, top }
})

export const bridges: Bridge[] = []
{
  // Bắt đầu duyệt từ một điểm mặt đất (điểm xuất phát luôn trên đảo chính).
  let i = 0
  while (i < N) {
    if (samples[i].top !== null) {
      i++
      continue
    }
    const start = i
    while (i < N && samples[i % N].top === null) i++
    const before = samples[(start - 1 + N) % N]
    const after = samples[i % N]
    const s0 = before.s
    const s1 = i < N ? after.s : after.s + L
    bridges.push({ s0, s1, y0: before.top! + 0.04, y1: after.top! + 0.04, sag: THREE.MathUtils.clamp((s1 - s0) * 0.035, 0.25, 0.6) })
  }
}

const ctrl: THREE.Vector3[] = []
const kinds: Kind[] = []
for (const { s, p, top } of samples) {
  if (top !== null) {
    ctrl.push(p.clone().setY(top + PATH_Y))
    kinds.push('ground')
    continue
  }
  const b = bridges.find((br) => (s >= br.s0 && s <= br.s1) || (s + L >= br.s0 && s + L <= br.s1))!
  const ss = s >= b.s0 ? s : s + L
  const q = bridgePoint(b, (ss - b.s0) / (b.s1 - b.s0))
  ctrl.push(q.setY(q.y + 0.03))
  kinds.push('bridge')
}

const curve = new THREE.CatmullRomCurve3(ctrl, true, 'centripetal')
curve.arcLengthDivisions = ctrl.length * 4
const length = curve.getLength()

/** Mẫu dày trên đường để tìm u gần một điểm. */
const SAMPLE_COUNT = Math.ceil(length / 0.1)
const spaced = curve.getSpacedPoints(SAMPLE_COUNT)
function nearestU(p: THREE.Vector3): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const d = (spaced[i].x - p.x) ** 2 + (spaced[i].z - p.z) ** 2
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best / SAMPLE_COUNT
}

/** u của từng trạm (chỉ số STATION_COUNT = hộp quà). */
const stationU = [...layout.stations, layout.gift].map((s) => nearestU(s.pos))

/** u của từng đảo phụ (điểm trên đường gần tâm đảo nhất), cùng thứ tự với skyIslands. */
export const islandU = skyIslands.map((s) => nearestU(s.center))

export const route = { curve, length }

/** u của trạm index (-1 = điểm xuất phát). */
export function routeStationU(index: number): number {
  if (index < 0) return 0
  return stationU[Math.min(index, STATION_COUNT)]
}

/** Đưa u về [0, 1). */
export function wrapU(u: number): number {
  return ((u % 1) + 1) % 1
}

/** Độ lệch có dấu ngắn nhất (vòng khép kín) để đi từ a tới b. */
export function diffU(a: number, b: number): number {
  const d = wrapU(b - a)
  return d > 0.5 ? d - 1 : d
}

export function routePoint(u: number, out = new THREE.Vector3()): THREE.Vector3 {
  return curve.getPointAt(wrapU(u), out)
}

export function routeTangent(u: number, out = new THREE.Vector3()): THREE.Vector3 {
  return curve.getTangentAt(wrapU(u), out).setY(0).normalize()
}

/** Trạm (kể cả hộp quà) gần vị trí u nhất trong phạm vi `range` mét, -1 nếu không có. */
export function stationNear(u: number, range: number): number {
  let best = -1
  let bestD = range
  for (let i = 0; i <= STATION_COUNT; i++) {
    const d = Math.abs(diffU(u, stationU[i])) * length
    if (d <= bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/** Các đoạn đường trên mặt đất (mọi thứ trừ cầu), mỗi đoạn là khoảng [u0, u1] liền nhau (có thể vắt qua u = 1). */
export const groundRuns: [number, number][] = []
{
  const n = ctrl.length
  const firstBridge = kinds.indexOf('bridge')
  if (firstBridge < 0) groundRuns.push([0, 1])
  else {
    let i0 = firstBridge
    while (kinds[i0 % n] === 'bridge') i0++
    let start = i0
    for (let k = i0; k <= i0 + n; k++) {
      const isBridge = kinds[k % n] === 'bridge'
      if (isBridge && start >= 0) {
        groundRuns.push([start / n, k / n])
        start = -1
      } else if (!isBridge && start < 0) start = k
    }
  }
}

/** Mẫu dọc các đoạn mặt đất, để trang trí ngẫu nhiên tránh đường. */
const groundSamples = ctrl.filter((_, i) => kinds[i] === 'ground')

/** Điểm nằm trên (hoặc sát) đường đi: trang trí ngẫu nhiên phải tránh. */
export function onWalkway(p: THREE.Vector3, pad = 0): boolean {
  const r2 = (PATH_HALF_WIDTH + 0.2 + pad) ** 2
  return groundSamples.some((q) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < r2 && Math.abs(q.y - p.y) < 1.5)
}

if (import.meta.env.DEV) (window as unknown as { __route: unknown }).__route = { curve, length, bridges, stationU, ctrl, kinds, groundRuns }

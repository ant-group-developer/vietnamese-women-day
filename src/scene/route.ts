import * as THREE from 'three'
import { STATION_COUNT } from '../data/departments'
import { layout, PATH_Y } from './path'
import { skyIslands, type SkyIsland } from './landmarks'

/**
 * Đường đi của nhân vật: một đường cong trơn khép kín đi qua mọi điểm theo một chiều.
 * Đường chính (qua các phòng ban tới hộp quà) → cầu treo sang đảo phụ đầu tiên → lần lượt các đảo
 * (mỗi đảo đi vòng cung qua góc chụp ảnh phía trước điểm nhấn) → cầu về đảo chính → vòng lại điểm xuất phát.
 * Các đoạn nối (đường chính ↔ cầu, cầu ↔ vòng cung trên đảo) là đường cong Hermite khớp hướng hai đầu nên không có khúc gãy.
 * Vị trí trên đường là u ∈ [0, 1), u = 0 là điểm xuất phát; giữ một phím là đi hết mọi nơi.
 */

/** Đầu cầu lùi vào trong mép đảo. */
const BRIDGE_INSET = 0.7
/** Vòng cung trên đảo phụ chạy quanh điểm nhấn ở khoảng này (tỉ lệ bán trục đảo). */
export const RING = 0.55
/** Góc chụp ảnh ở phía trước điểm nhấn (phía camera, góc π/2 trên elip đảo). */
const SPOT_ANGLE = Math.PI / 2
/** Vòng cung bắt đầu/kết thúc cách chỗ lên xuống cầu một góc này, chừa chỗ cho khúc lượn vào/ra. */
const RING_ENTRY = 1.0
/** Khoảng cách giữa các điểm lấy mẫu khi dựng đường. */
const SPACING = 0.4
/** Nửa bề rộng đường (viền ngoài), dùng chung cho mọi đoạn. */
export const PATH_HALF_WIDTH = 1.0

export interface Bridge {
  from: THREE.Vector3
  to: THREE.Vector3
  sag: number
}

export interface PhotoSpot {
  island: SkyIsland
  /** Chỉ số trong skyIslands. */
  index: number
  pos: THREE.Vector3
  u: number
}

interface Disc {
  center: THREE.Vector3
  rx: number
  rz: number
  /** Độ cao mặt đảo. */
  top: number
}

const TAU = Math.PI * 2
const norm = (a: number) => ((a % TAU) + TAU) % TAU

function ellipsePoint(d: Disc, angle: number, scale: number, y: number) {
  return new THREE.Vector3(d.center.x + Math.cos(angle) * d.rx * scale, y, d.center.z + Math.sin(angle) * d.rz * scale)
}

/** Hướng tiếp tuyến (xz) của elip đảo tại góc `angle`, theo chiều tăng góc nếu dir = 1. */
function ellipseTangent(d: Disc, angle: number, dir: number) {
  return new THREE.Vector3(-Math.sin(angle) * d.rx * dir, 0, Math.cos(angle) * d.rz * dir).normalize()
}

/** Góc của điểm trên mép đảo gần `target` nhất (theo mặt phẳng xz). */
function closestAngle(d: Disc, target: THREE.Vector3): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * TAU
    const dist = (d.center.x + Math.cos(a) * d.rx - target.x) ** 2 + (d.center.z + Math.sin(a) * d.rz - target.z) ** 2
    if (dist < bestD) {
      bestD = dist
      best = a
    }
  }
  return best
}

/** Đầu cầu trên đảo d ở góc `angle`: lùi vào trong mép một đoạn BRIDGE_INSET. */
function bridgeEnd(d: Disc, angle: number): THREE.Vector3 {
  const p = ellipsePoint(d, angle, 1, d.top + 0.04)
  const inward = new THREE.Vector3(d.center.x - p.x, 0, d.center.z - p.z).normalize()
  return p.addScaledVector(inward, BRIDGE_INSET)
}

/** Điểm trên cầu (u từ 0 tới 1); lift > 0 để lấy điểm treo dây tay vịn. */
export function bridgePoint(b: Bridge, u: number, lift = 0): THREE.Vector3 {
  return b.from
    .clone()
    .lerp(b.to, u)
    .setY(THREE.MathUtils.lerp(b.from.y, b.to.y, u) - b.sag * 4 * u * (1 - u) * (1 - lift * 0.4) + lift)
}

/**
 * Đường cong Hermite (xz) từ p0 theo hướng t0 tới p1 theo hướng t1, độ cao nội suy tuyến tính.
 * Trả về các điểm ở giữa (không gồm hai đầu).
 */
function hermite(p0: THREE.Vector3, t0: THREE.Vector3, p1: THREE.Vector3, t1: THREE.Vector3): THREE.Vector3[] {
  const chord = Math.hypot(p1.x - p0.x, p1.z - p0.z)
  const m = chord * 1.1
  const n = Math.max(2, Math.ceil(chord / SPACING))
  const out: THREE.Vector3[] = []
  for (let i = 1; i < n; i++) {
    const s = i / n
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1
    const h10 = s ** 3 - 2 * s ** 2 + s
    const h01 = -2 * s ** 3 + 3 * s ** 2
    const h11 = s ** 3 - s ** 2
    out.push(
      new THREE.Vector3(
        h00 * p0.x + h10 * m * t0.x + h01 * p1.x + h11 * m * t1.x,
        THREE.MathUtils.lerp(p0.y, p1.y, s),
        h00 * p0.z + h10 * m * t0.z + h01 * p1.z + h11 * m * t1.z,
      ),
    )
  }
  return out
}

type Kind = 'main' | 'walk' | 'bridge'

const main: Disc = { center: layout.island.center, rx: layout.island.rx, rz: layout.island.rz, top: 0 }
const islandDiscs: Disc[] = skyIslands.map((s) => ({ center: s.center, rx: s.rx, rz: s.rz, top: s.center.y }))

// Điểm điều khiển (dày) của đường cong, kèm loại đoạn bắt đầu từ điểm đó.
const ctrl: THREE.Vector3[] = []
const kinds: Kind[] = []
const push = (p: THREE.Vector3, kind: Kind) => {
  ctrl.push(p)
  kinds.push(kind)
}

const mainSteps = Math.ceil(layout.length / 0.6)
for (let i = 0; i <= mainSteps; i++) push(layout.curve.getPointAt(i / mainSteps), i < mainSteps ? 'main' : 'walk')

export const bridges: Bridge[] = []
const spotCtrl: number[] = []
const seq = [main, ...islandDiscs, main]
/** Điểm và hướng đang đứng trước khi dựng đoạn kế tiếp (ban đầu là cuối đường chính). */
let tail = { p: layout.curve.getPointAt(1), dir: layout.curve.getTangentAt(1).setY(0).normalize() }
for (let k = 0; k + 1 < seq.length; k++) {
  const A = seq[k]
  const B = seq[k + 1]
  const from = bridgeEnd(A, closestAngle(A, B.center))
  const landAngle = closestAngle(B, from)
  const to = bridgeEnd(B, landAngle)
  const bridge = { from, to, sag: THREE.MathUtils.clamp(from.distanceTo(to) * 0.035, 0.3, 0.7) }
  bridges.push(bridge)
  const dir = new THREE.Vector3(to.x - from.x, 0, to.z - from.z).normalize()
  const walkY = (d: Disc) => d.top + PATH_Y

  // Lượn từ chỗ đang đứng tới đầu cầu, vào cầu theo đúng hướng cầu.
  const start = from.clone().setY(walkY(A))
  for (const p of hermite(tail.p, tail.dir, start, dir)) push(p, 'walk')
  const m = Math.max(4, Math.ceil(from.distanceTo(to) / 1.2))
  for (let j = 0; j <= m; j++) {
    const p = bridgePoint(bridge, j / m)
    push(p.setY(p.y + 0.03), j < m ? 'bridge' : 'walk')
  }
  tail = { p: to.clone().setY(walkY(B)), dir }

  if (B === main) {
    // Cầu cuối: lượn về điểm xuất phát, nhập vào đầu đường chính theo đúng hướng đường (đường khép kín).
    for (const p of hermite(tail.p, tail.dir, layout.curve.getPointAt(0), layout.curve.getTangentAt(0).setY(0).normalize())) push(p, 'walk')
    break
  }

  // Trên đảo phụ: lượn vào vòng cung quanh điểm nhấn, đi qua góc chụp ảnh phía trước, rồi lượn ra cầu kế tiếp.
  const next = seq[k + 2]
  const leaveAngle = closestAngle(B, next.center)
  const up = norm(leaveAngle - landAngle)
  const spotUp = norm(SPOT_ANGLE - landAngle)
  const sign = spotUp < up ? 1 : -1
  const span = sign > 0 ? up : TAU - up
  const spotAt = sign > 0 ? spotUp : TAU - spotUp
  const entry = Math.min(RING_ENTRY, spotAt - 0.3, span - spotAt - 0.3)
  const a0 = landAngle + sign * entry
  const a1 = landAngle + sign * (span - entry)
  const y = walkY(B)
  const ringStart = ellipsePoint(B, a0, RING, y)
  for (const p of hermite(tail.p, tail.dir, ringStart, ellipseTangent(B, a0, sign))) push(p, 'walk')
  const arc = Math.abs(a1 - a0) * (B.rx + B.rz) * 0.5 * RING
  const n = Math.max(2, Math.ceil(arc / SPACING))
  let spotDone = false
  for (let i = 0; i <= n; i++) {
    const d = entry + ((span - 2 * entry) * i) / n
    if (!spotDone && d >= spotAt) {
      spotDone = true
      spotCtrl.push(ctrl.length)
      push(ellipsePoint(B, SPOT_ANGLE, RING, y), 'walk')
      if (Math.abs(d - spotAt) < 0.05) continue
    }
    push(ellipsePoint(B, landAngle + sign * d, RING, y), 'walk')
  }
  tail = { p: ellipsePoint(B, a1, RING, y), dir: ellipseTangent(B, a1, sign) }
}

const curve = new THREE.CatmullRomCurve3(ctrl, true, 'centripetal')
curve.arcLengthDivisions = ctrl.length * 8
const lengths = curve.getLengths(curve.arcLengthDivisions)
const length = lengths[lengths.length - 1]
/** u (theo chiều dài) của từng điểm điều khiển. */
const ctrlU = ctrl.map((_, i) => lengths[Math.round((i / ctrl.length) * curve.arcLengthDivisions)] / length)

/** Mẫu dày trên đường để tìm u gần một điểm. */
const SAMPLE_COUNT = Math.ceil(length / 0.1)
const samples = curve.getSpacedPoints(SAMPLE_COUNT)
function nearestU(p: THREE.Vector3): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const d = samples[i].distanceToSquared(p)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best / SAMPLE_COUNT
}

/** u của từng trạm (chỉ số STATION_COUNT = hộp quà). */
const stationU = [...layout.stations, layout.gift].map((s) => nearestU(s.pos))

export const route = { curve, length }

/** u của trạm index (-1 = điểm xuất phát). */
export function routeStationU(index: number): number {
  if (index < 0) return 0
  return stationU[Math.min(index, STATION_COUNT)]
}

export const photoSpots: PhotoSpot[] = skyIslands.map((island, index) => ({
  island,
  index,
  pos: ctrl[spotCtrl[index]].clone(),
  u: ctrlU[spotCtrl[index]],
}))

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

/** Góc chụp ảnh tại vị trí u (chỉ số trong photoSpots), -1 nếu không đứng ở góc nào. */
export function spotAt(u: number, range = 0.35): number {
  return photoSpots.findIndex((s) => Math.abs(diffU(u, s.u)) * length <= range)
}

/**
 * Các đoạn đường trên mặt đất (mọi thứ trừ cầu), mỗi đoạn là khoảng [u0, u1] liền nhau trên đường
 * (đoạn trên đảo chính vắt qua u = 0 nên u1 có thể lớn hơn 1).
 */
export const groundRuns: [number, number][] = []
{
  const N = ctrl.length
  const firstBridge = kinds.indexOf('bridge')
  // Bắt đầu duyệt ngay sau một đoạn cầu để mọi đoạn mặt đất đều liền mạch.
  let i0 = firstBridge
  while (kinds[i0 % N] === 'bridge') i0++
  let start = i0
  for (let k = i0; k <= i0 + N; k++) {
    const isBridge = kinds[k % N] === 'bridge'
    if (isBridge && start >= 0) {
      const u0 = ctrlU[start % N] + Math.floor(start / N)
      let u1 = ctrlU[k % N] + Math.floor(k / N)
      if (u1 < u0) u1 += 1
      groundRuns.push([u0, u1])
      start = -1
    } else if (!isBridge && start < 0) start = k
  }
}

/** Mẫu dọc các đoạn mặt đất, để trang trí ngẫu nhiên tránh đường. */
const groundSamples = groundRuns.flatMap(([u0, u1]) => {
  const n = Math.ceil(((u1 - u0) * length) / 0.3)
  return Array.from({ length: n + 1 }, (_, k) => curve.getPointAt(wrapU(u0 + ((u1 - u0) * k) / n)))
})

/** Điểm nằm trên (hoặc sát) đường đi: trang trí ngẫu nhiên phải tránh. */
export function onWalkway(p: THREE.Vector3, pad = 0): boolean {
  const r2 = (PATH_HALF_WIDTH + 0.2 + pad) ** 2
  return groundSamples.some((q) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < r2 && Math.abs(q.y - p.y) < 1.5)
}

if (import.meta.env.DEV) (window as unknown as { __route: unknown }).__route = { curve, length, bridges, photoSpots, stationU, ctrl, kinds, groundRuns }

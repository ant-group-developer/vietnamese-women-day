import * as THREE from 'three'
import { STATION_COUNT } from '../data/departments'

/**
 * Cả hành trình là một vòng elip lớn, đi một chiều là quay về chỗ cũ như một vòng tròn:
 * cung phía trước (phía camera) là đường chính trên đảo chính, qua các phòng ban tới hộp quà;
 * phần còn lại của vòng đi qua lần lượt các đảo phụ nối nhau bằng cầu (landmarks.ts, route.ts).
 * Nhà nằm phía trong vòng (sau đường), quảng trường và hồ ở phía ngoài (trước đường, phía camera).
 */
/** Khoảng cách (theo đường) giữa hai trạm liên tiếp. */
const STEP = 7.5
/** Đoạn đường dẫn vào trước trạm đầu và đoạn đuôi sau hộp quà. */
const LEAD_IN = 5
const TAIL = 2.5
export const PATH_Y = 0.08
/** Nhà lùi vào phía trong vòng so với điểm dừng. */
const HOUSE_BACK = 3.0
/** Tỉ lệ bán trục ngang/dọc của vòng elip. */
const LOOP_ASPECT = 1.25
/** Ước lượng chiều dài phần vòng ngoài đường chính (đảo chính còn dư hai đầu, các đảo phụ và cầu) để chọn cỡ vòng. */
const MAIN_EXTRA = 8
/** Số đảo phụ trên vòng (phải khớp danh sách trong landmarks.ts). */
export const SKY_ISLAND_COUNT = 5
const SKY_SHARE = SKY_ISLAND_COUNT * 13 + (SKY_ISLAND_COUNT + 1) * 7.5

/** Một khối đảo hình elip (trục song song x, z). */
export interface Disc {
  center: THREE.Vector3
  rx: number
  rz: number
  /** Độ cao mặt đảo. */
  top: number
}

export interface StationLayout {
  index: number
  t: number
  /** Điểm dừng trên đường. */
  pos: THREE.Vector3
  /** Vị trí ngôi nhà/hộp quà. */
  housePos: THREE.Vector3
  /** Góc xoay quanh trục y để mặt trước nhà quay về phía đường. */
  houseRotY: number
  /** Chỗ quà bóng bay đáp xuống nếu rơi ở trạm này: cạnh điểm dừng, tránh đường và nhà. */
  bonusPos: THREE.Vector3
}

export interface PathLayout {
  curve: THREE.Curve<THREE.Vector3>
  stations: StationLayout[]
  gift: StationLayout
  /** Khung elip bao cả đảo chính (dùng cho mây, bóng bay, chim bay quanh đảo). */
  island: { center: THREE.Vector3; rx: number; rz: number }
  /** Các khối ghép thành đảo chính hình lưỡi liềm ôm cung đường. */
  discs: Disc[]
  /** Tâm quảng trường (phía trước đường). */
  plaza: THREE.Vector3
  length: number
}

/** Vòng elip tâm gốc toạ độ, tham số theo chiều dài: t = 0 ở điểm xuất phát, đi từ trái sang phải phía trước rồi vòng ra sau. */
class LoopCurve extends THREE.Curve<THREE.Vector3> {
  readonly length: number
  readonly ra: number
  readonly rb: number
  private phis: Float64Array
  private cum: Float64Array
  constructor(ra: number, rb: number, startPhi: number) {
    super()
    this.ra = ra
    this.rb = rb
    const M = 4096
    this.phis = new Float64Array(M + 1)
    this.cum = new Float64Array(M + 1)
    let px = 0
    let pz = 0
    for (let i = 0; i <= M; i++) {
      // Góc giảm dần: từ trái qua giữa phía trước sang phải, rồi vòng ra sau.
      const phi = startPhi - (i / M) * Math.PI * 2
      const x = ra * Math.cos(phi)
      const z = rb * Math.sin(phi)
      this.phis[i] = phi
      this.cum[i] = i === 0 ? 0 : this.cum[i - 1] + Math.hypot(x - px, z - pz)
      px = x
      pz = z
    }
    this.length = this.cum[M]
  }
  getPoint(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    const s = (((t % 1) + 1) % 1) * this.length
    let lo = 0
    let hi = this.cum.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (this.cum[mid] <= s) lo = mid
      else hi = mid
    }
    const k = (s - this.cum[lo]) / (this.cum[hi] - this.cum[lo] || 1)
    const phi = this.phis[lo] + (this.phis[hi] - this.phis[lo]) * k
    return out.set(this.ra * Math.cos(phi), PATH_Y, this.rb * Math.sin(phi))
  }
}

/** Đoạn đầu [0, part] của một đường cong, tham số lại về [0, 1]. */
class SubCurve extends THREE.Curve<THREE.Vector3> {
  private base: THREE.Curve<THREE.Vector3>
  private part: number
  constructor(base: THREE.Curve<THREE.Vector3>, part: number) {
    super()
    this.base = base
    this.part = part
  }
  getPoint(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    return this.base.getPoint(t * this.part, out)
  }
}

/** Chiều dài cung elip từ đỉnh trước (φ = π/2) tới góc φ = π/2 + a. */
function arcFromFront(ra: number, rb: number, a: number) {
  const n = 2000
  let len = 0
  for (let i = 0; i < n; i++) {
    const p0 = Math.PI / 2 + (a * i) / n
    const p1 = Math.PI / 2 + (a * (i + 1)) / n
    len += Math.hypot(ra * (Math.cos(p1) - Math.cos(p0)), rb * (Math.sin(p1) - Math.sin(p0)))
  }
  return len
}

function buildLoop() {
  const total = STATION_COUNT + 1 // trạm + hộp quà
  const wanted = (total - 1) * STEP + LEAD_IN + TAIL
  const perimeter = wanted + MAIN_EXTRA + SKY_SHARE
  const rb = perimeter / (2 * Math.PI * Math.sqrt((LOOP_ASPECT ** 2 + 1) / 2))
  const ra = rb * LOOP_ASPECT
  // Góc bắt đầu: đường chính nằm đối xứng quanh đỉnh trước của vòng.
  let lo = 0
  let hi = Math.PI
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (arcFromFront(ra, rb, mid) < wanted / 2) lo = mid
    else hi = mid
  }
  return { curve: new LoopCurve(ra, rb, Math.PI / 2 + lo), wanted }
}

const built = buildLoop()
/** Vòng elip của cả hành trình. */
export const loop = built.curve

/** Pháp tuyến (xz) của vòng tại p, hướng ra ngoài vòng. */
export function loopOutward(p: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(p.x / loop.ra ** 2, 0, p.z / loop.rb ** 2).normalize()
}

function insideDiscs(discs: Disc[], x: number, z: number, margin: number) {
  return discs.some(
    (d) => ((x - d.center.x) / Math.max(0.1, d.rx - margin)) ** 2 + ((z - d.center.z) / Math.max(0.1, d.rz - margin)) ** 2 < 1,
  )
}

function buildLayout(): PathLayout {
  const total = STATION_COUNT + 1
  const length = built.wanted
  const curve = new SubCurve(loop, length / loop.length)

  const all: StationLayout[] = Array.from({ length: total }, (_, index) => {
    const t = (LEAD_IN + index * STEP) / length
    const pos = curve.getPointAt(t)
    const out = loopOutward(pos)
    const housePos = pos.clone().addScaledVector(out, -HOUSE_BACK).setY(PATH_Y)
    return { index, t, pos, housePos, houseRotY: Math.atan2(out.x, out.z), bonusPos: pos.clone() }
  })

  // Đảo chính: vài khối tròn nối nhau dọc cung đường, lệch vào phía trong vòng để sau dãy nhà còn khoảng cỏ trồng cây,
  // thêm một khối phía trước giữa làm quảng trường (sát đường, không để trống một khoảng lớn giữa đường và quảng trường).
  const K = Math.max(2, Math.round(length / 20))
  const r = Math.max(9, (length / K) * 0.62)
  const discs: Disc[] = Array.from({ length: K }, (_, k) => {
    const p = curve.getPointAt((k + 0.5) / K)
    return { center: p.addScaledVector(loopOutward(p), -1.5).setY(0), rx: r, rz: r, top: 0 }
  })
  const front = curve.getPointAt(0.5)
  const frontOut = loopOutward(front)
  discs.push({ center: front.clone().addScaledVector(frontOut, 7).setY(0), rx: 15, rz: 8.5, top: 0 })
  const plaza = front.clone().addScaledVector(frontOut, 6).setY(0)

  const box = new THREE.Box3()
  for (const d of discs) {
    box.expandByPoint(new THREE.Vector3(d.center.x - d.rx, 0, d.center.z - d.rz))
    box.expandByPoint(new THREE.Vector3(d.center.x + d.rx, 0, d.center.z + d.rz))
  }
  const size = box.getSize(new THREE.Vector3())
  const island = { center: box.getCenter(new THREE.Vector3()).setY(0), rx: size.x / 2, rz: size.z / 2 }

  // Chỗ đáp của quà bóng bay: thử lần lượt các hướng, ưu tiên phía trong vòng giữa hai nhà
  // (phía ngoài gần camera, chùm bóng bay dễ che nhân vật).
  const pathSamples = curve.getSpacedPoints(300)
  const houses = all.map((s) => s.housePos)
  const OFFSETS: [number, number][] = [
    [3.5, -2.2], [-3.5, -2.2], [3.5, -2.8], [-3.5, -2.8], [3.2, 2.2], [-3.2, 2.2], [2.4, 2.8], [-2.4, 2.8],
  ]
  for (const s of all) {
    const out = loopOutward(s.pos)
    const along = curve.getTangentAt(s.t).setY(0).normalize()
    const candidates = OFFSETS.map(([a, o]) => s.pos.clone().addScaledVector(along, a).addScaledVector(out, o).setY(0))
    const free = candidates.find(
      (c) =>
        insideDiscs(discs, c.x, c.z, 2) &&
        pathSamples.every((p) => p.distanceToSquared(c) > 1.8 * 1.8) &&
        houses.every((h) => h.distanceToSquared(c) > 3 * 3),
    )
    s.bonusPos = free ?? candidates[0]
  }

  return { curve, stations: all.slice(0, STATION_COUNT), gift: all[STATION_COUNT], island, discs, plaza, length }
}

export const layout = buildLayout()

/** Điểm (x, z) nằm trên đảo chính, cách mép ít nhất `margin`. */
export function insideMain(x: number, z: number, margin: number): boolean {
  return insideDiscs(layout.discs, x, z, margin)
}

/** Pháp tuyến (xz) của đường chính tại t, hướng ra ngoài vòng (phía trước đường). */
export function outwardAt(t: number): THREE.Vector3 {
  return loopOutward(layout.curve.getPointAt(t))
}

export const mascot = {
  t: 0,
  walking: false,
  pos: layout.curve.getPointAt(0).clone(),
}
if (import.meta.env.DEV) {
  const w = window as unknown as { __mascot: typeof mascot; __layout: typeof layout }
  w.__mascot = mascot
  w.__layout = layout
}

/** Quà bóng bay của trạm index nằm bên phải (1) hay bên trái (-1) điểm dừng, để bàn tay hướng dẫn đứng phía ngoài. */
export function bonusSide(index: number): 1 | -1 {
  const s = layout.stations[index]
  return s && s.bonusPos.x < s.pos.x ? -1 : 1
}

export function stationT(index: number): number {
  if (index < 0) return 0
  if (index >= STATION_COUNT) return layout.gift.t
  return layout.stations[index].t
}

/** Vị trí ngôi nhà/hộp quà của trạm index (GIFT_INDEX = hộp quà). */
export function housePosition(index: number): THREE.Vector3 {
  if (index >= STATION_COUNT) return layout.gift.housePos
  return layout.stations[index].housePos
}

/** Sinh ngẫu nhiên có seed để trang trí ổn định giữa các lần render. */
export function seededRandom(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

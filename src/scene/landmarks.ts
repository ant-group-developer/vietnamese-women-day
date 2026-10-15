import * as THREE from 'three'
import { layout, seededRandom } from './path'
import { isMobile } from './utils'

/**
 * Bố cục các điểm nhấn quanh đường đi (hồ sen, đài phun nước, chợ hoa, vườn hoa, chỗ cắm trại,
 * chỗ thú dạo chơi) và các đảo nhỏ lơ lửng quanh đảo chính.
 * Số trạm thay đổi theo cấu hình nên mỗi điểm nhấn có một vị trí ưa thích (tính theo kích thước đảo)
 * rồi dò xoắn ốc tìm chỗ trống gần nhất: không đè đường, nhà, chỗ quà bóng bay rơi và điểm nhấn khác.
 * Điểm nhấn nào không tìm được chỗ thì bỏ qua.
 */

export type SpotKind = 'pond' | 'fountain' | 'market' | 'garden' | 'camp' | 'pet'

export interface Spot {
  kind: SpotKind
  pos: THREE.Vector3
  /** Bán kính vùng chiếm chỗ (trang trí ngẫu nhiên tránh vùng này). */
  radius: number
  /** Góc xoay để mặt trước quay về phía đường. */
  rotY: number
}

export interface SkyIsland {
  center: THREE.Vector3
  rx: number
  rz: number
  seed: number
  /** Điểm nhấn trên đảo. */
  feature: 'windmill' | 'blossom' | 'camp' | 'grove'
  /** Pha nhấp nhô lên xuống. */
  phase: number
}

const { center, rx, rz } = layout.island
const pathSamples = layout.curve.getSpacedPoints(400)
const houses = [...layout.stations.map((s) => s.housePos), layout.gift.housePos]
const bonusSpots = layout.stations.map((s) => s.bonusPos)

/** Toạ độ z của đường tại hoành độ x (đường là cung chạy dọc trục x). */
function pathZAt(x: number): number {
  let best = pathSamples[0]
  for (const p of pathSamples) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p
  return best.z
}

/** Điểm (x, z) nằm trong đảo, cách mép ít nhất `margin`. */
export function insideIsland(x: number, z: number, margin: number): boolean {
  return ((x - center.x) / (rx - margin)) ** 2 + ((z - center.z) / (rz - margin)) ** 2 < 1
}

/** Mép trước (phía camera) của đảo tại hoành độ x. */
export function frontEdgeZ(x: number): number {
  const k = (x - center.x) / rx
  return center.z + rz * Math.sqrt(Math.max(0, 1 - k * k))
}

function isFree(p: THREE.Vector3, r: number, placed: Spot[]): boolean {
  if (!insideIsland(p.x, p.z, r + 0.8)) return false
  if (pathSamples.some((s) => s.distanceToSquared(p) < (r + 1.3) ** 2)) return false
  if (houses.some((h) => h.distanceToSquared(p) < (r + 1.9) ** 2)) return false
  if (bonusSpots.some((b) => b.distanceToSquared(p) < (r + 1.1) ** 2)) return false
  return placed.every((s) => s.pos.distanceToSquared(p) > (s.radius + r + 0.6) ** 2)
}

interface Want {
  kind: SpotKind
  radius: number
  /** Vị trí theo chiều ngang đảo: -1 mép trái, 1 mép phải. */
  fx: number
  /** 'front' = phía camera (trước đường), 'back' = sau dãy nhà. */
  side: 'front' | 'back'
  /** Độ sâu tương đối trong vùng (0 sát đường, 1 sát mép đảo). */
  depth: number
}

function place(want: Want, placed: Spot[]): Spot | null {
  const x0 = center.x + want.fx * rx * 0.85
  const pz = pathZAt(x0)
  const edge = want.side === 'front' ? frontEdgeZ(x0) : 2 * center.z - frontEdgeZ(x0)
  const z0 = pz + (edge - pz) * want.depth
  const p = new THREE.Vector3()
  // Dò xoắn ốc quanh vị trí ưa thích.
  for (let i = 0; i < 260; i++) {
    const a = i * 2.399
    const d = Math.sqrt(i) * 0.55
    p.set(x0 + Math.cos(a) * d * 1.6, 0, z0 + Math.sin(a) * d * 0.7)
    // Giữ đúng phía của đường.
    const front = p.z > pathZAt(p.x)
    if (front !== (want.side === 'front')) continue
    if (!isFree(p, want.radius, placed)) continue
    // Quay mặt trước (+z) về phía đường: phía trước đường thì nhìn ra sau (-z) và ngược lại.
    const rotY = want.side === 'front' ? Math.PI : 0
    return { kind: want.kind, pos: p.clone(), radius: want.radius, rotY }
  }
  return null
}

function buildSpots(): Spot[] {
  const wants: Want[] = [
    { kind: 'pond', radius: 2.4, fx: 0, side: 'front', depth: 0.45 },
    { kind: 'fountain', radius: 1.7, fx: -0.42, side: 'front', depth: 0.45 },
    { kind: 'market', radius: 2.0, fx: 0.42, side: 'front', depth: 0.45 },
    { kind: 'garden', radius: 1.8, fx: -0.25, side: 'back', depth: 0.55 },
    { kind: 'camp', radius: 1.6, fx: 0.3, side: 'back', depth: 0.55 },
    { kind: 'pet', radius: 1.8, fx: -0.72, side: 'front', depth: 0.4 },
    { kind: 'pet', radius: 1.8, fx: 0.72, side: 'front', depth: 0.4 },
    { kind: 'pet', radius: 1.6, fx: -0.6, side: 'back', depth: 0.5 },
    { kind: 'pet', radius: 1.6, fx: 0.62, side: 'back', depth: 0.5 },
  ]
  const placed: Spot[] = []
  for (const w of wants) {
    const s = place(w, placed)
    if (s) placed.push(s)
  }
  return placed
}

function buildSkyIslands(): SkyIsland[] {
  const rnd = seededRandom(777)
  const c = center
  const list: SkyIsland[] = [
    // Bên phải, sau hộp quà: nối với đảo chính bằng cầu treo.
    { center: new THREE.Vector3(c.x + rx + 11, -0.6, c.z - 1), rx: 5.5, rz: 4.5, seed: 11, feature: 'windmill', phase: 0 },
    // Bên trái, trước điểm xuất phát.
    { center: new THREE.Vector3(c.x - rx - 9, 1.8, c.z - 7), rx: 4.5, rz: 3.6, seed: 12, feature: 'blossom', phase: 0 },
    // Phía sau, giữa đảo.
    { center: new THREE.Vector3(c.x - 6, 3.5, c.z - rz - 15), rx: 6, rz: 4.5, seed: 13, feature: 'camp', phase: 0 },
    { center: new THREE.Vector3(c.x + rx * 0.5, -2.5, c.z - rz - 11), rx: 4, rz: 3.2, seed: 14, feature: 'grove', phase: 0 },
    { center: new THREE.Vector3(c.x - rx * 0.55, -4.5, c.z - rz - 9), rx: 3.4, rz: 2.8, seed: 15, feature: 'blossom', phase: 0 },
  ]
  list.forEach((s) => (s.phase = rnd() * Math.PI * 2))
  return isMobile ? list.slice(0, 3) : list
}

export const spots = buildSpots()
export const skyIslands = buildSkyIslands()

/** Vùng trang trí ngẫu nhiên phải tránh: các điểm nhấn và dòng suối chảy từ hồ ra mép đảo. */
export function isReserved(p: THREE.Vector3, pad = 0): boolean {
  for (const s of spots) if (s.pos.distanceToSquared(p) < (s.radius + pad) ** 2) return true
  const pond = spots.find((s) => s.kind === 'pond')
  if (pond && Math.abs(p.x - pond.pos.x) < 0.9 + pad && p.z > pond.pos.z && p.z < frontEdgeZ(pond.pos.x) + 1) return true
  if (archBase && archBase.pos.distanceToSquared(p) < (2 + pad) ** 2) return true
  return false
}

/** Cổng hoa ở đầu đường. */
function buildArch() {
  const t = 1.6 / layout.length
  const pos = layout.curve.getPointAt(t).setY(0)
  const tangent = layout.curve.getTangentAt(t)
  return { pos, rotY: Math.atan2(tangent.x, tangent.z) }
}
export const archBase = buildArch()

/** Cột đèn lồng: giữa hai trạm liên tiếp, phía sau đường. */
function buildLanterns(): { pos: THREE.Vector3; rotY: number }[] {
  const all = [...layout.stations, layout.gift]
  const out: { pos: THREE.Vector3; rotY: number }[] = []
  for (let i = 0; i + 1 < all.length; i++) {
    const t = (all[i].t + all[i + 1].t) / 2
    const p = layout.curve.getPointAt(t)
    const tan = layout.curve.getTangentAt(t)
    // Pháp tuyến hướng ra sau đường (z âm).
    const n = new THREE.Vector3(tan.z, 0, -tan.x)
    if (n.z > 0) n.negate()
    // Ưu tiên phía sau đường; chỗ đó trùng chỗ quà bóng bay đáp thì sang phía trước, trùng cả hai thì bỏ.
    const pos = [1, -1]
      .map((side) => p.clone().addScaledVector(n, 1.35 * side).setY(0))
      .find((c) => bonusSpots.every((b) => b.distanceToSquared(c) > 1.8 * 1.8))
    if (pos) out.push({ pos, rotY: Math.atan2(tan.x, tan.z) })
  }
  return out
}
export const lanterns = buildLanterns()

if (import.meta.env.DEV) {
  ;(window as unknown as { __spots: Spot[] }).__spots = spots
}

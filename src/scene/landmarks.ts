import * as THREE from 'three'
import { insideMain, layout, loop, loopOutward, outwardAt, seededRandom, SKY_ISLAND_COUNT } from './path'

/**
 * Bố cục các điểm nhấn trên đảo chính (quảng trường có đài phun nước, hồ sen, chợ hoa, vườn hoa,
 * chỗ thú dạo chơi) và các đảo phụ nằm trên vòng hành trình.
 * Mỗi điểm nhấn có một vị trí ưa thích quanh quảng trường rồi dò xoắn ốc tìm chỗ trống gần nhất:
 * không đè đường, nhà, chỗ quà bóng bay rơi và điểm nhấn khác. Điểm nhấn nào không tìm được chỗ thì bỏ qua.
 */

export type SpotKind = 'pond' | 'fountain' | 'market' | 'garden' | 'camp' | 'pet'

export interface Spot {
  kind: SpotKind
  pos: THREE.Vector3
  /** Bán kính vùng chiếm chỗ (trang trí ngẫu nhiên tránh vùng này). */
  radius: number
  /** Góc xoay: 0 = mặt trước nhìn về camera (+z). */
  rotY: number
}

export type SkyFeature = 'windmill' | 'zooSavanna' | 'tropical' | 'zooArctic' | 'blossom'

export interface SkyIsland {
  /** Mã đảo (duy nhất). */
  key: SkyFeature
  /** Tên hiển thị trên nhãn và ảnh kỷ niệm. */
  name: string
  center: THREE.Vector3
  rx: number
  rz: number
  seed: number
  /** Điểm nhấn trên đảo (mỗi đảo một chủ đề). */
  feature: SkyFeature
  /** Pha nhấp nhô lên xuống. */
  phase: number
  /**
   * Hướng (xz) vuông góc với đường đi qua giữa đảo, về phía đặt điểm nhấn;
   * phía bên kia đường để trống cho thú dạo và không che đường.
   */
  back: THREE.Vector3
}

const pathSamples = layout.curve.getSpacedPoints(400)
const houses = [...layout.stations.map((s) => s.housePos), layout.gift.housePos]
const bonusSpots = layout.stations.map((s) => s.bonusPos)

/** Điểm (x, z) nằm trên đảo chính, cách mép ít nhất `margin`. */
export function insideIsland(x: number, z: number, margin: number): boolean {
  return insideMain(x, z, margin)
}

/** Mép trước (phía camera) của đảo chính tại hoành độ x. */
export function frontEdgeZ(x: number): number {
  let best = -Infinity
  for (const d of layout.discs) {
    const k = (x - d.center.x) / d.rx
    if (Math.abs(k) < 1) best = Math.max(best, d.center.z + d.rz * Math.sqrt(1 - k * k))
  }
  return best
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
  /** Vị trí ưa thích so với tâm quảng trường (mét): x sang phải, z về phía camera. */
  dx: number
  dz: number
  rotY: number
  /** Vị trí ưa thích tuyệt đối (bỏ qua dx, dz). */
  at?: THREE.Vector3
}

function place(want: Want, placed: Spot[]): Spot | null {
  const x0 = want.at ? want.at.x : layout.plaza.x + want.dx
  const z0 = want.at ? want.at.z : layout.plaza.z + want.dz
  const p = new THREE.Vector3()
  // Dò xoắn ốc quanh vị trí ưa thích.
  for (let i = 0; i < 300; i++) {
    const a = i * 2.399
    const d = Math.sqrt(i) * 0.5
    p.set(x0 + Math.cos(a) * d, 0, z0 + Math.sin(a) * d)
    if (!isFree(p, want.radius, placed)) continue
    return { kind: want.kind, pos: p.clone(), radius: want.radius, rotY: want.rotY }
  }
  return null
}

/**
 * Quảng trường phía trước cung đường: đài phun nước giữa sân lát đá, vườn hoa bên trái, chợ hoa bên phải,
 * hồ sen phía trước (suối chảy ra mép đảo), hai bãi cỏ cho thú dạo chơi.
 */
/** Bãi cỏ phía trước đường trên khối đảo đầu trái (0) hoặc đầu phải (1). */
function lobeFront(side: 0 | 1): THREE.Vector3 {
  const t = side === 0 ? 0.17 : 0.83
  return layout.curve.getPointAt(t).addScaledVector(outwardAt(t), 5).setY(0)
}

function buildSpots(): Spot[] {
  const wants: Want[] = [
    // Bán kính lớn hơn đài phun nước để chừa sân lát đá quanh đó.
    { kind: 'fountain', radius: 3.6, dx: 0, dz: 0, rotY: 0 },
    { kind: 'pond', radius: 2.4, dx: 0, dz: 6.5, rotY: Math.PI },
    { kind: 'garden', radius: 1.8, dx: -8.5, dz: -1.5, rotY: 0 },
    { kind: 'market', radius: 2.0, dx: 8.5, dz: -1.5, rotY: 0 },
    // Hai bãi thú trên hai khối đảo hai đầu, phía trước đường (trái trước, phải sau, khớp thứ tự MAIN_ANIMALS).
    { kind: 'pet', radius: 2.4, dx: 0, dz: 0, rotY: 0, at: lobeFront(0) },
    { kind: 'pet', radius: 2.4, dx: 0, dz: 0, rotY: 0, at: lobeFront(1) },
  ]
  const placed: Spot[] = []
  for (const w of wants) {
    const s = place(w, placed)
    if (s) placed.push(s)
  }
  return placed
}

/**
 * Đảo phụ nằm ngay trên vòng hành trình, nối tiếp sau hộp quà, cách đều nhau theo chiều dài vòng,
 * nên đi hết đường chính là đi tiếp qua các đảo rồi về lại điểm xuất phát như một vòng tròn.
 * Độ cao chênh nhau ít để cầu treo không dốc.
 */
function buildSkyIslands(): SkyIsland[] {
  const rnd = seededRandom(777)
  const defs = [
    { key: 'windmill', name: 'Đảo Cối Xay Gió', rx: 7, rz: 5.5, seed: 11, feature: 'windmill' },
    { key: 'zooSavanna', name: 'Sở Thú Thảo Nguyên', rx: 7.5, rz: 6.5, seed: 14, feature: 'zooSavanna' },
    { key: 'tropical', name: 'Đảo Nhiệt Đới', rx: 7, rz: 5.5, seed: 13, feature: 'tropical' },
    { key: 'zooArctic', name: 'Sở Thú Bắc Cực', rx: 7.5, rz: 6.5, seed: 15, feature: 'zooArctic' },
    { key: 'blossom', name: 'Đảo Hoa Anh Đào', rx: 6.5, rz: 5.5, seed: 12, feature: 'blossom' },
  ] as const
  const heights = [-0.5, 0.6, 1.4, 0.6, -0.3]
  const L = loop.length
  const at = (s: number) => loop.getPointAt((((s / L) % 1) + 1) % 1)
  // Chỗ vòng rời đảo chính (sau cuối đường) và chỗ vòng trở lại đảo chính (trước điểm xuất phát).
  let exit = layout.length
  while (exit < L && insideMain(at(exit).x, at(exit).z, 0.7)) exit += 0.1
  let entry = 0
  while (entry > -L && insideMain(at(entry).x, at(entry).z, 0.7)) entry -= 0.1
  /** Đoạn vòng đi qua một đảo: dây cung của elip đảo theo hướng tiếp tuyến của vòng. */
  const crossing = (d: (typeof defs)[number], s: number) => {
    const tan = loop.getTangentAt((((s / L) % 1) + 1) % 1)
    return 2 / Math.sqrt((tan.x / d.rx) ** 2 + (tan.z / d.rz) ** 2)
  }
  const remaining = L + entry - exit
  // Ước lượng chỗ từng đảo rồi tính lại một lần theo dây cung thực tế để các cầu dài bằng nhau.
  let centers = defs.map((_, k) => exit + (remaining * (k + 0.5)) / defs.length)
  for (let pass = 0; pass < 2; pass++) {
    const cross = defs.map((d, k) => crossing(d, centers[k]))
    const gap = (remaining - cross.reduce((a, b) => a + b, 0)) / (defs.length + 1)
    let s = exit
    centers = cross.map((c) => {
      const mid = s + gap + c / 2
      s += gap + c
      return mid
    })
  }
  if (defs.length !== SKY_ISLAND_COUNT) throw new Error('SKY_ISLAND_COUNT trong path.ts phải bằng số đảo phụ')
  return defs.map((d, k) => {
    const p = at(centers[k])
    return {
      ...d,
      center: p.clone().setY(heights[k]),
      phase: rnd() * Math.PI * 2,
      // Đảo phía sau vòng: điểm nhấn ở phía ngoài vòng (xa camera). Đảo nằm hai bên vòng: điểm nhấn quay vào trong vòng,
      // thú dạo ở phía ngoài, để nhìn từ đảo chính sang không bị điểm nhấn chắn trước đường.
      back: loopOutward(p).multiplyScalar(loopOutward(p).z < -0.5 ? 1 : -1),
    }
  })
}

export const spots = buildSpots()
export const skyIslands = buildSkyIslands()

/**
 * Toạ độ cục bộ của một đảo phụ: đường đi qua tâm đảo theo trục x cục bộ, +z cục bộ hướng về phía camera,
 * nên điểm nhấn đặt ở z âm (phía xa camera) thì không đè lên đường và không che nhân vật.
 */
export function islandFrame(island: SkyIsland) {
  const inward = island.back.clone().negate()
  const yaw = Math.atan2(inward.x, inward.z)
  const world = (x: number, z: number) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(island.center)
  return { yaw, world }
}

/**
 * Hai bãi thả thú trên đảo thường, mỗi bãi một bên đường: bên trống (cục bộ z dương) và bên có điểm nhấn
 * (z âm, đặt lệch qua một đầu, cạnh điểm nhấn). Bãi nào chạm mép đảo thì kéo dần vào giữa.
 */
export function islandHomes(island: SkyIsland): { center: THREE.Vector3; radius: number }[] {
  if (!ISLAND_ANIMALS[island.feature]) return []
  const { world } = islandFrame(island)
  const fit = (x: number, z: number, r: number) => {
    for (let k = 1; k > 0.3; k -= 0.05) {
      const p = world(x * k, z * k)
      const m = r + 0.8
      if (((p.x - island.center.x) / (island.rx - m)) ** 2 + ((p.z - island.center.z) / (island.rz - m)) ** 2 < 1)
        return p.setY(island.center.y)
    }
    return world(x * 0.3, z * 0.3).setY(island.center.y)
  }
  return [
    { center: fit(-2.4, 2.8, 1.3), radius: 1.3 },
    { center: fit(4.3, -2.3, 1.0), radius: 1.0 },
  ]
}

/** Điểm nhấn lệch về phía xa camera so với đường đi qua giữa đảo. */
export const FEATURE_OUT = 3

/** Một chuồng trên đảo sở thú: tâm (toạ độ cục bộ của đảo), bán trục, thú đi dạo trong chuồng, thú bơi trong hồ. */
export interface Pen {
  x: number
  z: number
  rx: number
  rz: number
  animals: string[]
  /** Thú bơi vòng trong hồ (chuồng có hồ nước phủ gần kín). */
  swim?: string
}

/**
 * Mỗi đảo sở thú hai chuồng ở hai phía đường: chuồng lớn phía xa camera, chuồng nhỏ phía gần
 * (lệch sang một bên để không che nhân vật trên đường).
 */
export const ZOO_PENS: Partial<Record<SkyFeature, Pen[]>> = {
  zooSavanna: [
    // Thú ăn cỏ chung chuồng lớn, sư tử ở chuồng riêng.
    { x: 0, z: -(FEATURE_OUT + 1), rx: 3.3, rz: 2.0, animals: ['giraffe', 'elephant'] },
    { x: -2.6, z: 3.0, rx: 2.0, rz: 1.35, animals: ['lion'] },
  ],
  zooArctic: [
    { x: 0, z: -(FEATURE_OUT + 1), rx: 3.3, rz: 2.0, animals: ['polarBear', 'walrus'] },
    { x: -2.6, z: 3.0, rx: 2.0, rz: 1.35, animals: [], swim: 'seal' },
  ],
}

/** Một điểm theo toạ độ cục bộ của chuồng, đổi sang toạ độ thế giới (đúng độ cao mặt đảo). */
export function penPoint(island: SkyIsland, pen: Pen, x = 0, z = 0): THREE.Vector3 {
  return islandFrame(island).world(pen.x + x, pen.z + z).setY(island.center.y)
}
/**
 * Thú thả dạo trên các đảo không phải sở thú, mỗi đảo một nhóm cùng loài hoặc cùng môi trường sống
 * (đi lại ở nửa đảo phía trong vòng, chim thì bay lượn).
 */
export const ISLAND_ANIMALS: Partial<Record<SkyFeature, string[]>> = {
  // Nông trại cối xay gió: đàn cừu.
  windmill: ['lamb', 'lamb', 'lamb'],
  // Rừng nhiệt đới Nam Mỹ: vẹt, chim ruồi, chuột lang nước.
  tropical: ['parrot', 'hummingbird', 'capybara'],
  // Rừng ôn đới: cáo, sói con, nai con.
  blossom: ['fox', 'wolf', 'fawn'],
}

/** Hai bãi cỏ hai bên đảo chính (theo thứ tự trái, phải): ven nước bên trái, rừng tre bên phải. */
export const MAIN_ANIMALS: string[][] = [
  ['otter', 'otter', 'axolotl'],
  ['redPanda', 'redPanda', 'raccoon'],
]


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

/** Cột đèn lồng: giữa hai trạm liên tiếp, phía trong vòng (giữa hai nhà). */
function buildLanterns(): { pos: THREE.Vector3; rotY: number }[] {
  const all = [...layout.stations, layout.gift]
  const out: { pos: THREE.Vector3; rotY: number }[] = []
  for (let i = 0; i + 1 < all.length; i++) {
    const t = (all[i].t + all[i + 1].t) / 2
    const p = layout.curve.getPointAt(t)
    const tan = layout.curve.getTangentAt(t)
    const n = outwardAt(t).negate()
    // Ưu tiên phía trong; chỗ đó trùng chỗ quà bóng bay đáp thì sang phía ngoài, trùng cả hai thì bỏ.
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

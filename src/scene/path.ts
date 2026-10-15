import * as THREE from 'three'
import { STATION_COUNT } from '../data/departments'

/**
 * Đường là một cung tròn thoai thoải chạy dọc đảo theo trục x, võng ra phía sau (xa camera).
 * Các trạm cách đều nhau trên cung, nhà nằm phía ngoài cung (sau đường) để không che nhân vật.
 */
/** Khoảng cách (theo cung) giữa hai trạm liên tiếp. */
const STEP = 7
/** Bán kính cung nhỏ nhất (càng lớn càng thẳng). */
const MIN_RADIUS = 38
/** Nửa góc mở tối đa của cung: nhiều trạm thì cung dài ra nhưng không cong quá. */
const MAX_HALF_ANGLE = 0.55
/** Đoạn đường dẫn vào trước trạm đầu và đoạn đuôi sau hộp quà. */
const LEAD_IN = 5
const TAIL = 2.5
export const PATH_Y = 0.08
/** Nhà lùi về phía ngoài cung (sau đường, xa camera) so với điểm dừng. */
const HOUSE_BACK = 2.4

export interface StationLayout {
  index: number
  t: number
  /** Điểm dừng trên đường. */
  pos: THREE.Vector3
  /** Vị trí ngôi nhà/hộp quà. */
  housePos: THREE.Vector3
  /** Góc xoay quanh trục y để mặt trước nhà quay về phía đường. */
  houseRotY: number
  /** Chỗ quà bóng bay đáp xuống nếu rơi ở trạm này: cạnh điểm dừng, phía camera, tránh đường và nhà. */
  bonusPos: THREE.Vector3
}

export interface PathLayout {
  curve: THREE.CatmullRomCurve3
  stations: StationLayout[]
  gift: StationLayout
  /** Kích thước đảo (bán trục x, z) và tâm. */
  island: { center: THREE.Vector3; rx: number; rz: number }
  length: number
}

function buildLayout(): PathLayout {
  const total = STATION_COUNT + 1 // trạm + hộp quà
  const span = (total - 1) * STEP
  const radius = Math.max(MIN_RADIUS, (span + LEAD_IN + TAIL) / 2 / MAX_HALF_ANGLE)
  // Tâm cung nằm phía camera (z dương); đỉnh cung ở z = 0.
  const arcCenter = new THREE.Vector3(0, PATH_Y, radius)
  /** Hướng từ tâm ra điểm trên cung ở độ dài cung s (s = 0 là đỉnh). */
  const dirAt = (s: number) => new THREE.Vector3(Math.sin(s / radius), 0, -Math.cos(s / radius))
  const pointAt = (s: number) => arcCenter.clone().addScaledVector(dirAt(s), radius)

  const s0 = -span / 2
  const stopS = Array.from({ length: total }, (_, i) => s0 + i * STEP)
  const stopPoints = stopS.map(pointAt)
  // Lấy mẫu dày trên cung để đường CatmullRom bám đúng cung tròn.
  const points: THREE.Vector3[] = []
  const from = s0 - LEAD_IN
  const to = s0 + span + TAIL
  const n = Math.ceil(to - from)
  for (let i = 0; i <= n; i++) points.push(pointAt(from + ((to - from) * i) / n))

  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  const SAMPLES = 2000
  const samples = curve.getSpacedPoints(SAMPLES)
  const tFor = (p: THREE.Vector3) => {
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < samples.length; i++) {
      const d = samples[i].distanceToSquared(p)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best / SAMPLES
  }

  const all: StationLayout[] = stopPoints.map((p, index) => {
    const out = dirAt(stopS[index])
    const housePos = p.clone().addScaledVector(out, HOUSE_BACK)
    return {
      index,
      t: tFor(p),
      pos: p.clone(),
      housePos,
      // Mặt trước nhà (+z) quay vào tâm cung, tức là nhìn ra đường.
      houseRotY: -stopS[index] / radius,
      bonusPos: p.clone(),
    }
  })

  const box = new THREE.Box3().setFromPoints([...points, ...all.map((s) => s.housePos)])
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  center.y = 0
  // Hai đầu cung nằm ở góc trước của khung bao nên nới bán trục x cho đảo ôm trọn cả hai đầu.
  const rz = size.z / 2 + 5.5
  let rx = size.x / 2 + 4.5
  for (const p of [...points, ...all.map((s) => s.housePos)]) {
    const dz = (p.z - center.z) / rz
    rx = Math.max(rx, (Math.abs(p.x - center.x) + 4.5) / Math.sqrt(Math.max(0.2, 1 - dz * dz)))
  }
  const island = { center, rx, rz }

  // Chỗ đáp của quà bóng bay: thử lần lượt các hướng (theo dọc đường, ra phía sau đường),
  // ưu tiên phía sau đường, giữa hai nhà (đặt phía trước thì chùm bóng bay che mất nhân vật).
  const pathSamples = curve.getSpacedPoints(300)
  const houses = all.map((s) => s.housePos)
  const OFFSETS: [number, number][] = [
    [3.5, 1.6], [-3.5, 1.6], [3.5, 2.3], [-3.5, 2.3], [3.2, -2.2], [-3.2, -2.2], [2.4, -2.6], [-2.4, -2.6],
  ]
  for (const s of all) {
    const out = dirAt(stopS[s.index])
    const along = new THREE.Vector3(-out.z, 0, out.x)
    const candidates = OFFSETS.map(([a, o]) => s.pos.clone().addScaledVector(along, a).addScaledVector(out, o).setY(0))
    const free = candidates.find(
      (c) =>
        ((c.x - center.x) / (island.rx - 2)) ** 2 + ((c.z - center.z) / (island.rz - 2)) ** 2 < 1 &&
        pathSamples.every((p) => p.distanceToSquared(c) > 1.6 * 1.6) &&
        houses.every((h) => h.distanceToSquared(c) > 3 * 3),
    )
    s.bonusPos = free ?? candidates[0]
  }

  return {
    curve,
    stations: all.slice(0, STATION_COUNT),
    gift: all[STATION_COUNT],
    island,
    length: curve.getLength(),
  }
}

export const layout = buildLayout()

/** Trạng thái nhân vật, chia sẻ giữa Character và CameraRig mà không cần re-render. */
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

import * as THREE from 'three'
import { STATION_COUNT } from '../data/departments'

/**
 * Đường uốn lượn hình chữ S chạy dọc đảo theo trục x: mỗi trạm nằm ở đỉnh một khúc cua,
 * xen kẽ lệch về phía sau (z âm) và phía trước (z dương).
 */
/** Khoảng cách theo trục x giữa hai trạm liên tiếp (nửa bước sóng). */
const STEP_X = 6.5
/** Độ lệch z của đỉnh khúc cua so với trục giữa. */
const AMPLITUDE = 3.6
export const PATH_Y = 0.08
/**
 * Nhà luôn lùi về phía sau trạm (xa camera) để không che nhân vật:
 * ở khúc cua phía sau nhà nằm ngoài khúc cua, ở khúc cua phía trước nhà nằm gọn trong lòng khúc cua.
 */
const HOUSE_BACK = 2.4
/** Lòng khúc cua hẹp ở gần đỉnh nên nhà trong lòng khúc cua lùi sâu hơn chút. */
const HOUSE_BACK_INSIDE = 3.1

export interface StationLayout {
  index: number
  t: number
  /** Điểm dừng trên đường. */
  pos: THREE.Vector3
  /** Vị trí ngôi nhà/hộp quà. */
  housePos: THREE.Vector3
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
  const rnd = seededRandom(2010)
  const x0 = -((total - 1) * STEP_X) / 2
  const stopPoints: THREE.Vector3[] = []
  for (let i = 0; i < total; i++) {
    // Hộp quà (điểm cuối) luôn ở khúc cua phía sau cho rộng chỗ đặt bục quà.
    const back = (total - 1 - i) % 2 === 0
    const z = AMPLITUDE * (0.9 + rnd() * 0.2)
    stopPoints.push(new THREE.Vector3(x0 + i * STEP_X + (rnd() - 0.5) * 0.6, PATH_Y, back ? -z : z))
  }
  const first = stopPoints[0]
  const last = stopPoints[total - 1]
  // Đoạn đầu đi vào khúc cua thứ nhất, đoạn đuôi ngắn sau hộp quà.
  const points = [
    new THREE.Vector3(first.x - STEP_X * 0.8, PATH_Y, -first.z * 0.5),
    ...stopPoints,
    new THREE.Vector3(last.x + 2.5, PATH_Y, last.z * 0.5),
  ]

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

  const all: StationLayout[] = stopPoints.map((p, index) => ({
    index,
    t: tFor(p),
    pos: p.clone(),
    housePos: p.clone().add(new THREE.Vector3(0, 0, p.z > 0 ? -HOUSE_BACK_INSIDE : -HOUSE_BACK)),
  }))

  const box = new THREE.Box3().setFromPoints([...points, ...all.map((s) => s.housePos)])
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  center.y = 0

  return {
    curve,
    stations: all.slice(0, STATION_COUNT),
    gift: all[STATION_COUNT],
    island: { center, rx: size.x / 2 + 4.5, rz: size.z / 2 + 5.5 },
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

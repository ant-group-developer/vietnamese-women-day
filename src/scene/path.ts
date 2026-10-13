import * as THREE from 'three'
import { STATION_COUNT } from '../data/departments'

/** Vị trí x của 5 "ô" trên mỗi hàng: 2 ô ngoài cùng là chỗ rẽ, 3 ô giữa đặt trạm. */
const SLOTS = [-8, -4, 0, 4, 8]
const ROW_GAP = 6
const STATIONS_PER_ROW = 3
export const PATH_Y = 0.08
/** Nhà đặt lùi về phía sau đường (xa camera) để không che nhân vật. */
const HOUSE_OFFSET = new THREE.Vector3(0, 0, -2.4)

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
  const rows = Math.ceil(total / STATIONS_PER_ROW)
  const z0 = ((rows - 1) * ROW_GAP) / 2
  const points: THREE.Vector3[] = []
  const stopPoints: THREE.Vector3[] = []

  for (let r = 0; r < rows; r++) {
    const z = z0 - r * ROW_GAP
    const xs = r % 2 === 0 ? SLOTS : [...SLOTS].reverse()
    for (let i = 0; i < xs.length; i++) {
      const p = new THREE.Vector3(xs[i], PATH_Y, z)
      points.push(p)
      const isStationSlot = i >= 1 && i <= 3
      if (isStationSlot && stopPoints.length < total) stopPoints.push(p)
      if (stopPoints.length === total && isStationSlot) {
        // Thêm một đoạn đuôi ngắn sau hộp quà rồi dừng đường.
        const dir = r % 2 === 0 ? 1 : -1
        points.push(new THREE.Vector3(xs[i] + dir * 2.5, PATH_Y, z))
        r = rows
        break
      }
    }
  }

  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.35)
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
    housePos: p.clone().add(HOUSE_OFFSET),
  }))

  const box = new THREE.Box3().setFromPoints(points)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  center.y = 0
  center.z -= 1 // nhà nằm phía sau đường nên dịch đảo lùi một chút

  return {
    curve,
    stations: all.slice(0, STATION_COUNT),
    gift: all[STATION_COUNT],
    island: { center, rx: size.x / 2 + 5, rz: size.z / 2 + 6 },
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

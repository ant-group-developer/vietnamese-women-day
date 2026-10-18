/**
 * Model môi trường (CC0) trong public/models/env:
 * - nature/  Kenney Nature Kit: cây, bụi, hoa, nấm, đá (vật liệu màu phẳng, đặt tên theo màu)
 * - town/    Kenney Fantasy Town Kit: mảnh tường, mái để lắp nhà (dùng chung texture Textures/colormap.png)
 * - holiday/ Kenney Holiday Kit: hộp quà có nắp tách rời (node "lid"), ghế băng
 * - clouds/  mây của Quaternius (poly.pizza)
 * Đơn vị: 1 ô = 1 mét, mặt trước hướng +Z.
 */
import * as THREE from 'three'
import type { Placement } from './Decor'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const ENV = '/models/env'
export const natureUrl = (name: string) => `${ENV}/nature/${name}.glb`
export const townUrl = (name: string) => `${ENV}/town/${name}.glb`
export const holidayUrl = (name: string) => `${ENV}/holiday/${name}.glb`
export const PRESENT_URL = `${ENV}/holiday/present-a-cube.glb`
export const CLOUD_URLS = ['a', 'c'].map((n) => `${ENV}/clouds/cloud-${n}.glb`)

/** Đổi màu vật liệu gốc của Kenney sang tông pastel của web. */
export const PALETTE: Record<string, string> = {
  leafsGreen: '#7fd39f',
  leafsDark: '#5ec48a',
  grass: '#9be3b6',
  woodBark: '#c99272',
  wood: '#d9a07c',
  dirt: '#e8b9a0',
  woodBarkDark: '#a8735a',
  woodDark: '#a8735a',
  dirtDark: '#c99272',
  woodInner: '#f6e2c8',
  colorRed: '#ff7aa8',
  colorRedDark: '#e8537a',
  colorPurple: '#c77dff',
  colorYellow: '#ffd166',
  colorTan: '#ffb38a',
  colorWhite: '#fff6e9',
  _defaultMat: '#fff6e9',
  stone: '#e6dbe2',
  stoneDark: '#cdbdc8',
  leafsFall: '#ffb38a',
  corn: '#ffd166',
}

export interface Part {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  /** Ma trận của mesh so với gốc model. */
  matrix: THREE.Matrix4
}

const partsCache = new WeakMap<THREE.Object3D, Part[]>()

/** Tách model thành các mesh (geometry, material, ma trận so với gốc) để vẽ instanced hoặc gộp. */
export function getParts(root: THREE.Object3D): Part[] {
  const cached = partsCache.get(root)
  if (cached) return cached
  root.updateMatrixWorld(true)
  const inv = root.matrixWorld.clone().invert()
  const parts: Part[] = []
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    parts.push({
      geometry: mesh.geometry,
      material: mesh.material as THREE.Material,
      matrix: inv.clone().multiply(mesh.matrixWorld),
    })
  })
  partsCache.set(root, parts)
  return parts
}

/** Ma trận đưa model về kích thước `size` (theo cạnh lớn nhất) và đặt đáy chạm mặt đất. */
export function fitMatrix(root: THREE.Object3D, size: number): THREE.Matrix4 {
  const box = new THREE.Box3().setFromObject(root)
  const dim = box.getSize(new THREE.Vector3())
  const s = size / Math.max(dim.x, dim.y, dim.z)
  const center = box.getCenter(new THREE.Vector3())
  return new THREE.Matrix4().makeScale(s, s, s).premultiply(new THREE.Matrix4().makeTranslation(-center.x * s, -box.min.y * s, -center.z * s))
}

const remapCache = new Map<string, THREE.Material>()

/** Đổi màu vật liệu theo tên (bộ Nature Kit đặt tên vật liệu theo màu: leafsGreen, colorRed...). */
export function remapMaterial(mat: THREE.Material, palette: Record<string, string>, key: string): THREE.Material {
  const hex = palette[mat.name]
  if (!hex) return mat
  const id = `${mat.uuid}|${key}`
  let out = remapCache.get(id)
  if (!out) {
    const m = (mat as THREE.MeshStandardMaterial).clone()
    m.color.set(hex)
    m.roughness = 0.85
    m.metalness = 0
    out = m
    remapCache.set(id, out)
  }
  return out
}

export interface SwatchRegion {
  /** Vùng pixel trên texture (gốc trên-trái). */
  x: number
  y: number
  w: number
  h: number
  color: string
}

const textureCache = new Map<string, THREE.Texture>()

/**
 * Tô lại một số ô màu trên texture colormap của Kenney, giữ độ sáng tối (gradient) của ô gốc.
 * Dùng để đổi màu mái/tường theo phòng ban, đổi màu hộp quà.
 */
export function recolorTexture(src: THREE.Texture, regions: SwatchRegion[]): THREE.Texture {
  const key = `${src.uuid}|${regions.map((r) => `${r.x},${r.y},${r.w},${r.h},${r.color}`).join(';')}`
  const cached = textureCache.get(key)
  if (cached) return cached
  const img = src.image as CanvasImageSource & { width: number; height: number }
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const sx = img.width / 512
  for (const r of regions) {
    const x = Math.round(r.x * sx)
    const y = Math.round(r.y * sx)
    const data = ctx.getImageData(x, y, Math.round(r.w * sx), Math.round(r.h * sx))
    const d = data.data
    let max = 1
    for (let i = 0; i < d.length; i += 4) max = Math.max(max, 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
    const n = parseInt(r.color.slice(1), 16)
    const cr = (n >> 16) & 255
    const cg = (n >> 8) & 255
    const cb = n & 255
    for (let i = 0; i < d.length; i += 4) {
      // Giữ gradient nhẹ của ô gốc nhưng không để màu tối quá.
      const k = 0.55 + 0.45 * ((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / max)
      d[i] = cr * k
      d[i + 1] = cg * k
      d[i + 2] = cb * k
    }
    ctx.putImageData(data, x, y)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = src.colorSpace
  tex.flipY = src.flipY
  tex.magFilter = src.magFilter
  tex.minFilter = src.minFilter
  tex.wrapS = src.wrapS
  tex.wrapT = src.wrapT
  textureCache.set(key, tex)
  return tex
}

export interface PiecePlacement {
  url: string
  pos: [number, number, number]
  rotY: number
}

/** Gộp các mảnh (đều dùng chung một texture) thành một geometry duy nhất để vẽ một lần. */
export function mergePieces(scenes: Record<string, THREE.Object3D>, pieces: PiecePlacement[]): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = []
  const place = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const one = new THREE.Vector3(1, 1, 1)
  for (const p of pieces) {
    place.compose(new THREE.Vector3(...p.pos), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rotY), one)
    for (const part of getParts(scenes[p.url])) {
      const g = part.geometry.clone()
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(place, part.matrix))
      // Chỉ giữ thuộc tính chung để gộp được.
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name)
      geos.push(g.index ? g.toNonIndexed() : g)
    }
  }
  const merged = mergeGeometries(geos, false)
  geos.forEach((g) => g.dispose())
  return merged
}

/** Nhiều bản sao của nhiều model, gom theo model để vẽ instanced. */
export interface Batch {
  url: string
  size: number
  items: Placement[]
  palette?: Record<string, string>
  paletteKey?: string
}

export class BatchSet {
  private map = new Map<string, Batch>()
  add(url: string, size: number, p: Placement, palette = PALETTE, paletteKey = 'base') {
    const key = `${url}|${size}|${paletteKey}`
    let b = this.map.get(key)
    if (!b) {
      b = { url, size, items: [], palette, paletteKey }
      this.map.set(key, b)
    }
    b.items.push(p)
  }
  get list() {
    return [...this.map.values()]
  }
}

/** Cây anh đào: chỉ đổi màu lá. */
export const BLOSSOM: Record<string, string> = { ...PALETTE, leafsGreen: '#ffb3c6', leafsDark: '#ff9fbf' }
export const FLOWERS = ['flower_redA', 'flower_redB', 'flower_purpleA', 'flower_purpleC', 'flower_yellowA', 'flower_yellowB']

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { insideMain, layout, seededRandom } from './path'
import { isMobile } from './utils'
import { isReserved } from './landmarks'
import { onWalkway } from './route'
import { BLOSSOM, CLOUD_URLS, fitMatrix, getParts, natureUrl, PALETTE, remapMaterial } from './envAssets'

type DecorKind = 'tree' | 'bush' | 'flower' | 'grass' | 'rock' | 'mushroom' | 'stump'

/** Model Kenney Nature Kit cho từng loại, kèm kích thước (cạnh lớn nhất) sau khi chuẩn hoá. */
const KINDS: Record<DecorKind, { models: string[]; size: number }> = {
  tree: {
    models: ['tree_default', 'tree_oak', 'tree_fat', 'tree_detailed', 'tree_small', 'tree_cone', 'tree_blocks', 'tree_pineRoundA', 'tree_pineRoundC', 'tree_simple'],
    size: 1.9,
  },
  bush: { models: ['plant_bush', 'plant_bushLarge', 'plant_bushDetailed', 'plant_bushSmall'], size: 0.85 },
  flower: {
    models: ['flower_redA', 'flower_redB', 'flower_redC', 'flower_purpleA', 'flower_purpleB', 'flower_yellowA', 'flower_yellowB', 'flower_yellowC'],
    size: 0.75,
  },
  grass: { models: ['grass', 'grass_large'], size: 0.45 },
  rock: { models: ['stone_smallA', 'stone_smallC', 'stone_smallFlatA', 'stone_largeA'], size: 0.6 },
  mushroom: { models: ['mushroom_red', 'mushroom_redGroup', 'mushroom_tan', 'mushroom_tanGroup', 'mushroom_redTall'], size: 0.5 },
  stump: { models: ['stump_round', 'log'], size: 0.7 },
}

Object.values(KINDS).forEach((k) => k.models.forEach((m) => useGLTF.preload(natureUrl(m))))

export interface Placement {
  pos: [number, number, number]
  /** Góc quay quanh trục đứng. */
  rot: number
  scale: number
  /** Lật ngược (đá treo dưới đảo). */
  flip?: boolean
}

interface DecorItem extends Placement {
  kind: DecorKind
  model: string
  blossom: boolean
}

/**
 * Trang trí ngẫu nhiên, gom có chủ đích cho đỡ rối: cây, bụi, đá, gốc cây xếp thành dải dọc viền đảo
 * (khoảng trong đảo để trống làm bãi cỏ), hoa gom thành vài khóm nhỏ thay vì rải lẻ khắp nơi.
 */
function buildDecor(): DecorItem[] {
  const rnd = seededRandom(20102026)
  const samples = layout.curve.getSpacedPoints(300)
  const houses = [...layout.stations.map((s) => s.housePos), layout.gift.housePos]
  /** Chừa chỗ cho quà bóng bay đáp xuống. */
  const bonusSpots = layout.stations.map((s) => s.bonusPos)
  const items: DecorItem[] = []
  const free = (p: THREE.Vector3, gap: number) =>
    !samples.some((s) => s.distanceToSquared(p) < 2.0 * 2.0) &&
    !houses.some((h) => h.distanceToSquared(p) < 2.9 * 2.9) &&
    !bonusSpots.some((b) => b.distanceToSquared(p) < 1.5 * 1.5) &&
    !isReserved(p, 0.5) &&
    !onWalkway(p, 0.4) &&
    !items.some((it) => (it.pos[0] - p.x) ** 2 + (it.pos[2] - p.z) ** 2 < gap * gap)
  /** Điểm ngẫu nhiên trong một khối đảo chính bất kỳ (khối lớn được chọn nhiều hơn). */
  const discs = layout.discs
  const areas = discs.map((d) => d.rx * d.rz)
  const totalArea = areas.reduce((a, b) => a + b, 0)
  const randomOnMain = () => {
    let k = rnd() * totalArea
    let d = discs[0]
    for (let i = 0; i < discs.length; i++) {
      k -= areas[i]
      if (k <= 0) {
        d = discs[i]
        break
      }
    }
    const a = rnd() * Math.PI * 2
    const r = Math.sqrt(rnd())
    return new THREE.Vector3(d.center.x + Math.cos(a) * r * d.rx, 0, d.center.z + Math.sin(a) * r * d.rz)
  }
  const pick = <K extends DecorKind>(kind: K) => KINDS[kind].models[Math.floor(rnd() * KINDS[kind].models.length)]

  // Dải viền: cây là chính, xen bụi, đá, gốc cây.
  const rimTarget = isMobile ? 34 : 56
  for (let attempts = 0, n = 0; n < rimTarget && attempts < 6000; attempts++) {
    const p = randomOnMain()
    // Chỉ lấy dải sát mép đảo (cách mép 0.8–3.5 m).
    if (!insideMain(p.x, p.z, 0.8) || insideMain(p.x, p.z, 3.5)) continue
    if (!free(p, 1.7)) continue
    const k = rnd()
    const kind: DecorKind = k < 0.55 ? 'tree' : k < 0.8 ? 'bush' : k < 0.92 ? 'rock' : 'stump'
    items.push({ kind, model: pick(kind), blossom: kind === 'tree' && rnd() < 0.35, pos: [p.x, 0, p.z], rot: rnd() * Math.PI * 2, scale: 0.85 + rnd() * 0.3 })
    n++
  }

  // Khóm hoa: 4–6 bông quanh một tâm, nằm giữa viền và đường.
  const clusters = isMobile ? 5 : 8
  for (let attempts = 0, n = 0; n < clusters && attempts < 1500; attempts++) {
    const c = randomOnMain()
    if (!insideMain(c.x, c.z, 3) || !free(c, 2.2)) continue
    const count = 4 + Math.floor(rnd() * 3)
    for (let i = 0; i < count; i++) {
      const q = c.clone().add(new THREE.Vector3((rnd() - 0.5) * 1.4, 0, (rnd() - 0.5) * 1.4))
      items.push({ kind: 'flower', model: pick('flower'), blossom: false, pos: [q.x, 0, q.z], rot: rnd() * Math.PI * 2, scale: 0.9 + rnd() * 0.3 })
    }
    n++
  }
  return items
}

/** Vẽ mọi bản sao của một model bằng InstancedMesh (mỗi mesh con một lần vẽ). */
export function InstancedModel({
  url,
  size,
  palette,
  paletteKey,
  items,
  shadows = true,
}: {
  url: string
  size: number
  palette: Record<string, string>
  paletteKey: string
  items: Placement[]
  shadows?: boolean
}) {
  const { scene } = useGLTF(url)
  const parts = useMemo(() => {
    const fit = fitMatrix(scene, size)
    return getParts(scene).map((p) => ({
      geometry: p.geometry,
      material: remapMaterial(p.material, palette, paletteKey),
      local: fit.clone().multiply(p.matrix),
    }))
  }, [scene, size, palette, paletteKey])
  const matrices = useMemo(() => {
    const e = new THREE.Euler()
    const q = new THREE.Quaternion()
    return items.map((it) =>
      new THREE.Matrix4().compose(
        new THREE.Vector3(...it.pos),
        q.setFromEuler(e.set(it.flip ? Math.PI : 0, it.rot, 0)),
        new THREE.Vector3(it.scale, it.scale, it.scale),
      ),
    )
  }, [items])
  const refs = useRef<(THREE.InstancedMesh | null)[]>([])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    refs.current.forEach((mesh, j) => {
      if (!mesh) return
      matrices.forEach((world, i) => mesh.setMatrixAt(i, m.multiplyMatrices(world, parts[j].local)))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    })
  }, [matrices, parts])

  return (
    <>
      {parts.map((p, j) => (
        <instancedMesh
          key={j}
          ref={(el) => {
            refs.current[j] = el
          }}
          args={[p.geometry, p.material, matrices.length]}
          castShadow={shadows}
          receiveShadow={shadows}
        />
      ))}
    </>
  )
}

export function Decor() {
  const groups = useMemo(() => {
    const map = new Map<string, { url: string; size: number; blossom: boolean; items: DecorItem[] }>()
    for (const it of buildDecor()) {
      const key = `${it.model}|${it.blossom}`
      let g = map.get(key)
      if (!g) {
        g = { url: natureUrl(it.model), size: KINDS[it.kind].size, blossom: it.blossom, items: [] }
        map.set(key, g)
      }
      g.items.push(it)
    }
    return [...map.entries()]
  }, [])
  return (
    <group>
      {groups.map(([key, g]) => (
        <InstancedModel
          key={key}
          url={g.url}
          size={g.size}
          palette={g.blossom ? BLOSSOM : PALETTE}
          paletteKey={g.blossom ? 'blossom' : 'base'}
          items={g.items}
        />
      ))}
    </group>
  )
}

interface CloudDef {
  model: number
  pos: [number, number, number]
  rot: number
  scale: number
  speed: number
}

CLOUD_URLS.forEach((u) => useGLTF.preload(u))

function buildClouds(): CloudDef[] {
  const rnd = seededRandom(1010)
  const { center, rx, rz } = layout.island
  const n = isMobile ? 5 : 9
  const clouds: CloudDef[] = []
  for (let i = 0; i < n; i++) {
    clouds.push({
      model: i % CLOUD_URLS.length,
      // Mây trôi phía sau đảo (làm nền trời), không bay ngang qua đảo che mất nhà và đường.
      pos: [center.x + (rnd() - 0.5) * (rx * 2 + 16), 4 + rnd() * 5, center.z - rz - 6 - rnd() * 12],
      rot: (rnd() - 0.5) * 0.8,
      scale: 0.8 + rnd() * 0.8,
      speed: 0.25 + rnd() * 0.35,
    })
  }
  return clouds
}

const cloudMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff0f6', emissiveIntensity: 0.35, roughness: 1 })

/** Một đám mây low-poly (Quaternius), chuẩn hoá về rộng khoảng 2.8. */
function CloudModel({ index }: { index: number }) {
  const { scene } = useGLTF(CLOUD_URLS[index])
  const parts = useMemo(() => {
    const fit = fitMatrix(scene, 2.8)
    return getParts(scene).map((p) => ({ geometry: p.geometry, matrix: fit.clone().multiply(p.matrix) }))
  }, [scene])
  return (
    <>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geometry} material={cloudMaterial} matrix={p.matrix} matrixAutoUpdate={false} />
      ))}
    </>
  )
}

export function Clouds() {
  const clouds = useMemo(buildClouds, [])
  const refs = useRef<(THREE.Group | null)[]>([])
  const { center, rx } = layout.island
  const limit = rx + 14

  useFrame((_, dt) => {
    refs.current.forEach((g, i) => {
      if (!g) return
      g.position.x += clouds[i].speed * dt
      if (g.position.x > center.x + limit) g.position.x = center.x - limit
    })
  })

  return (
    <group>
      {clouds.map((c, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          position={c.pos}
          rotation={[0, c.rot, 0]}
          scale={c.scale}
        >
          <CloudModel index={c.model} />
        </group>
      ))}
    </group>
  )
}

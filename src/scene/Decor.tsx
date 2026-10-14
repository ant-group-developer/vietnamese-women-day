import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { layout, seededRandom } from './path'
import { isMobile } from './utils'
import { CLOUD_URLS, fitMatrix, getParts, natureUrl, PALETTE, remapMaterial } from './envAssets'

type DecorKind = 'tree' | 'bush' | 'flower' | 'grass' | 'rock' | 'mushroom' | 'stump'

/** Model Kenney Nature Kit cho từng loại, kèm kích thước (cạnh lớn nhất) sau khi chuẩn hoá. */
const KINDS: Record<DecorKind, { models: string[]; size: number }> = {
  tree: {
    models: ['tree_default', 'tree_oak', 'tree_fat', 'tree_detailed', 'tree_small', 'tree_cone', 'tree_blocks', 'tree_pineRoundA', 'tree_pineRoundC', 'tree_simple'],
    size: 2.1,
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

/** Cây hoa anh đào hồng: chỉ đổi màu lá. */
const BLOSSOM: Record<string, string> = { ...PALETTE, leafsGreen: '#ffb3c6', leafsDark: '#ff9fbf' }

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

function buildDecor(): DecorItem[] {
  const rnd = seededRandom(20102026)
  const { center, rx, rz } = layout.island
  const samples = layout.curve.getSpacedPoints(300)
  const houses = [...layout.stations.map((s) => s.housePos), layout.gift.housePos]
  /** Chừa chỗ cho quà bóng bay đáp xuống. */
  const bonusSpots = layout.stations.map((s) => s.bonusPos)
  const items: DecorItem[] = []
  const target = isMobile ? 80 : 160
  let attempts = 0
  while (items.length < target && attempts < 5000) {
    attempts++
    const a = rnd() * Math.PI * 2
    const r = Math.sqrt(rnd())
    const x = center.x + Math.cos(a) * r * (rx - 1.2)
    const z = center.z + Math.sin(a) * r * (rz - 1.2)
    const p = new THREE.Vector3(x, 0, z)
    if (samples.some((s) => s.distanceToSquared(p) < 1.9 * 1.9)) continue
    if (houses.some((h) => h.distanceToSquared(p) < 2.6 * 2.6)) continue
    if (bonusSpots.some((b) => b.distanceToSquared(p) < 1.5 * 1.5)) continue
    if (items.some((it) => (it.pos[0] - x) ** 2 + (it.pos[2] - z) ** 2 < 0.8)) continue
    const k = rnd()
    const kind: DecorKind =
      k < 0.2 ? 'tree' : k < 0.33 ? 'bush' : k < 0.68 ? 'flower' : k < 0.8 ? 'grass' : k < 0.88 ? 'rock' : k < 0.96 ? 'mushroom' : 'stump'
    const models = KINDS[kind].models
    items.push({
      kind,
      model: models[Math.floor(rnd() * models.length)],
      blossom: kind === 'tree' && rnd() < 0.3,
      pos: [x, 0, z],
      rot: rnd() * Math.PI * 2,
      scale: 0.8 + rnd() * 0.45,
    })
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
      pos: [center.x + (rnd() - 0.5) * (rx * 2 + 16), 5.5 + rnd() * 4, center.z + (rnd() - 0.5) * (rz * 2 + 10) - 4],
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

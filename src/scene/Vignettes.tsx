import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { InstancedModel, type Placement } from './Decor'
import { BatchSet, FLOWERS, mergePieces, natureUrl, PALETTE, townUrl, type Batch, type PiecePlacement } from './envAssets'
import { archBase, frontEdgeZ, lanterns, spots, type Spot } from './landmarks'
import { seededRandom } from './path'
import { isMobile } from './utils'

export function Batches({ batches, shadows = true }: { batches: Batch[]; shadows?: boolean }) {
  return (
    <>
      {batches.map((b) => (
        <InstancedModel
          key={`${b.url}|${b.size}|${b.paletteKey}`}
          url={b.url}
          size={b.size}
          palette={b.palette ?? PALETTE}
          paletteKey={b.paletteKey ?? 'base'}
          items={b.items}
          shadows={shadows}
        />
      ))}
    </>
  )
}

/** Một geometry + material vẽ nhiều lần (con của component là geometry và material). */
export function Instances({ items, children }: { items: { pos: THREE.Vector3 | readonly [number, number, number]; rotY?: number; scale?: number; color?: string }[]; children: React.ReactNode }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const v = new THREE.Vector3()
    const c = new THREE.Color()
    const up = new THREE.Vector3(0, 1, 0)
    items.forEach((it, i) => {
      const s = it.scale ?? 1
      if (it.pos instanceof THREE.Vector3) v.copy(it.pos)
      else v.set(it.pos[0], it.pos[1], it.pos[2])
      mesh.setMatrixAt(i, m.compose(v, q.setFromAxisAngle(up, it.rotY ?? 0), new THREE.Vector3(s, s, s)))
      if (it.color) mesh.setColorAt(i, c.set(it.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow={!isMobile}>
      {children}
    </instancedMesh>
  )
}

const NEW_MODELS = [
  ...['canoe', 'lily_large', 'lily_small', 'tent_detailedOpen', 'campfire_stones', 'fence_simple', 'sign', 'log_large', 'pot_small', 'log_stack', 'crop_pumpkin', 'crops_bambooStageB', 'stone_smallFlatB', 'stone_smallB', 'flower_purpleC'].map(natureUrl),
  ...['fountain-round-detail', 'stall-red', 'stall-green', 'cart', 'stall-bench', 'stall-stool', 'banner-red', 'lantern'].map(townUrl),
]
NEW_MODELS.forEach((u) => useGLTF.preload(u))

/** Đổi toạ độ cục bộ của điểm nhấn (mặt trước +z) sang toạ độ thế giới. */
function at(spot: Spot, lx: number, lz: number, rot = 0, scale = 1, y = 0): Placement {
  const c = Math.cos(spot.rotY)
  const s = Math.sin(spot.rotY)
  return { pos: [spot.pos.x + lx * c + lz * s, y, spot.pos.z - lx * s + lz * c], rot: spot.rotY + rot, scale }
}

function buildPond(spot: Spot, b: BatchSet, rnd: () => number) {
  // Viền đá quanh hồ (elip 1.95 x 1.5), chừa chỗ cho suối chảy ra phía camera (local -z vì hồ quay về đường).
  const n = 18
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) + Math.PI / 2) < 0.35) continue
    b.add(natureUrl(i % 2 ? 'stone_smallFlatB' : 'stone_smallB'), 0.42, at(spot, Math.cos(a) * 2.05, Math.sin(a) * 1.6, rnd() * 6, 0.8 + rnd() * 0.5))
  }
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2
    // Ngoài vòng bơi của rùa.
    const r = 1.05 + rnd() * 0.3
    b.add(natureUrl(i % 2 ? 'lily_small' : 'lily_large'), i % 2 ? 0.32 : 0.45, at(spot, Math.cos(a) * r * 1.2, Math.sin(a) * r * 0.85, rnd() * 6, 1, 0.02))
  }
  // Thuyền neo sát bờ sau, ngoài vòng bơi của rùa (Wanderers: bán kính 0.75 x 0.56).
  b.add(natureUrl('canoe'), 1.2, at(spot, 0.1, 1.08, Math.PI / 2 + 0.12, 1, 0.01))
  // Bụi tre phía sau hồ.
  for (const [x, z] of [[1.6, 1.45], [2.0, 0.9], [-1.8, 1.3]]) b.add(natureUrl('crops_bambooStageB'), 1.2, at(spot, x, z, rnd() * 6, 0.9 + rnd() * 0.3))
}

function buildFountain(spot: Spot, b: BatchSet) {
  b.add(townUrl('fountain-round-detail'), 2.4, at(spot, 0, 0))
  b.add(townUrl('stall-bench'), 0.95, at(spot, -1.55, 0.2, 0))
  b.add(townUrl('stall-bench'), 0.95, at(spot, 1.55, 0.2, Math.PI))
  for (const [x, z] of [[-1.3, -1.0], [1.3, -1.0], [0, 1.45]]) b.add(natureUrl('pot_small'), 0.45, at(spot, x, z))
  for (const [x, z] of [[-1.3, -1.0], [1.3, -1.0], [0, 1.45]]) b.add(natureUrl('flower_redA'), 0.5, at(spot, x, z, 0, 1, 0.3))
}

function buildMarket(spot: Spot, b: BatchSet, rnd: () => number) {
  b.add(townUrl('stall-red'), 1.45, at(spot, -0.85, 0.3, 0))
  b.add(townUrl('stall-green'), 1.45, at(spot, 0.85, 0.3, 0))
  b.add(townUrl('cart'), 1.3, at(spot, 1.55, -1.0, 0.5))
  b.add(townUrl('stall-stool'), 0.3, at(spot, -0.4, -0.55))
  b.add(townUrl('stall-stool'), 0.3, at(spot, 0.55, -0.6))
  b.add(townUrl('banner-red'), 0.9, at(spot, -1.75, 0.6, 0))
  // Hoa bày trước sạp và trên xe đẩy.
  for (let i = 0; i < 8; i++) b.add(natureUrl(FLOWERS[i % FLOWERS.length]), 0.45, at(spot, -1.4 + i * 0.36, -0.35 + rnd() * 0.15, rnd() * 6))
  for (let i = 0; i < 4; i++) b.add(natureUrl(FLOWERS[(i + 2) % FLOWERS.length]), 0.4, at(spot, 1.45 + (i % 2) * 0.22, -1.25 + (i >> 1) * 0.4, rnd() * 6, 1, 0.42))
  b.add(natureUrl('crop_pumpkin'), 0.5, at(spot, -1.6, -0.6, rnd() * 6))
}

function buildGarden(spot: Spot, b: BatchSet, rnd: () => number) {
  const h = 1.4
  const seg = 0.93
  for (const side of ['n', 's', 'e', 'w'] as const) {
    for (let i = -1; i <= 1; i++) {
      // Cổng vào ở giữa mặt trước.
      if (side === 's' && i === 0) continue
      const along = i * seg
      const [x, z, rot] =
        side === 'n' ? [along, -h, 0] : side === 's' ? [along, h, 0] : side === 'e' ? [h, along, Math.PI / 2] : [-h, along, Math.PI / 2]
      b.add(natureUrl('fence_simple'), 0.95, at(spot, x, z, rot))
    }
  }
  const rows = ['flower_redA', 'flower_yellowA', 'flower_purpleA', 'flower_redB']
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (r === 3 && (c === 1 || c === 2)) continue
      b.add(natureUrl(rows[r]), 0.55, at(spot, -0.9 + c * 0.6, -0.9 + r * 0.6, rnd() * 6, 0.9 + rnd() * 0.3))
    }
  b.add(natureUrl('sign'), 0.6, at(spot, -0.75, h + 0.35, 0))
}

function buildCamp(spot: Spot, b: BatchSet) {
  b.add(natureUrl('tent_detailedOpen'), 1.7, at(spot, 0, -0.5, 0))
  b.add(natureUrl('campfire_stones'), 0.8, at(spot, 0.2, 0.75))
  b.add(natureUrl('log_large'), 1.0, at(spot, -0.9, 0.95, 1.2))
  b.add(natureUrl('log_large'), 1.0, at(spot, 1.25, 0.85, -1.3))
  b.add(natureUrl('log_stack'), 0.8, at(spot, 1.1, -0.6, 0.3))
  b.add(natureUrl('pot_small'), 0.4, at(spot, -1.0, -0.2))
}

/** Toàn bộ model đặt sẵn của các điểm nhấn trên đảo chính. */
function buildVignettes() {
  const b = new BatchSet()
  const rnd = seededRandom(4242)
  for (const s of spots) {
    if (s.kind === 'pond') buildPond(s, b, rnd)
    else if (s.kind === 'fountain') buildFountain(s, b)
    else if (s.kind === 'market') buildMarket(s, b, rnd)
    else if (s.kind === 'garden') buildGarden(s, b, rnd)
    else if (s.kind === 'camp') buildCamp(s, b)
  }
  for (const l of lanterns) b.add(townUrl('lantern'), 1.5, { pos: [l.pos.x, 0, l.pos.z], rot: l.rotY, scale: 1 })
  return b.list
}

/* ---------- Nước: texture vệt sáng trượt dần ---------- */

function makeStreakTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#8fd6ee'
  ctx.fillRect(0, 0, 64, 256)
  const rnd = seededRandom(99)
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.75)' : 'rgba(200,240,255,0.8)'
    const x = rnd() * 64
    const y = rnd() * 256
    const len = 20 + rnd() * 60
    ctx.fillRect(x, y, 2 + rnd() * 4, len)
    if (y + len > 256) ctx.fillRect(x, y - 256, 2 + rnd() * 4, len)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Dải nước từ (x, z0) tới mép đảo rồi đổ xuống thành thác; kèm alpha mờ dần ở đáy thác. */
function buildStreamGeometry(x: number, z0: number) {
  const edge = frontEdgeZ(x) + 0.02
  const pts: { z: number; y: number; w: number }[] = []
  const flat = Math.max(1, Math.ceil((edge - z0) / 0.5))
  for (let i = 0; i <= flat; i++) pts.push({ z: z0 + ((edge - z0) * i) / flat, y: 0.035, w: 0.38 + (i / flat) * 0.12 })
  // Thác: cong ra ngoài một chút rồi rơi thẳng.
  const drop = 9
  const steps = 16
  for (let i = 1; i <= steps; i++) {
    const u = i / steps
    pts.push({ z: edge + 0.35 * Math.sqrt(u) + 0.25 * u, y: 0.035 - drop * u * u * 0.6 - drop * u * 0.4, w: 0.5 + u * 0.4 })
  }
  const pos: number[] = []
  const uv: number[] = []
  const col: number[] = []
  const idx: number[] = []
  let dist = 0
  pts.forEach((p, i) => {
    if (i > 0) dist += Math.hypot(p.z - pts[i - 1].z, p.y - pts[i - 1].y)
    const fall = i > flat ? (i - flat) / steps : 0
    const alpha = 0.92 * (1 - fall * fall)
    pos.push(x - p.w, p.y, p.z, x + p.w, p.y, p.z)
    uv.push(0, dist / 2.2, 1, dist / 2.2)
    col.push(1, 1, 1, alpha, 1, 1, 1, alpha)
    if (i > 0) {
      const a = (i - 1) * 2
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function Pond({ spot }: { spot: Spot }) {
  const tex = useMemo(() => makeStreakTexture(), [])
  const stream = useMemo(() => buildStreamGeometry(spot.pos.x, spot.pos.z + 1.2), [spot])
  const pondTex = useMemo(() => {
    const t = tex.clone()
    t.repeat.set(2, 0.6)
    t.needsUpdate = true
    return t
  }, [tex])
  const lotus = useMemo(() => {
    const petals: THREE.BufferGeometry[] = []
    for (let i = 0; i < 7; i++) {
      const g = new THREE.ConeGeometry(0.07, 0.24, 4)
      g.translate(0, 0.12, 0)
      g.rotateZ(0.65)
      g.rotateY((i / 7) * Math.PI * 2)
      petals.push(g.toNonIndexed())
    }
    return mergeGeometries(petals)
  }, [])
  const lotusRef = useRef<THREE.InstancedMesh>(null)
  const lotusSpots = useMemo(() => {
    const rnd = seededRandom(31)
    return Array.from({ length: 5 }, () => {
      const a = rnd() * Math.PI * 2
      const r = 1.05 + rnd() * 0.25
      const c = Math.cos(spot.rotY)
      const s = Math.sin(spot.rotY)
      const lx = Math.cos(a) * r * 1.2
      const lz = Math.sin(a) * r * 0.9
      return new THREE.Vector3(spot.pos.x + lx * c + lz * s, 0.06, spot.pos.z - lx * s + lz * c)
    })
  }, [spot])
  useLayoutEffect(() => {
    const m = lotusRef.current
    if (!m) return
    const mat = new THREE.Matrix4()
    lotusSpots.forEach((p, i) => m.setMatrixAt(i, mat.makeTranslation(p.x, p.y, p.z)))
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [lotusSpots])

  useFrame((_, dt) => {
    tex.offset.y -= dt * 0.9
    pondTex.offset.x += dt * 0.03
  })

  return (
    <group>
      {/* Mặt hồ */}
      <mesh position={[spot.pos.x, 0.03, spot.pos.z]} rotation={[-Math.PI / 2, 0, -spot.rotY]} scale={[1.95, 1.55, 1]} receiveShadow>
        <circleGeometry args={[1, 28]} />
        <meshStandardMaterial map={pondTex} color="#cdeffa" roughness={0.25} />
      </mesh>
      {/* Bờ cát quanh hồ */}
      <mesh position={[spot.pos.x, 0.015, spot.pos.z]} rotation={[-Math.PI / 2, 0, -spot.rotY]} scale={[2.25, 1.8, 1]}>
        <circleGeometry args={[1, 28]} />
        <meshStandardMaterial color="#f3dcc4" />
      </mesh>
      {/* Suối và thác */}
      <mesh geometry={stream}>
        <meshBasicMaterial map={tex} vertexColors transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <instancedMesh ref={lotusRef} args={[lotus, undefined, lotusSpots.length]} castShadow>
        <meshStandardMaterial color="#ff8fb5" flatShading roughness={0.7} />
      </instancedMesh>
    </group>
  )
}

/** Cột nước giữa đài phun: các giọt bay theo đường parabol. */
function FountainSpray({ spot }: { spot: Spot }) {
  const N = 18
  const ref = useRef<THREE.InstancedMesh>(null)
  const m = useMemo(() => new THREE.Matrix4(), [])
  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    const time = clock.elapsedTime
    for (let i = 0; i < N; i++) {
      const t = (time * 0.7 + i / N) % 1
      const a = (i / N) * Math.PI * 2 * 3
      const r = t * 0.85
      const y = 0.95 + 1.3 * t - 1.9 * t * t
      const s = 0.6 + 0.4 * (1 - t)
      m.makeScale(s, s, s).setPosition(spot.pos.x + Math.cos(a) * r, y, spot.pos.z + Math.sin(a) * r)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <mesh position={[spot.pos.x, 0.45, spot.pos.z]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 0.9, 8]} />
        <meshStandardMaterial color="#f1e6ee" flatShading />
      </mesh>
      <mesh position={[spot.pos.x, 0.9, spot.pos.z]}>
        <cylinderGeometry args={[0.32, 0.18, 0.12, 10]} />
        <meshStandardMaterial color="#f1e6ee" flatShading />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
        <icosahedronGeometry args={[0.05, 0]} />
        <meshBasicMaterial color="#bfeaff" transparent opacity={0.85} />
      </instancedMesh>
    </group>
  )
}

/** Ngọn lửa trại lập loè. */
function Campfire({ spot }: { spot: Spot }) {
  const ref = useRef<THREE.Group>(null)
  const p = at(spot, 0.2, 0.75).pos
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const t = clock.elapsedTime
    g.children.forEach((c, i) => {
      const k = 0.85 + 0.25 * Math.sin(t * (9 + i * 3) + i * 2)
      c.scale.set(1, k, 1)
    })
  })
  return (
    <group ref={ref} position={[p[0], 0.05, p[2]]}>
      <mesh position={[0, 0.2, 0]}>
        <coneGeometry args={[0.16, 0.42, 6]} />
        <meshBasicMaterial color="#ff9a5c" />
      </mesh>
      <mesh position={[0.05, 0.14, 0.03]}>
        <coneGeometry args={[0.09, 0.28, 5]} />
        <meshBasicMaterial color="#ffe08a" />
      </mesh>
    </group>
  )
}

/** Cổng hoa ở đầu đường. */
function FlowerArch() {
  const R = 1.45
  const H = 1.25
  const blooms = useMemo(() => {
    const rnd = seededRandom(5)
    const colors = ['#ff8fb5', '#ffd166', '#ffffff', '#ff6f9c', '#c77dff']
    return Array.from({ length: 26 }, (_, i) => {
      const a = (i / 25) * Math.PI
      return { pos: [Math.cos(a) * R + (rnd() - 0.5) * 0.08, H + Math.sin(a) * R, (rnd() - 0.5) * 0.12] as const, color: colors[i % colors.length], scale: 0.09 + rnd() * 0.05 }
    })
  }, [])
  return (
    <group position={archBase.pos} rotation={[0, archBase.rotY, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * R, H / 2, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, H, 8]} />
          <meshStandardMaterial color="#d9a07c" flatShading />
        </mesh>
      ))}
      <mesh position={[0, H, 0]} castShadow>
        <torusGeometry args={[R, 0.07, 6, 24, Math.PI]} />
        <meshStandardMaterial color="#7fd39f" flatShading />
      </mesh>
      <Instances items={blooms}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading />
      </Instances>
    </group>
  )
}

/* ---------- Cối xay gió (dùng cho đảo vệ tinh) ---------- */

const WINDMILL_PARTS = ['wall-wood', 'wall-wood-door', 'wall-wood-window-small', 'roof-high-point'].map(townUrl)
WINDMILL_PARTS.forEach((u) => useGLTF.preload(u))
useGLTF.preload(townUrl('windmill'))
const FACE = { px: 0, pz: -Math.PI / 2, nx: Math.PI, nz: Math.PI / 2 }

function windmillPieces(): PiecePlacement[] {
  const out: PiecePlacement[] = []
  for (let floor = 0; floor < 3; floor++) {
    for (const [face, rot] of Object.entries(FACE)) {
      const name = face === 'pz' ? (floor === 0 ? 'wall-wood-door' : 'wall-wood-window-small') : floor === 1 && face === 'nz' ? 'wall-wood-window-small' : 'wall-wood'
      out.push({ url: townUrl(name), pos: [0, floor, 0], rotY: rot })
    }
  }
  out.push({ url: townUrl('roof-high-point'), pos: [0, 3, 0], rotY: 0 })
  return out
}

export function Windmill(props: { position: [number, number, number]; rotY?: number; scale?: number }) {
  const gltfs = useGLTF(WINDMILL_PARTS)
  const sails = useGLTF(townUrl('windmill'))
  const geometry = useMemo(() => mergePieces(Object.fromEntries(gltfs.map((g, i) => [WINDMILL_PARTS[i], g.scene])), windmillPieces()), [gltfs])
  const material = useMemo(() => (gltfs[0].scene.getObjectByProperty('isMesh', true) as THREE.Mesh).material as THREE.Material, [gltfs])
  const sailsObj = useMemo(() => sails.scene.clone(true), [sails])
  const spin = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.x += dt * 0.6
  })
  return (
    <group position={props.position} rotation={[0, props.rotY ?? 0, 0]} scale={props.scale ?? 1}>
      <mesh geometry={geometry} material={material} />
      {/* Cánh quạt mỏng theo trục x: xoay để mặt quạt nhìn ra +z, quay quanh trục của nó. */}
      <group position={[0, 2.45, 0.62]} rotation={[0, -Math.PI / 2, 0]}>
        <group ref={spin}>
          <primitive object={sailsObj} />
        </group>
      </group>
    </group>
  )
}

/** Các điểm nhấn trên đảo chính: hồ sen + thác, đài phun nước, chợ hoa, vườn hoa, cắm trại, cổng hoa, đèn lồng. */
export function Vignettes() {
  const batches = useMemo(() => buildVignettes(), [])
  const pond = spots.find((s) => s.kind === 'pond')
  const fountain = spots.find((s) => s.kind === 'fountain')
  const camp = spots.find((s) => s.kind === 'camp')
  return (
    <group>
      <Batches batches={batches} shadows={!isMobile} />
      {pond && <Pond spot={pond} />}
      {fountain && <FountainSpray spot={fountain} />}
      {camp && <Campfire spot={camp} />}
      <FlowerArch />
    </group>
  )
}

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { layout, seededRandom } from './path'
import { insideIsland, isReserved } from './landmarks'
import { isMobile } from './utils'

/* ---------- Khinh khí cầu ---------- */

const BALLOON_COLORS: [string, string][] = [
  ['#ff8fb5', '#fff6e9'],
  ['#ffd166', '#ff7aa8'],
  ['#9bd9ff', '#fff6e9'],
  ['#c77dff', '#ffd6e8'],
]

/** Bóng hình giọt nước low-poly, sọc dọc hai màu (tô theo mặt). */
function balloonGeometry(a: string, b: string) {
  const prof: THREE.Vector2[] = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    const ang = -Math.PI / 2 + t * Math.PI
    const r = Math.cos(ang) * (t < 0.5 ? 0.6 + t * 0.8 : 1)
    prof.push(new THREE.Vector2(Math.max(0.12, r), Math.sin(ang) * 1.15))
  }
  const g = new THREE.LatheGeometry(prof, 12).toNonIndexed()
  const ca = new THREE.Color(a)
  const cb = new THREE.Color(b)
  const pos = g.getAttribute('position')
  const colors: number[] = []
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3
    const seg = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (Math.PI * 2)) * 12 + 0.5) % 12
    const c = seg % 2 ? ca : cb
    for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.computeVertexNormals()
  return g
}

function Balloon({ colors, orbit, height, speed, phase, scale }: { colors: [string, string]; orbit: [number, number]; height: number; speed: number; phase: number; scale: number }) {
  const geo = useMemo(() => balloonGeometry(...colors), [colors])
  const ref = useRef<THREE.Group>(null)
  const { center } = layout.island
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const t = clock.elapsedTime * speed + phase
    g.position.set(center.x + Math.cos(t) * orbit[0], height + Math.sin(clock.elapsedTime * 0.5 + phase) * 0.4, center.z - 4 + Math.sin(t) * orbit[1])
    g.rotation.y = clock.elapsedTime * 0.1
  })
  return (
    <group ref={ref} scale={scale}>
      <mesh geometry={geo} position={[0, 1.6, 0]}>
        <meshStandardMaterial vertexColors flatShading roughness={0.8} />
      </mesh>
      {/* Giỏ và dây */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[0.38, 0.3, 0.38]} />
        <meshStandardMaterial color="#c99272" flatShading />
      </mesh>
      {[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([x, z], i) => (
        <mesh key={i} position={[x * 0.17, 0.3, z * 0.17]} rotation={[z * 0.12, 0, -x * 0.12]}>
          <cylinderGeometry args={[0.01, 0.01, 0.6, 3]} />
          <meshBasicMaterial color="#8a5a45" />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- Sinh vật vỗ cánh (bướm, chim): mỗi con hai cánh instanced ---------- */

interface Flapper {
  /** Vị trí theo thời gian. */
  path: (t: number, out: THREE.Vector3) => void
  flap: number
  phase: number
}

function FlapperSwarm({ flappers, wing, colors, size }: { flappers: Flapper[]; wing: THREE.BufferGeometry; colors: string[]; size: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), next: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), s: new THREE.Vector3(size, size, size) }), [size])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const c = new THREE.Color()
    flappers.forEach((_, i) => {
      c.set(colors[i % colors.length])
      mesh.setColorAt(i * 2, c)
      mesh.setColorAt(i * 2 + 1, c)
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [flappers, colors])
  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    const time = clock.elapsedTime
    flappers.forEach((f, i) => {
      const t = time + f.phase
      f.path(t, tmp.p)
      f.path(t + 0.05, tmp.next)
      const yaw = Math.atan2(tmp.next.x - tmp.p.x, tmp.next.z - tmp.p.z)
      const flap = Math.sin(t * f.flap) * 0.9
      for (const side of [1, -1]) {
        tmp.q.setFromEuler(tmp.e.set(0, yaw, side * flap, 'YXZ'))
        tmp.m.compose(tmp.p, tmp.q, tmp.s.set(side * size, size, size))
        mesh.setMatrixAt(i * 2 + (side > 0 ? 0 : 1), tmp.m)
      }
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[wing, undefined, flappers.length * 2]} frustumCulled={false}>
      <meshBasicMaterial side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

/** Cánh bướm: hai thuỳ, gốc ở trục cơ thể (x = 0) xoè sang +x. */
function butterflyWing() {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(0.5, 0.6, 1.1, 0.5, 0.9, 0.05)
  s.bezierCurveTo(1.0, -0.3, 0.6, -0.7, 0, -0.15)
  const g = new THREE.ShapeGeometry(s, 4)
  g.rotateX(-Math.PI / 2)
  return g
}

/** Cánh chim: tam giác dài. */
function birdWing() {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, 0, 0, -0.2, 1, 0, -0.3], 3))
  g.computeVertexNormals()
  return g
}

function useButterflies(): Flapper[] {
  return useMemo(() => {
    const rnd = seededRandom(808)
    const { center, rx, rz } = layout.island
    const n = isMobile ? 6 : 10
    const out: Flapper[] = []
    for (let tries = 0; out.length < n && tries < 500; tries++) {
      const x = center.x + (rnd() * 2 - 1) * rx
      const z = center.z + (rnd() * 2 - 1) * rz
      if (!insideIsland(x, z, 1.5)) continue
      const home = new THREE.Vector3(x, 0, z)
      if (isReserved(home)) continue
      const r = 0.6 + rnd() * 1.2
      const sp = 0.5 + rnd() * 0.5
      const h = 0.5 + rnd() * 0.9
      out.push({
        path: (t, o) => o.set(home.x + Math.sin(t * sp) * r, h + Math.sin(t * sp * 2.3) * 0.25, home.z + Math.sin(t * sp * 0.7 + 1) * r * 0.8),
        flap: 16 + rnd() * 6,
        phase: rnd() * 100,
      })
    }
    return out
  }, [])
}

function useBirds(): Flapper[] {
  return useMemo(() => {
    const rnd = seededRandom(303)
    const { center, rx, rz } = layout.island
    const n = isMobile ? 5 : 9
    return Array.from({ length: n }, (_, i) => {
      // Bay vòng quanh đảo theo đội hình chữ V.
      const row = Math.ceil(i / 2)
      const side = i % 2 ? 1 : -1
      const lag = row * 0.03
      const off = side * row * 0.9
      const h = 11 + rnd() * 0.4
      return {
        path: (t: number, o: THREE.Vector3) => {
          const a = t * 0.09 - lag
          const R = rx * 0.75 + off
          o.set(center.x + Math.cos(a) * R, h + Math.sin(t * 0.3) * 0.5, center.z - 6 + Math.sin(a) * (rz + 8 + off))
        },
        flap: 7 + rnd() * 2,
        phase: 0,
      }
    })
  }, [])
}

export function SkyLife() {
  const butterflies = useButterflies()
  const birds = useBirds()
  const wingB = useMemo(() => butterflyWing(), [])
  const wingBird = useMemo(() => birdWing(), [])
  const { rx, rz } = layout.island
  const balloons = useMemo(() => {
    const rnd = seededRandom(64)
    const list = BALLOON_COLORS.map((colors, i) => ({
      colors,
      orbit: [rx + 6 + rnd() * 8, rz + 10 + rnd() * 6] as [number, number],
      height: 6 + rnd() * 5,
      speed: (0.012 + rnd() * 0.01) * (i % 2 ? 1 : -1),
      phase: (i / BALLOON_COLORS.length) * Math.PI * 2 + 0.6,
      scale: 1 + rnd() * 0.5,
    }))
    return isMobile ? list.slice(0, 2) : list
  }, [rx, rz])
  return (
    <group>
      {balloons.map((b, i) => (
        <Balloon key={i} {...b} />
      ))}
      <FlapperSwarm flappers={butterflies} wing={wingB} colors={['#ff8fb5', '#ffd166', '#c77dff', '#ffffff', '#9bd9ff']} size={0.16} />
      <FlapperSwarm flappers={birds} wing={wingBird} colors={['#ffffff']} size={0.45} />
    </group>
  )
}

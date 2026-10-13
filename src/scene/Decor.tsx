import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { layout, seededRandom } from './path'
import { isMobile } from './utils'

type DecorKind = 'tree' | 'bush' | 'flower' | 'rock' | 'mushroom'

interface DecorItem {
  kind: DecorKind
  pos: [number, number, number]
  rot: number
  scale: number
  color: string
}

const TREE_GREENS = ['#7fd39f', '#5ec48a', '#9be3b6']
const FLOWER_COLORS = ['#ff7aa8', '#ffd166', '#c77dff', '#ff9fbf', '#8ed6ff', '#ffffff']

function buildDecor(): DecorItem[] {
  const rnd = seededRandom(20102026)
  const { center, rx, rz } = layout.island
  const samples = layout.curve.getSpacedPoints(300)
  const houses = [...layout.stations.map((s) => s.housePos), layout.gift.housePos]
  const items: DecorItem[] = []
  const target = isMobile ? 70 : 140
  let attempts = 0
  while (items.length < target && attempts < 4000) {
    attempts++
    const a = rnd() * Math.PI * 2
    const r = Math.sqrt(rnd())
    const x = center.x + Math.cos(a) * r * (rx - 1.2)
    const z = center.z + Math.sin(a) * r * (rz - 1.2)
    const p = new THREE.Vector3(x, 0, z)
    if (samples.some((s) => s.distanceToSquared(p) < 1.9 * 1.9)) continue
    if (houses.some((h) => h.distanceToSquared(p) < 2.6 * 2.6)) continue
    if (items.some((it) => (it.pos[0] - x) ** 2 + (it.pos[2] - z) ** 2 < 0.9)) continue
    const k = rnd()
    const kind: DecorKind = k < 0.22 ? 'tree' : k < 0.4 ? 'bush' : k < 0.8 ? 'flower' : k < 0.9 ? 'rock' : 'mushroom'
    const color =
      kind === 'tree' || kind === 'bush'
        ? TREE_GREENS[Math.floor(rnd() * TREE_GREENS.length)]
        : kind === 'flower'
          ? FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length)]
          : kind === 'rock'
            ? '#d9c9d2'
            : '#ff6f91'
    items.push({ kind, pos: [x, 0, z], rot: rnd() * Math.PI * 2, scale: 0.75 + rnd() * 0.5, color })
  }
  return items
}

function Tree({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.7, 6]} />
        <meshStandardMaterial color="#b8805c" flatShading />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <coneGeometry args={[0.7, 1.1, 6]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <coneGeometry args={[0.5, 0.9, 6]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  )
}

function Bush({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.45, 7, 6]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0.35, 0.28, 0.15]} castShadow>
        <sphereGeometry args={[0.32, 7, 6]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  )
}

function Flower({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 4]} />
        <meshStandardMaterial color="#6cc58d" />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.58, 0.14]}>
        <sphereGeometry args={[0.07, 6, 6]} />
        <meshStandardMaterial color="#ffd166" />
      </mesh>
    </group>
  )
}

function Rock({ color }: { color: string }) {
  return (
    <mesh position={[0, 0.18, 0]} castShadow>
      <dodecahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  )
}

function Mushroom({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.4, 6]} />
        <meshStandardMaterial color="#fff6e9" />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <sphereGeometry args={[0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[
        [0.1, 0.6, 0.15],
        [-0.14, 0.58, -0.08],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  )
}

export function Decor() {
  const items = useMemo(buildDecor, [])
  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={it.pos} rotation={[0, it.rot, 0]} scale={it.scale}>
          {it.kind === 'tree' && <Tree color={it.color} />}
          {it.kind === 'bush' && <Bush color={it.color} />}
          {it.kind === 'flower' && <Flower color={it.color} />}
          {it.kind === 'rock' && <Rock color={it.color} />}
          {it.kind === 'mushroom' && <Mushroom color={it.color} />}
        </group>
      ))}
    </group>
  )
}

interface CloudDef {
  pos: [number, number, number]
  scale: number
  speed: number
  parts: [number, number, number, number][]
}

function buildClouds(): CloudDef[] {
  const rnd = seededRandom(1010)
  const { center, rx, rz } = layout.island
  const n = isMobile ? 5 : 9
  const clouds: CloudDef[] = []
  for (let i = 0; i < n; i++) {
    const parts: [number, number, number, number][] = []
    const count = 3 + Math.floor(rnd() * 3)
    for (let j = 0; j < count; j++) {
      parts.push([(j - count / 2) * 0.9 + rnd() * 0.4, rnd() * 0.3, (rnd() - 0.5) * 0.6, 0.55 + rnd() * 0.45])
    }
    clouds.push({
      pos: [center.x + (rnd() - 0.5) * (rx * 2 + 16), 5.5 + rnd() * 4, center.z + (rnd() - 0.5) * (rz * 2 + 10) - 4],
      scale: 0.8 + rnd() * 0.8,
      speed: 0.25 + rnd() * 0.35,
      parts,
    })
  }
  return clouds
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
          scale={c.scale}
        >
          {c.parts.map((p, j) => (
            <mesh key={j} position={[p[0], p[1], p[2]]}>
              <sphereGeometry args={[p[3], 10, 8]} />
              <meshStandardMaterial color="#ffffff" flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

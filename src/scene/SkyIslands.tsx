import { useMemo } from 'react'
import * as THREE from 'three'
import { FloatingIsland } from './Island'
import { Batches, Instances, Windmill } from './Vignettes'
import { skyIslands, type SkyIsland } from './landmarks'
import { layout, seededRandom } from './path'
import { BatchSet, BLOSSOM, FLOWERS, natureUrl } from './envAssets'

const TREES = ['tree_default', 'tree_oak', 'tree_fat', 'tree_detailed', 'tree_pineRoundA', 'tree_cone']

/** Rải cây, bụi, hoa lên mặt đảo vệ tinh (toạ độ thế giới), chừa chỗ cho điểm nhấn ở giữa. */
function scatter(island: SkyIsland, b: BatchSet) {
  const rnd = seededRandom(island.seed * 97)
  const { center: c, rx, rz } = island
  const keep = island.feature === 'grove' ? 0 : island.feature === 'blossom' ? 0.9 : island.feature === 'windmill' ? 2.4 : 1.9
  const taken: [number, number][] = []
  const count = Math.round(rx * rz * 1.1)
  for (let i = 0, tries = 0; i < count && tries < 400; tries++) {
    const a = rnd() * Math.PI * 2
    const r = Math.sqrt(rnd())
    const x = Math.cos(a) * r * (rx - 0.9)
    const z = Math.sin(a) * r * (rz - 0.9)
    if (Math.hypot(x, z) < keep) continue
    if (taken.some(([tx, tz]) => (tx - x) ** 2 + (tz - z) ** 2 < 0.7)) continue
    taken.push([x, z])
    i++
    const k = rnd()
    const p = { pos: [c.x + x, c.y, c.z + z] as [number, number, number], rot: rnd() * Math.PI * 2, scale: 0.8 + rnd() * 0.4 }
    if (k < 0.3) {
      const blossom = island.feature === 'blossom' || rnd() < 0.25
      b.add(natureUrl(TREES[Math.floor(rnd() * TREES.length)]), 2.1, p, blossom ? BLOSSOM : undefined, blossom ? 'blossom' : 'base')
    } else if (k < 0.45) b.add(natureUrl('plant_bushLarge'), 0.85, p)
    else if (k < 0.85) b.add(natureUrl(FLOWERS[Math.floor(rnd() * FLOWERS.length)]), 0.75, p)
    else b.add(natureUrl('mushroom_redGroup'), 0.5, p)
  }
  const at = (x: number, z: number, rot = 0) => ({ pos: [c.x + x, c.y, c.z + z] as [number, number, number], rot, scale: 1 })
  if (island.feature === 'blossom') {
    b.add(natureUrl('tree_oak'), 3, at(0, 0, 0.4), BLOSSOM, 'blossom')
  } else if (island.feature === 'camp') {
    b.add(natureUrl('tent_detailedOpen'), 1.7, at(0, -0.3))
    b.add(natureUrl('campfire_stones'), 0.8, at(0.3, 1.1))
    b.add(natureUrl('log_large'), 1.0, at(-0.8, 1.2, 1.2))
  }
}

/** Cầu treo bằng ván gỗ, võng xuống ở giữa, có dây hai bên. */
function HangingBridge({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const { planks, ropes, posts } = useMemo(() => {
    const len = from.distanceTo(to)
    const n = Math.round(len / 0.34)
    const dir = to.clone().sub(from)
    const yaw = Math.atan2(dir.x, dir.z)
    const sag = 0.55
    const pointAt = (u: number, lift = 0) => from.clone().lerp(to, u).setY(THREE.MathUtils.lerp(from.y, to.y, u) - sag * 4 * u * (1 - u) * (1 - lift * 0.4) + lift)
    const planks = Array.from({ length: n }, (_, i) => ({ pos: pointAt((i + 0.5) / n), rot: yaw }))
    const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(0.55)
    const ropes = [-1, 1].map((s) => {
      const pts = Array.from({ length: 13 }, (_, i) => pointAt(i / 12, 0.65).addScaledVector(side, s))
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 4)
    })
    const posts = [from, to].flatMap((p) => [-1, 1].map((s) => p.clone().addScaledVector(side, s)))
    return { planks, ropes, posts }
  }, [from, to])
  return (
    <group>
      <Instances items={planks.map((p) => ({ pos: p.pos, rotY: p.rot }))}>
        <boxGeometry args={[1.0, 0.06, 0.24]} />
        <meshStandardMaterial color="#d9a07c" flatShading />
      </Instances>
      {ropes.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#a8735a" />
        </mesh>
      ))}
      {posts.map((p, i) => (
        <mesh key={i} position={[p.x, p.y + 0.4, p.z]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 0.85, 6]} />
          <meshStandardMaterial color="#a8735a" flatShading />
        </mesh>
      ))}
    </group>
  )
}

/** Các đảo nhỏ lơ lửng quanh đảo chính; đảo có cối xay gió nối với đảo chính bằng cầu treo. */
export function SkyIslands() {
  const batches = useMemo(() => {
    const b = new BatchSet()
    skyIslands.forEach((s) => scatter(s, b))
    return b.list
  }, [])
  const mill = skyIslands.find((s) => s.feature === 'windmill')
  const bridge = useMemo(() => {
    if (!mill) return null
    const { center, rx } = layout.island
    const from = new THREE.Vector3(center.x + rx - 0.7, 0.04, mill.center.z)
    // Điểm trên mép đảo chính theo đúng z của cầu.
    const k = (mill.center.z - center.z) / layout.island.rz
    from.x = center.x + rx * Math.sqrt(Math.max(0, 1 - k * k)) - 0.7
    const to = new THREE.Vector3(mill.center.x - mill.rx + 0.7, mill.center.y + 0.04, mill.center.z)
    return { from, to }
  }, [mill])
  return (
    <group>
      {skyIslands.map((s) => (
        <group key={s.seed} position={s.center}>
          <FloatingIsland rx={s.rx} rz={s.rz} depth={0.55} seed={s.seed} rocks={12} shadows={false} />
        </group>
      ))}
      <Batches batches={batches} shadows={false} />
      {mill && <Windmill position={[mill.center.x, mill.center.y, mill.center.z]} rotY={-0.5} scale={1.25} />}
      {bridge && <HangingBridge from={bridge.from} to={bridge.to} />}
    </group>
  )
}

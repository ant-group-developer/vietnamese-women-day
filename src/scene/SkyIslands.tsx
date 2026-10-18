import { useEffect, useMemo } from 'react'
import { useJourney } from '../store/useJourney'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FloatingIsland } from './Island'
import { Batches, Instances, Windmill } from './Vignettes'
import { FEATURE_OUT, islandFrame, islandHomes, penPoint, skyIslands, ZOO_PENS, type Pen, type SkyIsland } from './landmarks'
import { seededRandom } from './path'
import { BatchSet, BLOSSOM, FLOWERS, holidayUrl, natureUrl, PALETTE } from './envAssets'
import { bridgePoint, bridges, bridgeTangent, onWalkway, type Bridge } from './route'
import { setLabelTarget } from './labels'

/** Nửa bề rộng mặt cầu, bằng mặt đường. */
const BRIDGE_HALF_WIDTH = 0.78

/** Cây rải ngẫu nhiên quanh mép đảo, hợp với chủ đề từng đảo. */
const SCATTER_TREES: Record<SkyIsland['feature'], string[]> = {
  windmill: ['tree_default', 'tree_oak', 'tree_fat', 'tree_detailed'],
  tropical: ['tree_palmShort', 'tree_palm'],
  blossom: ['tree_default', 'tree_oak', 'tree_fat'],
  zooSavanna: ['tree_fat', 'tree_palmShort'],
  zooArctic: ['tree_cone', 'tree_pineRoundA'],
}

/** Màu đá phủ tuyết cho sở thú Bắc Cực. */
const SNOW_STONE: Record<string, string> = { ...PALETTE, stone: '#f4f8ff', stoneDark: '#dbe6f3' }

/** Các chuồng sở thú: hàng rào gỗ vòng elip quanh khu thú, biển tên ở chuồng lớn, ít đồ trang trí cho khỏi che thú. */
function zooPens(island: SkyIsland, b: BatchSet) {
  const { yaw } = islandFrame(island)
  ;(ZOO_PENS[island.feature] ?? []).forEach((pen, k) => {
    const at = (x: number, z: number, rot = 0) => {
      const p = penPoint(island, pen, x, z)
      return { pos: [p.x, p.y, p.z] as [number, number, number], rot: rot + yaw, scale: 1 }
    }
    const n = Math.round((Math.PI * (pen.rx + pen.rz)) / 0.9)
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * Math.PI * 2
      const tx = -pen.rx * Math.sin(a)
      const tz = pen.rz * Math.cos(a)
      b.add(natureUrl('fence_simple'), 0.95, at(Math.cos(a) * pen.rx, Math.sin(a) * pen.rz, Math.atan2(-tz, tx)))
    }
    if (k > 0) return
    b.add(natureUrl('sign'), 1.0, at(pen.rx + 0.6, pen.rz * 0.6, -0.4))
    if (island.feature === 'zooSavanna') {
      b.add(natureUrl('tree_fat'), 2.6, at(-2.3, -1.0, 0.3))
      b.add(natureUrl('stone_largeA'), 1.0, at(2.4, -1.0, 0.8))
    } else {
      b.add(natureUrl('stone_largeA'), 1.1, at(-2.5, -0.9, 0.5), SNOW_STONE, 'snow')
      b.add(natureUrl('stone_tallA'), 1.0, at(2.6, -1.1, 1.2), SNOW_STONE, 'snow')
    }
  })
}

/**
 * Điểm nhấn riêng của từng đảo, đặt ở nửa đảo phía xa camera (toạ độ cục bộ z âm, lệch FEATURE_OUT so với đường).
 * Cối xay gió vẽ riêng bằng <Windmill>.
 */
function feature(island: SkyIsland, b: BatchSet) {
  const { yaw, world } = islandFrame(island)
  const at = (x: number, z: number, rot = 0) => {
    const p = world(x, z - FEATURE_OUT)
    return { pos: [p.x, island.center.y, p.z] as [number, number, number], rot: rot + yaw, scale: 1 }
  }
  switch (island.feature) {
    case 'tropical':
      // Bãi cát với hàng dừa và chiếc xuồng (bãi cát vẽ riêng bằng <GroundPatches>).
      b.add(natureUrl('tree_palmTall'), 4.0, at(-1.2, -0.6, 0.4))
      b.add(natureUrl('tree_palmBend'), 3.2, at(1.0, -0.9, 2.2))
      b.add(natureUrl('canoe'), 1.8, at(2.4, 0.6, 0.35))
      break
    case 'blossom':
      // Cây anh đào lớn, ghế băng ngắm hoa và chậu hoa.
      b.add(natureUrl('tree_oak'), 3.4, at(0, -0.6, 0.4), BLOSSOM, 'blossom')
      b.add(holidayUrl('bench'), 1.5, at(-2.0, 0.4, 0.3))
      b.add(natureUrl('pot_small'), 0.6, at(2.0, 0.5))
      b.add(natureUrl('flower_redA'), 0.75, at(2.5, 0.1))
      b.add(natureUrl('flower_purpleA'), 0.75, at(1.6, 0.8))
      break
    case 'zooSavanna':
    case 'zooArctic':
      zooPens(island, b)
      break
    case 'windmill':
      break
  }
}

/**
 * Rải thưa cây, bụi, hoa quanh đảo: cây chỉ ở sát viền và ít thôi, hoa bụi nhỏ ở trong;
 * tránh đường, điểm nhấn và bãi thú để không che thú và nhân vật.
 */
function scatter(island: SkyIsland, b: BatchSet) {
  const rnd = seededRandom(island.seed * 97)
  const { center: c, rx, rz } = island
  const trees = SCATTER_TREES[island.feature]
  const { world } = islandFrame(island)
  const featureCenter = world(0, -FEATURE_OUT)
  const homes = islandHomes(island)
  const taken: [number, number][] = []
  const count = Math.round(rx * rz * 0.26)
  let treeCount = 0
  const probe = new THREE.Vector3()
  for (let i = 0, tries = 0; i < count && tries < 500; tries++) {
    const a = rnd() * Math.PI * 2
    const r = 0.35 + rnd() * 0.57
    const x = Math.cos(a) * r * rx
    const z = Math.sin(a) * r * rz
    probe.set(c.x + x, c.y + 0.08, c.z + z)
    if (onWalkway(probe, 0.2)) continue
    if (Math.hypot(probe.x - featureCenter.x, probe.z - featureCenter.z) < (ZOO_PENS[island.feature] ? 4.4 : 3.4)) continue
    if ((ZOO_PENS[island.feature] ?? []).some((pen) => penPoint(island, pen).setY(probe.y).distanceTo(probe) < Math.max(pen.rx, pen.rz) + 0.8)) continue
    if (homes.some((h) => Math.hypot(probe.x - h.center.x, probe.z - h.center.z) < h.radius + 1)) continue
    if (taken.some(([tx, tz]) => (tx - x) ** 2 + (tz - z) ** 2 < 1.6)) continue
    const k = rnd()
    // Cây to chỉ đặt sát viền đảo, mỗi đảo tối đa 3 cây.
    const tree = k < 0.3 && r > 0.72 && treeCount < 3
    if (k < 0.3 && !tree) continue
    taken.push([x, z])
    i++
    const p = { pos: [c.x + x, c.y, c.z + z] as [number, number, number], rot: rnd() * Math.PI * 2, scale: 0.8 + rnd() * 0.4 }
    if (tree) {
      treeCount++
      const blossom = island.feature === 'blossom' || (island.feature === 'windmill' && rnd() < 0.25)
      b.add(natureUrl(trees[Math.floor(rnd() * trees.length)]), 1.9, p, blossom ? BLOSSOM : undefined, blossom ? 'blossom' : 'base')
    } else if (k < 0.55) b.add(natureUrl('plant_bushLarge'), 0.85, p)
    else if (k < 0.88) b.add(natureUrl(FLOWERS[Math.floor(rnd() * FLOWERS.length)]), 0.75, p)
    else b.add(natureUrl(island.feature === 'zooArctic' ? 'stone_smallB' : 'mushroom_redGroup'), 0.5, p)
  }
}

/** Mảng đất phẳng dưới điểm nhấn: bãi cát ở đảo nhiệt đới. */
const PATCHES: Partial<Record<SkyIsland['feature'], { color: string; w: number; d: number; dz: number }>> = {
  tropical: { color: '#ffe4b8', w: 2.8, d: 1.6, dz: -0.4 },
}

/** Nền trong chuồng sở thú: cát vàng (thảo nguyên), tuyết (Bắc Cực), hồ nước nếu chuồng có thú bơi. */
const PEN_GROUND: Partial<Record<SkyIsland['feature'], string>> = { zooSavanna: '#f3d9a4', zooArctic: '#f4f8ff' }

function PenGrounds() {
  return (
    <>
      {skyIslands.flatMap((s) =>
        (ZOO_PENS[s.feature] ?? []).map((pen: Pen, k) => {
          const p = penPoint(s, pen)
          return (
            <group key={`${s.key}-${k}`} position={[p.x, s.center.y + 0.012, p.z]} rotation={[0, islandFrame(s).yaw, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[pen.rx + 0.2, pen.rz + 0.2, 1]} receiveShadow>
                <circleGeometry args={[1, 40]} />
                <meshStandardMaterial color={PEN_GROUND[s.feature]} />
              </mesh>
              {pen.swim && (
                <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[pen.rx - 0.3, pen.rz - 0.3, 1]}>
                  <circleGeometry args={[1, 32]} />
                  <meshStandardMaterial color="#8fd3ff" roughness={0.3} />
                </mesh>
              )}
            </group>
          )
        }),
      )}
    </>
  )
}

function GroundPatches() {
  return (
    <>
      {skyIslands.map((s) => {
        const patch = PATCHES[s.feature]
        if (!patch) return null
        const { yaw, world } = islandFrame(s)
        const p = world(0, -FEATURE_OUT + patch.dz)
        return (
          <group key={s.key} position={[p.x, s.center.y + 0.012, p.z]} rotation={[0, yaw, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[patch.w, patch.d, 1]} receiveShadow>
              <circleGeometry args={[1, 40]} />
              <meshStandardMaterial color={patch.color} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

/** Mọi cầu treo (ván gỗ rộng bằng mặt đường, chạy theo cung vòng, võng xuống giữa, dây tay vịn hai bên), gộp chung để ít lượt vẽ. */
function HangingBridges({ list }: { list: Bridge[] }) {
  const { planks, ropes, posts } = useMemo(() => {
    const planks: { pos: THREE.Vector3; rotY: number }[] = []
    const posts: { pos: THREE.Vector3 }[] = []
    const ropeGeos: THREE.BufferGeometry[] = []
    const sideAt = (b: Bridge, u: number) => {
      const t = bridgeTangent(b, u)
      return new THREE.Vector3(t.z, 0, -t.x).multiplyScalar(BRIDGE_HALF_WIDTH + 0.12)
    }
    for (const bridge of list) {
      const n = Math.round((bridge.s1 - bridge.s0) / 0.34)
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n
        const t = bridgeTangent(bridge, u)
        planks.push({ pos: bridgePoint(bridge, u), rotY: Math.atan2(t.x, t.z) })
      }
      for (const sgn of [-1, 1]) {
        const pts = Array.from({ length: 17 }, (_, i) => bridgePoint(bridge, i / 16, 0.65).addScaledVector(sideAt(bridge, i / 16), sgn))
        ropeGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.025, 4))
        for (const u of [0, 1]) {
          const p = bridgePoint(bridge, u)
          posts.push({ pos: p.addScaledVector(sideAt(bridge, u), sgn).setY(p.y + 0.4) })
        }
      }
    }
    return { planks, posts, ropes: mergeGeometries(ropeGeos) }
  }, [list])
  return (
    <group>
      <Instances items={planks}>
        <boxGeometry args={[BRIDGE_HALF_WIDTH * 2, 0.06, 0.24]} />
        <meshStandardMaterial color="#d9a07c" flatShading />
      </Instances>
      <mesh geometry={ropes}>
        <meshStandardMaterial color="#a8735a" />
      </mesh>
      <Instances items={posts}>
        <cylinderGeometry args={[0.06, 0.07, 0.85, 6]} />
        <meshStandardMaterial color="#a8735a" flatShading />
      </Instances>
    </group>
  )
}

/** Neo nhãn tên đảo phía trên tâm mỗi đảo (chữ do LabelLayer vẽ). */
function IslandLabels() {
  useEffect(() => {
    skyIslands.forEach((s, i) => setLabelTarget(`island-${i}`, s.center.clone().add(new THREE.Vector3(0, 3.2, 0))))
  }, [])
  return null
}

/** Các đảo phụ nằm trên vòng hành trình, nối nhau bằng cầu treo; mỗi đảo một chủ đề và một nhóm thú. */
export function SkyIslands() {
  const batches = useMemo(() => {
    const b = new BatchSet()
    skyIslands.forEach((s) => {
      feature(s, b)
      scatter(s, b)
    })
    return b.list
  }, [])
  const mill = skyIslands.find((s) => s.feature === 'windmill')
  const millAt = mill ? islandFrame(mill) : null
  const millPos = millAt ? millAt.world(0, -FEATURE_OUT - 0.3) : null
  return (
    <group>
      {skyIslands.map((s, i) => (
        <group
          key={s.seed}
          position={s.center}
          onClick={(e) => {
            e.stopPropagation()
            useJourney.getState().goToIsland(i)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto'
          }}
        >
          <FloatingIsland rx={s.rx} rz={s.rz} depth={0.55} seed={s.seed} rocks={12} shadows={false} />
        </group>
      ))}
      <GroundPatches />
      <PenGrounds />
      <Batches batches={batches} shadows={false} />
      {mill && millAt && millPos && <Windmill position={[millPos.x, mill.center.y, millPos.z]} rotY={millAt.yaw - 0.5} scale={1.25} />}
      <HangingBridges list={bridges} />
      <IslandLabels />
    </group>
  )
}

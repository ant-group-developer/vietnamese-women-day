import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FloatingIsland } from './Island'
import { Batches, Instances, Windmill } from './Vignettes'
import { skyIslands, type SkyIsland } from './landmarks'
import { seededRandom } from './path'
import { BatchSet, BLOSSOM, FLOWERS, holidayUrl, natureUrl } from './envAssets'
import { bridgePoint, bridges, onWalkway, photoSpots, RING, type Bridge, type PhotoSpot } from './route'
import { setLabelTarget } from './labels'
import { useJourney } from '../store/useJourney'

/** Khung chụp ảnh đứng lùi về phía tâm đảo so với chỗ nhân vật đứng. */
const FRAME_BACK = 1.3
/** Nửa bề rộng mặt cầu, bằng mặt đường. */
const BRIDGE_HALF_WIDTH = 0.78

/** Cây rải ngẫu nhiên quanh mép đảo, hợp với chủ đề từng đảo. */
const SCATTER_TREES: Record<SkyIsland['feature'], string[]> = {
  windmill: ['tree_default', 'tree_oak', 'tree_fat', 'tree_detailed'],
  ruins: ['tree_cone', 'tree_pineRoundA', 'tree_detailed'],
  tropical: ['tree_palmShort', 'tree_palm'],
  farm: ['tree_fat', 'tree_default'],
  blossom: ['tree_default', 'tree_oak', 'tree_fat'],
}

/**
 * Điểm nhấn riêng của từng đảo, đặt trong vòng đường (toạ độ cục bộ: +z là phía trước/camera,
 * chừa trống phía trước cho góc chụp ảnh). Cối xay gió vẽ riêng bằng <Windmill>.
 */
function feature(island: SkyIsland, b: BatchSet) {
  const { center: c } = island
  const at = (x: number, z: number, rot = 0) => ({ pos: [c.x + x, c.y, c.z + z] as [number, number, number], rot, scale: 1 })
  switch (island.feature) {
    case 'ruins':
      // Phế tích đá: tháp đá giữa, cột đá (có cột đổ) xếp nửa vòng phía sau, tượng đầu đá và vòng đá hai bên.
      b.add(natureUrl('statue_obelisk'), 3.6, at(0, -0.8))
      b.add(natureUrl('statue_column'), 1.8, at(-1.8, -0.3, 0.3))
      b.add(natureUrl('statue_column'), 1.8, at(-1.0, -1.6, 0.8))
      b.add(natureUrl('statue_columnDamaged'), 1.3, at(1.8, -0.3, 1.2))
      b.add(natureUrl('statue_columnDamaged'), 1.1, at(1.1, -1.6, 2.4))
      b.add(natureUrl('statue_head'), 1.1, at(2.0, 0.8, -0.5))
      b.add(natureUrl('statue_ring'), 1.3, at(-2.1, 0.7, 0.5))
      break
    case 'tropical':
      // Bãi cát với hàng dừa và chiếc xuồng (bãi cát vẽ riêng bằng <SandPatch>).
      b.add(natureUrl('tree_palmTall'), 4.2, at(-0.3, -0.7, 0.4))
      b.add(natureUrl('tree_palmBend'), 3.4, at(1.6, -0.4, 2.2))
      b.add(natureUrl('tree_palmShort'), 2.3, at(-1.9, 0.1, 1.1))
      b.add(natureUrl('canoe'), 1.9, at(1.5, 0.9, 0.35))
      b.add(natureUrl('stone_smallA'), 0.5, at(-1.2, 1.1))
      break
    case 'farm':
      // Ruộng rau: luống ngô phía sau, bí ngô và dưa ở giữa, cà rốt và lúa mì phía trước.
      ;[-1.8, -0.6, 0.6, 1.8].forEach((x, i) => {
        b.add(natureUrl('crops_cornStageD'), 2.0, at(x, -1.6, 0))
        b.add(natureUrl(i % 2 ? 'crop_melon' : 'crop_pumpkin'), 1.05, at(x, -0.5, i))
        b.add(natureUrl(i % 2 ? 'crops_wheatStageB' : 'crop_carrot'), 0.95, at(x, 0.5, 0))
      })
      break
    case 'blossom':
      // Cây anh đào lớn, ghế băng ngắm hoa và chậu hoa.
      b.add(natureUrl('tree_oak'), 3.4, at(0, -0.6, 0.4), BLOSSOM, 'blossom')
      b.add(holidayUrl('bench'), 1.5, at(-1.5, 0.5, 0.3))
      b.add(natureUrl('pot_small'), 0.6, at(1.5, 0.6))
      b.add(natureUrl('flower_redA'), 0.75, at(1.9, 0.2))
      b.add(natureUrl('flower_purpleA'), 0.75, at(1.1, 0.9))
      break
    case 'windmill':
      break
  }
}

/** Rải cây, bụi, hoa ở dải đất giữa vòng đường và mép đảo, tránh lối đi. */
function scatter(island: SkyIsland, b: BatchSet) {
  const rnd = seededRandom(island.seed * 97)
  const { center: c, rx, rz } = island
  const trees = SCATTER_TREES[island.feature]
  const taken: [number, number][] = []
  const count = Math.round(rx * rz * 0.7)
  const probe = new THREE.Vector3()
  for (let i = 0, tries = 0; i < count && tries < 500; tries++) {
    const a = rnd() * Math.PI * 2
    const r = RING + 0.1 + rnd() * (0.92 - RING - 0.1)
    const x = Math.cos(a) * r * rx
    const z = Math.sin(a) * r * rz
    probe.set(c.x + x, c.y + 0.08, c.z + z)
    if (onWalkway(probe, 0.1)) continue
    // Khoảng trống phía trước góc chụp ảnh (phía camera) để không có gì che nhân vật.
    if (Math.abs(x) < 2.2 && z > 0) continue
    if (taken.some(([tx, tz]) => (tx - x) ** 2 + (tz - z) ** 2 < 0.8)) continue
    taken.push([x, z])
    i++
    const k = rnd()
    const p = { pos: [c.x + x, c.y, c.z + z] as [number, number, number], rot: rnd() * Math.PI * 2, scale: 0.8 + rnd() * 0.4 }
    if (k < 0.3) {
      const blossom = island.feature === 'blossom' || (island.feature === 'windmill' && rnd() < 0.25)
      b.add(natureUrl(trees[Math.floor(rnd() * trees.length)]), 2.1, p, blossom ? BLOSSOM : undefined, blossom ? 'blossom' : 'base')
    } else if (k < 0.45) b.add(natureUrl('plant_bushLarge'), 0.85, p)
    else if (k < 0.85) b.add(natureUrl(FLOWERS[Math.floor(rnd() * FLOWERS.length)]), 0.75, p)
    else b.add(natureUrl(island.feature === 'ruins' ? 'stone_smallB' : 'mushroom_redGroup'), 0.5, p)
  }
}

/** Mảng đất phẳng dưới điểm nhấn (bãi cát ở đảo nhiệt đới, đất ruộng ở nông trại). */
function GroundPatches() {
  const patches = skyIslands
    .filter((s) => s.feature === 'tropical' || s.feature === 'farm')
    .map((s) => ({ s, color: s.feature === 'tropical' ? '#ffe4b8' : '#e8b9a0', w: s.feature === 'tropical' ? 2.6 : 2.5, d: s.feature === 'tropical' ? 1.9 : 1.6, z: s.feature === 'tropical' ? -0.2 : -0.5 }))
  return (
    <>
      {patches.map(({ s, color, w, d, z }) => (
        <mesh key={s.key} position={[s.center.x, s.center.y + 0.012, s.center.z + z]} rotation={[-Math.PI / 2, 0, 0]} scale={[w, d, 1]} receiveShadow>
          <circleGeometry args={[1, 40]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </>
  )
}

/** Mọi cầu treo (ván gỗ rộng bằng mặt đường, võng xuống giữa, dây tay vịn hai bên), gộp chung để mỗi loại chi tiết chỉ tốn một lượt vẽ. */
function HangingBridges({ list }: { list: Bridge[] }) {
  const { planks, ropes, posts } = useMemo(() => {
    const planks: { pos: THREE.Vector3; rotY: number }[] = []
    const posts: { pos: THREE.Vector3 }[] = []
    const ropeGeos: THREE.BufferGeometry[] = []
    for (const bridge of list) {
      const { from, to } = bridge
      const n = Math.round(from.distanceTo(to) / 0.34)
      const dir = to.clone().sub(from)
      const yaw = Math.atan2(dir.x, dir.z)
      for (let i = 0; i < n; i++) planks.push({ pos: bridgePoint(bridge, (i + 0.5) / n), rotY: yaw })
      const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(BRIDGE_HALF_WIDTH + 0.12)
      for (const sgn of [-1, 1]) {
        const pts = Array.from({ length: 13 }, (_, i) => bridgePoint(bridge, i / 12, 0.65).addScaledVector(side, sgn))
        ropeGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 4))
        for (const p of [from, to]) posts.push({ pos: p.clone().addScaledVector(side, sgn).setY(p.y + 0.4) })
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

/** Khung tròn kết hoa của mọi góc chụp ảnh, gộp chung theo loại chi tiết. */
function PhotoFrames() {
  const { frames, flowers, legs } = useMemo(() => {
    const frames: { pos: THREE.Vector3 }[] = []
    const flowers: { pos: THREE.Vector3; color: string }[] = []
    const legs: { pos: THREE.Vector3 }[] = []
    for (const { pos } of photoSpots) {
      const c = new THREE.Vector3(pos.x, pos.y - 0.08 + 1.35, pos.z - FRAME_BACK)
      frames.push({ pos: c })
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        flowers.push({ pos: c.clone().add(new THREE.Vector3(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.05)), color: i % 2 ? '#ffd166' : '#ff9fbf' })
      }
      for (const x of [-0.55, 0.55]) legs.push({ pos: c.clone().add(new THREE.Vector3(x, -1.0, 0)) })
    }
    return { frames, flowers, legs }
  }, [])
  return (
    <group>
      <Instances items={frames}>
        <torusGeometry args={[0.95, 0.09, 10, 40]} />
        <meshStandardMaterial color="#ff7aa8" />
      </Instances>
      <Instances items={flowers}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </Instances>
      <Instances items={legs}>
        <cylinderGeometry args={[0.05, 0.06, 0.7, 6]} />
        <meshStandardMaterial color="#a8735a" flatShading />
      </Instances>
    </group>
  )
}

/** Góc chụp ảnh: vòng sáng dưới chân và nhãn; bấm vào đảo để đi tới. */
function PhotoSpotMarker({ spot }: { spot: PhotoSpot }) {
  const goToSpot = useJourney((s) => s.goToSpot)
  const here = useJourney((s) => s.atSpot === spot.index)
  const ring = useRef<THREE.Mesh>(null)
  const { pos, island } = spot
  const framePos = useMemo(() => pos.clone().add(new THREE.Vector3(0, 0, -FRAME_BACK)), [pos])

  useEffect(() => {
    setLabelTarget(`spot-${spot.index}`, framePos.clone().add(new THREE.Vector3(0, 2.7, 0)))
  }, [spot.index, framePos])

  useFrame(({ clock }) => {
    if (!ring.current) return
    const k = (clock.elapsedTime * 0.8) % 1
    ring.current.scale.setScalar(1 + k * 0.5)
    ;(ring.current.material as THREE.MeshBasicMaterial).opacity = here ? 0 : 0.5 * (1 - k)
  })

  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        goToSpot(spot.index)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <mesh ref={ring} position={[pos.x, pos.y - 0.02, pos.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.7, 32]} />
        <meshBasicMaterial color="#ff7aa8" transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Vùng bấm vô hình phủ mặt đảo để bấm được từ xa. */}
      <mesh position={[island.center.x, island.center.y - 0.3, island.center.z]} scale={[island.rx, 1, island.rz]} visible={false}>
        <cylinderGeometry args={[1, 1, 0.6, 24]} />
      </mesh>
    </group>
  )
}

/** Các đảo nhỏ xếp vòng cung sau đảo chính, nối thành một vòng bằng cầu treo; mỗi đảo một chủ đề và một góc chụp ảnh. */
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
  return (
    <group>
      {skyIslands.map((s) => (
        <group key={s.seed} position={s.center}>
          <FloatingIsland rx={s.rx} rz={s.rz} depth={0.55} seed={s.seed} rocks={12} shadows={false} />
        </group>
      ))}
      <GroundPatches />
      <Batches batches={batches} shadows={false} />
      {mill && <Windmill position={[mill.center.x, mill.center.y, mill.center.z - 0.4]} rotY={-0.5} scale={1.25} />}
      <HangingBridges list={bridges} />
      <PhotoFrames />
      {photoSpots.map((p) => (
        <PhotoSpotMarker key={p.index} spot={p} />
      ))}
    </group>
  )
}

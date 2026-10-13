import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { Department } from '../data/departments'
import { nextStationIndex, stationStatus, useJourney } from '../store/useJourney'
import { layout } from './path'
import { shade } from './utils'
import { setLabelTarget } from './labels'
import { mergePieces, natureUrl, PALETTE, recolorTexture, townUrl, type PiecePlacement } from './envAssets'
import { InstancedModel, type Placement } from './Decor'

/** Nhà lắp từ bộ Kenney Fantasy Town Kit: nền 2x2 ô, tường 1 tầng, mái cao 4 góc. */
const HOUSE_SCALE = 0.9
const PIECE_NAMES = ['wall', 'wall-door', 'wall-window-shutters', 'wall-window-round', 'wall-window-small', 'roof-high-corner', 'chimney'] as const
const PIECE_URLS = PIECE_NAMES.map(townUrl)
PIECE_URLS.forEach((u) => useGLTF.preload(u))

// Mảnh tường nằm ở cạnh +X của ô; góc quay để đưa nó ra cạnh +Z, -X, -Z.
const FACE = { px: 0, pz: -Math.PI / 2, nx: Math.PI, nz: Math.PI / 2 }
// Mảnh mái góc có góc ngoài ở (-X, +Z) của ô.
const ROOF_ROT: Record<string, number> = { '-1,1': 0, '1,1': Math.PI / 2, '1,-1': Math.PI, '-1,-1': -Math.PI / 2 }

function buildHousePieces(): PiecePlacement[] {
  const p = (name: string, x: number, y: number, z: number, rotY: number): PiecePlacement => ({ url: townUrl(name), pos: [x, y, z], rotY })
  const pieces: PiecePlacement[] = [
    // Mặt trước (+Z)
    p('wall-window-shutters', -0.5, 0, 0.5, FACE.pz),
    p('wall-door', 0.5, 0, 0.5, FACE.pz),
    // Hai bên
    p('wall-window-round', -0.5, 0, 0.5, FACE.nx),
    p('wall', -0.5, 0, -0.5, FACE.nx),
    p('wall-window-round', 0.5, 0, 0.5, FACE.px),
    p('wall', 0.5, 0, -0.5, FACE.px),
    // Mặt sau
    p('wall-window-small', -0.5, 0, -0.5, FACE.nz),
    p('wall', 0.5, 0, -0.5, FACE.nz),
    p('chimney', 0.5, 0.95, -0.5, 0),
  ]
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pieces.push(p('roof-high-corner', sx * 0.5, 1, sz * 0.5, ROOF_ROT[`${sx},${sz}`]))
  return pieces
}
const HOUSE_PIECES = buildHousePieces()
const ROOF_FLOWER: Placement[] = [{ pos: [0, 0, 0], rot: 0.6, scale: 1 }]

function House({ color }: { color: string }) {
  const gltfs = useGLTF(PIECE_URLS)
  const geometry = useMemo(() => {
    const scenes = Object.fromEntries(gltfs.map((g, i) => [PIECE_URLS[i], g.scene]))
    return mergePieces(scenes, HOUSE_PIECES)
  }, [gltfs])
  const material = useMemo(() => {
    const base = (gltfs[0].scene.getObjectByProperty('isMesh', true) as THREE.Mesh).material as THREE.MeshStandardMaterial
    const m = base.clone()
    // Ô màu tường (tím nhạt) và ô màu mái trên colormap của Kenney, tô theo màu phòng ban.
    m.map = recolorTexture(base.map!, [
      { x: 64, y: 256, w: 64, h: 128, color: shade(color, 0.62) },
      { x: 0, y: 384, w: 128, h: 128, color },
    ])
    m.roughness = 0.85
    m.metalness = 0
    return m
  }, [gltfs, color])
  return <mesh geometry={geometry} material={material} scale={HOUSE_SCALE} castShadow receiveShadow />
}

interface Props {
  index: number
  dept: Department
}

export function Station({ index, dept }: Props) {
  const status = useJourney((s) => stationStatus(s.visited, index))
  const suggested = useJourney((s) => s.phase === 'journey' && nextStationIndex(s.visited) === index)
  const goTo = useJourney((s) => s.goTo)
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState(false)
  const popAt = useRef(-1)
  const prevStatus = useRef(status)

  if (prevStatus.current !== status) {
    if (status === 'visited') popAt.current = -2 // đánh dấu: lấy thời gian ở frame tới
    prevStatus.current = status
  }

  const { housePos } = layout.stations[index]

  useEffect(() => {
    setLabelTarget(`station-${index}`, housePos.clone().add(new THREE.Vector3(0, 3.3, 0)))
  }, [index, housePos])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!group.current) return
    if (popAt.current === -2) popAt.current = t
    let s = 1
    if (suggested) s = 1 + Math.sin(t * 3) * 0.035
    if (hover) s *= 1.06
    if (popAt.current >= 0) {
      const age = t - popAt.current
      if (age < 0.8) s *= 1 + Math.sin(age * Math.PI * 2.5) * Math.exp(-age * 3) * 0.35
    }
    group.current.scale.setScalar(s)
    if (ring.current) {
      const r = 1 + ((t * 0.8) % 1) * 0.6
      ring.current.scale.setScalar(r)
      const mat = ring.current.material as THREE.MeshBasicMaterial
      mat.opacity = suggested ? 0.55 * (1 - ((t * 0.8) % 1)) : 0
    }
  })

  return (
    <group position={housePos}>
      {/* Vòng sáng gợi ý trạm tiếp theo */}
      <mesh ref={ring} position={[0, 0.06, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.3, 40]} />
        <meshBasicMaterial color="#ff7aa8" transparent opacity={0} depthWrite={false} />
      </mesh>

      <group
        ref={group}
        onClick={(e) => {
          e.stopPropagation()
          goTo(index)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <House color={dept.color} />
        {/* Hoa trên mái khi đã thăm */}
        {status === 'visited' && (
          <group position={[0, 2.0, 0]}>
            <InstancedModel url={natureUrl('flower_redA')} size={0.75} palette={PALETTE} paletteKey="base" items={ROOF_FLOWER} />
          </group>
        )}
        {/* Bóng bay */}
        {(
          <Float speed={2.2} rotationIntensity={0.2} floatIntensity={0.8}>
            <group position={[0.9, 3.1, 0.2]}>
              <mesh castShadow>
                <sphereGeometry args={[0.32, 24, 18]} />
                <meshStandardMaterial color={shade(dept.color, 0.25)} />
              </mesh>
              <mesh position={[0, -0.6, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.7, 6]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            </group>
          </Float>
        )}
      </group>
    </group>
  )
}

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ISLAND_VIDEOS, useJourney } from '../store/useJourney'
import { islandFrame, islandScreenPoint, skyIslands, type SkyIsland } from './landmarks'
import { ISLAND_LABEL_FADE, setLabelTarget } from './labels'

const WOOD = '#d9a07c'
const WOOD_DARK = '#a8735a'
/** Kích thước mặt màn chiếu (rộng × cao) và độ cao mép dưới so với mặt đảo. */
const W = 2.4
const H = 1.4
const LIFT = 0.9

/** Màn chiếu ngoài trời trên đảo phụ: khung gỗ, mặt màn hai mặt với nút ▶ nhấp nháy; bấm vào để xem video của đảo. */
function Screen({ island, index }: { island: SkyIsland; index: number }) {
  const plays = useRef<THREE.Group[]>([])
  const pos = islandScreenPoint(island)
  const { yaw } = islandFrame(island)

  useFrame(({ clock }) => {
    const k = 1 + Math.sin(clock.elapsedTime * 3) * 0.08
    plays.current.forEach((g) => g.scale.setScalar(k))
  })

  return (
    <group
      position={pos}
      rotation={[0, yaw, 0]}
      onClick={(e) => {
        e.stopPropagation()
        useJourney.getState().tapIslandVideo(island.key, index)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      {/* Hai cột chân */}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * (W / 2 - 0.15), (LIFT + H) / 2, -0.06]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, LIFT + H, 6]} />
          <meshStandardMaterial color={WOOD_DARK} flatShading />
        </mesh>
      ))}
      {/* Khung và mặt màn */}
      <mesh position={[0, LIFT + H / 2, 0]} castShadow>
        <boxGeometry args={[W + 0.24, H + 0.24, 0.1]} />
        <meshStandardMaterial color={WOOD} flatShading />
      </mesh>
      {/* Mặt màn và nút ▶ ở cả hai mặt, nhìn từ phía nào cũng thấy */}
      {[1, -1].map((side) => (
        <group key={side} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
          <mesh position={[0, LIFT + H / 2, 0.052]}>
            <planeGeometry args={[W, H]} />
            <meshStandardMaterial color="#3b2a4a" emissive="#ff8fb8" emissiveIntensity={0.18} roughness={0.4} />
          </mesh>
          <group
            ref={(g) => {
              if (g) plays.current[side === 1 ? 0 : 1] = g
            }}
            position={[0, LIFT + H / 2, 0.06]}
          >
            <mesh>
              <circleGeometry args={[0.36, 32]} />
              <meshStandardMaterial color="#ff5c93" emissive="#ff5c93" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0.04, 0, 0.005]}>
              <circleGeometry args={[0.18, 3]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
            </mesh>
          </group>
        </group>
      ))}
      {/* Mái nhỏ che màn */}
      <mesh position={[0, LIFT + H + 0.22, 0.02]} castShadow>
        <boxGeometry args={[W + 0.5, 0.08, 0.4]} />
        <meshStandardMaterial color="#ff8fb8" flatShading />
      </mesh>
    </group>
  )
}

const islands = skyIslands.map((s, index) => ({ s, index })).filter(({ s }) => ISLAND_VIDEOS.some((v) => v.island === s.key))

/** Màn chiếu video trên những đảo phụ có cấu hình video (ISLAND_VIDEOS), kèm nhãn "Bấm để xem". */
export function IslandScreens() {
  useEffect(() => {
    islands.forEach(({ s }) => setLabelTarget(`island-video-${s.key}`, islandScreenPoint(s).add(new THREE.Vector3(0, LIFT + H + 0.7, 0)), 0, ISLAND_LABEL_FADE))
  }, [])
  return (
    <>
      {islands.map(({ s, index }) => (
        <Screen key={s.key} island={s} index={index} />
      ))}
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import confetti from 'canvas-confetti'
import { useJourney } from '../store/useJourney'
import { layout } from './path'
import { playSfx } from '../audio/sound'
import { setLabelTarget } from './labels'
import { GIFT_INDEX } from '../data/departments'

const BOX = '#ff6f91'
const BOX_DARK = '#e8537a'
const RIBBON = '#ffd166'
const LOCKED = '#d6d0d4'
const LOCKED_RIBBON = '#bdb5ba'

function burst() {
  const defaults = { spread: 70, ticks: 160, gravity: 0.9, scalar: 1.1, zIndex: 50 }
  confetti({ ...defaults, particleCount: 120, origin: { x: 0.5, y: 0.55 }, colors: ['#ff7aa8', '#ffd166', '#8ed6ff', '#c77dff', '#ffffff'] })
  setTimeout(() => confetti({ ...defaults, particleCount: 60, angle: 60, origin: { x: 0.2, y: 0.7 } }), 250)
  setTimeout(() => confetti({ ...defaults, particleCount: 60, angle: 120, origin: { x: 0.8, y: 0.7 } }), 400)
  setTimeout(
    () =>
      confetti({
        ...defaults,
        particleCount: 50,
        spread: 120,
        shapes: ['circle'],
        scalar: 1.6,
        colors: ['#ff7aa8', '#ff9fbf', '#ffb3c6'],
        origin: { x: 0.5, y: 0.5 },
      }),
    700,
  )
}

export function GiftBox() {
  const phase = useJourney((s) => s.phase)
  const allVisited = useJourney((s) => s.visited.every(Boolean))
  const openGift = useJourney((s) => s.openGift)
  const playVideo = useJourney((s) => s.playVideo)
  const box = useRef<THREE.Group>(null)
  const lid = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState(false)
  const openStart = useRef(-1)
  const { housePos } = layout.gift

  useEffect(() => {
    setLabelTarget(`station-${GIFT_INDEX}`, housePos.clone().add(new THREE.Vector3(0, 4.3, 0)))
  }, [housePos])

  const ready = phase === 'gift'
  const opening = phase === 'opening'
  const opened = phase === 'video' || phase === 'outro'
  const locked = !allVisited
  const color = locked ? LOCKED : BOX
  const ribbon = locked ? LOCKED_RIBBON : RIBBON

  useEffect(() => {
    if (!opening) return
    openStart.current = -2
    playSfx('gift')
    const c = setTimeout(burst, 350)
    const v = setTimeout(playVideo, 2400)
    return () => {
      clearTimeout(c)
      clearTimeout(v)
    }
  }, [opening, playVideo])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!box.current || !lid.current) return
    if (openStart.current === -2) openStart.current = t

    let s = 1
    let rotZ = 0
    let y = 0
    if (ready) {
      // Rung lắc theo nhịp: 1 giây rung, 1.2 giây nghỉ
      const cycle = t % 2.2
      if (cycle < 1) {
        rotZ = Math.sin(cycle * 50) * 0.08 * (1 - cycle)
        y = Math.abs(Math.sin(cycle * 25)) * 0.12
      }
      s = 1 + Math.sin(t * 3) * 0.03
    }
    if (hover && ready) s *= 1.05
    box.current.rotation.z = rotZ
    box.current.position.y = y
    box.current.scale.setScalar(s)

    if (opening || opened) {
      const age = openStart.current >= 0 ? t - openStart.current : 3
      const k = Math.min(age / 1.2, 1)
      const e = 1 - Math.pow(1 - k, 3)
      lid.current.position.y = 1.45 + e * 3.2 + Math.sin(t * 2) * 0.1
      lid.current.position.z = e * 1.2
      lid.current.rotation.x = e * 0.9
      lid.current.rotation.z = Math.sin(t * 1.5) * 0.15 * e
    } else {
      lid.current.position.set(0, 1.45, 0)
      lid.current.rotation.set(0, 0, 0)
    }

    if (ring.current) {
      const r = 1 + ((t * 0.7) % 1) * 0.7
      ring.current.scale.setScalar(r)
      const mat = ring.current.material as THREE.MeshBasicMaterial
      mat.opacity = ready ? 0.5 * (1 - ((t * 0.7) % 1)) : 0
    }
  })

  return (
    <group position={housePos}>
      <mesh ref={ring} position={[0, 0.06, 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.65, 48]} />
        <meshBasicMaterial color="#ffd166" transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Bục đặt quà */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[1.9, 2.1, 0.24, 24]} />
        <meshStandardMaterial color={locked ? '#e4dfe2' : '#ffd6e7'} flatShading />
      </mesh>

      <group
        ref={box}
        onClick={(e) => {
          e.stopPropagation()
          if (ready) openGift()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          if (ready) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          document.body.style.cursor = 'auto'
        }}
      >
        {/* Thân hộp */}
        <RoundedBox args={[2.2, 1.7, 2.2]} radius={0.12} smoothness={3} position={[0, 1.08, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={color} />
        </RoundedBox>
        <mesh position={[0, 1.08, 0]}>
          <boxGeometry args={[2.24, 1.72, 0.5]} />
          <meshStandardMaterial color={ribbon} />
        </mesh>
        <mesh position={[0, 1.08, 0]}>
          <boxGeometry args={[0.5, 1.72, 2.24]} />
          <meshStandardMaterial color={ribbon} />
        </mesh>

        {/* Nắp hộp */}
        <group ref={lid} position={[0, 1.45, 0]}>
          <RoundedBox args={[2.45, 0.5, 2.45]} radius={0.1} smoothness={3} position={[0, 0.5, 0]} castShadow>
            <meshStandardMaterial color={locked ? '#c9c2c6' : BOX_DARK} />
          </RoundedBox>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[2.5, 0.52, 0.5]} />
            <meshStandardMaterial color={ribbon} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.5, 0.52, 2.5]} />
            <meshStandardMaterial color={ribbon} />
          </mesh>
          {/* Nơ */}
          <group position={[0, 0.9, 0]}>
            {[0, Math.PI / 2].map((ry) => (
              <group key={ry} rotation={[0, ry, 0]}>
                {[-0.45, 0.45].map((x) => (
                  <mesh key={x} position={[x, 0.18, 0]} rotation={[0, 0, x > 0 ? 0.4 : -0.4]} scale={[1.2, 0.55, 0.5]} castShadow>
                    <sphereGeometry args={[0.42, 10, 10]} />
                    <meshStandardMaterial color={ribbon} />
                  </mesh>
                ))}
              </group>
            ))}
            <mesh position={[0, 0.2, 0]}>
              <sphereGeometry args={[0.22, 10, 10]} />
              <meshStandardMaterial color={locked ? '#aaa2a7' : '#ffb347'} />
            </mesh>
          </group>
        </group>

        {/* Hoa và sao bay lên khi mở */}
        {(opening || opened) && (
          <group position={[0, 1.6, 0]}>
            <Sparkles count={80} scale={[3.5, 4, 3.5]} size={12} speed={1.2} color="#ff7aa8" />
            <Sparkles count={50} scale={[3, 5, 3]} size={8} speed={0.8} color="#ffd166" />
          </group>
        )}
      </group>

      {ready && (
        <group position={[0, 2.4, 0]}>
          <Sparkles count={30} scale={[3.5, 3, 3.5]} size={6} speed={0.5} color="#ffffff" />
        </group>
      )}
    </group>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import confetti from 'canvas-confetti'
import { useJourney } from '../store/useJourney'
import { layout } from './path'
import { playSfx } from '../audio/sound'
import { setLabelTarget } from './labels'
import { GIFT_INDEX } from '../data/departments'
import { PRESENT_URL, recolorTexture } from './envAssets'

useGLTF.preload(PRESENT_URL)

/** Bề rộng hộp quà sau khi phóng to (model gốc rộng 0.44). */
const GIFT_SCALE = 5.2

const BOX = '#ff6f91'
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

/**
 * Hộp quà Kenney Holiday Kit (present-a-cube): thân + nắp tách rời (node "lid").
 * lidRef trỏ vào nhóm bọc ngoài nắp để GiftBox tự di chuyển nắp khi mở (toạ độ nắp tính theo đơn vị model, chưa nhân scale).
 */
export function Present({
  color,
  ribbon,
  lidRef,
  scale = GIFT_SCALE,
  y = 0.24,
}: {
  color: string
  ribbon: string
  lidRef: React.RefObject<THREE.Group | null>
  scale?: number
  y?: number
}) {
  const { scene } = useGLTF(PRESENT_URL)
  const { body, lidNode, lidPos, material } = useMemo(() => {
    const root = scene.clone(true)
    const lidNode = root.getObjectByName('lid')!
    const body = root
    body.remove(lidNode)
    const base = (lidNode as THREE.Mesh).material as THREE.MeshStandardMaterial
    const material = base.clone()
    // Ô trắng (thân hộp) và ô đỏ (ruy băng) trên colormap.
    material.map = recolorTexture(base.map!, [
      { x: 0, y: 256, w: 64, h: 128, color },
      { x: 192, y: 384, w: 64, h: 128, color: ribbon },
    ])
    material.roughness = 0.7
    material.metalness = 0
    for (const o of [body, lidNode])
      o.traverse((m) => {
        const mesh = m as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.material = material
        mesh.castShadow = true
        mesh.receiveShadow = true
      })
    // Nắp xoay quanh gốc của chính nó: dời vị trí gốc ra nhóm bọc ngoài.
    const lidPos = lidNode.position.clone()
    lidNode.position.set(0, 0, 0)
    return { body, lidNode, lidPos, material }
  }, [scene, color, ribbon])
  useEffect(() => () => material.dispose(), [material])

  return (
    <group position={[0, y, 0]} scale={scale}>
      <primitive object={body} />
      <group position={lidPos}>
        <group ref={lidRef}>
          <primitive object={lidNode} />
        </group>
      </group>
    </group>
  )
}

export function GiftBox() {
  const phase = useJourney((s) => s.phase)
  const allVisited = useJourney((s) => s.visited.every(Boolean))
  const tapGift = useJourney((s) => s.tapGift)
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
  // Bấm được suốt hành trình: còn khoá thì lắc + nhắc, đủ hoa thì nhân vật chạy tới mở.
  const clickable = phase === 'journey' || phase === 'gift'
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
    if (hover && clickable) s *= 1.05
    // Lắc lắc "chưa mở được đâu" khi bấm lúc còn khoá.
    const hintAge = (Date.now() - useJourney.getState().giftHintAt) / 1000
    if (hintAge < 0.6) rotZ = Math.sin(hintAge * 40) * 0.12 * (1 - hintAge / 0.6)
    box.current.rotation.z = rotZ
    box.current.position.y = y
    box.current.scale.setScalar(s)

    if (opening || opened) {
      const age = openStart.current >= 0 ? t - openStart.current : 3
      const k = Math.min(age / 1.2, 1)
      const e = 1 - Math.pow(1 - k, 3)
      lid.current.position.set(0, (e * 3.2 + Math.sin(t * 2) * 0.1) / GIFT_SCALE, (e * 1.2) / GIFT_SCALE)
      lid.current.rotation.x = e * 0.9
      lid.current.rotation.z = Math.sin(t * 1.5) * 0.15 * e
    } else {
      lid.current.position.set(0, 0, 0)
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

      <group
        onClick={(e) => {
          e.stopPropagation()
          if (!clickable) return
          if (locked) playSfx('pop')
          tapGift()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          if (clickable) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          document.body.style.cursor = 'auto'
        }}
      >
        {/* Bục đặt quà */}
        <mesh position={[0, 0.12, 0]} receiveShadow>
          <cylinderGeometry args={[1.9, 2.1, 0.24, 48]} />
          <meshStandardMaterial color={locked ? '#e4dfe2' : '#ffd6e7'} />
        </mesh>

        <group ref={box}>
          <Present color={color} ribbon={ribbon} lidRef={lid} />

          {/* Hoa và sao bay lên khi mở */}
          {(opening || opened) && (
            <group position={[0, 1.6, 0]}>
              <Sparkles count={80} scale={[3.5, 4, 3.5]} size={12} speed={1.2} color="#ff7aa8" />
              <Sparkles count={50} scale={[3, 5, 3]} size={8} speed={0.8} color="#ffd166" />
            </group>
          )}
        </group>
      </group>

      {ready && (
        <group position={[0, 2.4, 0]}>
          <Sparkles count={30} scale={[3.5, 3, 3.5]} size={6} speed={0.5} color="#ffffff" />
        </group>
      )}
    </group>
  )
}

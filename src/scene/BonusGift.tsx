import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import confetti from 'canvas-confetti'
import { useJourney } from '../store/useJourney'
import { bonusSide, layout } from './path'
import { playSfx } from '../audio/sound'
import { setLabelTarget } from './labels'
import { Present } from './GiftBox'

/** Hộp quà nhỏ hơn hộp quà cuối (model gốc rộng 0.44). */
const BONUS_SCALE = 2.6
const BOX = '#b8a4ff'
const RIBBON = '#ff7aa8'
/** Độ cao bắt đầu rơi và thời gian rơi (giây). */
const DROP_HEIGHT = 13
const DROP_TIME = 3.4
/** Điểm buộc dây bóng bay: nóc hộp. */
const TIE_Y = 1.25
const STRING_SLACK = 1.4

const BALLOONS = [
  { color: '#ff7aa8', x: 0, y: 3.9, z: 0 },
  { color: '#ffd166', x: -0.75, y: 3.4, z: 0.25 },
  { color: '#8ed6ff', x: 0.75, y: 3.45, z: 0.15 },
  { color: '#c77dff', x: -0.3, y: 3.2, z: -0.6 },
  { color: '#ff9f6b', x: 0.4, y: 3.15, z: 0.65 },
]
const BALLOON_R = 0.42

/** Toạ độ màn hình (0–1) của một điểm 3D, để bắn pháo giấy đúng chỗ hộp quà. */
const screen = new THREE.Vector3()

function burst(origin: { x: number; y: number }) {
  const colors = ['#ff7aa8', '#ffd166', '#8ed6ff', '#c77dff', '#ffffff']
  confetti({ particleCount: 90, spread: 80, ticks: 150, gravity: 0.9, scalar: 1, zIndex: 50, origin, colors })
  setTimeout(() => confetti({ particleCount: 40, spread: 120, ticks: 140, scalar: 1.4, shapes: ['circle'], zIndex: 50, origin, colors }), 300)
}

/**
 * Quà bất ngờ giữa hành trình: hộp quà treo chùm bóng bay rơi xuống cạnh nhân vật khi đủ số hoa.
 * Bấm vào thì bóng bay bay đi, nắp bật ra, pháo giấy nổ rồi phát video bất ngờ.
 */
export function BonusGift() {
  const stage = useJourney((s) => s.bonusStage)
  const index = useJourney((s) => s.bonusIndex)
  if (stage === 'none' || index < 0) return null
  return <BonusGiftAt key={index} pos={layout.stations[index].bonusPos} side={bonusSide(index)} />
}

function BonusGiftAt({ pos, side }: { pos: THREE.Vector3; side: 1 | -1 }) {
  const stage = useJourney((s) => s.bonusStage)
  const tapBonus = useJourney((s) => s.tapBonus)
  const playBonus = useJourney((s) => s.playBonus)
  const root = useRef<THREE.Group>(null)
  const box = useRef<THREE.Group>(null)
  const lid = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const balloonRefs = useRef<(THREE.Group | null)[]>([])
  const [hover, setHover] = useState(false)
  const camera = useThree((s) => s.camera)
  /** Mốc thời gian (clock) bắt đầu rơi / chạm đất / thả bóng bay; -1 = chưa, -2 = lấy ở frame kế tiếp. */
  const dropStart = useRef(-2)
  const landedAt = useRef(-1)
  const releaseStart = useRef(-1)
  const labelPos = useMemo(() => pos.clone(), [pos])
  /** Bàn tay chỉ vào hộp quà, đứng bên cạnh phía không có nhân vật. */
  const handPos = useMemo(() => pos.clone(), [pos])
  const released = stage === 'opening' || stage === 'opened'
  const clickable = stage === 'ready' || stage === 'opened'

  const { strings, balloonMats } = useMemo(() => {
    const strings = BALLOONS.map(() => {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
      return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#8a7f86', transparent: true }))
    })
    const balloonMats = BALLOONS.map(
      (b) => new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.25, metalness: 0.05, transparent: true }),
    )
    return { strings, balloonMats }
  }, [])
  useEffect(
    () => () => {
      strings.forEach((l) => {
        l.geometry.dispose()
        ;(l.material as THREE.Material).dispose()
      })
      balloonMats.forEach((m) => m.dispose())
    },
    [strings, balloonMats],
  )

  useEffect(() => {
    // Hướng dẫn mở quà luôn nằm trên nhãn phòng ban.
    setLabelTarget('bonus', labelPos, 1000)
    setLabelTarget('bonus-hand', handPos, 1000)
  }, [labelPos, handPos])

  useEffect(() => {
    if (released) releaseStart.current = -2
  }, [released])

  useEffect(() => {
    if (stage !== 'opening') return
    playSfx('gift')
    const c = setTimeout(() => {
      if (!root.current) return
      root.current.getWorldPosition(screen).project(camera)
      burst({ x: THREE.MathUtils.clamp((screen.x + 1) / 2, 0.1, 0.9), y: THREE.MathUtils.clamp((1 - screen.y) / 2, 0.2, 0.85) })
    }, 350)
    const v = setTimeout(playBonus, 2000)
    return () => {
      clearTimeout(c)
      clearTimeout(v)
    }
  }, [stage, playBonus, camera])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!root.current || !box.current || !lid.current) return
    if (dropStart.current === -2) dropStart.current = t
    if (releaseStart.current === -2) releaseStart.current = t

    // Rơi từ trên trời xuống, chậm dần như dù lượn, đung đưa nhẹ.
    const k = Math.min((t - dropStart.current) / DROP_TIME, 1)
    const e = 1 - Math.pow(1 - k, 3)
    root.current.position.set(pos.x + Math.sin(t * 0.9) * 0.4 * (1 - e), DROP_HEIGHT * (1 - e), pos.z)
    root.current.rotation.z = Math.sin(t * 1.6) * 0.14 * (1 - e)
    if (k >= 1 && landedAt.current < 0) {
      landedAt.current = t
      playSfx('pop')
      useJourney.getState().landBonus()
    }

    // Nảy nhẹ khi chạm đất, sau đó phập phồng chờ bấm.
    let sx = 1
    let sy = 1
    if (landedAt.current >= 0) {
      const age = t - landedAt.current
      if (age < 0.6) {
        const squash = Math.sin(age * 16) * 0.18 * (1 - age / 0.6)
        sy = 1 - squash
        sx = 1 + squash * 0.6
      }
      if (stage === 'ready') sy *= 1 + Math.sin(t * 3) * 0.03
    }
    const hoverScale = hover && clickable ? 1.06 : 1
    box.current.scale.set(sx * hoverScale, sy * hoverScale, sx * hoverScale)

    // Nắp bật ra khi mở, sau đó lơ lửng phía trên.
    if (released && releaseStart.current >= 0) {
      const ko = Math.min((t - releaseStart.current) / 0.9, 1)
      const eo = 1 - Math.pow(1 - ko, 3)
      lid.current.position.set(0, (eo * 2.1 + Math.sin(t * 2) * 0.08) / BONUS_SCALE, (eo * 0.7) / BONUS_SCALE)
      lid.current.rotation.x = eo * 1
      lid.current.rotation.z = Math.sin(t * 1.5) * 0.15 * eo
    } else {
      lid.current.position.set(0, 0, 0)
      lid.current.rotation.set(0, 0, 0)
    }

    // Bóng bay: buộc vào nóc hộp, nhấp nhô; thả ra thì bay lên trời rồi mờ dần.
    const relAge = released && releaseStart.current >= 0 ? t - releaseStart.current : -1
    BALLOONS.forEach((b, i) => {
      const g = balloonRefs.current[i]
      if (!g) return
      const bob = Math.sin(t * 1.3 + i * 1.7) * 0.08
      let x = b.x + Math.sin(t * 0.8 + i) * 0.06
      let y = b.y + bob
      let z = b.z
      let opacity = 1
      if (relAge >= 0) {
        const rise = Math.pow(relAge, 1.5) * (2 + i * 0.25)
        y += rise
        x += relAge * (b.x >= 0 ? 0.35 : -0.35)
        z += relAge * b.z * 0.4
        opacity = THREE.MathUtils.clamp(1 - (relAge - 2.5) / 1.5, 0, 1)
      }
      g.position.set(x, y, z)
      g.visible = opacity > 0
      balloonMats[i].opacity = opacity

      const line = strings[i]
      line.visible = opacity > 0
      ;(line.material as THREE.LineBasicMaterial).opacity = opacity
      const attr = line.geometry.attributes.position as THREE.BufferAttribute
      const bottomY = y - BALLOON_R * 1.18 - 0.06
      // Dây buộc vào nóc hộp; thả ra thì đầu dây rời hộp, rủ xuống dưới quả bóng.
      const cut = relAge >= 0 ? Math.min(relAge * 2.5, 1) : 0
      attr.setXYZ(0, x, bottomY, z)
      attr.setXYZ(1, THREE.MathUtils.lerp(0, x, cut), THREE.MathUtils.lerp(TIE_Y, bottomY - STRING_SLACK, cut), THREE.MathUtils.lerp(0, z, cut))
      attr.needsUpdate = true
      line.geometry.computeBoundingSphere()
    })

    // Nhãn nổi theo hộp quà: chưa mở thì nằm dưới chân hộp (trên chùm bóng bay dễ đè lên HUD khi màn hình thấp),
    // đã mở thì nằm trên nắp hộp.
    labelPos.set(root.current.position.x, root.current.position.y + (released ? 3.2 : 0), root.current.position.z + (released ? 0 : 0.5))
    handPos.set(root.current.position.x + side * 1.25, root.current.position.y + 1.05, root.current.position.z)

    if (ring.current) {
      const r = 1 + ((t * 0.7) % 1) * 0.6
      ring.current.scale.setScalar(r)
      const mat = ring.current.material as THREE.MeshBasicMaterial
      mat.opacity = stage === 'ready' ? 0.5 * (1 - ((t * 0.7) % 1)) : 0
    }
  })

  return (
    <group ref={root} position={[pos.x, DROP_HEIGHT, pos.z]}>
      <mesh ref={ring} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.08, 40]} />
        <meshBasicMaterial color="#c77dff" transparent opacity={0} depthWrite={false} />
      </mesh>

      <group
        onClick={(e) => {
          e.stopPropagation()
          if (clickable) tapBonus()
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
        <group ref={box}>
          <Present color={BOX} ribbon={RIBBON} lidRef={lid} scale={BONUS_SCALE} y={0} />
        </group>
        {/* Vùng bấm rộng hơn hộp một chút cho dễ bấm trên điện thoại */}
        <mesh position={[0, 0.7, 0]} visible={false}>
          <boxGeometry args={[1.8, 1.6, 1.8]} />
        </mesh>
      </group>

      {BALLOONS.map((b, i) => (
        <group
          key={i}
          ref={(el) => {
            balloonRefs.current[i] = el
          }}
          position={[b.x, b.y, b.z]}
        >
          <mesh scale={[1, 1.18, 1]} castShadow material={balloonMats[i]}>
            <sphereGeometry args={[BALLOON_R, 24, 18]} />
          </mesh>
          {/* Nút thắt dưới quả bóng */}
          <mesh position={[0, -BALLOON_R * 1.18, 0]} material={balloonMats[i]}>
            <coneGeometry args={[0.07, 0.1, 8]} />
          </mesh>
        </group>
      ))}
      {strings.map((l, i) => (
        <primitive key={i} object={l} />
      ))}

      {stage === 'ready' && (
        <group position={[0, 1.4, 0]}>
          <Sparkles count={24} scale={[2.4, 2.4, 2.4]} size={6} speed={0.5} color="#ffffff" />
        </group>
      )}
      {released && (
        <group position={[0, 1.2, 0]}>
          <Sparkles count={50} scale={[2.6, 3, 2.6]} size={9} speed={1} color="#ff7aa8" />
          <Sparkles count={30} scale={[2.2, 3.5, 2.2]} size={7} speed={0.7} color="#ffd166" />
        </group>
      )}
    </group>
  )
}

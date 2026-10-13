import { Suspense, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useJourney } from '../store/useJourney'
import { layout, mascot, stationT } from './path'
import { playStep } from '../audio/sound'
import { CHARACTERS, type CharacterSpec } from './characters'

const SPEED = 2.5 // đơn vị/giây
const FADE = 0.25

const tmpDir = new THREE.Vector3()
const tmpLook = new THREE.Vector3()

// Tải trước nhân vật đã chọn; các nhân vật khác tải khi được chọn.
useGLTF.preload(CHARACTERS[useJourney.getState().character].model)

/** Model GLB có animation: clip đứng yên, clip di chuyển khi đi, clip "trick" một lần khi tới nơi. */
function PetModel({ spec, walkingRef, arrivedAt }: { spec: CharacterSpec; walkingRef: React.RefObject<boolean>; arrivedAt: React.RefObject<number> }) {
  const group = useRef<THREE.Group>(null)
  const gltf = useGLTF(spec.model)
  const { actions, mixer } = useAnimations(gltf.animations, group)
  const current = useRef<string>('')
  const lastArrive = useRef(0)

  // Bật bóng đổ; texture pixel-art (Cube Pets 64x64) lọc Nearest cho nét.
  useEffect(() => {
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.frustumCulled = false
      if (!spec.pixelArt) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'] as const) {
          const tex = std[key]
          if (tex) {
            tex.magFilter = THREE.NearestFilter
            tex.minFilter = THREE.NearestFilter
            tex.generateMipmaps = false
            tex.needsUpdate = true
          }
        }
      })
    })
  }, [gltf, spec.pixelArt])

  const play = (name: string, once = false) => {
    const next = actions[name]
    if (!next || current.current === name) return
    const prev = actions[current.current]
    next.reset()
    next.enabled = true
    if (once) {
      next.setLoop(THREE.LoopOnce, 1)
      next.clampWhenFinished = true
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity)
    }
    if (prev) next.crossFadeFrom(prev, FADE, true)
    next.play()
    current.current = name
  }

  useEffect(() => {
    mixer.timeScale = spec.clipSpeed ?? 1
  }, [mixer, spec.clipSpeed])

  useEffect(() => {
    current.current = ''
    play(spec.clips.idle)
    const onFinished = () => {
      if (current.current === spec.clips.trick) play(spec.clips.idle)
    }
    mixer.addEventListener('finished', onFinished)
    return () => {
      mixer.removeEventListener('finished', onFinished)
      mixer.stopAllAction()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, mixer])

  useFrame(({ clock }) => {
    const { idle, move, trick } = spec.clips
    const moving = actions[move]
    if (walkingRef.current) {
      if (current.current !== move) play(move)
      // Khớp tốc độ clip với tốc độ di chuyển để chân không trượt (có giới hạn cho đỡ quơ chân).
      if (moving) moving.timeScale = Math.min(SPEED / (spec.moveSpeed * spec.scale), spec.maxTimeScale ?? Infinity)
    } else if (current.current === move && move !== idle) {
      play(idle)
    } else if (moving && move === idle) {
      moving.timeScale = 1
    }
    if (arrivedAt.current !== lastArrive.current) {
      lastArrive.current = arrivedAt.current
      if (arrivedAt.current > 0 && trick) play(trick, true)
    }
    // Nhân vật bay: lơ lửng nhấp nhô.
    if (spec.hover && group.current) group.current.position.y = spec.hover + Math.sin(clock.elapsedTime * 2.4) * 0.08
  })

  return (
    <group ref={group} scale={spec.scale}>
      <primitive object={gltf.scene} />
    </group>
  )
}

/** Nhân vật đi theo đường cong; ngoại hình lấy từ CHARACTERS theo lựa chọn trong store. */
export function Character() {
  const characterId = useJourney((s) => s.character)
  const spec = CHARACTERS[characterId]

  const root = useRef<THREE.Group>(null)
  const shadow = useRef<THREE.Mesh>(null)
  const heading = useRef(new THREE.Vector3(1, 0, 0))
  const walkingRef = useRef(false)
  const arrivedAt = useRef(0)

  useFrame(({ clock }, dt) => {
    const time = clock.elapsedTime
    const { targetIndex, arrive } = useJourney.getState()
    const target = targetIndex === null ? null : stationT(targetIndex)
    let walking = false

    if (target !== null) {
      // Giới hạn dt để không nhảy cóc khi tab bị tạm dừng, nhưng vẫn đủ lớn khi máy yếu.
      const step = (SPEED * Math.min(dt, 0.1)) / layout.length
      const diff = target - mascot.t
      if (Math.abs(diff) <= step) {
        mascot.t = target
        arrivedAt.current = time
        arrive(targetIndex!)
      } else {
        mascot.t += Math.sign(diff) * step
        walking = true
        const tangent = layout.curve.getTangentAt(THREE.MathUtils.clamp(mascot.t, 0, 1))
        tmpDir.copy(tangent).multiplyScalar(Math.sign(diff))
        heading.current.lerp(tmpDir, 0.18)
        playStep(time)
      }
    }
    mascot.walking = walking
    walkingRef.current = walking
    layout.curve.getPointAt(THREE.MathUtils.clamp(mascot.t, 0, 1), mascot.pos)

    if (!root.current) return
    root.current.position.copy(mascot.pos)
    tmpLook.copy(mascot.pos).add(heading.current)
    root.current.lookAt(tmpLook)
  })

  return (
    <group ref={root}>
      {/* Bóng đổ mềm dưới chân */}
      <mesh ref={shadow} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[spec.shadow, 24]} />
        <meshBasicMaterial color="#5a2d44" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      {/* Suspense riêng: đổi sang nhân vật chưa tải thì chỉ nhân vật biến mất trong lúc tải, không ẩn cả cảnh. */}
      <Suspense fallback={null}>
        <PetModel key={spec.id} spec={spec} walkingRef={walkingRef} arrivedAt={arrivedAt} />
      </Suspense>
    </group>
  )
}

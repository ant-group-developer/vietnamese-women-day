import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useJourney } from '../store/useJourney'
import { CHARACTERS, type CharacterId, type CharacterSpec } from './characters'
import { spots } from './landmarks'
import { seededRandom } from './path'
import { isMobile } from './utils'

/** Thú đi dạo quanh các góc trống (không trùng với bạn đồng hành đang chọn). */
const LAND: CharacterId[] = ['capybara', 'lamb', 'fawn', 'redPanda', 'fox', 'otter', 'elephant', 'polarBear']
const SIZE = 0.8
/** Rùa bơi trong hồ nhỏ nên thu nhỏ hơn. */
const SWIM_SIZE = 0.45
const SPEED = 0.7

interface Home {
  center: THREE.Vector3
  radius: number
  /** Bơi vòng quanh (rùa trong hồ) thay vì đi dạo. */
  swim?: boolean
}

function Pet({ spec, home, seed }: { spec: CharacterSpec; home: Home; seed: number }) {
  const gltf = useGLTF(spec.model)
  const scene = useMemo(() => {
    const s = clone(gltf.scene)
    s.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = !isMobile
        m.frustumCulled = false
      }
    })
    return s
  }, [gltf])
  const root = useRef<THREE.Group>(null)
  const { actions } = useAnimations(gltf.animations, root)
  const st = useRef({
    rnd: seededRandom(seed),
    pos: home.center.clone(),
    target: home.center.clone(),
    wait: 1 + (seed % 3),
    heading: 0,
    clip: '',
    angle: 0,
  })

  const play = (name: string | undefined, once = false) => {
    const s = st.current
    if (!name || s.clip === name) return
    const next = actions[name]
    if (!next) return
    const prev = s.clip ? actions[s.clip] : null
    next.reset()
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity)
    next.clampWhenFinished = once
    if (prev) next.crossFadeFrom(prev, 0.3, true)
    next.play()
    s.clip = name
  }

  useEffect(() => {
    st.current.clip = ''
    play(home.swim ? spec.clips.move : spec.clips.idle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions])

  useFrame((_, rawDt) => {
    const g = root.current
    if (!g) return
    const dt = Math.min(rawDt, 0.1)
    const s = st.current
    if (home.swim) {
      s.angle += dt * 0.35
      const r = home.radius
      s.pos.set(home.center.x + Math.cos(s.angle) * r, -0.08, home.center.z + Math.sin(s.angle) * r * 0.75)
      g.position.copy(s.pos)
      g.rotation.y = Math.atan2(-Math.sin(s.angle), Math.cos(s.angle) * 0.75)
      return
    }
    const d = s.target.clone().sub(s.pos).setY(0)
    const dist = d.length()
    if (s.wait > 0) {
      s.wait -= dt
      if (s.wait <= 0) {
        // Chọn điểm đến mới trong vùng của mình.
        const a = s.rnd() * Math.PI * 2
        const r = Math.sqrt(s.rnd()) * home.radius
        s.target.set(home.center.x + Math.cos(a) * r, 0, home.center.z + Math.sin(a) * r)
      }
    } else if (dist < 0.05) {
      s.wait = 2 + s.rnd() * 5
      if (s.rnd() < 0.35 && spec.clips.trick) play(spec.clips.trick, true)
      else play(spec.clips.idle)
    } else {
      play(spec.clips.move)
      const step = Math.min(dist, SPEED * dt)
      s.pos.addScaledVector(d.normalize(), step)
      const want = Math.atan2(d.x, d.z)
      let diff = want - s.heading
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      s.heading += diff * Math.min(1, dt * 6)
      const move = actions[spec.clips.move]
      if (move) move.timeScale = Math.min(SPEED / (spec.moveSpeed * spec.scale * SIZE), 1.2)
    }
    // Clip "trick" chạy xong thì về đứng yên.
    const trick = spec.clips.trick ? actions[spec.clips.trick] : null
    if (trick && s.clip === spec.clips.trick && !trick.isRunning()) play(spec.clips.idle)
    g.position.copy(s.pos)
    g.rotation.y = s.heading
  })

  return (
    <group ref={root} scale={spec.scale * (home.swim ? SWIM_SIZE : SIZE)}>
      <primitive object={scene} />
    </group>
  )
}

export function Wanderers() {
  const character = useJourney((s) => s.character)
  // Tải sau khi cảnh chính đã hiện để không tranh băng thông lúc đầu.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 2500)
    return () => clearTimeout(id)
  }, [])

  const pets = useMemo(() => {
    const homes: Home[] = spots.filter((s) => s.kind === 'pet').map((s) => ({ center: s.pos, radius: s.radius - 0.3 }))
    const ids = LAND.filter((id) => id !== character)
    const list = homes.slice(0, isMobile ? 2 : 4).map((home, i) => ({ id: ids[i], home }))
    const pond = spots.find((s) => s.kind === 'pond')
    if (pond && !isMobile && character !== 'turtle') list.push({ id: 'turtle', home: { center: pond.pos, radius: 0.75, swim: true } })
    return list
  }, [character])

  if (!ready) return null
  return (
    <group>
      {pets.map((p, i) => (
        <Suspense key={`${p.id}-${i}`} fallback={null}>
          <Pet spec={CHARACTERS[p.id]} home={p.home} seed={i * 17 + 3} />
        </Suspense>
      ))}
    </group>
  )
}

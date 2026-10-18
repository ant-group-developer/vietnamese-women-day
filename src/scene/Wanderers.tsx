import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { CHARACTERS, type CharacterId, type CharacterSpec } from './characters'
import { islandHomes, ISLAND_ANIMALS, MAIN_ANIMALS, penPoint, skyIslands, spots, ZOO_PENS } from './landmarks'
import { mascot, seededRandom } from './path'
import { isMobile } from './utils'

const SIZE = 0.8
/** Rùa bơi trong hồ nhỏ nên thu nhỏ hơn. */
const SWIM_SIZE = 0.45
const SPEED = 0.7

/**
 * Thân của mọi con thú đang đi trên mặt đất (tâm và bán kính), để các con né nhau thay vì đi xuyên qua nhau.
 * Chim bay lượn trên cao không tính.
 */
const bodies = new Map<number, { pos: THREE.Vector3; r: number }>()
if (import.meta.env.DEV) (window as unknown as { __bodies: typeof bodies }).__bodies = bodies
/** Khoảng trống tối thiểu giữa hai con (ngoài bán kính thân) để không đứng sát nhau. */
const GAP = 0.7
/** Bán kính thân của bạn đồng hành, thú cũng né. */
const MASCOT_R = 0.5

/** Có vật nào (thú khác, bạn đồng hành) chạm vào vòng tròn (p, r) không; trả về vật gần nhất bị chạm. */
function blocker(self: number, p: THREE.Vector3, r: number): THREE.Vector3 | null {
  let hit: THREE.Vector3 | null = null
  let best = Infinity
  const test = (q: THREE.Vector3, rq: number) => {
    if (Math.abs(q.y - p.y) > 1.2) return
    const d = Math.hypot(q.x - p.x, q.z - p.z) - (r + rq + GAP)
    if (d < 0 && d < best) {
      best = d
      hit = q
    }
  }
  bodies.forEach((b, id) => id !== self && test(b.pos, b.r))
  test(mascot.pos, MASCOT_R)
  return hit
}

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
  const flying = !!spec.hover
  /** Bán kính thân: model cao khoảng 1.7 ở scale 1, thân dài chừng nửa chiều cao. */
  const bodyR = 0.45 * spec.scale * (home.swim ? SWIM_SIZE : SIZE) * 1.7 * 0.6
  const st = useRef({
    rnd: seededRandom(seed),
    pos: home.center.clone(),
    target: home.center.clone(),
    wait: 1 + (seed % 3),
    /** Điểm đến vừa chọn để né va chạm: giữ nguyên khi hết nhịp dừng. */
    dodge: false,
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

  // Xuất phát ở một chỗ trống trong vùng (không chồng lên con khác), rồi ghi danh thân để các con khác né.
  useEffect(() => {
    const s = st.current
    if (!home.swim) {
      for (let i = 0; i < 20; i++) {
        const a = s.rnd() * Math.PI * 2
        const r = Math.sqrt(s.rnd()) * home.radius
        s.pos.set(home.center.x + Math.cos(a) * r, home.center.y, home.center.z + Math.sin(a) * r)
        if (flying || !blocker(seed, s.pos, bodyR)) break
      }
      s.target.copy(s.pos)
    }
    if (!flying) bodies.set(seed, { pos: s.pos, r: bodyR })
    return () => {
      bodies.delete(seed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, rawDt) => {
    const g = root.current
    if (!g) return
    const dt = Math.min(rawDt, 0.1)
    const s = st.current
    if (home.swim) {
      s.angle += dt * 0.35
      const r = home.radius
      s.pos.set(home.center.x + Math.cos(s.angle) * r, home.center.y - 0.08, home.center.z + Math.sin(s.angle) * r * 0.75)
      g.position.copy(s.pos)
      g.rotation.y = Math.atan2(-Math.sin(s.angle), Math.cos(s.angle) * 0.75)
      return
    }
    const d = s.target.clone().sub(s.pos).setY(0)
    const dist = d.length()
    if (s.wait > 0) {
      s.wait -= dt
      if (s.wait <= 0 && s.dodge) s.dodge = false
      else if (s.wait <= 0) {
        // Chọn điểm đến mới trong vùng của mình, ưu tiên chỗ chưa có con nào đứng.
        for (let i = 0; i < 6; i++) {
          const a = s.rnd() * Math.PI * 2
          const r = Math.sqrt(s.rnd()) * home.radius
          s.target.set(home.center.x + Math.cos(a) * r, home.center.y, home.center.z + Math.sin(a) * r)
          if (flying || !blocker(seed, s.target, bodyR)) break
        }
      }
    } else if (dist < 0.05) {
      s.wait = 2 + s.rnd() * 5
      if (s.rnd() < 0.35 && spec.clips.trick) play(spec.clips.trick, true)
      else play(spec.clips.idle)
    } else {
      const step = Math.min(dist, SPEED * dt)
      const next = s.pos.clone().addScaledVector(d.clone().normalize(), step)
      const hit = flying ? null : blocker(seed, next, bodyR)
      // Sắp chạm con khác (hoặc bạn đồng hành) mà còn đang lại gần: dừng một nhịp, chọn điểm đến mới theo hướng tránh xa.
      if (hit && Math.hypot(hit.x - next.x, hit.z - next.z) < Math.hypot(hit.x - s.pos.x, hit.z - s.pos.z)) {
        const away = Math.atan2(s.pos.z - hit.z, s.pos.x - hit.x)
        const a = away + (s.rnd() - 0.5) * 1.6
        const r = 0.6 + s.rnd() * home.radius
        const t = new THREE.Vector3(s.pos.x + Math.cos(a) * r, home.center.y, s.pos.z + Math.sin(a) * r)
        // Giữ trong vùng của mình.
        const off = t.clone().sub(home.center).setY(0)
        if (off.length() > home.radius) t.copy(home.center).addScaledVector(off.normalize(), home.radius).setY(home.center.y)
        s.target.copy(t)
        s.dodge = true
        s.wait = 0.3 + s.rnd() * 0.5
        play(spec.clips.idle)
        g.position.copy(s.pos)
        g.rotation.y = s.heading
        return
      }
      play(spec.clips.move)
      s.pos.copy(next)
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
    // Chim (vẹt, chim ruồi) bay lượn trên cao một chút.
    if (spec.hover) g.position.y += spec.hover * spec.scale * SIZE + Math.sin(performance.now() / 400 + seed) * 0.08
    g.rotation.y = s.heading
  })

  return (
    <group ref={root} scale={spec.scale * (home.swim ? SWIM_SIZE : SIZE)}>
      <primitive object={scene} />
    </group>
  )
}

export function Wanderers() {
  // Tải sau khi cảnh chính đã hiện để không tranh băng thông lúc đầu.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 2500)
    return () => clearTimeout(id)
  }, [])

  const pets = useMemo(() => {
    const list: { id: CharacterId; home: Home }[] = []
    /** Thả một nhóm thú vào một vùng; máy yếu thì bớt số con. */
    const group = (ids: string[], home: Home, max = isMobile ? 2 : 3) => {
      for (const id of ids.slice(0, max)) list.push({ id: id as CharacterId, home })
    }
    // Hai bãi thú hai bên đảo chính.
    spots
      .filter((s) => s.kind === 'pet')
      .forEach((s, i) => MAIN_ANIMALS[i] && group(MAIN_ANIMALS[i], { center: s.pos, radius: s.radius - 0.3 }))
    const pond = spots.find((s) => s.kind === 'pond')
    if (pond && !isMobile) list.push({ id: 'turtle', home: { center: pond.pos, radius: 0.75, swim: true } })
    // Thú trên từng đảo phụ: thả dạo (đảo thường) hoặc trong chuồng (đảo sở thú, hải cẩu bơi vòng trong hồ).
    for (const island of skyIslands) {
      const free = ISLAND_ANIMALS[island.feature]
      if (free) {
        // Chia đều thú ra hai bãi hai bên đường (islandHomes), tránh điểm nhấn.
        const homes = islandHomes(island)
        free
          .slice(0, isMobile ? 2 : 3)
          .forEach((id, i) => list.push({ id: id as CharacterId, home: homes[i % homes.length] }))
      }
      for (const pen of ZOO_PENS[island.feature] ?? []) {
        group(pen.animals, { center: penPoint(island, pen), radius: Math.min(pen.rx, pen.rz) - 0.4 })
        if (pen.swim) list.push({ id: pen.swim as CharacterId, home: { center: penPoint(island, pen), radius: Math.min(pen.rx, pen.rz) * 0.45, swim: true } })
      }
    }
    return list
  }, [])

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

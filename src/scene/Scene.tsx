import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { departments } from '../data/departments'
import { Island } from './Island'
import { PathMesh } from './PathMesh'
import { Station } from './Station'
import { Character } from './Character'
import { GiftBox } from './GiftBox'
import { BonusGift } from './BonusGift'
import { Clouds, Decor } from './Decor'
import { CAMERA_OFFSET, CameraRig } from './CameraRig'
import { layout } from './path'
import { isMobile } from './utils'
import { LabelProjector } from './labels'
import { Vignettes } from './Vignettes'
import { SkyIslands } from './SkyIslands'
import { SkyLife } from './SkyLife'
import { Wanderers } from './Wanderers'

const start = layout.curve.getPointAt(0)

const SUN_OFFSET = new THREE.Vector3(10, 16, 8)
/** Nửa cạnh vùng bóng đổ quanh chỗ camera đang nhìn. */
const SHADOW_HALF = 22
const SHADOW_MAP = 2048
const sunZ = SUN_OFFSET.clone().normalize()
const sunX = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), sunZ).normalize()
const sunY = new THREE.Vector3().crossVectors(sunZ, sunX)
const lookDir = new THREE.Vector3()
const focus = new THREE.Vector3()

/**
 * Nắng chính có bóng đổ. Vùng bóng đổ đi theo chỗ camera đang nhìn (đảo dài hơn vùng bóng),
 * và được làm tròn theo kích thước một texel của shadow map để bóng không rung khi camera di chuyển.
 */
function SunLight() {
  const light = useRef<THREE.DirectionalLight>(null)
  useFrame(({ camera }) => {
    const l = light.current
    if (!l) return
    // Giao điểm hướng nhìn của camera với mặt đất.
    camera.getWorldDirection(lookDir)
    const k = lookDir.y < -0.05 ? -camera.position.y / lookDir.y : 20
    focus.copy(camera.position).addScaledVector(lookDir, Math.min(k, 40)).setY(0)
    const texel = (SHADOW_HALF * 2) / SHADOW_MAP
    const a = Math.round(focus.dot(sunX) / texel) * texel
    const b = Math.round(focus.dot(sunY) / texel) * texel
    const c = focus.dot(sunZ)
    focus.copy(sunX).multiplyScalar(a).addScaledVector(sunY, b).addScaledVector(sunZ, c)
    l.target.position.copy(focus)
    l.target.updateMatrixWorld()
    l.position.copy(focus).add(SUN_OFFSET)
  })
  return (
    <directionalLight
      ref={light}
      castShadow
      position={SUN_OFFSET}
      intensity={1.45}
      shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]}
      shadow-radius={3}
      shadow-bias={-0.0004}
      shadow-normalBias={0.03}
      shadow-camera-left={-SHADOW_HALF}
      shadow-camera-right={SHADOW_HALF}
      shadow-camera-top={SHADOW_HALF}
      shadow-camera-bottom={-SHADOW_HALF}
      shadow-camera-near={1}
      shadow-camera-far={60}
    />
  )
}

export function Scene() {
  return (
    <div className="canvas-wrap">
      <Canvas
        shadows={isMobile ? false : { type: THREE.PCFShadowMap }}
        dpr={[1, isMobile ? 1.5 : 2]}
        camera={{
          position: [start.x + CAMERA_OFFSET.x, start.y + CAMERA_OFFSET.y, start.z + CAMERA_OFFSET.z],
          fov: 42,
          near: 0.1,
          far: 150,
        }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
      >
        <fog attach="fog" args={['#dceeff', 32, 75]} />
        <ambientLight intensity={0.5} />
        <hemisphereLight args={['#fff5f8', '#bfe8cf', 0.9]} />
        <directionalLight position={[-12, 8, -6]} intensity={0.35} color="#ffe3ef" />
        <SunLight />

        <Suspense fallback={null}>
          <Island />
          <PathMesh />
          <Decor />
          <Vignettes />
          <SkyIslands />
          <SkyLife />
          <Wanderers />
          <Clouds />
          {departments.map((d, i) => (
            <Station key={d.slug} index={i} dept={d} />
          ))}
          <GiftBox />
          <BonusGift />
          <Character />
        </Suspense>
        <CameraRig />
        <LabelProjector />
      </Canvas>
    </div>
  )
}

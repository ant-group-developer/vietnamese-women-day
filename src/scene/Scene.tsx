import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { departments } from '../data/departments'
import { Island } from './Island'
import { PathMesh } from './PathMesh'
import { Station } from './Station'
import { Character } from './Character'
import { GiftBox } from './GiftBox'
import { Clouds, Decor } from './Decor'
import { CAMERA_OFFSET, CameraRig } from './CameraRig'
import { layout } from './path'
import { isMobile } from './utils'
import { LabelProjector } from './labels'

const start = layout.curve.getPointAt(0)

export function Scene() {
  return (
    <div className="canvas-wrap">
      <Canvas
        shadows={isMobile ? false : { type: THREE.VSMShadowMap }}
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
        <directionalLight
          castShadow
          position={[10, 16, 8]}
          intensity={1.45}
          shadow-mapSize={[2048, 2048]}
          shadow-radius={6}
          shadow-blurSamples={12}
          shadow-bias={-0.0002}
          shadow-normalBias={0.02}
          shadow-camera-left={-24}
          shadow-camera-right={24}
          shadow-camera-top={24}
          shadow-camera-bottom={-24}
          shadow-camera-near={1}
          shadow-camera-far={60}
        />

        <Suspense fallback={null}>
          <Island />
          <PathMesh />
          <Decor />
          <Clouds />
          {departments.map((d, i) => (
            <Station key={d.slug} index={i} dept={d} />
          ))}
          <GiftBox />
          <Character />
        </Suspense>
        <CameraRig />
        <LabelProjector />
      </Canvas>
    </div>
  )
}

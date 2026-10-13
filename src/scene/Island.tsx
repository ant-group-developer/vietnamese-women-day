import { layout } from './path'

/** Đảo nổi low-poly: mặt cỏ, lớp đất và chóp nhọn phía dưới. */
export function Island() {
  const { center, rx, rz } = layout.island
  return (
    <group position={[center.x, 0, center.z]}>
      {/* Mặt cỏ */}
      <mesh receiveShadow position={[0, -0.35, 0]} scale={[rx, 1, rz]}>
        <cylinderGeometry args={[1, 0.97, 0.7, 28]} />
        <meshStandardMaterial color="#a6e9bd" flatShading />
      </mesh>
      {/* Viền cỏ đậm */}
      <mesh position={[0, -0.72, 0]} scale={[rx * 0.985, 1, rz * 0.985]}>
        <cylinderGeometry args={[0.97, 0.9, 0.25, 28]} />
        <meshStandardMaterial color="#7fd39f" flatShading />
      </mesh>
      {/* Lớp đất */}
      <mesh position={[0, -2.1, 0]} scale={[rx * 0.9, 1, rz * 0.9]}>
        <cylinderGeometry args={[0.9, 0.5, 2.6, 28]} />
        <meshStandardMaterial color="#f0b6a0" flatShading />
      </mesh>
      {/* Chóp đáy */}
      <mesh position={[0, -4.6, 0]} rotation={[Math.PI, 0, 0]} scale={[rx * 0.45, 1, rz * 0.45]}>
        <coneGeometry args={[1, 2.4, 14]} />
        <meshStandardMaterial color="#d99280" flatShading />
      </mesh>
    </group>
  )
}

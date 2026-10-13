import { useMemo } from 'react'
import { layout, seededRandom } from './path'
import { InstancedModel, type Placement } from './Decor'
import { natureUrl, PALETTE } from './envAssets'

const ROCKS = ['stone_tallA', 'stone_tallB', 'stone_tallE']
const ROCK_PALETTE = { ...PALETTE, stone: '#f0c4b4', stoneDark: '#d99280' }

/** Đá Kenney lật ngược, xếp vòng quanh mép dưới đảo cho giống đảo nổi. */
function buildRocks(): Placement[][] {
  const rnd = seededRandom(2010)
  const { center, rx, rz } = layout.island
  const groups: Placement[][] = ROCKS.map(() => [])
  const n = 34
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.12
    const r = 0.8 + rnd() * 0.1
    groups[i % ROCKS.length].push({
      pos: [center.x + Math.cos(a) * rx * r, -0.8 - rnd() * 0.6, center.z + Math.sin(a) * rz * r],
      rot: rnd() * Math.PI * 2,
      scale: 0.8 + rnd() * 0.7,
      flip: true,
    })
  }
  return groups
}

/** Đảo nổi low-poly: mặt cỏ, lớp đất, chóp nhọn phía dưới và đá treo quanh mép. */
export function Island() {
  const { center, rx, rz } = layout.island
  const rocks = useMemo(() => buildRocks(), [])
  return (
    <group>
      <group position={[center.x, 0, center.z]}>
        {/* Mặt cỏ */}
        <mesh receiveShadow position={[0, -0.35, 0]} scale={[rx, 1, rz]}>
          <cylinderGeometry args={[1, 0.97, 0.7, 64]} />
          <meshStandardMaterial color="#a6e9bd" />
        </mesh>
        {/* Viền cỏ đậm */}
        <mesh position={[0, -0.72, 0]} scale={[rx * 0.985, 1, rz * 0.985]}>
          <cylinderGeometry args={[0.97, 0.9, 0.25, 40]} />
          <meshStandardMaterial color="#7fd39f" flatShading />
        </mesh>
        {/* Lớp đất */}
        <mesh position={[0, -2.1, 0]} scale={[rx * 0.9, 1, rz * 0.9]}>
          <cylinderGeometry args={[0.9, 0.5, 2.6, 24, 2]} />
          <meshStandardMaterial color="#f0b6a0" flatShading />
        </mesh>
        {/* Chóp đáy */}
        <mesh position={[0, -4.6, 0]} rotation={[Math.PI, 0, 0]} scale={[rx * 0.45, 1, rz * 0.45]}>
          <coneGeometry args={[1, 2.4, 16]} />
          <meshStandardMaterial color="#d99280" flatShading />
        </mesh>
      </group>
      {rocks.map((items, i) => (
        <InstancedModel key={ROCKS[i]} url={natureUrl(ROCKS[i])} size={2.2} palette={ROCK_PALETTE} paletteKey="island" items={items} shadows={false} />
      ))}
    </group>
  )
}

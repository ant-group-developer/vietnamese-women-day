import type { ReactNode } from 'react'

/**
 * Bộ ngoại hình cho các nhân vật. Tất cả dùng chung khung xương 2 chân trong Character.tsx:
 * đầu là group riêng (các bộ phận mặt đặt tương đối với tâm đầu), tay chân là Limb.
 */
export type CharacterId = 'cat' | 'bunny' | 'bear' | 'panda' | 'duck'

export interface CharacterSpec {
  id: CharacterId
  name: string
  emoji: string
  /** Màu lông chính (đầu, thân). */
  body: string
  /** Màu tay/chân, mặc định = body. */
  limb?: string
  dress: string
  dressDark: string
  shoe: string
  /** Giày dẹt và rộng (chân vịt). */
  flatFeet?: boolean
  /** Tỉ lệ đầu [x, y, z]. */
  headScale: [number, number, number]
  /** Lắc lư mạnh khi đi (vịt). */
  waddle?: boolean
  /** Các bộ phận trên đầu: tai, mắt, mũi, phụ kiện. Toạ độ tương đối tâm đầu. */
  head: ReactNode
}

const BLACK = '#2b1a24'
const BLUSH = '#ffb3c6'

function Blush() {
  return (
    <>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.36, -0.1, 0.38]} scale={[1, 0.6, 0.3]}>
          <sphereGeometry args={[0.08, 16, 12]} />
          <meshStandardMaterial color={BLUSH} transparent opacity={0.8} />
        </mesh>
      ))}
    </>
  )
}

function DotEyes({ y = 0.02, size = 0.065 }: { y?: number; size?: number }) {
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.21, y, 0.44]}>
          <mesh scale={[0.7, 1.1, 0.5]}>
            <sphereGeometry args={[size, 16, 12]} />
            <meshStandardMaterial color={BLACK} />
          </mesh>
          <mesh position={[0.02, 0.025, 0.03]}>
            <sphereGeometry args={[size * 0.3, 8, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
    </>
  )
}

function Muzzle({ color }: { color: string }) {
  return (
    <mesh position={[0, -0.14, 0.4]} scale={[1.25, 0.8, 0.7]}>
      <sphereGeometry args={[0.2, 20, 14]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Nose({ color, y = -0.12, z = 0.49, size = 0.055 }: { color: string; y?: number; z?: number; size?: number }) {
  return (
    <mesh position={[0, y, z]} scale={[1.3, 0.85, 0.6]}>
      <sphereGeometry args={[size, 16, 12]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Bow({ color, position, rotation = [0, 0, 0], size = 1 }: { color: string; position: [number, number, number]; rotation?: [number, number, number]; size?: number }) {
  return (
    <group position={position} rotation={rotation} scale={size}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.15, 0, 0]} rotation={[0, 0, s * 0.3]} scale={[1.2, 0.75, 0.5]} castShadow>
          <sphereGeometry args={[0.15, 20, 14]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.075, 16, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

function RoundEars({ color, inner }: { color: string; inner: string }) {
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.42, 0.36, -0.04]}>
          <mesh castShadow>
            <sphereGeometry args={[0.17, 20, 14]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0, 0.09]} scale={[1, 1, 0.5]}>
            <sphereGeometry args={[0.09, 16, 12]} />
            <meshStandardMaterial color={inner} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function Whiskers() {
  return (
    <>
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * 0.46, -0.08, 0.34]}>
          {[-0.1, 0, 0.1].map((y, i) => (
            <mesh key={i} position={[side * 0.16, y, 0]} rotation={[0, 0, side * (i - 1) * -0.18]}>
              <boxGeometry args={[0.36, 0.022, 0.022]} />
              <meshStandardMaterial color={BLACK} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

/* ---------------- Mèo ---------------- */
const CAT_WHITE = '#fffdfa'
const catHead = (
  <>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.4, 0.42, 0]} rotation={[0, 0, s * -0.35]} castShadow>
        <coneGeometry args={[0.19, 0.34, 20]} />
        <meshStandardMaterial color={CAT_WHITE} />
      </mesh>
    ))}
    <DotEyes />
    <Nose color="#ffd166" />
    <Blush />
    <Whiskers />
    <Bow color="#ff2e5a" position={[0.42, 0.3, 0.2]} rotation={[0.1, 0, -0.35]} />
  </>
)

/* ---------------- Thỏ ---------------- */
const BUNNY = '#fff6f8'
const bunnyHead = (
  <>
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 0.22, 0.62, -0.06]} rotation={[0.1, 0, s * -0.18]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.11, 0.5, 6, 14]} />
          <meshStandardMaterial color={BUNNY} />
        </mesh>
        <mesh position={[0, 0.02, 0.07]} scale={[0.6, 0.8, 0.4]}>
          <capsuleGeometry args={[0.11, 0.5, 6, 14]} />
          <meshStandardMaterial color="#ffb3c6" />
        </mesh>
      </group>
    ))}
    <DotEyes />
    <Nose color="#ff8fb3" size={0.05} />
    <Blush />
    {/* Răng thỏ */}
    <mesh position={[0, -0.24, 0.46]}>
      <boxGeometry args={[0.09, 0.07, 0.03]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
    <Bow color="#ff5c8a" position={[0, 0.5, 0.12]} rotation={[0.3, 0, 0]} size={0.9} />
  </>
)

/* ---------------- Gấu ---------------- */
const BEAR = '#d19a66'
const bearHead = (
  <>
    <RoundEars color={BEAR} inner="#f3d2ad" />
    <Muzzle color="#f8e3c6" />
    <DotEyes y={0.06} />
    <Nose color={BLACK} y={-0.1} z={0.56} size={0.06} />
    <Blush />
    {/* Nơ cổ */}
    <Bow color="#ff5c8a" position={[0, -0.46, 0.34]} rotation={[0.4, 0, 0]} size={0.8} />
  </>
)

/* ---------------- Gấu trúc ---------------- */
const PANDA_WHITE = '#fffdfa'
const PANDA_BLACK = '#2f2a2e'
const pandaHead = (
  <>
    <RoundEars color={PANDA_BLACK} inner="#4a4248" />
    {/* Vệt mắt đen */}
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 0.21, 0.03, 0.4]} rotation={[0, 0, s * 0.35]}>
        <mesh scale={[1, 1.35, 0.5]}>
          <sphereGeometry args={[0.13, 20, 14]} />
          <meshStandardMaterial color={PANDA_BLACK} />
        </mesh>
        <mesh position={[0, 0.02, 0.07]} scale={[1, 1.2, 0.5]}>
          <sphereGeometry args={[0.05, 14, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.005, 0.02, 0.1]} scale={[1, 1.2, 0.5]}>
          <sphereGeometry args={[0.028, 10, 8]} />
          <meshStandardMaterial color={BLACK} />
        </mesh>
      </group>
    ))}
    <Nose color={PANDA_BLACK} y={-0.14} z={0.5} size={0.06} />
    <Blush />
    <Bow color="#ff2e5a" position={[-0.38, 0.34, 0.18]} rotation={[0.1, 0, 0.4]} size={0.9} />
  </>
)

/* ---------------- Vịt ---------------- */
const DUCK = '#ffd94d'
const BILL = '#ff9f43'
const duckHead = (
  <>
    {/* Chỏm lông */}
    <mesh position={[0, 0.48, -0.05]} rotation={[0.3, 0, 0]} castShadow>
      <coneGeometry args={[0.08, 0.26, 12]} />
      <meshStandardMaterial color={DUCK} />
    </mesh>
    <mesh position={[-0.1, 0.46, -0.02]} rotation={[0.2, 0, 0.5]}>
      <coneGeometry args={[0.06, 0.2, 12]} />
      <meshStandardMaterial color={DUCK} />
    </mesh>
    <DotEyes y={0.08} size={0.075} />
    {/* Mỏ */}
    <mesh position={[0, -0.12, 0.5]} scale={[1.5, 0.45, 1.1]} castShadow>
      <sphereGeometry args={[0.2, 20, 14]} />
      <meshStandardMaterial color={BILL} />
    </mesh>
    <mesh position={[0, -0.19, 0.48]} scale={[1.3, 0.3, 0.95]}>
      <sphereGeometry args={[0.2, 20, 14]} />
      <meshStandardMaterial color="#f08a2e" />
    </mesh>
    <Blush />
    <Bow color="#ff7aa8" position={[0.3, 0.38, 0.14]} rotation={[0.2, 0, -0.3]} size={0.85} />
  </>
)

export const CHARACTERS: Record<CharacterId, CharacterSpec> = {
  cat: {
    id: 'cat',
    name: 'Mèo Mi',
    emoji: '🐱',
    body: CAT_WHITE,
    dress: '#ff5c8a',
    dressDark: '#e8457a',
    shoe: '#ff7aa8',
    headScale: [1.15, 0.9, 0.95],
    head: catHead,
  },
  bunny: {
    id: 'bunny',
    name: 'Thỏ Bông',
    emoji: '🐰',
    body: BUNNY,
    dress: '#ff8fb3',
    dressDark: '#ff6f9c',
    shoe: '#ff5c8a',
    headScale: [1.05, 0.95, 0.95],
    head: bunnyHead,
  },
  bear: {
    id: 'bear',
    name: 'Gấu Nâu',
    emoji: '🐻',
    body: BEAR,
    dress: '#8ed6ff',
    dressDark: '#6cc3f5',
    shoe: '#9a6b3f',
    headScale: [1.05, 0.95, 0.95],
    head: bearHead,
  },
  panda: {
    id: 'panda',
    name: 'Gấu Trúc',
    emoji: '🐼',
    body: PANDA_WHITE,
    limb: PANDA_BLACK,
    dress: '#5ed6b0',
    dressDark: '#45c49b',
    shoe: '#1f1b1e',
    headScale: [1.1, 0.95, 0.95],
    head: pandaHead,
  },
  duck: {
    id: 'duck',
    name: 'Vịt Vàng',
    emoji: '🐥',
    body: DUCK,
    dress: '#c77dff',
    dressDark: '#b05ef0',
    shoe: BILL,
    flatFeet: true,
    headScale: [1.0, 1.0, 0.95],
    waddle: true,
    head: duckHead,
  },
}

export const CHARACTER_LIST: CharacterSpec[] = [CHARACTERS.panda, CHARACTERS.duck, CHARACTERS.bunny, CHARACTERS.bear, CHARACTERS.cat]

export const DEFAULT_CHARACTER: CharacterId = 'cat'

export function isCharacterId(v: unknown): v is CharacterId {
  return typeof v === 'string' && v in CHARACTERS
}

/**
 * Nhân vật dẫn đường: model GLB có rig + animation, hướng mặt +Z, đơn vị mét.
 * - Gà Con (mặc định) từ bộ Cube Pets (assets/CubePets_Free): clip Idle, Walk, Run (lặp), Jump, Trick (một lần), texture pixel-art.
 * - Bộ Cozy Animals của Gamideo (assets/Gamideo_cozy_animals, texture đã thu về 1024px trong public/models/cozy):
 *   cao ~1.7, clip idle, walk (lặp), gesture (một lần); rùa và hải cẩu chỉ có swimIdle/swim; chim chỉ có fly.
 */
interface CharacterDef {
  name: string
  emoji: string
  /** Ảnh đại diện cho thẻ chọn (không có thì dùng emoji). */
  thumb?: string
  /** Màu nhấn cho thẻ chọn. */
  color: string
  /** Đường dẫn GLB trong public/. */
  model: string
  /** Hệ số phóng to để nhân vật cao tương xứng với nhà (nhà cao ~2). */
  scale: number
  /** Tên clip: đứng yên, di chuyển (lặp), và clip chạy một lần khi tới nơi (nếu có). */
  clips: { idle: string; move: string; trick?: string }
  /** Quãng đường (mét, ở scale 1) clip di chuyển đi được mỗi giây khi phát tốc độ gốc. */
  moveSpeed: number
  /** Giới hạn tốc độ phát clip di chuyển để chân không quơ quá nhanh. */
  maxTimeScale?: number
  /** Hệ số tốc độ cho mọi clip của nhân vật (vd. 0.6 = vỗ cánh chậm lại 40%). */
  clipSpeed?: number
  /** Texture pixel-art nhỏ: lọc Nearest cho nét. */
  pixelArt?: boolean
  /** Bay lơ lửng cách mặt đất (đơn vị cảnh). */
  hover?: number
  /** Bán kính bóng dưới chân. */
  shadow: number
}

type Def = CharacterDef
export type CharacterSpec = CharacterDef & { id: CharacterId }

const CUBE_CLIPS = { idle: 'Idle', move: 'Run', trick: 'Trick' }
const cube = (d: Pick<Def, 'name' | 'emoji' | 'color' | 'model' | 'scale'> & Partial<Def>): Def => ({
  ...d,
  clips: CUBE_CLIPS,
  // Theo README của bộ model: Run đi 2.24 m/s.
  moveSpeed: 2.24,
  pixelArt: true,
  shadow: 0.3 * d.scale,
})

const LAND = { idle: 'idle', move: 'walk', trick: 'gesture' }
const SWIM = { idle: 'swimIdle', move: 'swim' }
const FLY = { idle: 'fly', move: 'fly' }
const cozy = (file: string, thumb: string, d: Pick<Def, 'name' | 'emoji' | 'color'> & Partial<Def>): Def => ({
  model: `/models/cozy/${file}.glb`,
  thumb: `/images/characters/${thumb}.webp`,
  scale: 0.85,
  clips: LAND,
  moveSpeed: 1.4,
  maxTimeScale: 1.25,
  shadow: 0.45,
  ...d,
})

const DEFS = {
  chick: cube({ name: 'Gà Con', emoji: '🐥', color: '#ffd166', model: '/models/Chick.glb', thumb: '/images/characters/chick.webp', scale: 1.9 }),
  fox: cozy('Fox', 'fox', { name: 'Cáo Nhỏ', emoji: '🦊', color: '#ff7a3d' }),
  redPanda: cozy('RedPanda', 'red-panda', { name: 'Gấu Trúc Đỏ', emoji: '🐾', color: '#d9572b' }),
  lamb: cozy('Lamb', 'lamb', { name: 'Cừu Non', emoji: '🐑', color: '#f2c9a0' }),
  fawn: cozy('Fawn', 'fawn', { name: 'Nai Con', emoji: '🦌', color: '#c9804a' }),
  raccoon: cozy('Raccoon', 'raccoon', { name: 'Gấu Mèo', emoji: '🦝', color: '#8d8a9b' }),
  otter: cozy('Otter', 'otter', { name: 'Rái Cá', emoji: '🦦', color: '#a0705a', scale: 0.75 }),
  capybara: cozy('Capybara', 'capybara', { name: 'Chuột Lang Nước', emoji: '🍊', color: '#b5774a' }),
  axolotl: cozy('Axolotl', 'axolotl', { name: 'Kỳ Giông Hồng', emoji: '🦎', color: '#7aa8ff', scale: 0.7 }),
  lion: cozy('Lion', 'lion', { name: 'Sư Tử Con', emoji: '🦁', color: '#f0a24a', scale: 0.9 }),
  elephant: cozy('Elephant', 'elephant', { name: 'Voi Con', emoji: '🐘', color: '#a7a9c4', scale: 0.95, moveSpeed: 1.6 }),
  giraffe: cozy('Giraffe', 'giraffe', { name: 'Hươu Cao Cổ', emoji: '🦒', color: '#f3b75b', scale: 1.05, moveSpeed: 1.6 }),
  polarBear: cozy('PolarBear', 'polar-bear', { name: 'Gấu Bắc Cực', emoji: '🐻‍❄️', color: '#c9b9a3', scale: 0.9 }),
  wolf: cozy('Wolf', 'wolf', { name: 'Sói Con', emoji: '🐺', color: '#7d7a86' }),
  walrus: cozy('Walrus', 'walrus', { name: 'Hải Mã', emoji: '🦭', color: '#a8603f', scale: 0.8, moveSpeed: 1.2 }),
  seal: cozy('Seal', 'seal', { name: 'Hải Cẩu', emoji: '🦭', color: '#8f98a8', scale: 0.7, clips: SWIM, moveSpeed: 1.6 }),
  turtle: cozy('Turtle', 'turtle', { name: 'Rùa Biển', emoji: '🐢', color: '#5fae5a', scale: 0.75, clips: SWIM, moveSpeed: 1.6 }),
  parrot: cozy('Parrot', 'parrot', { name: 'Vẹt Xanh', emoji: '🦜', color: '#59c45a', scale: 0.6, clips: FLY, hover: 0.9, moveSpeed: 4, maxTimeScale: 1.2 }),
  hummingbird: cozy('Hummingbird', 'hummingbird', { name: 'Chim Ruồi', emoji: '🐦', color: '#3fb7a0', scale: 0.5, clips: FLY, hover: 1, moveSpeed: 4, maxTimeScale: 1.2, clipSpeed: 0.55 }),
} satisfies Record<string, Def>

export type CharacterId = keyof typeof DEFS

export const CHARACTERS = Object.fromEntries(Object.entries(DEFS).map(([id, d]) => [id, { id, ...d }])) as Record<CharacterId, CharacterSpec>

export const CHARACTER_LIST: CharacterSpec[] = Object.values(CHARACTERS)

export const DEFAULT_CHARACTER: CharacterId = 'chick'

export function isCharacterId(v: unknown): v is CharacterId {
  return typeof v === 'string' && Object.hasOwn(CHARACTERS, v)
}

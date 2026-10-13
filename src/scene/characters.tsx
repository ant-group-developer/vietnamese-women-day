/**
 * Nhân vật dẫn đường: model GLB có rig + animation (bộ Cube Pets, assets/CubePets_Free).
 * Mỗi model có sẵn các clip Idle, Walk, Run (lặp), Jump, Trick (một lần), hướng mặt +Z, đơn vị mét.
 */
export type CharacterId = 'bunny' | 'chick' | 'ladybug'

export interface CharacterSpec {
  id: CharacterId
  name: string
  emoji: string
  /** Câu giới thiệu ngắn ở màn chọn nhân vật. */
  tagline: string
  /** Màu nhấn cho thẻ chọn. */
  color: string
  /** Đường dẫn GLB trong public/. */
  model: string
  /** Hệ số phóng to để nhân vật cao tương xứng với nhà (nhà cao ~2.3). */
  scale: number
  /** Tốc độ clip Run tính theo mét/giây ở scale 1 (theo README của bộ model). */
  runSpeed: number
}

export const CHARACTERS: Record<CharacterId, CharacterSpec> = {
  bunny: {
    id: 'bunny',
    name: 'Thỏ Bông',
    emoji: '🐰',
    tagline: 'Tai dài, nhảy chân sáo, thích cà rốt và lời khen.',
    color: '#ff8fb3',
    model: '/models/Bunny.glb',
    scale: 1.55,
    runSpeed: 2.24,
  },
  chick: {
    id: 'chick',
    name: 'Gà Con',
    emoji: '🐥',
    tagline: 'Lạch bạch, ồn ào, vui nhất đảo.',
    color: '#ffd166',
    model: '/models/Chick.glb',
    scale: 1.9,
    runSpeed: 2.24,
  },
  ladybug: {
    id: 'ladybug',
    name: 'Bọ Rùa',
    emoji: '🐞',
    tagline: 'Nhỏ xinh, chăm chỉ, mang may mắn tới từng phòng ban.',
    color: '#ff5c5c',
    model: '/models/Ladybug.glb',
    scale: 2.4,
    runSpeed: 2.24,
  },
}

export const CHARACTER_LIST: CharacterSpec[] = [CHARACTERS.bunny, CHARACTERS.chick, CHARACTERS.ladybug]

export const DEFAULT_CHARACTER: CharacterId = 'bunny'

export function isCharacterId(v: unknown): v is CharacterId {
  return typeof v === 'string' && v in CHARACTERS
}

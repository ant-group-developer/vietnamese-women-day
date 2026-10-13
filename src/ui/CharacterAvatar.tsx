import type { CharacterSpec } from '../scene/characters'

/** Ảnh đại diện nhân vật: ảnh thumbnail nếu có, không thì emoji. */
export function CharacterAvatar({ spec }: { spec: CharacterSpec }) {
  if (spec.thumb) return <img className="character-thumb" src={spec.thumb} alt="" draggable={false} />
  return <span className="character-emoji">{spec.emoji}</span>
}

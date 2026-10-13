import { useMemo } from 'react'
import { isMobile } from '../scene/utils'

const EMOJI = ['🌸', '🌷', '💮', '🌺', '🩷']

export function Petals() {
  const petals = useMemo(() => {
    const n = isMobile ? 10 : 18
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: -Math.random() * 14,
      duration: 10 + Math.random() * 8,
      size: 16 + Math.random() * 14,
      emoji: EMOJI[Math.floor(Math.random() * EMOJI.length)],
    }))
  }, [])

  return (
    <div className="petals" aria-hidden>
      {petals.map((p) => (
        <span
          key={p.id}
          className="petal"
          style={{
            left: `${p.left}%`,
            fontSize: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  )
}

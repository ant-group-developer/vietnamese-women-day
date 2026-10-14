import { useState } from 'react'
import { motion } from 'framer-motion'
import { CHARACTER_LIST, type CharacterId } from '../scene/characters'
import { useJourney } from '../store/useJourney'
import { playSfx } from '../audio/sound'
import { useGLTF } from '@react-three/drei'
import { CharacterAvatar } from './CharacterAvatar'

/** Màn chọn nhân vật khi vào web. Nhân vật được lưu; tích "không hiển thị lại" thì các lần sau bỏ qua màn này. */
export function CharacterPick() {
  const initial = useJourney((s) => s.character)
  const confirmCharacter = useJourney((s) => s.confirmCharacter)
  const [picked, setPicked] = useState<CharacterId>(initial)
  const [dontShow, setDontShow] = useState(false)
  const spec = CHARACTER_LIST.find((c) => c.id === picked)!

  return (
    <motion.div className="intro pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.5 }}>
      <motion.div className="pick-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
        <div className="intro-badge">Bước 1 / 1</div>
        <h1>Chọn bạn đồng hành 🐾</h1>
        <p>Ai sẽ cùng bạn đi thăm các chị em hôm nay?</p>

        <div className="character-grid pick-grid">
          {CHARACTER_LIST.map((c, i) => (
            <motion.button
              key={c.id}
              type="button"
              className={`character-card ${picked === c.id ? 'selected' : ''}`}
              style={{ ['--c' as string]: c.color }}
              onClick={() => {
                playSfx('pop')
                setPicked(c.id)
                useGLTF.preload(c.model)
              }}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.03, type: 'spring', stiffness: 260, damping: 18 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                className="character-avatar"
                animate={picked === c.id ? { y: [0, -8, 0], rotate: [0, -8, 8, 0] } : { y: 0, rotate: 0 }}
                transition={{ duration: 1.6, repeat: picked === c.id ? Infinity : 0 }}
              >
                <CharacterAvatar spec={c} />
              </motion.span>
              <span className="character-name">{c.name}</span>
              {picked === c.id && <span className="character-check">✓</span>}
            </motion.button>
          ))}
        </div>

        <label className="tutorial-check pick-check">
          <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
          Không hiển thị lại lần sau
        </label>
        <motion.button className="btn big" onClick={() => confirmCharacter(picked, dontShow)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
          Đi cùng {spec.name} 🌸
        </motion.button>
        <div className="intro-hint">Bạn có thể đổi nhân vật bất cứ lúc nào ở nút 🐾 góc trên.</div>
      </motion.div>
    </motion.div>
  )
}

import { AnimatePresence, motion } from 'framer-motion'
import { CHARACTER_LIST } from '../scene/characters'
import { useJourney } from '../store/useJourney'
import { playSfx } from '../audio/sound'
import { VolumeIcon } from './icons'

/** Hộp cài đặt: chọn nhân vật dẫn đường và chỉnh âm lượng. */
export function SettingsModal() {
  const open = useJourney((s) => s.settingsOpen)
  const current = useJourney((s) => s.character)
  const volume = useJourney((s) => s.volume)
  const audioOn = useJourney((s) => s.audioOn)
  const { setCharacter, closeSettings, setVolume, toggleAudio } = useJourney.getState()
  const shown = audioOn ? volume : 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeSettings}
        >
          <motion.div
            className="settings-card"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          >
            <button className="modal-close settings-close" onClick={closeSettings} aria-label="Đóng">
              ✕
            </button>
            <h2>Chọn nhân vật dẫn đường</h2>
            <p className="settings-sub">Bạn thích ai đi cùng mình hôm nay?</p>
            <div className="character-grid">
              {CHARACTER_LIST.map((c) => (
                <motion.button
                  key={c.id}
                  type="button"
                  className={`character-card ${current === c.id ? 'selected' : ''}`}
                  style={{ ['--c' as string]: c.color }}
                  onClick={() => {
                    playSfx('pop')
                    setCharacter(c.id)
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="character-emoji">{c.emoji}</span>
                  <span className="character-name">{c.name}</span>
                  {current === c.id && <span className="character-check">✓</span>}
                </motion.button>
              ))}
            </div>
            <div className="volume-row">
              <button
                type="button"
                className="volume-icon"
                onClick={toggleAudio}
                aria-label={audioOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
              >
                <VolumeIcon level={shown} />
              </button>
              <input
                type="range"
                className="volume-slider"
                min={0}
                max={100}
                step={1}
                value={Math.round(shown * 100)}
                style={{ ['--p' as string]: `${shown * 100}%` }}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                aria-label="Âm lượng"
              />
              <span className="volume-value">{Math.round(shown * 100)}%</span>
            </div>
            <button className="btn" onClick={closeSettings}>
              Xong 💕
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

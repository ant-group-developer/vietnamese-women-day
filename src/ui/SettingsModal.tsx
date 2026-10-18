import { AnimatePresence, motion } from 'framer-motion'
import { CHARACTER_LIST } from '../scene/characters'
import { CharacterAvatar } from './CharacterAvatar'
import { useJourney } from '../store/useJourney'
import { playSfx } from '../audio/sound'
import { VolumeIcon } from './icons'
import { trackEvent } from '../utils/ga'

/** Hộp cài đặt: mở riêng phần chọn nhân vật dẫn đường, phần chỉnh âm lượng hoặc ảnh kỷ niệm vừa chụp. */
export function SettingsModal() {
  const panel = useJourney((s) => s.settingsOpen)
  const { closeSettings } = useJourney.getState()

  return (
    <AnimatePresence>
      {panel && (
        <motion.div
          className="modal-backdrop settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeSettings}
        >
          <motion.div
            key={panel}
            className={`settings-card ${panel === 'audio' ? 'audio-card' : ''} ${panel === 'photo' ? 'photo-card' : ''}`}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          >
            <button className="modal-close settings-close" onClick={closeSettings} aria-label="Đóng">
              ✕
            </button>
            {panel === 'photo' ? (
              <PhotoPanel />
            ) : (
              <>
                {panel === 'character' ? <CharacterPanel /> : <AudioPanel />}
                <button className="btn" onClick={closeSettings}>
                  Xong 💕
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CharacterPanel() {
  const current = useJourney((s) => s.character)
  const { setCharacter } = useJourney.getState()

  return (
    <>
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
            <CharacterAvatar spec={c} />
            <span className="character-name">{c.name}</span>
            {current === c.id && <span className="character-check">✓</span>}
          </motion.button>
        ))}
      </div>
    </>
  )
}

function AudioPanel() {
  const volume = useJourney((s) => s.volume)
  const audioOn = useJourney((s) => s.audioOn)
  const { setVolume, toggleAudio } = useJourney.getState()
  const shown = audioOn ? volume : 0

  return (
    <>
      <h2>Âm lượng</h2>
      <p className="settings-sub">Nhạc nền, hiệu ứng và video</p>
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
    </>
  )
}

const PHOTO_NAME = 'anh-ky-niem-20-10.jpg'

function PhotoPanel() {
  const photo = useJourney((s) => s.photo)
  const { closeSettings } = useJourney.getState()
  if (!photo) return null
  const file = new File([photo.blob], PHOTO_NAME, { type: photo.blob.type })
  // Điện thoại: mở bảng chia sẻ của hệ thống (Zalo, Messenger, lưu vào Ảnh...).
  const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
  const share = async () => {
    try {
      await navigator.share({ files: [file], title: 'Ảnh kỷ niệm 20/10' })
      trackEvent('photo_share')
    } catch {
      /* người dùng đóng bảng chia sẻ */
    }
  }

  return (
    <>
      <h2>Ảnh kỷ niệm 📸</h2>
      <p className="settings-sub">Lưu lại khoảnh khắc trên đảo hoa nhé!</p>
      <img className="photo-preview" src={photo.url} alt="Ảnh kỷ niệm 20/10" />
      <div className="photo-actions">
        {canShare && (
          <button className="btn" onClick={share}>
            Chia sẻ 💌
          </button>
        )}
        <a
          className={`btn ${canShare ? 'ghost' : ''}`}
          href={photo.url}
          download={PHOTO_NAME}
          onClick={() => trackEvent('photo_download')}
        >
          Tải ảnh ⬇️
        </a>
        <button className="btn ghost" onClick={closeSettings}>
          Chụp lại 🔄
        </button>
      </div>
    </>
  )
}

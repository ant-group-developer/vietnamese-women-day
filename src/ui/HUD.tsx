import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { departments, GIFT_INDEX, STATION_COUNT } from '../data/departments'
import { nextStationIndex, useJourney } from '../store/useJourney'
import { SettingsIcon } from './icons'

export function HUD() {
  const phase = useJourney((s) => s.phase)
  const visited = useJourney((s) => s.visited)
  const targetIndex = useJourney((s) => s.targetIndex)
  const openedIndex = useJourney((s) => s.openedIndex)
  const currentIndex = useJourney((s) => s.currentIndex)
  const lastFlowerAt = useJourney((s) => s.lastFlowerAt)
  const lastVisitedIndex = useJourney((s) => s.lastVisitedIndex)
  const tutorialOpen = useJourney((s) => s.tutorialOpen)
  const { goTo, openGift, openSettings } = useJourney.getState()

  const [popIndex, setPopIndex] = useState<number | null>(null)
  const [flowerToast, setFlowerToast] = useState<string | null>(null)
  useEffect(() => {
    if (!lastFlowerAt) return
    setPopIndex(lastVisitedIndex)
    const remaining = STATION_COUNT - useJourney.getState().visited.filter(Boolean).length
    setFlowerToast(
      remaining > 0
        ? `+1 bông hoa! Còn ${remaining} phòng ban nữa là mở được quà 🎁`
        : 'Tuyệt vời! Đủ hoa rồi, hộp quà đã mở khoá 🎉',
    )
    const t = setTimeout(() => setPopIndex(null), 700)
    const t2 = setTimeout(() => setFlowerToast(null), 3500)
    return () => {
      clearTimeout(t)
      clearTimeout(t2)
    }
  }, [lastFlowerAt, lastVisitedIndex])

  if (phase !== 'journey' && phase !== 'gift') return null

  const count = visited.filter(Boolean).length
  const next = nextStationIndex(visited)
  const idle = targetIndex === null && openedIndex === null

  let action: { label: string; onClick: () => void; cls?: string } | null = null
  if (idle) {
    if (phase === 'gift') action = { label: 'Mở quà 🎁', onClick: openGift, cls: 'gift' }
    else if (next < STATION_COUNT) action = { label: `Đi tiếp → ${departments[next].name}`, onClick: () => goTo(next) }
    else if (currentIndex !== GIFT_INDEX) action = { label: 'Đến hộp quà 🎁', onClick: () => goTo(GIFT_INDEX), cls: 'gift' }
  }

  let toast: string | null = null
  if (tutorialOpen) {
    toast = null
  } else if (flowerToast) {
    toast = flowerToast
  } else if (targetIndex !== null) {
    toast = targetIndex === GIFT_INDEX ? 'Đang chạy tới hộp quà... 🎁' : `Đang đi tới ${departments[targetIndex].name}...`
  } else if (count === 0 && currentIndex === -1) {
    toast = `Ghé thăm đủ ${STATION_COUNT} phòng ban để mở hộp quà bí mật 🎁`
  } else if (phase === 'gift') {
    toast = 'Đủ hoa rồi! Bấm vào hộp quà nào 🎉'
  }

  return (
    <div className="hud">
      <div className="hud-top">
        <motion.div className="hud-progress" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="label">
            Bó hoa: {count}/{STATION_COUNT} · {count < STATION_COUNT ? `đủ ${STATION_COUNT} hoa sẽ mở quà 🎁` : 'đã mở khoá quà 🎉'}
          </div>
          <div className="hud-flowers">
            {departments.map((d, i) => (
              <span key={d.slug} className={`${visited[i] ? '' : 'empty'} ${popIndex === i ? 'pop' : ''}`} title={d.name}>
                🌸
              </span>
            ))}
          </div>
        </motion.div>
        <div className="hud-actions">
          <button className="icon-btn" onClick={openSettings} title="Cài đặt: nhân vật, âm lượng" aria-label="Cài đặt">
            <SettingsIcon />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            className="hud-toast"
            initial={{ opacity: 0, y: -10, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -10, x: '-50%' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hud-bottom">
        <AnimatePresence>
          {action && (
            <motion.button
              key={action.label}
              className={`btn ${action.cls ?? ''}`}
              onClick={action.onClick}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
            >
              {action.label}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

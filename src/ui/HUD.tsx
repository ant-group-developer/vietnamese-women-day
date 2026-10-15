import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { departments, GIFT_INDEX, STATION_COUNT } from '../data/departments'
import { bonusAtStation, bonusTitle, droppedBonuses, nextStationIndex, useJourney } from '../store/useJourney'
import { FilmIcon, PawIcon, VolumeIcon } from './icons'
import { keyboardEnabled } from '../scene/keyboard'

export function HUD() {
  const phase = useJourney((s) => s.phase)
  const visited = useJourney((s) => s.visited)
  const targetIndex = useJourney((s) => s.targetIndex)
  const openedIndex = useJourney((s) => s.openedIndex)
  const currentIndex = useJourney((s) => s.currentIndex)
  const lastFlowerAt = useJourney((s) => s.lastFlowerAt)
  const lastVisitedIndex = useJourney((s) => s.lastVisitedIndex)
  const tourOpen = useJourney((s) => s.tourOpen)
  const giftHintAt = useJourney((s) => s.giftHintAt)
  const volume = useJourney((s) => s.volume)
  const audioOn = useJourney((s) => s.audioOn)
  const bonuses = useJourney((s) => s.bonuses)
  const bonusLandedAt = useJourney((s) => s.bonusLandedAt)
  const { goTo, openGift, openSettings, playBonus, tapBonus } = useJourney.getState()

  const [popIndex, setPopIndex] = useState<number | null>(null)
  const [flowerToast, setFlowerToast] = useState<string | null>(null)
  useEffect(() => {
    if (!lastFlowerAt) return
    setPopIndex(lastVisitedIndex)
    const remaining = STATION_COUNT - useJourney.getState().visited.filter(Boolean).length
    setFlowerToast(
      remaining > 0
        ? `+1 bông hoa! Còn ${remaining} phòng ban nữa là mở được quà\u00a0🎁`
        : 'Tuyệt vời! Đủ hoa rồi, hộp quà đã mở khoá 🎉',
    )
    const t = setTimeout(() => setPopIndex(null), 700)
    const t2 = setTimeout(() => setFlowerToast(null), 3500)
    return () => {
      clearTimeout(t)
      clearTimeout(t2)
    }
  }, [lastFlowerAt, lastVisitedIndex])

  // Bấm hộp quà lúc còn khoá: nhắc còn bao nhiêu phòng ban.
  const [giftHint, setGiftHint] = useState<string | null>(null)
  useEffect(() => {
    if (!giftHintAt) return
    const remaining = STATION_COUNT - useJourney.getState().visited.filter(Boolean).length
    setGiftHint(`🔒 Hộp quà còn khoá! Ghé thêm ${remaining} phòng ban nữa nhé`)
    const t = setTimeout(() => setGiftHint(null), 2500)
    return () => clearTimeout(t)
  }, [giftHintAt])

  // Quà bóng bay vừa đáp xuống: gọi người xem bấm vào.
  const [bonusToast, setBonusToast] = useState(false)
  useEffect(() => {
    if (!bonusLandedAt) return
    setBonusToast(true)
    const t = setTimeout(() => setBonusToast(false), 5000)
    return () => clearTimeout(t)
  }, [bonusLandedAt])

  // Nhiều video bất ngờ: nút 🎬 mở danh sách để chọn video xem lại.
  const [bonusMenu, setBonusMenu] = useState(false)
  useEffect(() => {
    if (!bonusMenu) return
    const close = () => setBonusMenu(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [bonusMenu])

  if (phase !== 'journey' && phase !== 'gift') return null

  const count = visited.filter(Boolean).length
  const next = nextStationIndex(visited)
  const idle = targetIndex === null && openedIndex === null

  // Quà bóng bay chưa mở mà nhân vật đang đứng cạnh: nút dưới cùng gợi ý mở quà trước.
  const waitingSlot = bonusAtStation(bonuses, currentIndex, ['ready'])
  const bonusWaiting = waitingSlot >= 0
  const anyBonusReady = bonuses.some((b) => b.stage === 'ready')
  const dropped = droppedBonuses(bonuses)
  let action: { label: string; onClick: () => void; cls?: string } | null = null
  if (idle) {
    if (bonusWaiting) action = { label: 'Mở quà bất ngờ 🎈', onClick: () => tapBonus(waitingSlot), cls: 'gift' }
    else if (phase === 'gift') action = { label: 'Mở quà\u00a0🎁', onClick: openGift, cls: 'gift' }
    else if (next < STATION_COUNT) action = { label: `Đi tiếp → ${departments[next].name}`, onClick: () => goTo(next) }
    else if (currentIndex !== GIFT_INDEX) action = { label: 'Đến hộp quà\u00a0🎁', onClick: () => goTo(GIFT_INDEX), cls: 'gift' }
  }

  let toast: string | null = null
  if (tourOpen) {
    toast = null
  } else if (giftHint) {
    toast = giftHint
  } else if (bonusToast && anyBonusReady) {
    toast = 'Có quà bất ngờ! Bấm vào để mở nhé 🎈'
  } else if (flowerToast) {
    toast = flowerToast
  } else if (targetIndex !== null) {
    toast = targetIndex === GIFT_INDEX ? 'Đang chạy tới hộp quà...\u00a0🎁' : `Đang đi tới ${departments[targetIndex].name}...`
  } else if (count === 0 && currentIndex === -1) {
    toast = `Ghé thăm đủ ${STATION_COUNT} phòng ban để mở hộp quà bí mật\u00a0🎁`
  } else if (bonusWaiting) {
    toast = 'Bấm vào hộp quà bóng bay để mở nhé 🎈'
  } else if (phase === 'gift') {
    toast = 'Đủ hoa rồi! Bấm vào hộp quà nào 🎉'
  }

  return (
    <div className="hud">
      <div className="hud-top">
        <motion.div className="hud-progress" data-tour="flowers" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="label">
            Bó hoa: {count}/{STATION_COUNT} · {count < STATION_COUNT ? `đủ ${STATION_COUNT} hoa sẽ mở quà\u00a0🎁` : 'đã mở khoá quà\u00a0🎉'}
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
          <button className="icon-btn" onClick={() => openSettings('character')} data-tour="character" title="Đổi nhân vật dẫn đường" aria-label="Đổi nhân vật">
            <PawIcon />
          </button>
          <button className="icon-btn" onClick={() => openSettings('audio')} data-tour="audio" title="Âm lượng" aria-label="Âm lượng">
            <VolumeIcon level={audioOn ? volume : 0} />
          </button>
          {dropped.length > 0 && (
            <div className="bonus-menu-wrap" onPointerDown={(e) => e.stopPropagation()}>
              <button
                className={`icon-btn ${dropped.some((i) => bonuses[i].stage !== 'opened') ? 'bonus-new' : ''} ${bonusMenu ? 'active' : ''}`}
                onClick={() => (dropped.length === 1 ? playBonus(dropped[0]) : setBonusMenu((v) => !v))}
                data-tour="bonus"
                title="Xem video bất ngờ"
                aria-label="Xem video bất ngờ"
              >
                <FilmIcon />
              </button>
              <AnimatePresence>
                {bonusMenu && (
                  <motion.div
                    className="bonus-menu"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    {dropped.map((i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setBonusMenu(false)
                          playBonus(i)
                        }}
                      >
                        {bonuses[i].stage === 'opened' ? '🎬' : '🎈'} {bonusTitle(i)}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
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

      {keyboardEnabled && !tourOpen && (
        <div className="kbd-hint" aria-hidden>
          <kbd>←</kbd>
          <kbd>→</kbd>/ <kbd>A</kbd>
          <kbd>D</kbd> di chuyển
        </div>
      )}

      <div className="hud-bottom">
        {/* Đổi nút: nút cũ ẩn hẳn rồi nút mới mới hiện, tránh hai nút chen nhau trên màn hẹp. */}
        <AnimatePresence mode="wait">
          {action && (
            <motion.button
              key={action.label}
              className={`btn ${action.cls ?? ''}`}
              onClick={action.onClick}
              data-tour="action"
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

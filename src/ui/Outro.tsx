import { useEffect } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { config } from '../config'
import { useJourney } from '../store/useJourney'

export function Outro() {
  const continueJourney = useJourney((s) => s.continueJourney)
  const playVideo = useJourney((s) => s.playVideo)
  const playBonus = useJourney((s) => s.playBonus)
  const hasBonus = useJourney((s) => s.bonusStage !== 'none')

  useEffect(() => {
    const end = Date.now() + 1800
    const tick = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors: ['#ff7aa8', '#ffd166', '#c77dff'], zIndex: 60 })
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors: ['#ff7aa8', '#8ed6ff', '#ffffff'], zIndex: 60 })
      if (Date.now() < end) requestAnimationFrame(tick)
    }
    tick()
  }, [])

  return (
    <motion.div className="outro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.7 }}>
        <motion.div
          className="outro-icon"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        >
          💐
        </motion.div>
        <h1>{config.outro.title}</h1>
        <p>{config.outro.message}</p>
        <div className="actions">
          <button className="btn" onClick={playVideo}>
            Xem lại video 🎬
          </button>
          {hasBonus && (
            <button className="btn ghost" onClick={playBonus}>
              Video bất ngờ 🎈
            </button>
          )}
          <button className="btn ghost" onClick={continueJourney}>
            Tiếp tục dạo chơi 🐾
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

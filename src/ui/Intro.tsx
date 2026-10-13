import { motion } from 'framer-motion'
import { config } from '../config'
import { useJourney } from '../store/useJourney'
import { startBgm } from '../audio/sound'

export function Intro() {
  const start = useJourney((s) => s.start)

  const onStart = () => {
    startBgm() // gọi trong sự kiện click để trình duyệt cho phép phát âm thanh
    start()
  }

  return (
    <motion.div className="intro" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.6 }}>
      <motion.div className="intro-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
        <motion.div
          className="intro-mascot"
          animate={{ y: [0, -14, 0], rotate: [0, -6, 6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          🐱
        </motion.div>
        <div className="intro-badge">{config.companyName} · 20/10</div>
        <h1>{config.title}</h1>
        <p>{config.subtitle}</p>
        <motion.button className="btn big" onClick={onStart} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
          Bắt đầu hành trình 🌸
        </motion.button>
        <div className="intro-hint">
          {config.mascotName} sẽ dẫn bạn đi. {config.introHint}
        </div>
      </motion.div>
    </motion.div>
  )
}

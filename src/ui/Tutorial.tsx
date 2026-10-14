import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { STATION_COUNT } from '../data/departments'
import { useJourney } from '../store/useJourney'

const STEPS = [
  { icon: '🏠', title: 'Ghé thăm phòng ban', text: 'Bấm vào bất kỳ ngôi nhà nào, bạn đồng hành sẽ chạy tới và mở thiệp giới thiệu các chị em.' },
  { icon: '🔄', title: 'Xoay và zoom bản đồ', text: 'Kéo để xoay, cuộn chuột hoặc chụm hai ngón để zoom. Hoặc dùng các nút ở góc phải dưới.' },
  { icon: '🌸', title: `Thu đủ ${STATION_COUNT} bông hoa`, text: 'Mỗi phòng ban ghé thăm tặng bạn 1 bông hoa. Đủ hoa là hộp quà bí mật sẽ mở ra\u00a0🎁' },
]

export function Tutorial() {
  const open = useJourney((s) => s.tutorialOpen)
  const closeTutorial = useJourney((s) => s.closeTutorial)
  const [dontShow, setDontShow] = useState(false)

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop tutorial-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="tutorial-card"
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          >
            <h2>Cách chơi 🐾</h2>
            <div className="tutorial-steps">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.title}
                  className="tutorial-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.12 }}
                >
                  <div className="tutorial-icon">{s.icon}</div>
                  <div>
                    <div className="tutorial-title">{s.title}</div>
                    <div className="tutorial-text">{s.text}</div>
                  </div>
                </motion.div>
              ))}
            </div>
            <label className="tutorial-check">
              <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
              Không hiển thị lại lần sau
            </label>
            <button className="btn" onClick={() => closeTutorial(dontShow)}>
              Đã hiểu, bắt đầu thôi! 🌸
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

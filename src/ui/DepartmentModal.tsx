import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { departments, fallbackAvatar, type Member } from '../data/departments'
import { useJourney } from '../store/useJourney'
import { playSfx } from '../audio/sound'
import { shade } from '../scene/utils'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from './icons'

function photoSrc(m: Member) {
  return m.photo || fallbackAvatar(m.name)
}

function MemberCard({ m, i, onOpen }: { m: Member; i: number; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      className="member"
      onClick={onOpen}
      title="Bấm để xem ảnh lớn"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.15 + i * 0.06, type: 'spring', stiffness: 260, damping: 18 }}
    >
      <img
        className="photo"
        src={photoSrc(m)}
        alt={m.name}
        loading="lazy"
        onError={(e) => {
          const img = e.currentTarget
          if (!img.src.startsWith('data:')) img.src = fallbackAvatar(m.name)
        }}
      />
      <div className="name">{m.name}</div>
      {m.title && <div className="title">{m.title}</div>}
    </motion.button>
  )
}

interface LightboxProps {
  members: Member[]
  index: number | null
  onNavigate: (index: number) => void
  onClose: () => void
}

/** Xem ảnh lớn, chuyển trái/phải bằng nút, phím mũi tên hoặc vuốt. */
function Lightbox({ members, index, onNavigate, onClose }: LightboxProps) {
  const [dir, setDir] = useState(0)
  const touchX = useRef<number | null>(null)
  const open = index !== null
  const count = members.length
  const member = open ? members[index] : null

  const go = (step: number) => {
    if (index === null || count < 2) return
    setDir(step)
    onNavigate((index + step + count) % count)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, count])

  return (
    <AnimatePresence>
      {member && (
        <motion.div
          className="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX
          }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            touchX.current = null
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
          }}
        >
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.figure
              key={member.name + index}
              custom={dir}
              initial={{ x: dir * 80, scale: 0.9, opacity: 0 }}
              animate={{ x: 0, scale: 1, opacity: 1 }}
              exit={{ x: -dir * 80, scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={photoSrc(member)} alt={member.name} draggable={false} />
              <figcaption>
                <strong>{member.name}</strong>
                {member.title && <span>{member.title}</span>}
                {count > 1 && (
                  <small>
                    {index! + 1} / {count}
                  </small>
                )}
              </figcaption>
            </motion.figure>
          </AnimatePresence>

          {count > 1 && (
            <>
              <button
                className="icon-btn lightbox-nav prev"
                aria-label="Ảnh trước"
                onClick={(e) => {
                  e.stopPropagation()
                  go(-1)
                }}
              >
                <ChevronLeftIcon />
              </button>
              <button
                className="icon-btn lightbox-nav next"
                aria-label="Ảnh sau"
                onClick={(e) => {
                  e.stopPropagation()
                  go(1)
                }}
              >
                <ChevronRightIcon />
              </button>
            </>
          )}
          <button className="icon-btn lightbox-close" onClick={onClose} aria-label="Đóng">
            <CloseIcon />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function DepartmentModal() {
  const openedIndex = useJourney((s) => s.openedIndex)
  const visited = useJourney((s) => s.visited)
  const closeModal = useJourney((s) => s.closeModal)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const dept = openedIndex === null ? null : departments[openedIndex]
  const alreadyVisited = openedIndex !== null && visited[openedIndex]

  const close = () => {
    playSfx('pop')
    setLightbox(null)
    closeModal()
  }

  return (
    <>
      <AnimatePresence>
        {dept && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            <motion.div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 60, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            >
              <div className="modal-head" style={{ background: `linear-gradient(135deg, ${dept.color}, ${shade(dept.color, -0.2)})` }}>
                <button className="modal-close" onClick={close} aria-label="Đóng">
                  ✕
                </button>
                <div className="title-row">
                  <motion.div className="icon" animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}>
                    {dept.icon}
                  </motion.div>
                  <h2>{dept.name}</h2>
                </div>
                <p>{dept.message}</p>
              </div>
              <div className="modal-body">
                <div className="members" data-count={Math.min(dept.members.length, 4)}>
                  {dept.members.map((m, i) => (
                    <MemberCard key={m.name + i} m={m} i={i} onOpen={() => setLightbox(i)} />
                  ))}
                </div>
                <div className="members-hint">Bấm vào ảnh để xem lớn hơn 🔍</div>
              </div>
              <div className="modal-foot">
                <button className="btn" onClick={close}>
                  {alreadyVisited ? 'Đóng lại 💕' : 'Nhận hoa 🌸'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Lightbox members={dept?.members ?? []} index={lightbox} onNavigate={setLightbox} onClose={() => setLightbox(null)} />
    </>
  )
}

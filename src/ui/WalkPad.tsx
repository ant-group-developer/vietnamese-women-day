import { useEffect, useState } from 'react'
import { keyboard } from '../scene/keyboard'

const Arrow = ({ flip }: { flip?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden style={flip ? { transform: 'scaleX(-1)' } : undefined}>
    <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Hai nút giữ để đi trên màn cảm ứng (thay cho phím A/D): giữ ◀ đi lùi, giữ ▶ đi tới dọc đường,
 * qua cầu treo sang các đảo phụ. Ghi vào cùng `keyboard.dir` mà Character đọc mỗi frame.
 */
export function WalkPad() {
  const [held, setHeld] = useState(0)

  // Gỡ nút (đóng tour, đổi màn) giữa lúc đang giữ thì dừng lại.
  useEffect(
    () => () => {
      keyboard.dir = 0
    },
    [],
  )

  const bind = (dir: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      // Giữ sự kiện nhả tay về nút này kể cả khi ngón tay trượt ra ngoài.
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* con trỏ không còn hoạt động */
      }
      keyboard.dir = dir
      setHeld(dir)
    },
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  })
  const release = () => {
    keyboard.dir = 0
    setHeld(0)
  }

  return (
    <div className="walk-pad" data-tour="walk">
      <button className={`icon-btn ${held === -1 ? 'held' : ''}`} {...bind(-1)} title="Giữ để đi lùi" aria-label="Giữ để đi lùi">
        <Arrow />
      </button>
      <button className={`icon-btn ${held === 1 ? 'held' : ''}`} {...bind(1)} title="Giữ để đi tới" aria-label="Giữ để đi tới">
        <Arrow flip />
      </button>
    </div>
  )
}

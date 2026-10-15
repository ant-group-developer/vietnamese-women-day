import { useEffect } from 'react'
import { STATION_COUNT } from '../data/departments'
import { useJourney } from '../store/useJourney'
import { layout, stationT } from './path'
import { isMobile } from './utils'

/** Điều khiển bằng bàn phím (chỉ trên máy tính): giữ ← → hoặc A D để đi dọc đường. */
export const keyboardEnabled = !isMobile && typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches

/** Hướng đi do bàn phím: -1 lùi, 1 tiến, 0 đứng yên. Character đọc mỗi frame. */
export const keyboard = { dir: 0 }

/** Khoảng cách để coi là đứng đúng tại trạm (cập nhật currentIndex). */
const AT = 0.35

/** Trạm (kể cả hộp quà) gần vị trí t nhất trong phạm vi `range` mét, -1 nếu không có. */
export function stationNear(t: number, range: number): number {
  let best = -1
  let bestD = range / layout.length
  for (let i = 0; i <= STATION_COUNT; i++) {
    const d = Math.abs(stationT(i) - t)
    if (d <= bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

export function stationAt(t: number): number {
  return stationNear(t, AT)
}

/** Có đang được phép điều khiển nhân vật không (không mở popup, tour, cài đặt...). */
export function canControl(): boolean {
  const s = useJourney.getState()
  return (s.phase === 'journey' || s.phase === 'gift') && s.openedIndex === null && !s.tourOpen && !s.settingsOpen
}

const LEFT = new Set(['ArrowLeft', 'KeyA'])
const RIGHT = new Set(['ArrowRight', 'KeyD'])

export function useKeyboardControls() {
  useEffect(() => {
    if (!keyboardEnabled) return
    const held = new Set<string>()
    const update = () => {
      keyboard.dir = ([...held].some((k) => RIGHT.has(k)) ? 1 : 0) - ([...held].some((k) => LEFT.has(k)) ? 1 : 0)
    }
    const typing = (e: KeyboardEvent) => {
      const el = e.target
      return el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
    }
    const onDown = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return
      if (LEFT.has(e.code) || RIGHT.has(e.code)) {
        if (!canControl()) return
        e.preventDefault()
        held.add(e.code)
        update()
      }
    }
    const onUp = (e: KeyboardEvent) => {
      held.delete(e.code)
      update()
    }
    const clear = () => {
      held.clear()
      update()
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', clear)
      clear()
    }
  }, [])
}

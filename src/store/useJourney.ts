import { create } from 'zustand'
import { GIFT_INDEX, STATION_COUNT } from '../data/departments'
import { mascot, stationT } from '../scene/path'

export type Phase = 'intro' | 'journey' | 'gift' | 'opening' | 'video' | 'outro'

interface JourneyState {
  phase: Phase
  /** Trạm mà nhân vật đang đứng (-1 = điểm xuất phát). GIFT_INDEX = hộp quà. */
  currentIndex: number
  /** Trạm đang đi tới, null nếu đứng yên. */
  targetIndex: number | null
  visited: boolean[]
  /** Trạm đang mở popup. */
  openedIndex: number | null
  audioOn: boolean
  /** Thời điểm yêu cầu đưa camera về góc nhìn mặc định sau nhân vật. */
  cameraResetAt: number
  /** Thời điểm và trạm vừa nhận hoa (để trigger animation HUD). */
  lastFlowerAt: number
  lastVisitedIndex: number
  /** Hộp hướng dẫn đang mở. */
  tutorialOpen: boolean

  start: () => void
  openTutorial: () => void
  closeTutorial: (dontShowAgain: boolean) => void
  goTo: (index: number) => void
  arrive: (index: number) => void
  closeModal: () => void
  openGift: () => void
  playVideo: () => void
  finishVideo: () => void
  restart: () => void
  toggleAudio: () => void
  resetCamera: () => void
}

const freshVisited = () => Array.from({ length: STATION_COUNT }, () => false)

const TUTORIAL_KEY = 'vn-woman-day:tutorial-seen'
function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === '1'
  } catch {
    return false
  }
}

export const useJourney = create<JourneyState>((set, get) => ({
  phase: 'intro',
  currentIndex: -1,
  targetIndex: null,
  visited: freshVisited(),
  openedIndex: null,
  audioOn: true,
  cameraResetAt: 0,
  lastFlowerAt: 0,
  lastVisitedIndex: -1,
  tutorialOpen: false,

  start: () => set({ phase: 'journey', tutorialOpen: !tutorialSeen() }),
  openTutorial: () => set({ tutorialOpen: true }),
  closeTutorial: (dontShowAgain) => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(TUTORIAL_KEY, '1')
      } catch {
        /* bỏ qua nếu trình duyệt chặn localStorage */
      }
    }
    set({ tutorialOpen: false })
  },

  goTo: (index) => {
    const { openedIndex, phase, targetIndex, currentIndex, tutorialOpen } = get()
    if (openedIndex !== null || tutorialOpen) return
    if (phase !== 'journey' && phase !== 'gift') return
    if (!isStationAvailable(get(), index)) return
    if (targetIndex === null && index === currentIndex) {
      // Đang đứng ngay trạm đó: mở luôn
      get().arrive(index)
      return
    }
    // Có thể đổi hướng ngay cả khi đang đi
    set({ targetIndex: index })
  },

  arrive: (index) => {
    if (index === GIFT_INDEX) {
      set({ currentIndex: index, targetIndex: null, phase: 'gift' })
      return
    }
    set({ currentIndex: index, targetIndex: null, openedIndex: index })
  },

  closeModal: () => {
    const { openedIndex, visited } = get()
    if (openedIndex === null) return
    const next = [...visited]
    const gained = !next[openedIndex]
    next[openedIndex] = true
    set({
      openedIndex: null,
      visited: next,
      lastFlowerAt: gained ? Date.now() : get().lastFlowerAt,
      lastVisitedIndex: openedIndex,
    })
  },

  openGift: () => {
    if (get().phase !== 'gift') return
    set({ phase: 'opening' })
  },

  playVideo: () => set({ phase: 'video' }),

  finishVideo: () => set({ phase: 'outro' }),

  restart: () =>
    set({
      phase: 'journey',
      currentIndex: -1,
      targetIndex: null,
      visited: freshVisited(),
      openedIndex: null,
      lastFlowerAt: 0,
      lastVisitedIndex: -1,
      cameraResetAt: Date.now(),
    }),

  toggleAudio: () => set((s) => ({ audioOn: !s.audioOn })),
  resetCamera: () => set({ cameraResetAt: Date.now() }),
}))

/**
 * Trạm gợi ý tiếp theo: trạm chưa thăm gần nhân vật nhất trên đường đi.
 * = GIFT_INDEX nếu đã thăm hết.
 */
export function nextStationIndex(visited: boolean[]): number {
  let best = -1
  let bestD = Infinity
  for (let i = 0; i < visited.length; i++) {
    if (visited[i]) continue
    const d = Math.abs(stationT(i) - mascot.t)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best === -1 ? GIFT_INDEX : best
}

/** Mọi trạm đều có thể đến bất cứ lúc nào; hộp quà chỉ mở khi đã thăm hết. */
export function isStationAvailable(state: Pick<JourneyState, 'visited'>, index: number): boolean {
  if (index === GIFT_INDEX) return state.visited.every(Boolean)
  return index >= 0 && index < STATION_COUNT
}

export type StationStatus = 'available' | 'visited'

export function stationStatus(visited: boolean[], index: number): StationStatus {
  return visited[index] ? 'visited' : 'available'
}

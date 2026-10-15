import { create } from 'zustand'
import { GIFT_INDEX, STATION_COUNT } from '../data/departments'
import { siteData } from '../data/siteData'
import { mascot, stationT } from '../scene/path'
import { DEFAULT_CHARACTER, isCharacterId, type CharacterId } from '../scene/characters'

export type Phase = 'intro' | 'pick' | 'journey' | 'gift' | 'opening' | 'video' | 'outro' | 'bonus'
/**
 * Quà bóng bay giữa hành trình: none → dropping (đang rơi) → ready (đã đáp, chờ bấm)
 * → opening (bóng bay bay đi, mở nắp) → opened (đã xem video, xem lại được).
 */
export type BonusStage = 'none' | 'dropping' | 'ready' | 'opening' | 'opened'
/** Hộp cài đặt: chọn nhân vật hoặc chỉnh âm lượng. */
export type SettingsPanel = 'character' | 'audio'

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
  /** Âm lượng tổng (0–1), áp cho nhạc nền, hiệu ứng và video. */
  volume: number
  /** Thời điểm yêu cầu đưa camera về góc nhìn mặc định sau nhân vật. */
  cameraResetAt: number
  /** Thời điểm và trạm vừa nhận hoa (để trigger animation HUD). */
  lastFlowerAt: number
  lastVisitedIndex: number
  /** Tour hướng dẫn đang chạy. */
  tourOpen: boolean
  /** Hộp cài đặt đang mở (null = đóng). */
  settingsOpen: SettingsPanel | null
  /** Nhân vật dẫn đường đã chọn. */
  character: CharacterId
  /** Thời điểm bấm vào hộp quà khi còn khoá (để lắc hộp và hiện nhắc nhở). */
  giftHintAt: number
  /** Bấm hộp quà từ xa: tới nơi thì tự mở. */
  openGiftOnArrive: boolean
  bonusStage: BonusStage
  /** Trạm mà quà bóng bay rơi xuống cạnh đó. */
  bonusIndex: number
  /** Thời điểm quà bóng bay đáp xuống (để HUD hiện thông báo). */
  bonusLandedAt: number
  /** Phase để quay về sau khi xem xong video bất ngờ. */
  bonusReturn: Phase

  start: () => void
  openTour: () => void
  closeTour: () => void
  openSettings: (panel: SettingsPanel) => void
  closeSettings: () => void
  setCharacter: (id: CharacterId) => void
  /** Chọn nhân vật ở màn đầu rồi vào hành trình; dontShowAgain thì lần sau bỏ qua màn chọn. */
  confirmCharacter: (id: CharacterId, dontShowAgain: boolean) => void
  goTo: (index: number) => void
  arrive: (index: number) => void
  closeModal: () => void
  openGift: () => void
  /** Bấm vào hộp quà: còn khoá thì nhắc, đủ hoa thì chạy tới và mở. */
  tapGift: () => void
  playVideo: () => void
  /** Quà bóng bay đã rơi chạm đất. */
  landBonus: () => void
  /** Bấm vào quà bóng bay: mở hộp rồi phát video bất ngờ. */
  tapBonus: () => void
  /** Phát video bất ngờ (cũng dùng cho nút xem lại). */
  playBonus: () => void
  finishBonus: () => void
  finishVideo: () => void
  restart: () => void
  toggleAudio: () => void
  setVolume: (v: number) => void
  resetCamera: () => void
}

const freshVisited = () => Array.from({ length: STATION_COUNT }, () => false)

/** Có video bất ngờ thì mới thả quà bóng bay. */
export const BONUS_ENABLED = !!siteData.bonus.src
const BONUS_FLOWERS = siteData.bonus.flowers

const TOUR_KEY = 'vn-woman-day:tour-seen'
const CHARACTER_KEY = 'vn-woman-day:character'
const PICK_SKIP_KEY = 'vn-woman-day:pick-skip'
const VOLUME_KEY = 'vn-woman-day:volume'
function savedVolume(): number {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '')
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1
  } catch {
    return 1
  }
}
function savedCharacter(): CharacterId {
  try {
    const v = localStorage.getItem(CHARACTER_KEY)
    return isCharacterId(v) ? v : DEFAULT_CHARACTER
  } catch {
    return DEFAULT_CHARACTER
  }
}
/** Bỏ qua màn chọn nhân vật? Chỉ khi người dùng đã tích "Không hiển thị lại lần sau". */
function pickSkipped(): boolean {
  try {
    return localStorage.getItem(PICK_SKIP_KEY) === '1'
  } catch {
    return false
  }
}
/**
 * Tour chỉ tự chạy ở lần đầu tiên vào web: đánh dấu đã xem ngay khi mở,
 * nên dù tải lại trang giữa chừng thì lần sau cũng không hiện nữa (vẫn xem lại được bằng nút ?).
 */
function takeFirstTour(): boolean {
  try {
    if (localStorage.getItem(TOUR_KEY) === '1') return false
    localStorage.setItem(TOUR_KEY, '1')
  } catch {
    /* bỏ qua nếu trình duyệt chặn localStorage */
  }
  return true
}

export const useJourney = create<JourneyState>((set, get) => ({
  phase: 'intro',
  currentIndex: -1,
  targetIndex: null,
  visited: freshVisited(),
  openedIndex: null,
  audioOn: true,
  volume: savedVolume(),
  cameraResetAt: 0,
  lastFlowerAt: 0,
  lastVisitedIndex: -1,
  tourOpen: false,
  settingsOpen: null,
  character: savedCharacter(),
  giftHintAt: 0,
  openGiftOnArrive: false,
  bonusStage: 'none',
  bonusIndex: -1,
  bonusLandedAt: 0,
  bonusReturn: 'journey',

  start: () => (pickSkipped() ? set({ phase: 'journey', tourOpen: takeFirstTour() }) : set({ phase: 'pick' })),
  openTour: () => set({ tourOpen: true }),
  closeTour: () => set({ tourOpen: false }),
  openSettings: (panel) => set({ settingsOpen: panel }),
  closeSettings: () => set({ settingsOpen: null }),
  confirmCharacter: (id, dontShowAgain) => {
    get().setCharacter(id)
    try {
      localStorage.setItem(PICK_SKIP_KEY, dontShowAgain ? '1' : '0')
    } catch {
      /* bỏ qua nếu trình duyệt chặn localStorage */
    }
    set({ phase: 'journey', tourOpen: takeFirstTour() })
  },
  setCharacter: (id) => {
    try {
      localStorage.setItem(CHARACTER_KEY, id)
    } catch {
      /* bỏ qua nếu trình duyệt chặn localStorage */
    }
    set({ character: id })
  },

  goTo: (index) => {
    const { openedIndex, phase, targetIndex, currentIndex, tourOpen, settingsOpen } = get()
    if (openedIndex !== null || tourOpen || settingsOpen) return
    if (phase !== 'journey' && phase !== 'gift') return
    if (!isStationAvailable(get(), index)) return
    if (targetIndex === null && index === currentIndex) {
      // Đang đứng ngay trạm đó: mở luôn
      get().arrive(index)
      return
    }
    // Có thể đổi hướng ngay cả khi đang đi
    set({ targetIndex: index, openGiftOnArrive: false })
  },

  arrive: (index) => {
    if (index === GIFT_INDEX) {
      const autoOpen = get().openGiftOnArrive
      set({ currentIndex: index, targetIndex: null, phase: 'gift', openGiftOnArrive: false })
      // Chờ camera quay về hộp quà một chút rồi mới mở.
      if (autoOpen) setTimeout(() => get().openGift(), 700)
      return
    }
    set({ currentIndex: index, targetIndex: null, openedIndex: index })
  },

  closeModal: () => {
    const { openedIndex, visited, bonusStage } = get()
    if (openedIndex === null) return
    const next = [...visited]
    const gained = !next[openedIndex]
    next[openedIndex] = true
    // Vừa đủ số hoa: thả quà bóng bay xuống cạnh trạm vừa thăm.
    const drop = BONUS_ENABLED && gained && bonusStage === 'none' && next.filter(Boolean).length >= BONUS_FLOWERS
    set({
      openedIndex: null,
      visited: next,
      lastFlowerAt: gained ? Date.now() : get().lastFlowerAt,
      lastVisitedIndex: openedIndex,
      ...(drop ? { bonusStage: 'dropping' as const, bonusIndex: openedIndex } : {}),
    })
  },

  openGift: () => {
    if (get().phase !== 'gift') return
    set({ phase: 'opening' })
  },

  tapGift: () => {
    const s = get()
    if (s.phase === 'gift') {
      s.openGift()
      return
    }
    if (s.phase !== 'journey' || s.openedIndex !== null || s.tourOpen || s.settingsOpen) return
    if (!isStationAvailable(s, GIFT_INDEX)) {
      set({ giftHintAt: Date.now() })
      return
    }
    s.goTo(GIFT_INDEX)
    if (get().phase === 'gift') get().openGift()
    else set({ openGiftOnArrive: true })
  },

  playVideo: () => set({ phase: 'video' }),

  landBonus: () => {
    if (get().bonusStage === 'dropping') set({ bonusStage: 'ready', bonusLandedAt: Date.now() })
  },

  tapBonus: () => {
    const s = get()
    if (s.phase !== 'journey' && s.phase !== 'gift') return
    if (s.openedIndex !== null || s.tourOpen || s.settingsOpen) return
    if (s.bonusStage === 'ready') set({ bonusStage: 'opening' })
    else if (s.bonusStage === 'opened') s.playBonus()
  },

  playBonus: () => {
    const { phase, bonusStage } = get()
    if (bonusStage === 'none' || phase === 'bonus') return
    set({ phase: 'bonus', bonusReturn: phase, bonusStage: 'opened' })
  },

  finishBonus: () => {
    if (get().phase === 'bonus') set({ phase: get().bonusReturn })
  },

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
      openGiftOnArrive: false,
      bonusStage: 'none',
      bonusIndex: -1,
      cameraResetAt: Date.now(),
    }),

  toggleAudio: () => set((s) => ({ audioOn: !s.audioOn })),
  setVolume: (v) => {
    const volume = Math.min(1, Math.max(0, v))
    try {
      localStorage.setItem(VOLUME_KEY, String(volume))
    } catch {
      /* bỏ qua nếu trình duyệt chặn localStorage */
    }
    // Kéo thanh âm lượng lên khi đang tắt tiếng thì bật lại luôn
    set((s) => ({ volume, audioOn: volume > 0 ? true : s.audioOn }))
  },
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

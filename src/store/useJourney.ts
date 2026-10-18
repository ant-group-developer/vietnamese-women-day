import { create } from 'zustand'
import { GIFT_INDEX, STATION_COUNT } from '../data/departments'
import { siteData } from '../data/siteData'
import { mascot } from '../scene/path'
import { diffU, routeStationU } from '../scene/route'
import { DEFAULT_CHARACTER, isCharacterId, type CharacterId } from '../scene/characters'

export type Phase = 'intro' | 'pick' | 'journey' | 'gift' | 'opening' | 'video' | 'outro' | 'bonus'
/**
 * Quà bóng bay giữa hành trình: none → dropping (đang rơi) → ready (đã đáp, chờ bấm)
 * → opening (bóng bay bay đi, mở nắp) → opened (đã xem video, xem lại được).
 */
export type BonusStage = 'none' | 'dropping' | 'ready' | 'opening' | 'opened'
/** Trạng thái một quà bóng bay (ứng với một video bất ngờ). */
export interface BonusSlot {
  stage: BonusStage
  /** Trạm mà quà rơi xuống cạnh đó (-1 = chưa rơi). */
  index: number
}
/** Hộp cài đặt: chọn nhân vật hoặc chỉnh âm lượng. */
export type SettingsPanel = 'character' | 'audio' | 'photo'

/** Ảnh kỷ niệm vừa chụp (đã ghép khung), giữ cả blob để tải về hoặc chia sẻ. */
export interface Photo {
  url: string
  blob: Blob
}

interface JourneyState {
  phase: Phase
  /** Trạm mà nhân vật đang đứng (-1 = điểm xuất phát). GIFT_INDEX = hộp quà. */
  currentIndex: number
  /** Trạm đang đi tới, null nếu đứng yên. */
  targetIndex: number | null
  /** Góc chụp ảnh trên đảo phụ đang đi tới (chỉ số trong photoSpots), null nếu không. */
  targetSpot: number | null
  /** Góc chụp ảnh đang đứng, -1 nếu không đứng ở góc nào. */
  atSpot: number
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
  /** Ảnh kỷ niệm mới nhất (hiện trong hộp 'photo'). */
  photo: Photo | null
  /** Nhân vật dẫn đường đã chọn. */
  character: CharacterId
  /** Thời điểm bấm vào hộp quà khi còn khoá (để lắc hộp và hiện nhắc nhở). */
  giftHintAt: number
  /** Bấm hộp quà từ xa: tới nơi thì tự mở. */
  openGiftOnArrive: boolean
  /** Trạng thái từng quà bóng bay, cùng thứ tự với BONUSES. */
  bonuses: BonusSlot[]
  /** Thời điểm quà bóng bay gần nhất đáp xuống (để HUD hiện thông báo). */
  bonusLandedAt: number
  /** Video bất ngờ đang phát (chỉ số trong BONUSES). */
  bonusPlaying: number
  /** Phase để quay về sau khi xem xong video bất ngờ. */
  bonusReturn: Phase

  start: () => void
  openTour: () => void
  closeTour: () => void
  openSettings: (panel: SettingsPanel) => void
  closeSettings: () => void
  /** Hiện ảnh kỷ niệm vừa chụp (thu hồi ảnh cũ). */
  showPhoto: (photo: Photo) => void
  setCharacter: (id: CharacterId) => void
  /** Chọn nhân vật ở màn đầu rồi vào hành trình; dontShowAgain thì lần sau bỏ qua màn chọn. */
  confirmCharacter: (id: CharacterId, dontShowAgain: boolean) => void
  goTo: (index: number) => void
  arrive: (index: number) => void
  /** Đi tới góc chụp ảnh trên đảo phụ. */
  goToSpot: (i: number) => void
  arriveSpot: (i: number) => void
  closeModal: () => void
  openGift: () => void
  /** Bấm vào hộp quà: còn khoá thì nhắc, đủ hoa thì chạy tới và mở. */
  tapGift: () => void
  playVideo: () => void
  /** Quà bóng bay thứ i đã rơi chạm đất. */
  landBonus: (i: number) => void
  /** Bấm vào quà bóng bay thứ i: mở hộp rồi phát video bất ngờ. */
  tapBonus: (i: number) => void
  /** Phát video bất ngờ thứ i (cũng dùng cho nút xem lại). */
  playBonus: (i: number) => void
  finishBonus: () => void
  finishVideo: () => void
  /** Rời màn kết thúc về lại bản đồ, giữ nguyên số hoa đã nhận (chỉ tải lại trang mới bắt đầu lại). */
  continueJourney: () => void
  toggleAudio: () => void
  setVolume: (v: number) => void
  resetCamera: () => void
}

const freshVisited = () => Array.from({ length: STATION_COUNT }, () => false)

/** Các video bất ngờ có video, xếp theo mốc số hoa tăng dần. */
export const BONUSES = siteData.bonuses.filter((b) => b.src).sort((a, b) => a.flowers - b.flowers)
const freshBonuses = (): BonusSlot[] => BONUSES.map(() => ({ stage: 'none', index: -1 }))

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
  targetSpot: null,
  atSpot: -1,
  visited: freshVisited(),
  openedIndex: null,
  audioOn: true,
  volume: savedVolume(),
  cameraResetAt: 0,
  lastFlowerAt: 0,
  lastVisitedIndex: -1,
  tourOpen: false,
  settingsOpen: null,
  photo: null,
  character: savedCharacter(),
  giftHintAt: 0,
  openGiftOnArrive: false,
  bonuses: freshBonuses(),
  bonusLandedAt: 0,
  bonusPlaying: -1,
  bonusReturn: 'journey',

  start: () => (pickSkipped() ? set({ phase: 'journey', tourOpen: takeFirstTour() }) : set({ phase: 'pick' })),
  openTour: () => set({ tourOpen: true }),
  closeTour: () => set({ tourOpen: false }),
  openSettings: (panel) => set({ settingsOpen: panel }),
  closeSettings: () => set({ settingsOpen: null }),
  showPhoto: (photo) => {
    const old = get().photo
    if (old) URL.revokeObjectURL(old.url)
    set({ photo, settingsOpen: 'photo' })
  },
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
    set({ targetIndex: index, targetSpot: null, openGiftOnArrive: false })
  },

  goToSpot: (i) => {
    const { openedIndex, phase, tourOpen, settingsOpen, atSpot, targetIndex } = get()
    if (openedIndex !== null || tourOpen || settingsOpen) return
    if (phase !== 'journey' && phase !== 'gift') return
    if (atSpot === i && targetIndex === null) return
    set({ targetSpot: i, targetIndex: null, openGiftOnArrive: false })
  },

  // Tới đảo phụ thì rời khỏi trạm/hộp quà đang đứng.
  arriveSpot: (i) =>
    set((s) => ({ atSpot: i, targetSpot: null, currentIndex: -1, phase: s.phase === 'gift' ? 'journey' : s.phase })),

  arrive: (index) => {
    if (index === GIFT_INDEX) {
      const autoOpen = get().openGiftOnArrive
      set({ currentIndex: index, targetIndex: null, phase: 'gift', openGiftOnArrive: false })
      // Chờ camera quay về hộp quà một chút rồi mới mở.
      if (autoOpen) setTimeout(() => get().openGift(), 700)
      return
    }
    // Rời hộp quà sang trạm khác thì thoát trạng thái đứng ở hộp quà.
    set((s) => ({ currentIndex: index, targetIndex: null, openedIndex: index, phase: s.phase === 'gift' ? 'journey' : s.phase }))
  },

  closeModal: () => {
    const { openedIndex, visited, bonuses } = get()
    if (openedIndex === null) return
    const next = [...visited]
    const gained = !next[openedIndex]
    next[openedIndex] = true
    // Vừa đủ mốc số hoa: thả quà bóng bay xuống cạnh trạm vừa thăm.
    // Mỗi bông hoa mới chỉ thả 1 quà (các video trùng mốc rơi dần ở những trạm sau) để quà không chồng lên nhau.
    const count = next.filter(Boolean).length
    const drop = gained ? bonuses.findIndex((b, i) => b.stage === 'none' && BONUSES[i].flowers <= count) : -1
    set({
      openedIndex: null,
      visited: next,
      lastFlowerAt: gained ? Date.now() : get().lastFlowerAt,
      lastVisitedIndex: openedIndex,
      ...(drop >= 0 ? { bonuses: updateSlot(bonuses, drop, { stage: 'dropping', index: openedIndex }) } : {}),
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

  landBonus: (i) => {
    const { bonuses } = get()
    if (bonuses[i]?.stage === 'dropping') set({ bonuses: updateSlot(bonuses, i, { stage: 'ready' }), bonusLandedAt: Date.now() })
  },

  tapBonus: (i) => {
    const s = get()
    if (s.phase !== 'journey' && s.phase !== 'gift') return
    if (s.openedIndex !== null || s.tourOpen || s.settingsOpen) return
    const stage = s.bonuses[i]?.stage
    if (stage === 'ready') set({ bonuses: updateSlot(s.bonuses, i, { stage: 'opening' }) })
    else if (stage === 'opened') s.playBonus(i)
  },

  playBonus: (i) => {
    const { phase, bonuses } = get()
    if (!bonuses[i] || bonuses[i].stage === 'none' || phase === 'bonus') return
    set({ phase: 'bonus', bonusReturn: phase, bonusPlaying: i, bonuses: updateSlot(bonuses, i, { stage: 'opened' }) })
  },

  finishBonus: () => {
    if (get().phase === 'bonus') set({ phase: get().bonusReturn })
  },

  finishVideo: () => set({ phase: 'outro' }),

  continueJourney: () =>
    set({ phase: 'journey', targetIndex: null, openedIndex: null, openGiftOnArrive: false, cameraResetAt: Date.now() }),

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

function updateSlot(bonuses: BonusSlot[], i: number, patch: Partial<BonusSlot>): BonusSlot[] {
  return bonuses.map((b, j) => (j === i ? { ...b, ...patch } : b))
}

/** Quà bóng bay đã rơi (đang rơi, chờ mở hoặc đã mở), theo thứ tự rơi xuống. */
export function droppedBonuses(bonuses: BonusSlot[]): number[] {
  return bonuses.map((_, i) => i).filter((i) => bonuses[i].stage !== 'none')
}

/** Quà bóng bay ở cạnh trạm index đang ở một trong các trạng thái stages (-1 nếu không có). */
export function bonusAtStation(bonuses: BonusSlot[], index: number, stages: BonusStage[]): number {
  return bonuses.findIndex((b) => b.index === index && stages.includes(b.stage))
}

/** Tên hiển thị của video bất ngờ thứ i. */
export function bonusTitle(i: number): string {
  return BONUSES[i]?.title || (BONUSES.length > 1 ? `Video bất ngờ ${i + 1}` : 'Video bất ngờ')
}

/**
 * Trạm gợi ý tiếp theo: trạm chưa thăm gần nhân vật nhất trên đường đi.
 * = GIFT_INDEX nếu đã thăm hết.
 */
export function nextStationIndex(visited: boolean[]): number {
  let best = -1
  let bestD = Infinity
  for (let i = 0; i < visited.length; i++) {
    if (visited[i]) continue
    const d = Math.abs(diffU(mascot.t, routeStationU(i)))
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

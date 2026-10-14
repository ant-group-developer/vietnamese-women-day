import { Howl, Howler } from 'howler'
import { config } from '../config'
import { siteData } from '../data/siteData'
import { useJourney } from '../store/useJourney'

type SfxName = 'step' | 'pop' | 'gift'

const howls = new Map<SfxName, Howl>()
const failed = new Set<SfxName>()

function getHowl(name: SfxName): Howl | null {
  if (failed.has(name)) return null
  let h = howls.get(name)
  if (h) return h
  const src = config.audio[name]
  if (!src) return null
  h = new Howl({
    src: [src],
    volume: 0.6,
    onloaderror: () => {
      // File không tồn tại hoặc lỗi: bỏ qua, không làm hỏng trải nghiệm.
      failed.add(name)
      howls.delete(name)
    },
  })
  howls.set(name, h)
  return h
}

export function playSfx(name: SfxName) {
  if (!useJourney.getState().audioOn) return
  getHowl(name)?.play()
}

let stepCooldown = 0
export function playStep(now: number) {
  if (now < stepCooldown) return
  stepCooldown = now + 0.32
  playSfx('step')
}

// ---- Nhạc nền: phát lần lượt danh sách bài (cấu hình ở /admin), hết bài thì quay lại đầu. ----

let order: number[] = []
let pos = 0
let bgm: Howl | null = null
/** Đang muốn phát nhạc (false khi tạm dừng cho video). */
let wanted = false
/** Số bài lỗi liên tiếp; lỗi hết cả danh sách thì thôi không thử nữa. */
let failStreak = 0
/** Người dùng đang ở tab khác (hoặc thu nhỏ trình duyệt): tạm dừng nhạc nền. */
let tabHidden = typeof document !== 'undefined' && document.hidden

function buildOrder() {
  const { tracks, shuffle } = siteData.music
  order = tracks.map((_, i) => i)
  if (shuffle) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
  }
}

function loadTrack(): Howl | null {
  const { tracks, volume } = siteData.music
  if (!tracks.length || failStreak >= tracks.length) return null
  if (!order.length) buildOrder()
  const single = tracks.length === 1
  const h: Howl = new Howl({
    src: [tracks[order[pos]].url],
    html5: true,
    loop: single,
    volume,
    onplay: () => {
      failStreak = 0
    },
    onend: () => {
      if (!single) nextTrack()
    },
    onloaderror: () => {
      failStreak++
      nextTrack()
    },
    onplayerror: () => {
      h.once('unlock', () => {
        if (bgm === h && wanted && !tabHidden) h.play()
      })
    },
  })
  return h
}

function nextTrack() {
  bgm?.unload()
  bgm = null
  pos = (pos + 1) % Math.max(order.length, 1)
  if (pos === 0 && siteData.music.shuffle) buildOrder()
  if (wanted) startBgm()
}

export function startBgm() {
  wanted = true
  if (!bgm) bgm = loadTrack()
  if (!bgm || bgm.playing() || tabHidden) return
  bgm.play()
}

export function stopBgm() {
  wanted = false
  bgm?.pause()
}

/** Đồng bộ trạng thái bật/tắt audio và âm lượng tổng từ store. */
export function bindAudioToStore() {
  const apply = (on: boolean) => {
    Howler.mute(!on)
    if (on) startBgm()
  }
  const { audioOn, volume } = useJourney.getState()
  Howler.volume(volume)
  apply(audioOn)
  // Chỉ phát nhạc nền khi người dùng đang ở trong tab; rời tab thì tạm dừng, quay lại thì phát tiếp.
  const onVisibility = () => {
    tabHidden = document.hidden
    if (tabHidden) bgm?.pause()
    else if (wanted) startBgm()
  }
  document.addEventListener('visibilitychange', onVisibility)
  const unsub = useJourney.subscribe((s, prev) => {
    if (s.volume !== prev.volume) Howler.volume(s.volume)
    if (s.audioOn !== prev.audioOn) apply(s.audioOn)
  })
  return () => {
    unsub()
    document.removeEventListener('visibilitychange', onVisibility)
  }
}

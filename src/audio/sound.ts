import { Howl, Howler } from 'howler'
import { config } from '../config'
import { useJourney } from '../store/useJourney'

type SoundName = 'bgm' | 'step' | 'pop' | 'gift'

const howls = new Map<SoundName, Howl>()
const failed = new Set<SoundName>()

function getHowl(name: SoundName): Howl | null {
  if (failed.has(name)) return null
  let h = howls.get(name)
  if (h) return h
  const src = config.audio[name]
  if (!src) return null
  h = new Howl({
    src: [src],
    loop: name === 'bgm',
    volume: name === 'bgm' ? config.audio.bgmVolume : 0.6,
    html5: name === 'bgm',
    onloaderror: () => {
      // File không tồn tại hoặc lỗi: bỏ qua, không làm hỏng trải nghiệm.
      failed.add(name)
      howls.delete(name)
    },
    onplayerror: () => {
      h?.once('unlock', () => h?.play())
    },
  })
  howls.set(name, h)
  return h
}

export function playSfx(name: Exclude<SoundName, 'bgm'>) {
  if (!useJourney.getState().audioOn) return
  getHowl(name)?.play()
}

let stepCooldown = 0
export function playStep(now: number) {
  if (now < stepCooldown) return
  stepCooldown = now + 0.32
  playSfx('step')
}

export function startBgm() {
  const h = getHowl('bgm')
  if (!h || h.playing()) return
  h.play()
}

export function stopBgm() {
  howls.get('bgm')?.pause()
}

/** Đồng bộ trạng thái bật/tắt audio từ store. */
export function bindAudioToStore() {
  const apply = (on: boolean) => {
    Howler.mute(!on)
    if (on) startBgm()
  }
  apply(useJourney.getState().audioOn)
  return useJourney.subscribe((s, prev) => {
    if (s.audioOn !== prev.audioOn) apply(s.audioOn)
  })
}

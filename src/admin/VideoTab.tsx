import { useRef, useState, type ReactNode } from 'react'
import type { VideoConfig } from '../data/siteData'
import { youtubeEmbed } from '../utils/youtube'
import { uploadFile } from './api'
import type { TabProps } from './AdminApp'

export function VideoTab({ data, update, onError }: TabProps) {
  const { bonus } = data
  const maxFlowers = data.departments.length

  return (
    <div className="stack">
      <VideoEditor
        title="Video quà cuối hành trình"
        hint="Phát khi mở hộp quà sau khi đã thu thập đủ hoa. Nhạc nền tự tạm dừng trong lúc xem video."
        emptyHint="Chưa có video. Website sẽ hiện thông báo và cho bấm “Tiếp tục”."
        uploadName="gift"
        video={data.video}
        onChange={(video) => update((d) => ({ ...d, video }))}
        onError={onError}
      />

      <VideoEditor
        title="Video bất ngờ giữa hành trình 🎈"
        hint="Khi thu thập đủ số bông hoa bên dưới, một hộp quà treo bóng bay rơi xuống cạnh nhân vật. Bấm vào hộp để xem video; sau đó xem lại được ở nút 🎬 trên thanh trên cùng."
        emptyHint="Chưa có video. Quà bóng bay sẽ không xuất hiện."
        uploadName="bonus"
        video={bonus}
        onChange={(video) => update((d) => ({ ...d, bonus: { ...d.bonus, ...video } }))}
        onError={onError}
      >
        <label className="field">
          <span>Số bông hoa để quà rơi xuống (1–{maxFlowers})</span>
          <input
            type="number"
            min={1}
            max={maxFlowers}
            value={bonus.flowers}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value))
              if (!Number.isFinite(n)) return
              update((d) => ({ ...d, bonus: { ...d.bonus, flowers: Math.min(maxFlowers, Math.max(1, n)) } }))
            }}
          />
        </label>
      </VideoEditor>
    </div>
  )
}

function VideoEditor({
  title,
  hint,
  emptyHint,
  uploadName,
  video,
  onChange,
  onError,
  children,
}: {
  title: string
  hint: string
  emptyHint: string
  uploadName: string
  video: VideoConfig
  onChange: (v: VideoConfig) => void
  onError: (e: unknown) => void
  children?: ReactNode
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  /** Giữ link/ file của từng loại để đổi qua lại không bị mất. */
  const [drafts, setDrafts] = useState<Record<VideoConfig['type'], string>>(() => ({
    mp4: video.type === 'mp4' ? video.src : '',
    youtube: video.type === 'youtube' ? video.src : '',
  }))

  const setVideo = (v: VideoConfig) => {
    setDrafts((d) => ({ ...d, [v.type]: v.src }))
    onChange(v)
  }

  const pick = async (file: File) => {
    setProgress(0)
    try {
      setVideo({ type: 'mp4', src: await uploadFile(file, 'video', uploadName, setProgress) })
    } catch (e) {
      onError(e)
    } finally {
      setProgress(null)
    }
  }

  return (
    <>
      <div className="card">
        <h2>{title}</h2>
        <p className="hint">{hint}</p>
        {children}
        <div className="segmented">
          <button className={video.type === 'mp4' ? 'active' : ''} onClick={() => setVideo({ type: 'mp4', src: drafts.mp4 })}>
            🎬 File video (mp4)
          </button>
          <button className={video.type === 'youtube' ? 'active' : ''} onClick={() => setVideo({ type: 'youtube', src: drafts.youtube })}>
            ▶️ YouTube
          </button>
        </div>

        {video.type === 'mp4' ? (
          <>
            <div className="inline">
              <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={progress !== null}>
                {progress !== null ? `Đang tải ${progress}%` : video.src ? 'Thay video khác' : 'Tải lên video'}
              </button>
              {video.src && (
                <button className="btn ghost" onClick={() => confirm('Bỏ video này?') && setVideo({ type: 'mp4', src: '' })}>
                  Bỏ video
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/webm"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void pick(f)
                e.target.value = ''
              }}
            />
            <p className="hint">Nên nén video dưới ~50MB (720p) để xem mượt trên điện thoại.</p>
          </>
        ) : (
          <label className="field">
            <span>Link YouTube</span>
            <input
              placeholder="https://www.youtube.com/watch?v=..."
              value={video.src}
              onChange={(e) => setVideo({ type: 'youtube', src: e.target.value })}
            />
          </label>
        )}
      </div>

      <div className="card">
        <h2>Xem trước</h2>
        {!video.src ? (
          <p className="hint">{emptyHint}</p>
        ) : video.type === 'youtube' ? (
          <iframe className="preview" src={youtubeEmbed(video.src, false)} title="Xem trước" allow="encrypted-media; fullscreen" allowFullScreen />
        ) : (
          <video className="preview" src={video.src} controls preload="metadata" />
        )}
      </div>
    </>
  )
}

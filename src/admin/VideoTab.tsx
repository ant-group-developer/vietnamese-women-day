import { useRef, useState } from 'react'
import type { VideoConfig } from '../data/siteData'
import { youtubeEmbed } from '../utils/youtube'
import { uploadFile } from './api'
import type { TabProps } from './AdminApp'

export function VideoTab({ data, update, onError }: TabProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  /** Giữ link/ file của từng loại để đổi qua lại không bị mất. */
  const [drafts, setDrafts] = useState<Record<VideoConfig['type'], string>>(() => ({
    mp4: data.video.type === 'mp4' ? data.video.src : '',
    youtube: data.video.type === 'youtube' ? data.video.src : '',
  }))
  const { video } = data

  const setVideo = (v: VideoConfig) => {
    setDrafts((d) => ({ ...d, [v.type]: v.src }))
    update((d) => ({ ...d, video: v }))
  }

  const pick = async (file: File) => {
    setProgress(0)
    try {
      setVideo({ type: 'mp4', src: await uploadFile(file, 'video', 'gift', setProgress) })
    } catch (e) {
      onError(e)
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>Video quà cuối hành trình</h2>
        <p className="hint">Phát khi mở hộp quà sau khi đã thu thập đủ hoa. Nhạc nền tự tạm dừng trong lúc xem video.</p>
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
          <p className="hint">Chưa có video. Website sẽ hiện thông báo và cho bấm “Tiếp tục”.</p>
        ) : video.type === 'youtube' ? (
          <iframe className="preview" src={youtubeEmbed(video.src, false)} title="Xem trước" allow="encrypted-media; fullscreen" allowFullScreen />
        ) : (
          <video className="preview" src={video.src} controls preload="metadata" />
        )}
      </div>
    </div>
  )
}

import { useRef, useState, type ReactNode } from 'react'
import { DEFAULT_BONUS_FLOWERS, LIMITS, type BonusConfig, type VideoConfig } from '../data/siteData'
import { youtubeEmbed } from '../utils/youtube'
import { uploadFile } from './api'
import type { TabProps } from './AdminApp'

export function VideoTab({ data, update, onError }: TabProps) {
  const { bonuses } = data
  const maxFlowers = data.departments.length
  const clampFlowers = (n: number) => Math.min(maxFlowers, Math.max(1, n))

  const patchBonus = (id: string, patch: Partial<BonusConfig>) =>
    update((d) => ({ ...d, bonuses: d.bonuses.map((b) => (b.id === id ? { ...b, ...patch } : b)) }))
  const addBonus = () =>
    update((d) => {
      // Mốc mặc định: sau mốc lớn nhất hiện có một chút.
      const last = Math.max(0, ...d.bonuses.map((b) => b.flowers))
      const flowers = clampFlowers(last ? last + 2 : DEFAULT_BONUS_FLOWERS)
      return { ...d, bonuses: [...d.bonuses, { id: `b${Date.now().toString(36)}`, type: 'mp4', src: '', flowers }] }
    })
  const removeBonus = (id: string) => update((d) => ({ ...d, bonuses: d.bonuses.filter((b) => b.id !== id) }))

  const sameFlowers = (b: BonusConfig) => bonuses.some((o) => o.id !== b.id && o.src && b.src && o.flowers === b.flowers)

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

      <div className="card">
        <div className="card-head">
          <h2>Video bất ngờ giữa hành trình 🎈 ({bonuses.length})</h2>
          <button className="btn primary" onClick={addBonus} disabled={bonuses.length >= LIMITS.bonuses}>
            ＋ Thêm video bất ngờ
          </button>
        </div>
        <p className="hint">
          Mỗi video có một mốc số bông hoa: khi thu thập đủ số hoa đó, một hộp quà treo bóng bay rơi xuống cạnh nhân vật. Bấm vào hộp để
          xem video; sau đó xem lại được ở nút 🎬 trên thanh trên cùng. Video chưa có file/link sẽ bị bỏ qua.
        </p>
        {bonuses.length === 0 && <p className="hint">Chưa có video bất ngờ nào.</p>}
      </div>

      {bonuses.map((b, i) => (
        <VideoEditor
          key={b.id}
          title={`🎈 Video bất ngờ #${i + 1}${b.title ? ` – ${b.title}` : ''}`}
          action={
            <button className="btn danger" onClick={() => confirm('Xoá video bất ngờ này?') && removeBonus(b.id)}>
              Xoá
            </button>
          }
          hint=""
          emptyHint="Chưa có video. Quà bóng bay này sẽ không xuất hiện."
          uploadName={`bonus-${b.id}`}
          video={b}
          onChange={(video) => patchBonus(b.id, video)}
          onError={onError}
        >
          <div className="grid-2">
            <label className="field">
              <span>Xuất hiện khi đủ bao nhiêu bông hoa (1–{maxFlowers})</span>
              <input
                type="number"
                min={1}
                max={maxFlowers}
                value={b.flowers}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value))
                  if (Number.isFinite(n)) patchBonus(b.id, { flowers: clampFlowers(n) })
                }}
              />
            </label>
            <label className="field">
              <span>Tên hiển thị (không bắt buộc)</span>
              <input
                placeholder={`Video bất ngờ ${i + 1}`}
                maxLength={80}
                value={b.title ?? ''}
                onChange={(e) => patchBonus(b.id, { title: e.target.value || undefined })}
              />
            </label>
          </div>
          {sameFlowers(b) && (
            <p className="hint">Có video khác cùng mốc {b.flowers} hoa: video sau sẽ rơi xuống ở bông hoa kế tiếp.</p>
          )}
        </VideoEditor>
      ))}
    </div>
  )
}

function VideoEditor({
  title,
  action,
  hint,
  emptyHint,
  uploadName,
  video,
  onChange,
  onError,
  children,
}: {
  title: string
  /** Nút phụ ở góc phải tiêu đề (vd. xoá). */
  action?: ReactNode
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
        {action ? (
          <div className="card-head">
            <h2>{title}</h2>
            {action}
          </div>
        ) : (
          <h2>{title}</h2>
        )}
        {hint && <p className="hint">{hint}</p>}
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

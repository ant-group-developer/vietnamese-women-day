import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import type { VideoConfig } from '../data/siteData'
import { youtubeEmbed } from '../utils/youtube'
import { useJourney } from '../store/useJourney'
import { startBgm, stopBgm } from '../audio/sound'

/** Khung phát video quà (video cuối hành trình hoặc video bất ngờ). */
export function GiftVideo({ video, ribbon, onDone }: { video: VideoConfig; ribbon: string; onDone: () => void }) {
  const volume = useJourney((s) => s.volume)
  const audioOn = useJourney((s) => s.audioOn)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState(!video.src)
  // Tỉ lệ khung theo video gốc (rộng / cao); YouTube Shorts mặc định dọc
  const [ratio, setRatio] = useState(
    video.type === 'youtube' && /shorts\//.test(video.src) ? 9 / 16 : 16 / 9,
  )

  useEffect(() => {
    stopBgm()
    return () => {
      const { audioOn, volume } = useJourney.getState()
      if (audioOn && volume > 0) startBgm()
    }
  }, [])

  // Video dùng chung âm lượng tổng với cả trang
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = volume
    v.muted = !audioOn
  }, [volume, audioOn, error])

  return (
    <motion.div className="video-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="video-frame"
        style={{ '--ar': ratio } as CSSProperties}
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.1 }}
      >
        <div className="video-ribbon">{ribbon}</div>
        <span className="video-deco tl">🌸</span>
        <span className="video-deco tr">🌷</span>
        <span className="video-deco bl">🌷</span>
        <span className="video-deco br">🌸</span>

        <div className="video-screen">
          {video.type === 'youtube' && video.src ? (
            <iframe
              src={youtubeEmbed(video.src)}
              title="Video quà 20/10"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
          ) : error ? (
            <div className="video-missing">
              <div style={{ fontSize: 56 }}>🎬</div>
              <p>Chưa có video. Hãy thêm video ở trang cấu hình /admin.</p>
              <button className="btn" onClick={onDone}>
                Tiếp tục ➜
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={video.src}
              autoPlay
              playsInline
              controls
              onLoadedMetadata={(e) => {
                const { videoWidth: w, videoHeight: h } = e.currentTarget
                if (w && h) setRatio(w / h)
              }}
              onEnded={onDone}
              onError={() => setError(true)}
            />
          )}
        </div>
      </motion.div>
      <button className="btn ghost video-skip" onClick={onDone}>
        Bỏ qua ✕
      </button>
    </motion.div>
  )
}

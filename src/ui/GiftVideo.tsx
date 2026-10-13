import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { siteData } from '../data/siteData'
import { youtubeEmbed } from '../utils/youtube'
import { useJourney } from '../store/useJourney'
import { startBgm, stopBgm } from '../audio/sound'

export function GiftVideo() {
  const finishVideo = useJourney((s) => s.finishVideo)
  const { video } = siteData
  const [error, setError] = useState(!video.src)

  useEffect(() => {
    stopBgm()
    return () => {
      if (useJourney.getState().audioOn) startBgm()
    }
  }, [])

  return (
    <motion.div className="video-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
          <button className="btn" onClick={finishVideo}>
            Tiếp tục ➜
          </button>
        </div>
      ) : (
        <video
          src={video.src}
          autoPlay
          playsInline
          controls
          onEnded={finishVideo}
          onError={() => setError(true)}
        />
      )}
      <button className="btn ghost video-skip" onClick={finishVideo}>
        Bỏ qua ✕
      </button>
    </motion.div>
  )
}

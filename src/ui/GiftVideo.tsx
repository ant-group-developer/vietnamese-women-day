import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { config } from '../config'
import { useJourney } from '../store/useJourney'
import { startBgm, stopBgm } from '../audio/sound'

function youtubeEmbed(url: string): string {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{6,})/)
  const id = m ? m[1] : url
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`
}

export function GiftVideo() {
  const finishVideo = useJourney((s) => s.finishVideo)
  const [error, setError] = useState(false)

  useEffect(() => {
    stopBgm()
    return () => {
      if (useJourney.getState().audioOn) startBgm()
    }
  }, [])

  return (
    <motion.div className="video-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {config.video.type === 'youtube' ? (
        <iframe
          src={youtubeEmbed(config.video.src)}
          title="Video quà 20/10"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      ) : error ? (
        <div className="video-missing">
          <div style={{ fontSize: 56 }}>🎬</div>
          <p>Chưa tìm thấy video. Hãy đặt file vào <code>public{config.video.src}</code>.</p>
          <button className="btn" onClick={finishVideo}>
            Tiếp tục ➜
          </button>
        </div>
      ) : (
        <video
          src={config.video.src}
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

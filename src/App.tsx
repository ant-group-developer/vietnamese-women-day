import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Scene } from './scene/Scene'
import { Petals } from './ui/Petals'
import { LabelLayer } from './ui/LabelLayer'
import { Intro } from './ui/Intro'
import { CharacterPick } from './ui/CharacterPick'
import { HUD } from './ui/HUD'
import { DepartmentModal } from './ui/DepartmentModal'
import { GiftVideo } from './ui/GiftVideo'
import { Outro } from './ui/Outro'
import { Tour } from './ui/Tour'
import { CameraControls } from './ui/CameraControls'
import { SettingsModal } from './ui/SettingsModal'
import { BONUSES, bonusTitle, ISLAND_VIDEOS, useJourney } from './store/useJourney'
import { bindAudioToStore } from './audio/sound'
import { siteData } from './data/siteData'
import { useKeyboardControls } from './scene/keyboard'

export default function App() {
  const phase = useJourney((s) => s.phase)
  const finishVideo = useJourney((s) => s.finishVideo)
  const finishBonus = useJourney((s) => s.finishBonus)
  const bonusPlaying = useJourney((s) => s.bonusPlaying)
  const finishIslandVideo = useJourney((s) => s.finishIslandVideo)
  const islandVideoKey = useJourney((s) => s.islandVideo)
  const islandVideo = ISLAND_VIDEOS.find((v) => v.island === islandVideoKey)

  useEffect(() => bindAudioToStore(), [])
  useKeyboardControls()

  // Chỉ khi dev: cho phép xem/sửa trạng thái từ console (window.__journey).
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __journey: typeof useJourney }).__journey = useJourney
  }, [])

  return (
    <>
      <Scene />
      <LabelLayer />
      <Petals />
      <HUD />
      <CameraControls />
      <DepartmentModal />
      <Tour />
      <SettingsModal />
      <AnimatePresence>
        {phase === 'video' && (
          <GiftVideo key="video" video={siteData.video} ribbon="💝 Món quà dành tặng bạn 💝" onDone={finishVideo} />
        )}
        {phase === 'bonus' && BONUSES[bonusPlaying] && (
          <GiftVideo
            key={`bonus-${bonusPlaying}`}
            video={BONUSES[bonusPlaying]}
            ribbon={BONUSES[bonusPlaying].title ? `🎈 ${bonusTitle(bonusPlaying)} 🎈` : '🎈 Quà bất ngờ giữa đường 🎈'}
            onDone={finishBonus}
          />
        )}
        {phase === 'islandVideo' && islandVideo && (
          <GiftVideo
            key={`island-${islandVideo.island}`}
            video={islandVideo}
            ribbon={`🎬 ${islandVideo.title || 'Video trên đảo'} 🎬`}
            onDone={finishIslandVideo}
          />
        )}
        {phase === 'outro' && <Outro key="outro" />}
        {phase === 'intro' && <Intro key="intro" />}
        {phase === 'pick' && <CharacterPick key="pick" />}
      </AnimatePresence>
    </>
  )
}

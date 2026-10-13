import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Scene } from './scene/Scene'
import { Petals } from './ui/Petals'
import { LabelLayer } from './ui/LabelLayer'
import { Intro } from './ui/Intro'
import { HUD } from './ui/HUD'
import { DepartmentModal } from './ui/DepartmentModal'
import { GiftVideo } from './ui/GiftVideo'
import { Outro } from './ui/Outro'
import { Tutorial } from './ui/Tutorial'
import { CameraControls } from './ui/CameraControls'
import { useJourney } from './store/useJourney'
import { bindAudioToStore } from './audio/sound'

export default function App() {
  const phase = useJourney((s) => s.phase)

  useEffect(() => bindAudioToStore(), [])

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
      <Tutorial />
      <AnimatePresence>
        {phase === 'video' && <GiftVideo key="video" />}
        {phase === 'outro' && <Outro key="outro" />}
        {phase === 'intro' && <Intro key="intro" />}
      </AnimatePresence>
    </>
  )
}

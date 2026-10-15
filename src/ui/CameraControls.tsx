import { useJourney } from '../store/useJourney'
import { rotateCamera, zoomCamera } from '../scene/cameraControl'
import { HelpIcon, MinusIcon, PlusIcon, RotateLeftIcon, RotateRightIcon, TargetIcon } from './icons'

/** Cụm nút góc phải dưới: zoom, xoay, về nhân vật, xem lại tour hướng dẫn. */
export function CameraControls() {
  const phase = useJourney((s) => s.phase)
  const { resetCamera, openTour } = useJourney.getState()
  if (phase !== 'journey' && phase !== 'gift') return null

  return (
    <div className="cam-controls">
      <button className="icon-btn" data-tour="zoom" title="Phóng to" aria-label="Phóng to" onClick={() => zoomCamera(1)}>
        <PlusIcon />
      </button>
      <button className="icon-btn" data-tour="zoom" title="Thu nhỏ" aria-label="Thu nhỏ" onClick={() => zoomCamera(-1)}>
        <MinusIcon />
      </button>
      <button className="icon-btn" data-tour="rotate" title="Xoay trái" aria-label="Xoay trái" onClick={() => rotateCamera(Math.PI / 6)}>
        <RotateLeftIcon />
      </button>
      <button className="icon-btn" data-tour="rotate" title="Xoay phải" aria-label="Xoay phải" onClick={() => rotateCamera(-Math.PI / 6)}>
        <RotateRightIcon />
      </button>
      <button className="icon-btn" data-tour="recenter" title="Đưa camera về nhân vật" aria-label="Đưa camera về nhân vật" onClick={resetCamera}>
        <TargetIcon />
      </button>
      <button className="icon-btn" data-tour="help" title="Xem lại hướng dẫn" aria-label="Xem lại hướng dẫn" onClick={openTour}>
        <HelpIcon />
      </button>
    </div>
  )
}

import { useJourney } from '../store/useJourney'
import { rotateCamera, zoomCamera } from '../scene/cameraControl'

/** Cụm nút góc phải dưới: zoom, xoay, về nhân vật, mở hướng dẫn. */
export function CameraControls() {
  const phase = useJourney((s) => s.phase)
  const { resetCamera, openTutorial } = useJourney.getState()
  if (phase !== 'journey' && phase !== 'gift') return null

  return (
    <div className="cam-controls">
      <button className="icon-btn" title="Phóng to" onClick={() => zoomCamera(1)}>
        ➕
      </button>
      <button className="icon-btn" title="Thu nhỏ" onClick={() => zoomCamera(-1)}>
        ➖
      </button>
      <button className="icon-btn" title="Xoay trái" onClick={() => rotateCamera(Math.PI / 6)}>
        ↺
      </button>
      <button className="icon-btn" title="Xoay phải" onClick={() => rotateCamera(-Math.PI / 6)}>
        ↻
      </button>
      <button className="icon-btn" title="Đưa camera về nhân vật" onClick={resetCamera}>
        🎯
      </button>
      <button className="icon-btn" title="Hướng dẫn" onClick={openTutorial}>
        ❔
      </button>
    </div>
  )
}

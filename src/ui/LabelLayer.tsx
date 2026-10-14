import { departments, GIFT_INDEX } from '../data/departments'
import { nextStationIndex, stationStatus, useJourney } from '../store/useJourney'
import { bindLabelElement } from '../scene/labels'
import { bonusSide } from '../scene/path'

/** Lớp nhãn HTML cho các trạm và hộp quà; vị trí do LabelProjector cập nhật. */
export function LabelLayer() {
  const phase = useJourney((s) => s.phase)
  const visited = useJourney((s) => s.visited)
  const allVisited = visited.every(Boolean)
  const visible = phase !== 'intro' && phase !== 'pick'
  const bonusStage = useJourney((s) => s.bonusStage)
  const bonusIndex = useJourney((s) => s.bonusIndex)
  const handRight = bonusIndex >= 0 && bonusSide(bonusIndex) === 1
  const bonusText = bonusStage === 'ready' ? '🎈 Bấm để mở quà!' : bonusStage === 'opened' ? '🎬 Xem lại' : null
  const suggested = phase === 'journey' ? nextStationIndex(visited) : -1

  const giftState = !allVisited ? 'locked' : phase === 'gift' ? 'available suggested' : 'visited'
  const giftText = !allVisited
    ? '🔒 Hộp quà'
    : phase === 'gift'
      ? '🎁 Mở quà nào!'
      : phase === 'journey'
        ? '🎁 Hộp quà'
        : '🎉 Bất ngờ chưa!'

  return (
    <div className="labels-layer" style={{ opacity: visible ? 1 : 0 }} aria-hidden>
      {departments.map((d, i) => {
        const status = stationStatus(visited, i)
        return (
          <div key={d.slug} className="label-anchor" ref={(el) => bindLabelElement(`station-${i}`, el)}>
            <div className={`station-label ${status} ${suggested === i ? 'suggested' : ''}`}>
              {status === 'visited' ? '✅' : d.icon} {d.name}
            </div>
          </div>
        )
      })}
      <div className="label-anchor" ref={(el) => bindLabelElement(`station-${GIFT_INDEX}`, el)}>
        <div className={`station-label ${giftState}`}>{giftText}</div>
      </div>
      <div className="label-anchor" ref={(el) => bindLabelElement('bonus', el)}>
        {bonusText && <div className={`station-label ${bonusStage === 'ready' ? 'bonus below' : 'visited'}`}>{bonusText}</div>}
      </div>
      <div className="label-anchor" ref={(el) => bindLabelElement('bonus-hand', el)}>
        {bonusStage === 'ready' && <div className={`tap-hand ${handRight ? 'right' : 'left'}`}>{handRight ? '👈' : '👉'}</div>}
      </div>
    </div>
  )
}

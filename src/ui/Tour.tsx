import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { STATION_COUNT } from '../data/departments'
import { nextStationIndex, useJourney } from '../store/useJourney'
import { cameraFocus } from '../scene/cameraControl'

/**
 * Tour hướng dẫn khi vào màn chơi: làm tối màn hình, khoanh sáng lần lượt từng phần
 * (gắn bằng data-tour="...") kèm thẻ giải thích. Phần tử di chuyển (nhãn 3D) được bám theo mỗi frame.
 */
interface Step {
  /** Giá trị data-tour của phần tử cần khoanh; nhiều phần tử cùng giá trị thì khoanh cả cụm. */
  target: string
  /** Bỏ qua bước nếu lúc bắt đầu tour không thấy phần tử (vd. nút chỉ hiện về sau). */
  optional?: boolean
  /** Chỉ khoanh một phần tử trong nhóm: cái hiện rõ nhất trên màn hình (dùng cho các ngôi nhà). */
  pickOne?: boolean
  /** Ưu tiên đặt thẻ phía trên (nhãn nhà nằm trên mái, đặt dưới sẽ che mất ngôi nhà). */
  above?: boolean
  icon: string
  title: string
  text: string
}

function buildSteps(): Step[] {
  const touch = window.matchMedia('(pointer: coarse)').matches
  return [
    {
      target: 'station',
      pickOne: true,
      above: true,
      icon: '🏠',
      title: 'Ghé thăm phòng ban',
      text: 'Mỗi ngôi nhà là một phòng ban. Bấm vào nhà bất kỳ, bạn đồng hành sẽ chạy tới và mở thiệp giới thiệu các chị em.',
    },
    {
      target: 'flowers',
      icon: '🌸',
      title: 'Bó hoa của bạn',
      text: `Ghé mỗi phòng ban được tặng 1 bông hoa. Thu đủ ${STATION_COUNT} bông là hộp quà bí mật sẽ mở ra.`,
    },
    {
      target: 'gift',
      optional: true,
      icon: '🎁',
      title: 'Hộp quà bí mật',
      text: 'Hộp quà nằm cuối đường, còn khoá cho tới khi bạn đủ hoa. Đủ rồi thì bấm vào để mở nhé!',
    },
    {
      target: 'action',
      optional: true,
      icon: '👣',
      title: 'Đi tiếp',
      text: 'Chưa biết đi đâu? Bấm nút này để tới phòng ban gần nhất mà bạn chưa ghé.',
    },
    { target: 'character', icon: '🐾', title: 'Bạn đồng hành', text: 'Chọn con vật dẫn đường và chỉnh tốc độ đi nhanh hay chậm.' },
    { target: 'audio', icon: '🔊', title: 'Âm lượng', text: 'Chỉnh to nhỏ hoặc tắt hẳn nhạc nền.' },
    {
      target: 'bonus',
      optional: true,
      icon: '🎬',
      title: 'Video bất ngờ',
      text: 'Xem lại các video bất ngờ bạn đã nhận.',
    },
    {
      target: 'zoom',
      icon: '🔍',
      title: 'Phóng to, thu nhỏ',
      text: touch ? 'Hoặc chụm hai ngón tay trên bản đồ.' : 'Hoặc cuộn chuột trên bản đồ.',
    },
    {
      target: 'rotate',
      icon: '🔄',
      title: 'Xoay bản đồ',
      text: touch ? 'Hoặc vuốt trên bản đồ để xoay góc nhìn.' : 'Hoặc kéo chuột trên bản đồ để xoay góc nhìn.',
    },
    { target: 'recenter', icon: '🎯', title: 'Về chỗ nhân vật', text: 'Lạc mất bạn đồng hành? Bấm để đưa camera về ngay.' },
    { target: 'help', icon: '❓', title: 'Xem lại hướng dẫn', text: 'Bấm vào đây bất cứ lúc nào để xem lại tour này.' },
  ]
}

interface Box {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Phần tử có đang hiện không (nhãn 3D bị làm mờ khi xa camera hoặc ở sau lưng).
 * checkOpacity = false khi lọc bước lúc mở tour: nút HUD có thể còn đang mờ dần vào
 * (hoặc animation bị dừng vì tab đang ẩn) nhưng vẫn sẽ hiện.
 */
function isShown(el: HTMLElement, checkOpacity: boolean) {
  for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
    const cs = getComputedStyle(n)
    if (cs.display === 'none' || cs.visibility === 'hidden') return false
    if (checkOpacity && parseFloat(cs.opacity) < 0.2) return false
  }
  return true
}

const targets = (target: string) => [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)]

/** Khung bao quanh các phần tử; null nếu không thấy trên màn hình. */
function measure(els: HTMLElement[], checkOpacity = true): Box | null {
  let l = Infinity
  let t = Infinity
  let r = -Infinity
  let b = -Infinity
  els.forEach((el) => {
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height || !isShown(el, checkOpacity)) return
    l = Math.min(l, rect.left)
    t = Math.min(t, rect.top)
    r = Math.max(r, rect.right)
    b = Math.max(b, rect.bottom)
  })
  if (l === Infinity) return null
  // Chỉ lấy phần nằm trong màn hình (nhãn nhà có thể lệch một nửa ra ngoài mép trên điện thoại hẹp).
  l = Math.max(l, 0)
  t = Math.max(t, 0)
  r = Math.min(r, window.innerWidth)
  b = Math.min(b, window.innerHeight)
  if (r - l < 8 || b - t < 8) return null
  return { left: l, top: t, width: r - l, height: b - t }
}

/** Tỉ lệ phần tử nằm trong màn hình (0–1), 0 nếu đang ẩn. */
function visibleRatio(el: HTMLElement) {
  if (!isShown(el, true)) return 0
  const r = el.getBoundingClientRect()
  const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0)
  const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)
  return w > 0 && h > 0 ? (w * h) / (r.width * r.height) : 0
}

/**
 * Chọn một phần tử trong nhóm: ưu tiên cái đang nhún gợi ý nếu nằm trọn trong màn hình,
 * không thì cái hiện rõ nhất, gần giữa màn hình nhất (trên điện thoại nhà gợi ý hay nằm ngoài khung).
 */
function pickVisible(els: HTMLElement[]): HTMLElement | null {
  const suggested = els.find((el) => el.classList.contains('suggested'))
  if (suggested && visibleRatio(suggested) > 0.99) return suggested
  let best: HTMLElement | null = null
  let bestScore = 0
  for (const el of els) {
    const ratio = visibleRatio(el)
    if (ratio < 0.5) continue
    const r = el.getBoundingClientRect()
    const off = Math.hypot(r.left + r.width / 2 - window.innerWidth / 2, r.top - window.innerHeight / 2)
    const score = ratio * 10000 - off
    if (!best || score > bestScore) {
      best = el
      bestScore = score
    }
  }
  return best ?? suggested ?? null
}

const sameBox = (a: Box | null, b: Box | null) =>
  a === b ||
  (!!a &&
    !!b &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5)

const PAD = 6
const GAP = 14
const MARGIN = 12
/** Phần tử trôi xa hơn mức này (camera di chuyển) thì mới đặt lại thẻ; nhún nhảy nhỏ thì thẻ đứng yên. */
const REPLACE_DIST = 60

export function Tour() {
  const open = useJourney((s) => s.tourOpen)
  const phase = useJourney((s) => s.phase)
  const closeTour = useJourney((s) => s.closeTour)
  const active = open && (phase === 'journey' || phase === 'gift')

  const [steps, setSteps] = useState<Step[] | null>(null)
  const [index, setIndex] = useState(0)
  /** Khung đo được gần nhất, kèm bước mà nó thuộc về (ngay sau khi đổi bước vẫn còn khung của bước cũ). */
  const [measured, setMeasured] = useState<{ step: Step; box: Box | null } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  /** Lần đặt thẻ gần nhất: thẻ đứng yên trong cả bước để dễ đọc, không bám theo nhãn đang nhún. */
  const placed = useRef<{ step: Step; cx: number; cy: number; vw: number; vh: number } | null>(null)

  // Chờ HUD và các nút trượt vào xong rồi mới chốt danh sách bước (bỏ bước không có phần tử).
  // Trong lúc chờ, camera quay sang giữa nhân vật và nhà gợi ý: trên điện thoại dọc, góc nhìn
  // mặc định thường để ngôi nhà nằm ngoài khung. Đóng tour thì camera bám nhân vật trở lại.
  useEffect(() => {
    if (!active) {
      setSteps(null)
      return
    }
    cameraFocus.station = nextStationIndex(useJourney.getState().visited)
    const t = setTimeout(() => {
      setSteps(buildSteps().filter((s) => !s.optional || measure(targets(s.target), false)))
      setIndex(0)
    }, 800)
    return () => {
      clearTimeout(t)
      cameraFocus.station = -1
    }
  }, [active])

  const step = steps?.[index]
  const box = measured?.box ?? null
  const boxReady = !!step && measured?.step === step

  // Bám theo phần tử mỗi frame: nhãn 3D di chuyển theo camera, nút có thể đổi chỗ khi xoay màn hình.
  useEffect(() => {
    if (!step) return
    let raf = 0
    let last: Box | null | undefined
    let chosen: HTMLElement | null = null
    const tick = () => {
      let els = targets(step.target)
      if (step.pickOne) {
        // Giữ nguyên phần tử đã chọn trong cả bước, chỉ chọn lại khi nó khuất hẳn.
        if (!chosen || !chosen.isConnected || !measure([chosen])) chosen = pickVisible(els)
        els = chosen ? [chosen] : []
      }
      const next = measure(els)
      if (last === undefined || !sameBox(next, last)) {
        last = next
        setMeasured({ step, box: next })
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [step])

  // Đặt thẻ giải thích dưới phần tử nếu đủ chỗ, không thì phía trên; không có phần tử thì giữa màn hình.
  // Chỉ đặt lại khi đổi bước, đổi cỡ màn hình, phần tử hiện ra/biến mất hoặc trôi đi xa.
  useLayoutEffect(() => {
    const card = cardRef.current
    // Chưa đo phần tử của bước này thì chưa đặt, tránh đặt thẻ theo vị trí của bước trước.
    if (!card || !step || !boxReady) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cx = box ? box.left + box.width / 2 : NaN
    const cy = box ? box.top + box.height / 2 : NaN
    const p = placed.current
    if (
      p &&
      p.step === step &&
      p.vw === vw &&
      p.vh === vh &&
      Number.isNaN(p.cx) === !box &&
      (!box || Math.hypot(cx - p.cx, cy - p.cy) < REPLACE_DIST)
    )
      return
    placed.current = { step, cx, cy, vw, vh }
    const cw = card.offsetWidth
    const ch = card.offsetHeight
    let top = (vh - ch) / 2
    let left = (vw - cw) / 2
    // side = cạnh của thẻ có mũi nhọn (top: thẻ nằm dưới phần tử, left: thẻ nằm bên phải phần tử...).
    let side = 'none'
    let arrowX = cw / 2
    let arrowY = ch / 2
    if (box) {
      const below = box.top + box.height + PAD + GAP
      const above = box.top - PAD - GAP - ch
      const right = box.left + box.width + PAD + GAP
      const leftOf = box.left - PAD - GAP - cw
      const fitsBelow = below + ch <= vh - MARGIN
      const fitsAbove = above >= MARGIN
      if (fitsBelow && !(step.above && fitsAbove)) {
        top = below
        side = 'top'
      } else if (fitsAbove) {
        top = above
        side = 'bottom'
      } else if (right + cw <= vw - MARGIN || leftOf >= MARGIN) {
        // Màn hình thấp (điện thoại xoay ngang): không đủ chỗ trên/dưới thì đặt sang bên cạnh.
        const toRight = right + cw <= vw - MARGIN && (leftOf < MARGIN || cx < vw / 2)
        left = toRight ? right : leftOf
        side = toRight ? 'left' : 'right'
      } else {
        // Không chỗ nào vừa (màn rất thấp): dạt thẻ về phía còn nhiều chỗ hơn để che phần tử ít nhất.
        top = box.top > vh - box.top - box.height ? MARGIN : vh - ch - MARGIN
      }
      if (side === 'top' || side === 'bottom' || side === 'none') {
        left = Math.max(MARGIN, Math.min(vw - cw - MARGIN, cx - cw / 2))
        arrowX = Math.max(22, Math.min(cw - 22, cx - left))
      } else {
        top = Math.max(MARGIN, Math.min(vh - ch - MARGIN, cy - ch / 2))
        arrowY = Math.max(22, Math.min(ch - 22, cy - top))
      }
    }
    card.style.top = `${Math.round(top)}px`
    card.style.left = `${Math.round(left)}px`
    card.style.setProperty('--arrow-x', `${Math.round(arrowX)}px`)
    card.style.setProperty('--arrow-y', `${Math.round(arrowY)}px`)
    card.dataset.side = side
  }, [box, step, boxReady])

  const total = steps?.length ?? 0
  const isLast = index === total - 1
  const next = () => (isLast ? closeTour() : setIndex((i) => i + 1))
  const back = () => setIndex((i) => Math.max(0, i - 1))

  useEffect(() => {
    if (!step) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTour()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const radius = box ? Math.min(28, Math.min(box.width, box.height) / 2 + PAD) : 0
  const hole = box
    ? { left: box.left - PAD, top: box.top - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2, borderRadius: radius }
    : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0, borderRadius: 0 }

  return (
    <AnimatePresence>
      {active && (
        <motion.div className="tour" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {/* Lớp chặn bấm: trong lúc xem tour không tương tác được với bản đồ và các nút. */}
          <div className="tour-blocker" />
          {step && (
            <>
              <div className={`tour-hole ${box ? 'on' : ''}`} style={hole} />
              <div ref={cardRef} className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title">
                <motion.div
                  key={index}
                  className="tour-card-inner"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="tour-head">
                    <span className="tour-icon">{step.icon}</span>
                    <h3 id="tour-title">{step.title}</h3>
                    <span className="tour-count">
                      {index + 1}/{total}
                    </span>
                  </div>
                  <p className="tour-text">{step.text}</p>
                  <div className="tour-dots" aria-hidden>
                    {steps!.map((s, i) => (
                      <span key={s.target} className={i === index ? 'on' : i < index ? 'done' : ''} />
                    ))}
                  </div>
                  <div className="tour-foot">
                    {!isLast && (
                      <button className="tour-skip" onClick={closeTour}>
                        Bỏ qua
                      </button>
                    )}
                    <div className="tour-nav">
                      {index > 0 && (
                        <button className="btn ghost tour-btn" onClick={back}>
                          Quay lại
                        </button>
                      )}
                      <button className="btn tour-btn" onClick={next} autoFocus>
                        {isLast ? 'Bắt đầu chơi! 🌸' : 'Tiếp'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

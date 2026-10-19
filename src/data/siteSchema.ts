/**
 * Kiểu dữ liệu + kiểm tra cấu hình website (phòng ban, nhân viên, nhạc nền, video).
 * Dùng chung cho web chính, trang admin và API (thư mục api/) nên KHÔNG import file nào khác.
 */

export interface Member {
  name: string
  title?: string
  photo?: string
}

export interface Department {
  slug: string
  name: string
  color: string
  icon: string
  message: string
  members: Member[]
}

export interface Track {
  id: string
  title: string
  url: string
}

export interface MusicConfig {
  tracks: Track[]
  shuffle: boolean
  /** 0..1 */
  volume: number
}

export interface VideoConfig {
  type: 'mp4' | 'youtube'
  src: string
}

/** Video bất ngờ giữa hành trình: quà treo bóng bay rơi xuống khi thu thập đủ `flowers` bông hoa. */
export interface BonusConfig extends VideoConfig {
  id: string
  /** Tên hiển thị ở nút xem lại (không bắt buộc). */
  title?: string
  flowers: number
}

/** Video chiếu trên màn hình dựng ở một đảo phụ: bấm vào màn hình để xem. */
export interface IslandVideoConfig extends VideoConfig {
  /** Mã đảo phụ đặt màn hình (vd. "tropical", "blossom"). */
  island: string
  /** Tên hiển thị trên khung video (không bắt buộc). */
  title?: string
}

export interface SiteData {
  version: 1
  departments: Department[]
  music: MusicConfig
  video: VideoConfig
  /** Các video bất ngờ, mỗi video một mốc số hoa. */
  bonuses: BonusConfig[]
  /** Video trên các đảo phụ, mỗi đảo một video. */
  islandVideos: IslandVideoConfig[]
  updatedAt?: string
}

/** Mặc định: quà bóng bay rơi khi có 4 bông hoa. */
export const DEFAULT_BONUS_FLOWERS = 4

/** Mặc định: màn chiếu ở Đảo Nhiệt Đới và Đảo Hoa Anh Đào (cấu hình cũ chưa có mục này cũng dùng). */
export const DEFAULT_ISLAND_VIDEOS: IslandVideoConfig[] = [
  { island: 'tropical', type: 'youtube', src: '', title: 'Video Đảo Nhiệt Đới' },
  { island: 'blossom', type: 'youtube', src: '', title: 'Video Đảo Hoa Anh Đào' },
]

export const LIMITS = {
  departments: 30,
  members: 100,
  tracks: 50,
  bonuses: 10,
  islandVideos: 5,
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const COLOR_RE = /^#[0-9a-fA-F]{6}$/

function fail(msg: string): never {
  throw new Error(msg)
}

function str(v: unknown, where: string, max: number, required = true): string {
  if (v === undefined || v === null || v === '') {
    if (required) fail(`${where}: không được để trống`)
    return ''
  }
  if (typeof v !== 'string') fail(`${where}: phải là chuỗi`)
  const s = v.trim()
  if (required && !s) fail(`${where}: không được để trống`)
  if (s.length > max) fail(`${where}: quá dài (tối đa ${max} ký tự)`)
  return s
}

/** Chỉ cho phép đường dẫn nội bộ (/...) hoặc https. */
function url(v: unknown, where: string, required = true): string {
  const s = str(v, where, 2000, required)
  if (s && !s.startsWith('/') && !/^https:\/\//i.test(s)) fail(`${where}: đường dẫn không hợp lệ`)
  return s
}

function arr(v: unknown, where: string, max: number): unknown[] {
  if (!Array.isArray(v)) fail(`${where}: phải là danh sách`)
  if (v.length > max) fail(`${where}: tối đa ${max} mục`)
  return v
}

function obj(v: unknown, where: string): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(`${where}: dữ liệu không hợp lệ`)
  return v as Record<string, unknown>
}

function video(input: unknown, where: string): VideoConfig {
  const v = obj(input ?? {}, where)
  const type = v.type === 'youtube' ? 'youtube' : 'mp4'
  const src = type === 'youtube' ? str(v.src, `${where} – link YouTube`, 500, false) : url(v.src, `${where} – file`, false)
  return { type, src }
}

/** Kiểm tra + chuẩn hoá dữ liệu. Ném Error (tiếng Việt) nếu sai. */
export function parseSiteData(input: unknown): SiteData {
  const root = obj(input, 'Cấu hình')

  const depList = arr(root.departments, 'Phòng ban', LIMITS.departments)
  if (depList.length === 0) fail('Cần ít nhất 1 phòng ban')
  const slugs = new Set<string>()
  const departments: Department[] = depList.map((d, i) => {
    const o = obj(d, `Phòng ban #${i + 1}`)
    const name = str(o.name, `Phòng ban #${i + 1} – tên`, 80)
    const where = `Phòng ban "${name}"`
    const slug = str(o.slug, `${where} – mã`, 60)
    if (!SLUG_RE.test(slug)) fail(`${where} – mã chỉ gồm a-z, 0-9 và dấu "-"`)
    if (slugs.has(slug)) fail(`${where} – mã "${slug}" bị trùng`)
    slugs.add(slug)
    const color = str(o.color, `${where} – màu`, 7)
    if (!COLOR_RE.test(color)) fail(`${where} – màu phải dạng #rrggbb`)
    const members = arr(o.members ?? [], `${where} – nhân viên`, LIMITS.members).map((m, j) => {
      const mo = obj(m, `${where} – nhân viên #${j + 1}`)
      const member: Member = { name: str(mo.name, `${where} – nhân viên #${j + 1} – tên`, 80) }
      const title = str(mo.title, `${where} – ${member.name} – chức danh`, 80, false)
      const photo = url(mo.photo, `${where} – ${member.name} – ảnh`, false)
      if (title) member.title = title
      if (photo) member.photo = photo
      return member
    })
    return {
      slug,
      name,
      color,
      icon: str(o.icon, `${where} – icon`, 16),
      message: str(o.message, `${where} – lời chúc`, 1000, false),
      members,
    }
  })

  const m = obj(root.music ?? {}, 'Nhạc nền')
  const ids = new Set<string>()
  const tracks: Track[] = arr(m.tracks ?? [], 'Nhạc nền', LIMITS.tracks).map((t, i) => {
    const o = obj(t, `Bài nhạc #${i + 1}`)
    let id = str(o.id, `Bài nhạc #${i + 1} – id`, 60, false) || `t${i + 1}`
    while (ids.has(id)) id += 'x'
    ids.add(id)
    return {
      id,
      title: str(o.title, `Bài nhạc #${i + 1} – tên`, 120),
      url: url(o.url, `Bài nhạc #${i + 1} – file`),
    }
  })
  const volume = typeof m.volume === 'number' && Number.isFinite(m.volume) ? Math.min(1, Math.max(0, m.volume)) : 0.15

  // Bản cũ chỉ có 1 video bất ngờ (root.bonus): chuyển thành danh sách.
  const legacy = root.bonus as { src?: unknown } | undefined
  const bonusList = Array.isArray(root.bonuses) ? root.bonuses : legacy?.src ? [legacy] : []
  const bonusIds = new Set<string>()
  const bonuses: BonusConfig[] = arr(bonusList, 'Video bất ngờ', LIMITS.bonuses).map((input, i) => {
    const where = `Video bất ngờ #${i + 1}`
    const b = obj(input, where)
    let id = str(b.id, `${where} – id`, 60, false) || `b${i + 1}`
    while (bonusIds.has(id)) id += 'x'
    bonusIds.add(id)
    const flowers =
      typeof b.flowers === 'number' && Number.isFinite(b.flowers)
        ? Math.min(departments.length, Math.max(1, Math.round(b.flowers)))
        : Math.min(departments.length, DEFAULT_BONUS_FLOWERS)
    const title = str(b.title, `${where} – tên`, 80, false)
    return { id, ...video(b, where), flowers, ...(title ? { title } : {}) }
  })

  const islandKeys = new Set<string>()
  const islandVideos: IslandVideoConfig[] = arr(root.islandVideos ?? DEFAULT_ISLAND_VIDEOS, 'Video trên đảo', LIMITS.islandVideos).map((input, i) => {
    const where = `Video trên đảo #${i + 1}`
    const o = obj(input, where)
    const island = str(o.island, `${where} – đảo`, 30)
    if (!SLUG_RE.test(island.toLowerCase())) fail(`${where} – mã đảo không hợp lệ`)
    if (islandKeys.has(island)) fail(`${where} – đảo "${island}" đã có video`)
    islandKeys.add(island)
    const title = str(o.title, `${where} – tên`, 80, false)
    return { island, ...video(o, where), ...(title ? { title } : {}) }
  })

  return {
    version: 1,
    departments,
    music: { tracks, shuffle: m.shuffle === true, volume },
    video: video(root.video, 'Video'),
    bonuses,
    islandVideos,
    updatedAt: typeof root.updatedAt === 'string' ? root.updatedAt : undefined,
  }
}

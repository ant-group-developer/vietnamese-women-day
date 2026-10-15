import { useRef, useState } from 'react'
import { fallbackAvatar, photoThumb } from '../data/departments'
import type { Department, Member } from '../data/siteData'
import { LIMITS } from '../data/siteData'
import { nameFromFile, slugify, uploadFile } from './api'
import type { TabProps } from './AdminApp'
import { DragHandle, SortableList } from './Sortable'
import { arrayMove, idOf, patched } from './sortableIds'

const COLORS = ['#ff8fab', '#ffb86b', '#7ed6a5', '#6cc3ff', '#a78bfa', '#f472b6', '#facc15', '#fb7185']
/** Quá số này thì bản đồ khá dài, vẫn chạy được nhưng nên cân nhắc. */
const MANY_DEPARTMENTS = 12

function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = slugify(base)
  for (let i = 2; taken.has(slug); i++) slug = `${slugify(base)}-${i}`
  return slug
}

export function DepartmentsTab({ data, update, onError }: TabProps) {
  const [selected, setSelected] = useState(0)
  const deps = data.departments
  const index = Math.min(selected, deps.length - 1)
  const dept = deps[index]

  const setDepts = (fn: (list: Department[]) => Department[]) =>
    update((d) => ({ ...d, departments: fn(d.departments) }))

  const patchDept = (i: number, patch: Partial<Department>) =>
    setDepts((list) => list.map((x, j) => (j === i ? patched(x, patch) : x)))

  const addDept = () => {
    const name = 'Phòng ban mới'
    const slug = uniqueSlug(name, new Set(deps.map((d) => d.slug)))
    setDepts((list) => [
      ...list,
      { slug, name, icon: '🌸', color: COLORS[list.length % COLORS.length], message: 'Chúc các chị em luôn xinh đẹp và hạnh phúc!', members: [] },
    ])
    setSelected(deps.length)
  }

  const removeDept = (i: number) => {
    if (deps.length <= 1) return alert('Cần giữ lại ít nhất 1 phòng ban.')
    if (!confirm(`Xoá phòng ban "${deps[i].name}" và ${deps[i].members.length} nhân viên?`)) return
    setDepts((list) => list.filter((_, j) => j !== i))
    setSelected(Math.max(0, i - 1))
  }

  /** Kéo thả: phòng ban đang chọn vẫn được chọn sau khi đổi chỗ. */
  const moveDept = (from: number, to: number) => {
    setDepts((list) => arrayMove(list, from, to))
    if (from === index) setSelected(to)
    else if (from < index && to >= index) setSelected(index - 1)
    else if (from > index && to <= index) setSelected(index + 1)
  }

  return (
    <div className="split">
      <aside className="side card">
        <SortableList items={deps} onMove={moveDept} as="ol" className="dept-list">
          {(d, i, handle) => (
            <div className={`dept-row ${i === index ? 'active' : ''}`} onClick={() => setSelected(i)}>
              <DragHandle handle={handle} />
              <span className="dot" style={{ background: d.color }}>
                {d.icon}
              </span>
              <span className="grow">
                <b>{d.name || '(chưa đặt tên)'}</b>
                <small>{d.members.length} người</small>
              </span>
            </div>
          )}
        </SortableList>
        <button className="btn ghost full" onClick={addDept} disabled={deps.length >= LIMITS.departments}>
          + Thêm phòng ban
        </button>
        {deps.length > MANY_DEPARTMENTS && (
          <p className="hint warn">Có {deps.length} phòng ban, bản đồ sẽ khá dài.</p>
        )}
        <p className="hint">Kéo ⠿ để đổi thứ tự. Thứ tự trong danh sách là thứ tự các ngôi nhà trên đường đi.</p>
      </aside>

      {dept && (
        <section className="main-col">
          <div className="card">
            <div className="card-head">
              <h2>
                {dept.icon} {dept.name}
              </h2>
              <button className="btn danger" onClick={() => removeDept(index)}>
                Xoá phòng ban
              </button>
            </div>
            <div className="grid-2">
              <label className="field">
                <span>Tên phòng ban</span>
                <input value={dept.name} maxLength={80} onChange={(e) => patchDept(index, { name: e.target.value })} />
              </label>
              <label className="field">
                <span>Mã (dùng trong đường dẫn ảnh)</span>
                <div className="inline">
                  <input
                    value={dept.slug}
                    maxLength={60}
                    onChange={(e) => patchDept(index, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  />
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() =>
                      patchDept(index, { slug: uniqueSlug(dept.name, new Set(deps.filter((_, j) => j !== index).map((d) => d.slug))) })
                    }
                  >
                    Tạo từ tên
                  </button>
                </div>
              </label>
              <label className="field">
                <span>Icon (emoji)</span>
                <input value={dept.icon} maxLength={16} onChange={(e) => patchDept(index, { icon: e.target.value })} />
              </label>
              <label className="field">
                <span>Màu</span>
                <div className="inline">
                  <input type="color" value={dept.color} onChange={(e) => patchDept(index, { color: e.target.value })} />
                  <input value={dept.color} maxLength={7} onChange={(e) => patchDept(index, { color: e.target.value })} />
                </div>
              </label>
            </div>
            <label className="field">
              <span>Lời chúc</span>
              <textarea rows={3} maxLength={1000} value={dept.message} onChange={(e) => patchDept(index, { message: e.target.value })} />
            </label>
          </div>

          <Members
            key={idOf(dept)}
            dept={dept}
            setMembers={(fn) => {
              // Gắn theo id (không theo vị trí) để upload đang chạy vẫn vào đúng phòng ban dù đã kéo đổi chỗ.
              const id = idOf(dept)
              setDepts((list) => list.map((x) => (idOf(x) === id ? patched(x, { members: fn(x.members) }) : x)))
            }}
            onError={onError}
          />
        </section>
      )}
    </div>
  )
}

interface MembersProps {
  dept: Department
  setMembers: (fn: (list: Member[]) => Member[]) => void
  onError: (e: unknown) => void
}

function Members({ dept, setMembers, onError }: MembersProps) {
  const bulkRef = useRef<HTMLInputElement>(null)
  const [bulk, setBulk] = useState('')
  const members = dept.members

  const patch = (id: string, p: Partial<Member>) => setMembers((list) => list.map((m) => (idOf(m) === id ? patched(m, p) : m)))

  /** Chọn nhiều ảnh cùng lúc: mỗi ảnh thành 1 nhân viên, tên lấy từ tên file. */
  const addFromPhotos = async (files: FileList) => {
    const list = Array.from(files)
    let done = 0
    setBulk(`0/${list.length}`)
    for (const file of list) {
      try {
        const name = nameFromFile(file)
        const photo = await uploadFile(file, 'images', name, undefined, dept.slug)
        setMembers((ms) => [...ms, { name, photo }])
      } catch (e) {
        onError(e)
      }
      setBulk(`${++done}/${list.length}`)
    }
    setBulk('')
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Nhân viên ({members.length})</h2>
        <div className="inline">
          <button className="btn ghost" onClick={() => bulkRef.current?.click()} disabled={!!bulk}>
            {bulk ? `Đang tải ảnh ${bulk}` : '📷 Thêm nhiều từ ảnh'}
          </button>
          <button className="btn primary" onClick={() => setMembers((ms) => [...ms, { name: '' }])} disabled={members.length >= LIMITS.members}>
            + Thêm nhân viên
          </button>
        </div>
        <input
          ref={bulkRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void addFromPhotos(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {members.length === 0 && <p className="hint">Chưa có nhân viên. Mẹo: “Thêm nhiều từ ảnh” sẽ lấy tên file làm tên người.</p>}
      {members.length > 1 && <p className="hint">Kéo ⠿ để đổi thứ tự.</p>}
      <SortableList
        items={members}
        layout="grid"
        className="members"
        onMove={(from, to) => setMembers((list) => arrayMove(list, from, to))}
      >
        {(m, _i, handle) => {
          const id = idOf(m)
          return (
            <MemberCard
              member={m}
              dept={dept}
              handle={<DragHandle handle={handle} />}
              onChange={(p) => patch(id, p)}
              onRemove={() => {
                if (!m.name || confirm(`Xoá "${m.name}"?`)) setMembers((list) => list.filter((x) => idOf(x) !== id))
              }}
              onError={onError}
            />
          )
        }}
      </SortableList>
    </div>
  )
}

interface MemberCardProps {
  member: Member
  dept: Department
  handle: React.ReactNode
  onChange: (p: Partial<Member>) => void
  onRemove: () => void
  onError: (e: unknown) => void
}

function MemberCard({ member, dept, handle, onChange, onRemove, onError }: MemberCardProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)

  const pick = async (file: File) => {
    setProgress(0)
    try {
      const photo = await uploadFile(file, 'images', member.name || nameFromFile(file), setProgress, dept.slug)
      onChange(member.name ? { photo } : { photo, name: nameFromFile(file) })
    } catch (e) {
      onError(e)
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="member">
      <button className="photo" onClick={() => fileRef.current?.click()} title="Đổi ảnh" style={{ borderColor: dept.color }}>
        <img src={member.photo ? photoThumb(member.photo) : fallbackAvatar(member.name || '?')} alt="" onError={(e) => (e.currentTarget.src = fallbackAvatar(member.name || '?'))} />
        <span className={`photo-overlay ${progress !== null ? 'show' : ''}`}>{progress !== null ? `${progress}%` : '📷'}</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void pick(f)
          e.target.value = ''
        }}
      />
      <input className="name" placeholder="Họ tên" value={member.name} maxLength={80} onChange={(e) => onChange({ name: e.target.value })} />
      <input placeholder="Chức danh (không bắt buộc)" value={member.title ?? ''} maxLength={80} onChange={(e) => onChange({ title: e.target.value || undefined })} />
      <div className="row-btns">
        {handle}
        <span className="grow" />
        {member.photo && (
          <button className="icon" onClick={() => onChange({ photo: undefined })} title="Bỏ ảnh">
            🚫
          </button>
        )}
        <button className="icon danger" onClick={onRemove} title="Xoá">
          ✕
        </button>
      </div>
    </div>
  )
}

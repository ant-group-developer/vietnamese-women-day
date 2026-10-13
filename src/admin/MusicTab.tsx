import { useRef, useState } from 'react'
import type { MusicConfig, Track } from '../data/siteData'
import { LIMITS } from '../data/siteData'
import { nameFromFile, newId, uploadFile } from './api'
import type { TabProps } from './AdminApp'
import { DragHandle, SortableList } from './Sortable'
import { arrayMove } from './sortableIds'

export function MusicTab({ data, update, onError }: TabProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState('')
  const [link, setLink] = useState('')
  const { tracks, shuffle, volume } = data.music

  const setMusic = (fn: (m: MusicConfig) => MusicConfig) => update((d) => ({ ...d, music: fn(d.music) }))
  const setTracks = (fn: (t: Track[]) => Track[]) => setMusic((m) => ({ ...m, tracks: fn(m.tracks) }))

  const addFiles = async (files: FileList) => {
    const list = Array.from(files)
    for (const [n, file] of list.entries()) {
      try {
        const title = nameFromFile(file)
        const url = await uploadFile(file, 'audio', title, (p) => setProgress(`${n + 1}/${list.length} · ${p}%`))
        setTracks((t) => [...t, { id: newId(), title, url }])
      } catch (e) {
        onError(e)
      }
    }
    setProgress('')
  }

  const addLink = () => {
    const url = link.trim()
    if (!/^https:\/\//i.test(url)) return onError(new Error('Link phải bắt đầu bằng https://'))
    const title = decodeURIComponent(url.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Bài nhạc')
    setTracks((t) => [...t, { id: newId(), title, url }])
    setLink('')
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h2>Danh sách nhạc nền ({tracks.length})</h2>
          <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={!!progress || tracks.length >= LIMITS.tracks}>
            {progress ? `Đang tải ${progress}` : '🎵 Tải lên nhạc'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/mp4,audio/aac,.mp3,.m4a,.aac"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
        <p className="hint">
          Nhạc phát lần lượt từ trên xuống, hết bài cuối thì quay lại bài đầu. Nên dùng mp3 dưới ~10MB để tải nhanh trên điện thoại.
        </p>

        {tracks.length === 0 && <p className="hint">Chưa có bài nào, website sẽ không có nhạc nền.</p>}
        <SortableList
          items={tracks}
          getId={(t) => t.id}
          as="ol"
          className="tracks"
          itemClassName="track"
          onMove={(from, to) => setTracks((l) => arrayMove(l, from, to))}
        >
          {(t, i, handle) => (
            <>
              <DragHandle handle={handle} />
              <span className="num">{i + 1}</span>
              <input
                className="grow"
                value={t.title}
                maxLength={120}
                onChange={(e) => setTracks((list) => list.map((x) => (x.id === t.id ? { ...x, title: e.target.value } : x)))}
              />
              <audio src={t.url} controls preload="none" />
              <button
                className="icon danger"
                onClick={() => confirm(`Xoá bài "${t.title}"?`) && setTracks((l) => l.filter((x) => x.id !== t.id))}
                title="Xoá"
              >
                ✕
              </button>
            </>
          )}
        </SortableList>

        <div className="inline">
          <input className="grow" placeholder="Hoặc dán link mp3 (https://...)" value={link} onChange={(e) => setLink(e.target.value)} />
          <button className="btn ghost" onClick={addLink} disabled={!link.trim()}>
            Thêm link
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Tuỳ chọn phát</h2>
        <label className="field">
          <span>Âm lượng: {Math.round(volume * 100)}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => setMusic((m) => ({ ...m, volume: Number(e.target.value) / 100 }))}
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={shuffle} onChange={(e) => setMusic((m) => ({ ...m, shuffle: e.target.checked }))} />
          Phát ngẫu nhiên (xáo bài)
        </label>
      </div>
    </div>
  )
}

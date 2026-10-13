import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SiteData } from '../data/siteData'
import { AuthError, getPassword, loadConfig, login, saveConfig, setPassword, useUploading } from './api'
import { DepartmentsTab } from './DepartmentsTab'
import { MusicTab } from './MusicTab'
import { VideoTab } from './VideoTab'

type Tab = 'departments' | 'music' | 'video'

export function AdminApp() {
  const [authed, setAuthed] = useState(() => !!getPassword())
  const [data, setData] = useState<SiteData | null>(null)
  const [saved, setSaved] = useState<SiteData | null>(null)
  const [everSaved, setEverSaved] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    loadConfig()
      .then((r) => {
        setData(r.data)
        setSaved(r.data)
        setEverSaved(r.saved)
      })
      .catch((e: Error) => setLoadError(e.message))
  }, [])

  const logout = useCallback(() => {
    setPassword('')
    setAuthed(false)
  }, [])

  if (!authed) return <Login onDone={() => setAuthed(true)} />
  if (loadError) return <div className="center-msg error">Không tải được cấu hình: {loadError}</div>
  if (!data || !saved) return <div className="center-msg">Đang tải cấu hình...</div>

  return (
    <Editor
      data={data}
      setData={setData}
      saved={saved}
      everSaved={everSaved}
      onSaved={(d) => {
        setData(d)
        setSaved(d)
        setEverSaved(true)
      }}
      onAuthError={logout}
    />
  )
}

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(pw)
      setPassword(pw)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="login card" onSubmit={submit}>
      <h1>🌸 Cấu hình 20/10</h1>
      <label className="field">
        <span>Mật khẩu quản trị</span>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus required />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn primary" disabled={busy || !pw}>
        {busy ? 'Đang kiểm tra...' : 'Đăng nhập'}
      </button>
    </form>
  )
}

interface EditorProps {
  data: SiteData
  setData: React.Dispatch<React.SetStateAction<SiteData | null>>
  saved: SiteData
  everSaved: boolean
  onSaved: (d: SiteData) => void
  onAuthError: () => void
}

function Editor({ data, setData, saved, everSaved, onSaved, onAuthError }: EditorProps) {
  const [tab, setTab] = useState<Tab>('departments')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const uploading = useUploading()
  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(saved), [data, saved])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), message.type === 'ok' ? 5000 : 12000)
    return () => clearTimeout(t)
  }, [message])

  const update = useCallback((fn: (d: SiteData) => SiteData) => setData((d) => (d ? fn(d) : d)), [setData])

  const onError = useCallback(
    (e: unknown) => {
      if (e instanceof AuthError) onAuthError()
      setMessage({ type: 'error', text: e instanceof Error ? e.message : String(e) })
    },
    [onAuthError],
  )

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      onSaved(await saveConfig(data))
      setMessage({ type: 'ok', text: 'Đã lưu! Trang chính sẽ dùng cấu hình mới ở lần tải tiếp theo.' })
    } catch (e) {
      onError(e)
    } finally {
      setSaving(false)
    }
  }

  const status = uploading
    ? `Đang upload ${uploading} file...`
    : dirty
      ? 'Có thay đổi chưa lưu'
      : saved.updatedAt
        ? `Đã lưu lúc ${new Date(saved.updatedAt).toLocaleString('vi-VN')}`
        : everSaved
          ? 'Đã lưu'
          : 'Đang dùng dữ liệu mặc định (chưa lưu lần nào)'

  return (
    <div className="admin">
      <header className="topbar">
        <h1>🌸 Cấu hình 20/10</h1>
        <nav className="tabs">
          <button className={tab === 'departments' ? 'active' : ''} onClick={() => setTab('departments')}>
            Phòng ban & nhân viên <small>{data.departments.length}</small>
          </button>
          <button className={tab === 'music' ? 'active' : ''} onClick={() => setTab('music')}>
            Nhạc nền <small>{data.music.tracks.length}</small>
          </button>
          <button className={tab === 'video' ? 'active' : ''} onClick={() => setTab('video')}>
            Video
          </button>
        </nav>
        <div className="actions">
          <span className={`status ${dirty ? 'dirty' : ''}`}>{status}</span>
          <a className="btn ghost" href="/" target="_blank" rel="noreferrer">
            Xem trang ↗
          </a>
          <button className="btn primary" onClick={save} disabled={saving || uploading > 0 || (!dirty && everSaved)}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
          <button className="btn ghost" onClick={onAuthError}>
            Đăng xuất
          </button>
        </div>
      </header>

      {message && (
        <div className={`toast ${message.type}`} onClick={() => setMessage(null)}>
          {message.text}
        </div>
      )}

      <main className="content">
        {tab === 'departments' && <DepartmentsTab data={data} update={update} onError={onError} />}
        {tab === 'music' && <MusicTab data={data} update={update} onError={onError} />}
        {tab === 'video' && <VideoTab data={data} update={update} onError={onError} />}
      </main>
    </div>
  )
}

export interface TabProps {
  data: SiteData
  update: (fn: (d: SiteData) => SiteData) => void
  onError: (e: unknown) => void
}

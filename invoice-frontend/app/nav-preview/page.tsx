'use client'
import { useTheme, themes } from '@/contexts/ThemeContext'
import './design-nav.css'

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM13 5a1 1 0 011-1h5a1 1 0 011 1v3a1 1 0 01-1 1h-5a1 1 0 01-1-1V5zM4 14a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5zM13 12a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1h-5a1 1 0 01-1-1v-7z" /></svg>,
  invoices: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  clients: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  time: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  year: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
}
const NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'clients', label: 'Clients' },
  { key: 'time', label: 'Time' },
  { key: 'year', label: 'Summary' },
]

function Cube() {
  return <div className="nv-cube-stage"><div className="nv-cube"><span /><span /><span /><span /><span /><span /></div></div>
}

function ThemeBar() {
  const { colorTheme, isDark, setColorTheme, toggleMode } = useTheme()
  return (
    <div className="sticky top-0 z-30 mb-8 flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl"
      style={{ background: 'var(--t-bg-header)', border: '1px solid var(--t-border)', backdropFilter: 'blur(12px)' }}>
      <span className="text-xs uppercase tracking-wider font-bold t-text-muted mr-1">Theme</span>
      {themes.map(t => (
        <button key={t.id} onClick={() => setColorTheme(t.id)} title={t.name}
          className="w-7 h-7 rounded-full transition-transform hover:scale-110"
          style={{ background: 'var(--t-accent)', filter: colorTheme === t.id ? 'none' : 'grayscale(0.7) opacity(0.5)', outline: colorTheme === t.id ? '2px solid var(--t-text)' : 'none', outlineOffset: 2 }}
          data-theme={t.id} data-mode={isDark ? 'dark' : 'light'} />
      ))}
      <button onClick={toggleMode} className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium"
        style={{ background: 'var(--t-bg-elevated)', color: 'var(--t-text)', border: '1px solid var(--t-border)' }}>
        {isDark ? '☀ Light' : '🌙 Dark'}
      </button>
    </div>
  )
}

// faint placeholder content beside a drawer, so the variant reads in context
function FakeContent({ left }: { left: number }) {
  return (
    <div className="absolute top-0 right-0 bottom-0 p-6 space-y-4" style={{ left }}>
      <div className="h-7 w-40 rounded-lg" style={{ background: 'var(--t-bg-elevated)' }} />
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl" style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border-light)' }} />)}
      </div>
      <div className="h-40 rounded-xl" style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border-light)' }} />
    </div>
  )
}

export default function NavPreview() {
  return (
    <div className="min-h-screen t-page-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-16">
        <ThemeBar />

        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] t-accent font-bold mb-1">Material direction · pick one</p>
          <h1 className="text-2xl font-bold t-text">Sidebar variants</h1>
        </div>

        <div className="space-y-8">
          {/* VARIANT 1 — Material 3 Drawer */}
          <div className="nv-stage">
            <span className="nv-chip">Sidebar 1 · Material 3 Drawer (pill)</span>
            <aside className="nv-drawer nv-v1">
              <span className="nv-shape" />
              <div className="nv-logo mb-8"><Cube /><span className="nv-wordmark">Invoicer</span></div>
              <span className="nv-section px-4 mb-2">Menu</span>
              {NAV.map((n, i) => (
                <div key={n.key} className={`nv-item ${i === 0 ? 'nv-item--active' : ''}`}>
                  {ICONS[n.key]}<span>{n.label}</span>
                </div>
              ))}
              <div className="mt-auto"><div className="nv-cta w-full">+ New Invoice</div></div>
            </aside>
            <FakeContent left={260} />
          </div>

          {/* VARIANT 2 — Material Rail */}
          <div className="nv-stage">
            <span className="nv-chip">Sidebar 2 · Material Rail (icon + label)</span>
            <aside className="nv-drawer nv-v2">
              <span className="nv-shape" />
              <div className="mb-6"><Cube /></div>
              {NAV.map((n, i) => (
                <div key={n.key} className={`nv-rail-item ${i === 0 ? 'nv-rail-item--active' : ''}`}>
                  <div className="nv-rail-pill">{ICONS[n.key]}</div>
                  <span>{n.label}</span>
                </div>
              ))}
              <div className="mt-auto nv-cta" style={{ width: 48, height: 48, padding: 0, borderRadius: 16 }}>+</div>
            </aside>
            <FakeContent left={96} />
          </div>

          {/* VARIANT 3 — Elevated card drawer */}
          <div className="nv-stage">
            <span className="nv-chip">Sidebar 3 · Elevated card (accent bar)</span>
            <aside className="nv-drawer nv-v3">
              <span className="nv-shape" />
              <div className="nv-logo mb-7"><Cube /><span className="nv-wordmark">Invoicer</span></div>
              <span className="nv-section px-3 mb-2">Workspace</span>
              {NAV.map((n, i) => (
                <div key={n.key} className={`nv-item ${i === 0 ? 'nv-item--active' : ''}`}>
                  {ICONS[n.key]}<span>{n.label}</span>
                </div>
              ))}
              <div className="mt-auto"><div className="nv-cta w-full">+ New Invoice</div></div>
            </aside>
            <FakeContent left={276} />
          </div>
        </div>

        {/* HEADERS */}
        <div className="mt-12 mb-6">
          <p className="text-xs uppercase tracking-[0.2em] t-accent font-bold mb-1">Material direction · pick one</p>
          <h1 className="text-2xl font-bold t-text">Header variants</h1>
        </div>

        <div className="space-y-6">
          {/* Header A */}
          <div>
            <span className="text-xs font-bold t-text-muted">Header A · Top app bar (filled search)</span>
            <div className="nv-header mt-2">
              <button className="nv-icon-btn"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
              <div className="nv-search"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><span>Search invoices…</span></div>
              <div className="ml-auto flex items-center gap-1">
                <button className="nv-icon-btn"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1" /></svg></button>
                <button className="nv-icon-btn"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg></button>
                <div className="nv-avatar ml-1">T</div>
              </div>
            </div>
          </div>

          {/* Header B */}
          <div>
            <span className="text-xs font-bold t-text-muted">Header B · Title + segmented + accent shape</span>
            <div className="nv-header mt-2">
              <span className="nv-headerB-shape" />
              <button className="nv-icon-btn"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
              <span className="font-bold t-text relative z-10">Dashboard</span>
              <div className="nv-seg ml-2 relative z-10"><span className="is-active">Overview</span><span>Activity</span></div>
              <div className="ml-auto flex items-center gap-1 relative z-10">
                <button className="nv-icon-btn"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
                <button className="nv-icon-btn"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1" /></svg></button>
                <div className="nv-avatar ml-1">T</div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm t-text-muted mt-10">
          Switch theme above to see each variant re-tint. Tell me e.g. <b>“Sidebar 1 + Header A”</b> and
          I&apos;ll wire it into the real <code>Sidebar.tsx</code> / <code>Header.tsx</code> (keeping collapse, mobile drawer, search & dropdowns working).
        </p>
      </div>
    </div>
  )
}

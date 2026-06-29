'use client'
import { useState } from 'react'
import { useTheme, themes } from '@/contexts/ThemeContext'
import './concepts.css'

type Concept = 'fusion' | 'neo' | 'aurora' | 'prism'
const CONCEPTS: { id: Concept; name: string; blurb: string }[] = [
  { id: 'fusion', name: 'Prism Sharp', blurb: 'Prism beauty + Neo clipped corners — gradient icons & accent bars, sharp beveled card edges with a corner notch' },
  { id: 'neo',    name: 'Neo',    blurb: 'Sharp / cyber — clipped corners, wireframe shapes, mono numbers' },
  { id: 'aurora', name: 'Aurora', blurb: 'Glow / glass — drifting blobs, frosted cards, neon accents' },
  { id: 'prism',  name: 'Prism',  blurb: 'Geometric / bold — floating diamonds, accent bars, big type' },
]

const I = {
  euro: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 9v1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  doc: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  users: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  chart: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" /></svg>,
  search: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  bell: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0" /></svg>,
}

function Spark({ data }: { data: number[] }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const w = 84, h = 26, step = w / (data.length - 1)
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg className="cpt-spark" viewBox={`0 0 ${w} ${h}`}>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="var(--t-accent)" opacity="0.14" />
      <path d={line} fill="none" stroke="var(--t-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill="var(--t-accent)" />
    </svg>
  )
}

const STATS = [
  { label: 'Total Revenue', val: '12 480 €', sub: '↑ 12% vs last month', icon: I.euro, trend: true, spark: [3,5,4,6,7,6,9] },
  { label: 'Invoices', val: '128', sub: '94 paid', icon: I.doc },
  { label: 'Clients', val: '42', sub: 'Active', icon: I.users },
  { label: 'Paid Ratio', val: '73%', sub: '34 unpaid', icon: I.chart },
]
const BARS = [40, 65, 50, 80, 60, 95, 72, 88]
const UNPAID = [
  { n: 'SF 2025-014', c: 'Acme UAB', d: '2025-07-02', t: '1 210 €', s: 'Sent' },
  { n: 'SF 2025-015', c: 'Nordis', d: '2025-06-18', t: '840 €', s: 'Overdue' },
  { n: 'SF 2025-016', c: 'Baltic Co', d: '2025-07-09', t: '2 190 €', s: 'Draft' },
]
const TOPC = [
  { name: 'Acme UAB', pct: 100, total: '8 400 €' },
  { name: 'Nordis', pct: 68, total: '5 700 €' },
  { name: 'Baltic Co', pct: 41, total: '3 480 €' },
]

function Bg({ c }: { c: Concept }) {
  return (
    <div className="cpt-bg">
      {c === 'neo' && (<><span className="cpt-poly p1" /><span className="cpt-poly p2" /><span className="cpt-poly p3" /></>)}
      {c === 'aurora' && (<><span className="cpt-blob b1" /><span className="cpt-blob b2" /><span className="cpt-blob b3" /></>)}
      {(c === 'prism' || c === 'fusion') && (<><span className="cpt-shape s1" /><span className="cpt-shape s2" /><span className="cpt-shape s3" /></>)}
    </div>
  )
}

function Mock({ c }: { c: Concept }) {
  return (
    <div className={`cpt-shell cpt cpt--${c} ${c === 'fusion' ? 'cpt--prism' : ''}`}>
      <Bg c={c} />
      <div className="cpt-ui">
        {/* header */}
        <div className="cpt-top">
          <div className="cpt-cube-stage"><div className="cpt-cube"><span /><span /><span /><span /><span /><span /></div></div>
          <span className="cpt-wordmark">Invoicer</span>
          <div className="cpt-search ml-2">{I.search}<span>Search invoices…</span></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="cpt-iconbtn">{I.bell}</span>
            <span className="cpt-avatar">T</span>
          </div>
        </div>

        <div className="cpt-h1">Dashboard</div>
        <div className="cpt-sub mb-1">Welcome back, Tomas</div>

        {/* stat cards */}
        <div className="cpt-grid4">
          {STATS.map((s, i) => (
            <div className="cpt-card" key={i}>
              <div className="flex items-center gap-2 mb-1">
                <span className="cpt-iconwrap">{s.icon}</span>
                <span className="cpt-klabel">{s.label}</span>
                {s.trend && <span className="cpt-trend ml-auto" style={{ color: '#10b981', background: 'rgba(16,185,129,.12)' }}>↑12%</span>}
              </div>
              <div className="cpt-kval">{s.val}</div>
              <div className="flex items-end justify-between">
                <span className="cpt-ksub" style={{ color: 'var(--t-accent)' }}>{s.sub}</span>
                {s.spark && <Spark data={s.spark} />}
              </div>
            </div>
          ))}
        </div>

        {/* main cols */}
        <div className="cpt-cols">
          <div className="space-y-3">
            <div className="cpt-panel">
              <div className="cpt-ph">Invoice Statistics</div>
              <div className="cpt-bars">{BARS.map((b, i) => <i key={i} style={{ height: `${b}%` }} />)}</div>
            </div>
            <div className="cpt-panel">
              <div className="cpt-ph">Unpaid Invoices</div>
              {UNPAID.map((u, i) => (
                <div className="cpt-row" key={i}>
                  <span style={{ color: 'var(--t-text)', fontWeight: 600 }}>{u.n}</span>
                  <span>{u.c}</span>
                  <span>{u.d}</span>
                  <span style={{ color: 'var(--t-text)', fontWeight: 700 }}>{u.t}</span>
                  <span className="cpt-pill" style={{ background: 'var(--t-accent-soft)', color: 'var(--t-accent)' }}>{u.s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="cpt-panel">
            <div className="cpt-ph">Top Clients</div>
            {TOPC.map((t, i) => (
              <div key={i} className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--t-text-secondary)' }}>
                  <span style={{ fontWeight: 600 }}>{i + 1}. {t.name}</span>
                  <span style={{ color: 'var(--t-accent)', fontWeight: 700 }}>{t.total}</span>
                </div>
                <div style={{ height: 6, background: 'var(--t-bg-elevated)', borderRadius: 999 }}>
                  <div style={{ width: `${t.pct}%`, height: '100%', background: 'var(--t-accent)', borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ThemeDots() {
  const { colorTheme, isDark, setColorTheme, toggleMode } = useTheme()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider font-bold t-text-muted mr-1">Theme</span>
      {themes.map(t => (
        <button key={t.id} onClick={() => setColorTheme(t.id)} title={t.name}
          className="w-6 h-6 rounded-full transition-transform hover:scale-110"
          style={{ background: 'var(--t-accent)', filter: colorTheme === t.id ? 'none' : 'grayscale(.7) opacity(.5)', outline: colorTheme === t.id ? '2px solid var(--t-text)' : 'none', outlineOffset: 2 }}
          data-theme={t.id} data-mode={isDark ? 'dark' : 'light'} />
      ))}
      <button onClick={toggleMode} className="px-3 py-1.5 rounded-lg text-xs font-medium"
        style={{ background: 'var(--t-bg-elevated)', color: 'var(--t-text)', border: '1px solid var(--t-border)' }}>
        {isDark ? '☀ Light' : '🌙 Dark'}
      </button>
    </div>
  )
}

export default function Concepts() {
  const [c, setC] = useState<Concept>('fusion')
  return (
    <div className="min-h-screen t-page-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-16">
        {/* controls */}
        <div className="sticky top-0 z-30 mb-6 px-4 py-3 rounded-xl flex flex-col gap-3"
          style={{ background: 'var(--t-bg-header)', border: '1px solid var(--t-border)', backdropFilter: 'blur(12px)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold t-text-muted mr-1">Concept</span>
            {CONCEPTS.map(cc => (
              <button key={cc.id} onClick={() => setC(cc.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={c === cc.id
                  ? { background: 'var(--t-accent)', color: '#fff' }
                  : { background: 'var(--t-bg-elevated)', color: 'var(--t-text-secondary)', border: '1px solid var(--t-border)' }}>
                {cc.name}
              </button>
            ))}
            <div className="ml-auto"><ThemeDots /></div>
          </div>
          <p className="text-xs t-text-muted">{CONCEPTS.find(x => x.id === c)!.blurb}</p>
        </div>

        <Mock c={c} />

        <p className="text-sm t-text-muted mt-8">
          Same dashboard, three directions — flip <b>Concept</b> and <b>Theme</b> to compare in context.
          When one feels like “the one”, tell me (e.g. <b>“Prism”</b>) and I&apos;ll apply it to the real dashboard,
          sidebar &amp; header — then we refine details together.
        </p>
      </div>
    </div>
  )
}

'use client'
import { useRef } from 'react'
import { useTheme, themes } from '@/contexts/ThemeContext'
import './design-lab.css'

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-xs uppercase tracking-[0.2em] t-accent font-bold mb-1">{kicker}</p>
      <h2 className="text-2xl font-bold t-text">{title}</h2>
    </div>
  )
}

// Self-contained theme switcher (no dashboard header on this public page).
function ThemeBar() {
  const { colorTheme, isDark, setColorTheme, toggleMode } = useTheme()
  return (
    <div className="sticky top-0 z-30 mb-10 flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl"
      style={{ background: 'var(--t-bg-header)', border: '1px solid var(--t-border)', backdropFilter: 'blur(12px)' }}>
      <span className="text-xs uppercase tracking-wider font-bold t-text-muted mr-1">Theme</span>
      {themes.map(t => (
        <button key={t.id} onClick={() => setColorTheme(t.id)} title={t.name}
          className="w-7 h-7 rounded-full transition-transform hover:scale-110"
          style={{
            background: 'var(--t-accent)',
            filter: colorTheme === t.id ? 'none' : 'grayscale(0.7) opacity(0.5)',
            outline: colorTheme === t.id ? '2px solid var(--t-text)' : 'none',
            outlineOffset: 2,
          }}
          data-theme={t.id} data-mode={isDark ? 'dark' : 'light'}
        />
      ))}
      <button onClick={toggleMode}
        className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium"
        style={{ background: 'var(--t-bg-elevated)', color: 'var(--t-text)', border: '1px solid var(--t-border)' }}>
        {isDark ? '☀ Light' : '🌙 Dark'}
      </button>
    </div>
  )
}

function TiltCard() {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${px * 16}deg`)
    el.style.setProperty('--ry', `${-py * 16}deg`)
  }
  const reset = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }
  return (
    <div ref={ref} className="dl-card dl-card--tilt" onMouseMove={onMove} onMouseLeave={reset}>
      <div className="dl-tilt-layer">
        <p className="text-xs uppercase tracking-wider t-text-muted">Card D · 3D Tilt</p>
        <h3>Total Revenue</h3>
        <p>Follows your cursor</p>
        <div className="dl-val t-text">12 480 €</div>
      </div>
    </div>
  )
}

function SpotlightCard() {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <div ref={ref} className="dl-card dl-card--spot" onMouseMove={onMove}>
      <p className="text-xs uppercase tracking-wider t-text-muted">Card E · Spotlight</p>
      <h3>Paid Ratio</h3>
      <p>Hover to reveal the glow</p>
      <div className="dl-val t-text">87%</div>
    </div>
  )
}

export default function DesignLab() {
  return (
    <div className="min-h-screen t-page-bg">
      <div className="dl-wrap max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-12 pb-16">
        <ThemeBar />

        {/* ─── Brand hero ───────────────────────────────────── */}
        <section className="dl-demo dl-bg-aurora" style={{ minHeight: 280 }}>
          <span className="dl-blob" /><span className="dl-blob" /><span className="dl-blob" />
          <div className="relative z-10 text-center px-6">
            <div className="dl-cube-stage inline-block mb-5">
              <div className="dl-cube"><span /><span /><span /><span /><span /><span /></div>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight"
              style={{ background: 'linear-gradient(120deg, var(--t-gradient-from), var(--t-gradient-via), var(--t-accent))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              Invoicer
            </h1>
            <p className="mt-3 t-text-secondary max-w-md mx-auto">
              Brand direction — animated aurora, glass surfaces, a living 3D mark.
              Everything below adapts to your active theme.
            </p>
          </div>
        </section>

        {/* ─── Animated backgrounds ─────────────────────────── */}
        <section>
          <SectionTitle kicker="Pick one" title="Animated backgrounds" />
          <div className="grid md:grid-cols-3 gap-5">
            <div className="dl-demo dl-bg-aurora">
              <span className="dl-label">BG A · Aurora</span>
              <span className="dl-blob" /><span className="dl-blob" /><span className="dl-blob" />
              <span className="relative z-10 font-semibold t-text">Drifting blobs</span>
            </div>
            <div className="dl-demo dl-bg-orbs">
              <span className="dl-label">BG B · Floating orbs</span>
              <span className="dl-orb" /><span className="dl-orb" /><span className="dl-orb" /><span className="dl-orb" />
              <span className="relative z-10 font-semibold t-text">Rising 3D spheres</span>
            </div>
            <div className="dl-demo dl-bg-grid">
              <span className="dl-label">BG C · Neon grid</span>
              <span className="dl-grid" /><span className="dl-grid-glow" />
              <span className="relative z-10 font-semibold t-text">Perspective floor</span>
            </div>
          </div>
        </section>

        {/* ─── Cards ────────────────────────────────────────── */}
        <section>
          <SectionTitle kicker="Pick a few" title="Card styles" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="dl-card dl-card--glass">
              <p className="text-xs uppercase tracking-wider t-text-muted">Card A · Glass</p>
              <h3>Outstanding</h3><p>Frosted blur surface</p>
              <div className="dl-val">3 240 €</div>
            </div>
            <div className="dl-card dl-card--gradborder">
              <p className="text-xs uppercase tracking-wider t-text-muted">Card B · Gradient border</p>
              <h3>This Month</h3><p>Rotating conic edge</p>
              <div className="dl-val">18 sf</div>
            </div>
            <div className="dl-card dl-card--glow">
              <p className="text-xs uppercase tracking-wider t-text-muted">Card C · Glow hover</p>
              <h3>Clients</h3><p>Lifts + accent glow</p>
              <div className="dl-val">42</div>
            </div>
            <TiltCard />
            <SpotlightCard />
            <div className="dl-card dl-card--soft">
              <p className="text-xs uppercase tracking-wider t-text-muted">Card F · Soft</p>
              <h3>Avg Invoice</h3><p>Neumorphic depth</p>
              <div className="dl-val">694 €</div>
            </div>
          </div>
        </section>

        {/* ─── Buttons ──────────────────────────────────────── */}
        <section>
          <SectionTitle kicker="Pick a few" title="Button styles" />
          <div className="flex flex-wrap gap-4 items-center">
            <button className="dl-btn dl-btn--grad">Btn 1 · Gradient</button>
            <button className="dl-btn dl-btn--press">Btn 2 · 3D Press</button>
            <button className="dl-btn dl-btn--shimmer">Btn 3 · Shimmer</button>
            <button className="dl-btn dl-btn--outline">Btn 4 · Outline fill</button>
            <button className="dl-btn dl-btn--magnetic">Btn 5 · Magnetic</button>
            <button className="dl-btn dl-btn--glass">Btn 6 · Glass</button>
          </div>
        </section>

        <p className="text-sm t-text-muted">
          Tip: switch theme above — every shape, card and button re-tints automatically.
          Tell me which numbers you want and I&apos;ll wire them into the real dashboard.
        </p>
      </div>
    </div>
  )
}

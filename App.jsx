import { useState, useEffect, useMemo } from 'react'

const API = 'https://ironwatch-3906.onrender.com/api/v1/lots'

const VERDICT = {
  'Strong Buy': { color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green-border)' },
  'Buy':        { color: 'var(--blue)',  bg: 'var(--blue-bg)',  border: 'var(--blue-border)'  },
  'Watch':      { color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'var(--amber-border)' },
  'Pass':       { color: 'var(--red)',   bg: 'var(--red-bg)',   border: 'var(--red-border)'   },
}

function scoreColor(score) {
  if (score >= 80) return 'var(--green)'
  if (score >= 65) return 'var(--blue)'
  if (score >= 50) return 'var(--amber)'
  return 'var(--red)'
}

function timeLeft(isoDate) {
  if (!isoDate) return null
  const diff = new Date(isoDate) - new Date()
  if (diff <= 0) return 'Ended'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function fmt(n) {
  if (n == null) return '—'
  return '£' + Math.round(n).toLocaleString('en-GB')
}

function LotCard({ lot }) {
  const [expanded, setExpanded] = useState(false)
  const v = VERDICT[lot.verdict] || VERDICT['Watch']
  const img = lot.image_urls?.[0]
  const tl = timeLeft(lot.auction_end_time)

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {img && (
        <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: '#0d0f0c' }}>
          <img
            src={img}
            alt={lot.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
            onError={e => { e.target.style.display = 'none' }}
          />
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.85)',
            border: `1px solid ${v.border}`,
            borderRadius: 4,
            padding: '4px 10px',
            fontFamily: 'var(--mono)',
            fontSize: 22,
            fontWeight: 500,
            color: v.color,
            lineHeight: 1,
          }}>
            {lot.deal_score}
          </div>
          {tl && (
            <div style={{
              position: 'absolute', bottom: 10, left: 10,
              background: 'rgba(0,0,0,0.8)',
              border: '1px solid var(--border-light)',
              borderRadius: 3,
              padding: '3px 8px',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: tl === 'Ended' ? 'var(--red)' : tl.includes('h') && !tl.includes('d') ? 'var(--amber)' : 'var(--muted)',
            }}>
              {tl === 'Ended' ? 'ENDED' : `ENDS ${tl}`}
            </div>
          )}
        </div>
      )}

      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <h3 style={{
            fontFamily: 'var(--head)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1.3,
            letterSpacing: '0.01em',
          }}>
            {lot.title.length > 72 ? lot.title.slice(0, 72) + '…' : lot.title}
          </h3>
          <span style={{
            flexShrink: 0,
            background: v.bg,
            border: `1px solid ${v.border}`,
            color: v.color,
            fontFamily: 'var(--head)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '2px 7px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
          }}>
            {lot.verdict?.toUpperCase()}
          </span>
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, fontFamily: 'var(--mono)' }}>
          {lot.location} · {lot.platform_name}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
          marginBottom: 12,
        }}>
          <Stat label="Current bid" value={lot.current_bid === 0 ? 'No bids' : fmt(lot.current_bid)} highlight={lot.current_bid === 0} />
          <Stat label="Market low" value={fmt(lot.market_price_low)} />
          <Stat label="Market high" value={fmt(lot.market_price_high)} />
        </div>

        {lot.margin_pct != null && (
          <div style={{
            background: 'var(--accent-dim)',
            border: '1px solid rgba(232,160,32,0.2)',
            borderRadius: 4,
            padding: '5px 10px',
            marginBottom: 12,
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--accent)',
          }}>
            ↑ {Math.round(lot.margin_pct)}% margin potential
          </div>
        )}

        <p style={{
          fontSize: 13,
          color: '#b0b4ac',
          lineHeight: 1.6,
          marginBottom: 12,
          fontStyle: 'italic',
        }}>
          "{lot.commentary?.length > 180 && !expanded
            ? lot.commentary.slice(0, 180) + '…'
            : lot.commentary}"
        </p>

        {lot.watch_points?.length > 0 && expanded && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 6 }}>WATCH POINTS</div>
            {lot.watch_points.map((wp, i) => (
              <div key={i} style={{
                fontSize: 12,
                color: 'var(--amber)',
                padding: '3px 0',
                display: 'flex',
                gap: 6,
                lineHeight: 1.4,
              }}>
                <span style={{ flexShrink: 0 }}>⚠</span>
                <span>{wp}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a
            href={lot.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: 'block',
              textAlign: 'center',
              background: 'var(--accent)',
              color: '#0b0d0c',
              fontFamily: 'var(--head)',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.06em',
              padding: '8px 16px',
              borderRadius: 4,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            GO TO AUCTION →
          </a>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-light)',
              color: 'var(--muted)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              padding: '8px 12px',
              borderRadius: 4,
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--faint)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border-light)' }}
          >
            {expanded ? '▲ LESS' : '▼ MORE'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      padding: '6px 8px',
    }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.06em', marginBottom: 2 }}>
        {label.toUpperCase()}
      </div>
      <div style={{
        fontFamily: 'var(--mono)',
        fontSize: 13,
        fontWeight: 500,
        color: highlight ? 'var(--accent)' : 'var(--text)',
      }}>
        {value}
      </div>
    </div>
  )
}

export default function App() {
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [minScore, setMinScore] = useState(0)
  const [verdictFilter, setVerdictFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sortBy, setSortBy] = useState('score')

  useEffect(() => {
    fetch(`${API}?limit=200`)
      .then(r => r.json())
      .then(data => { setLots(data.lots || []); setLoading(false) })
      .catch(() => { setError('Could not load lots. Is the API running?'); setLoading(false) })
  }, [])

  const categories = useMemo(() => {
    const cats = [...new Set(lots.map(l => l.category).filter(Boolean))]
    return ['All', ...cats.sort()]
  }, [lots])

  const filtered = useMemo(() => {
    let out = lots.filter(l => {
      if (l.deal_score < minScore) return false
      if (verdictFilter !== 'All' && l.verdict !== verdictFilter) return false
      if (categoryFilter !== 'All' && l.category !== categoryFilter) return false
      return true
    })
    if (sortBy === 'score') out = [...out].sort((a, b) => b.deal_score - a.deal_score)
    if (sortBy === 'margin') out = [...out].sort((a, b) => (b.margin_pct || 0) - (a.margin_pct || 0))
    if (sortBy === 'ending') out = [...out].sort((a, b) => new Date(a.auction_end_time) - new Date(b.auction_end_time))
    if (sortBy === 'bid') out = [...out].sort((a, b) => a.current_bid - b.current_bid)
    return out
  }, [lots, minScore, verdictFilter, categoryFilter, sortBy])

  const counts = useMemo(() => ({
    total: lots.length,
    strongBuy: lots.filter(l => l.verdict === 'Strong Buy').length,
    buy: lots.filter(l => l.verdict === 'Buy').length,
  }), [lots])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        position: 'sticky',
        top: 0,
        background: 'rgba(11,13,12,0.95)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            fontFamily: 'var(--head)',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--accent)',
          }}>
            IRON<span style={{ color: 'var(--text)' }}>WATCH</span>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
            INDUSTRIAL SURPLUS INTELLIGENCE
          </div>
        </div>
        {!loading && (
          <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--mono)', fontSize: 12 }}>
            <span style={{ color: 'var(--muted)' }}>{counts.total} lots</span>
            <span style={{ color: 'var(--green)' }}>{counts.strongBuy} strong buy</span>
            <span style={{ color: 'var(--blue)' }}>{counts.buy} buy</span>
          </div>
        )}
      </header>

      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              MIN SCORE: <span style={{ color: scoreColor(minScore), fontWeight: 500 }}>{minScore}</span>
            </span>
            <input
              type="range" min="0" max="95" step="5" value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              style={{ width: 100, accentColor: 'var(--accent)' }}
            />
          </div>

          <FilterGroup
            value={verdictFilter}
            onChange={setVerdictFilter}
            options={['All', 'Strong Buy', 'Buy', 'Watch', 'Pass']}
            label="VERDICT"
          />

          <FilterGroup
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categories}
            label="CATEGORY"
          />

          <FilterGroup
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'score', label: 'TOP SCORE' },
              { value: 'margin', label: 'MARGIN %' },
              { value: 'ending', label: 'ENDING SOON' },
              { value: 'bid', label: 'LOWEST BID' },
            ]}
            label="SORT"
          />
        </div>
      </div>

      <main style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
            <div style={{ fontSize: 13, letterSpacing: '0.1em' }}>SCANNING AUCTIONS...</div>
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--red-bg)',
            border: '1px solid var(--red-border)',
            borderRadius: 6,
            padding: 20,
            color: 'var(--red)',
            fontFamily: 'var(--mono)',
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: 13, letterSpacing: '0.08em' }}>
            NO LOTS MATCH YOUR FILTERS
          </div>
        )}

        {!loading && !error && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}>
            {filtered.map(lot => <LotCard key={lot.id} lot={lot} />)}
          </div>
        )}
      </main>
    </div>
  )
}

function FilterGroup({ value, onChange, options, label }) {
  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{label}:</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {opts.map(o => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              background: value === o.value ? 'var(--accent)' : 'transparent',
              border: `1px solid ${value === o.value ? 'var(--accent)' : 'var(--border-light)'}`,
              color: value === o.value ? '#0b0d0c' : 'var(--muted)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              fontWeight: value === o.value ? 700 : 400,
              padding: '4px 9px',
              borderRadius: 3,
              letterSpacing: '0.04em',
              transition: 'all 0.12s',
              cursor: 'pointer',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
